// ============================================================
//  Run QueryDescriptors against Neon with Supabase-style RLS
// ============================================================
// Every query runs in its own transaction. For non-service callers we switch
// to the `anon` / `authenticated` Postgres role and publish the caller's JWT
// claims via `request.jwt.claims`, exactly like PostgREST does. The auth.uid()
// shim (db/neon/00_supabase_compat.sql) reads those claims, so the RLS
// policies carried over from Supabase keep working unchanged.

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PoolClient } from 'pg'
import { getPool } from './pool'
import { compile, CompileError, type SchemaInfo, type ForeignKey } from './compile'
import { makeError, type DbResponse, type QueryDescriptor } from './query-builder'

export type DbRole = 'service' | 'authenticated' | 'anon'

export type DbContext = {
  role: DbRole
  userId?: string | null
  email?: string | null
}

// ── Schema cache ─────────────────────────────────────────────

let schemaCache: { at: number; info: Promise<SchemaInfo> } | null = null
const SCHEMA_TTL_MS = 5 * 60_000

async function loadSchema(): Promise<SchemaInfo> {
  const pool = getPool()
  const [cols, pks, fks] = await Promise.all([
    pool.query(`
      select c.relname as table, a.attname as column, format_type(a.atttypid, a.atttypmod) as type
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r','v','m','p','f')
        and a.attnum > 0 and not a.attisdropped`),
    pool.query(`
      select c.relname as table, array_agg(a.attname order by k.ord) as columns
      from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace n on n.oid = c.relnamespace
      cross join lateral unnest(con.conkey) with ordinality as k(attnum, ord)
      join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum
      where n.nspname = 'public' and con.contype = 'p'
      group by c.relname`),
    pool.query(`
      select con.conname as name, c.relname as table, a.attname as column,
             rc.relname as ref_table, ra.attname as ref_column
      from pg_constraint con
      join pg_class c   on c.oid = con.conrelid
      join pg_class rc  on rc.oid = con.confrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_namespace rn on rn.oid = rc.relnamespace
      join pg_attribute a  on a.attrelid = con.conrelid  and a.attnum = con.conkey[1]
      join pg_attribute ra on ra.attrelid = con.confrelid and ra.attnum = con.confkey[1]
      where con.contype = 'f' and array_length(con.conkey, 1) = 1
        and n.nspname = 'public' and rn.nspname = 'public'
      order by con.conname`),
  ])

  const columns = new Map<string, Map<string, string>>()
  for (const r of cols.rows) {
    if (!columns.has(r.table)) columns.set(r.table, new Map())
    columns.get(r.table)!.set(r.column, r.type)
  }
  const primaryKeys = new Map<string, string[]>(pks.rows.map(r => [r.table, r.columns]))
  const foreignKeys: ForeignKey[] = fks.rows.map(r => ({
    name: r.name, table: r.table, column: r.column, refTable: r.ref_table, refColumn: r.ref_column,
  }))
  return { columns, primaryKeys, foreignKeys }
}

export function getSchema(force = false): Promise<SchemaInfo> {
  if (!force && schemaCache && Date.now() - schemaCache.at < SCHEMA_TTL_MS) return schemaCache.info
  const info = loadSchema()
  schemaCache = { at: Date.now(), info }
  info.catch(() => { schemaCache = null })
  return info
}

// ── Transactions with an RLS context ─────────────────────────

/**
 * Runs `fn` inside a transaction. For anon/authenticated callers the role and
 * JWT claims are set transaction-locally, so RLS applies to every statement.
 */
export async function withDbContext<T>(ctx: DbContext, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    // Transaction-local settings only: with Neon's pooled (PgBouncer) endpoint
    // session-level SETs can leak between clients.
    if (ctx.role === 'service') {
      await client.query(`select set_config('TimeZone', 'UTC', true)`)
    } else {
      const claims = ctx.role === 'authenticated' && ctx.userId
        ? { sub: ctx.userId, email: ctx.email ?? null, role: 'authenticated', aud: 'authenticated' }
        : { role: 'anon' }
      await client.query(
        `select set_config('TimeZone', 'UTC', true),
                set_config('role', $1, true),
                set_config('request.jwt.claims', $2, true),
                set_config('request.jwt.claim.sub', $3, true)`,
        [claims.role, JSON.stringify(claims), ctx.role === 'authenticated' ? ctx.userId ?? '' : ''],
      )
    }
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

function toDbError(err: any) {
  if (err instanceof CompileError) return makeError(err.message, err.code)
  return makeError(err?.message ?? String(err), err?.code ?? 'ERROR', err?.detail ?? null, err?.hint ?? null)
}

const ok = (data: any, count: number | null, status = 200): DbResponse =>
  ({ data, error: null, count, status, statusText: 'OK' })
const fail = (error: ReturnType<typeof makeError>, status = 400): DbResponse =>
  ({ data: null, error, count: null, status, statusText: 'Error' })

export async function executeQuery(q: QueryDescriptor, ctx: DbContext): Promise<DbResponse> {
  try {
    let schema = await getSchema()
    let compiled
    try {
      compiled = compile(schema, q)
    } catch (err) {
      // A table/column might have been added since the cache was loaded.
      if (err instanceof CompileError && ['PGRST205', '42703', 'PGRST200'].includes(err.code)) {
        schema = await getSchema(true)
        compiled = compile(schema, q)
      } else throw err
    }

    return await withDbContext(ctx, async (client) => {
      let count: number | null = null
      if (compiled.countText) {
        const r = await client.query(compiled.countText, compiled.countValues)
        count = r.rows[0]?.count ?? 0
      }
      if (q.action === 'select' && q.head) return ok(null, count)

      const res = await client.query(compiled.text, compiled.values)
      const returning = q.action === 'select' || q.columns !== null
      if (q.action !== 'select' && q.count) count = res.rowCount ?? 0
      let rows: any[] | null = returning ? res.rows : null

      if (q.single) {
        const n = rows?.length ?? 0
        if (n === 1) return ok(rows![0], count)
        if (n === 0 && q.single === 'maybeSingle') return ok(null, count)
        return fail(makeError(
          'JSON object requested, multiple (or no) rows returned',
          'PGRST116',
          `The result contains ${n} rows`,
        ), 406)
      }
      if (!returning) rows = null
      return ok(rows, count, q.action === 'insert' || q.action === 'upsert' ? 201 : 200)
    })
  } catch (err) {
    const e = toDbError(err)
    if (e.code === '42501') return fail(e, 403)
    return fail(e)
  }
}
