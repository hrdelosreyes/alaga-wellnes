// ============================================================
//  QueryDescriptor → parameterised SQL (server only)
// ============================================================
// Compiles the PostgREST-style descriptors produced by QueryBuilder into a
// single SQL statement. Identifiers are validated and quoted; every value is
// passed as a bind parameter. Embedded resources like `therapists(name)` are
// resolved through foreign keys read from pg_catalog (see SchemaInfo).

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Filter, FilterOp, QueryDescriptor } from './query-builder'

export type ForeignKey = { table: string; column: string; refTable: string; refColumn: string; name: string }

export type SchemaInfo = {
  /** table → column → formatted SQL type, e.g. "jsonb", "text[]", "uuid" */
  columns: Map<string, Map<string, string>>
  primaryKeys: Map<string, string[]>
  foreignKeys: ForeignKey[]
}

export class CompileError extends Error {
  constructor(message: string, public code = 'PGRST100') { super(message) }
}

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/

export function ident(name: string): string {
  if (!IDENT.test(name)) throw new CompileError(`Invalid identifier: ${name}`)
  return `"${name}"`
}

class Params {
  values: unknown[] = []
  add(v: unknown, sqlType?: string): string {
    this.values.push(prepareValue(v, sqlType))
    const ref = `$${this.values.length}`
    return sqlType ? `${ref}::${sqlType}` : ref
  }
}

function isJsonType(t?: string) { return t === 'json' || t === 'jsonb' }

function prepareValue(v: unknown, sqlType?: string): unknown {
  if (v === undefined) return null
  if (isJsonType(sqlType)) return v === null ? null : JSON.stringify(v)
  if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) return JSON.stringify(v)
  return v
}

function tableExists(schema: SchemaInfo, table: string) {
  if (!schema.columns.has(table)) throw new CompileError(`Could not find the table 'public.${table}' in the schema cache`, 'PGRST205')
}

function colType(schema: SchemaInfo, table: string, column: string): string | undefined {
  return schema.columns.get(table)?.get(column)
}

function assertColumn(schema: SchemaInfo, table: string, column: string) {
  if (!schema.columns.get(table)?.has(column)) {
    throw new CompileError(`column ${table}.${column} does not exist`, '42703')
  }
}

// ── Select-list parsing ───────────────────────────────────────

type SelectItem =
  | { kind: 'star' }
  | { kind: 'column'; column: string; alias?: string; cast?: string }
  | { kind: 'embed'; relation: string; alias?: string; hint?: string; inner: boolean; items: SelectItem[] }

function splitTopLevel(s: string): string[] {
  const out: string[] = []
  let depth = 0, cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue }
    cur += ch
  }
  if (cur.trim()) out.push(cur)
  return out.map(x => x.trim()).filter(Boolean)
}

export function parseSelect(s: string): SelectItem[] {
  return splitTopLevel(s.replace(/\s+/g, ' ')).map(token => {
    if (token === '*') return { kind: 'star' } as const
    const paren = token.indexOf('(')
    if (paren !== -1) {
      if (!token.endsWith(')')) throw new CompileError(`Malformed select: ${token}`)
      let head = token.slice(0, paren).trim()
      const inner = token.slice(paren + 1, -1)
      let alias: string | undefined
      if (head.includes(':')) [alias, head] = head.split(':').map(x => x.trim())
      const [relation, ...mods] = head.split('!').map(x => x.trim())
      const isInner = mods.includes('inner')
      const hint = mods.find(m => m !== 'inner' && m !== 'left')
      return { kind: 'embed', relation, alias, hint, inner: isInner, items: parseSelect(inner) } as const
    }
    let column = token, alias: string | undefined, cast: string | undefined
    if (column.includes('::')) [column, cast] = column.split('::').map(x => x.trim())
    if (column.includes(':')) [alias, column] = column.split(':').map(x => x.trim())
    return { kind: 'column', column, alias, cast } as const
  })
}

// ── Embeds ────────────────────────────────────────────────────

type Join = { kind: 'many-to-one' | 'one-to-many'; on: (parent: string, child: string) => string }

function resolveJoin(schema: SchemaInfo, parent: string, relation: string, hint?: string): Join {
  const matches = (fk: ForeignKey) => !hint || fk.name === hint || fk.column === hint
  // parent.col → relation.id  (e.g. bookings.therapist_id → therapists)
  const m2o = schema.foreignKeys.filter(fk => fk.table === parent && fk.refTable === relation && matches(fk))
  if (m2o.length) {
    const fk = m2o[0]
    return { kind: 'many-to-one', on: (p, c) => `${c}.${ident(fk.refColumn)} = ${p}.${ident(fk.column)}` }
  }
  // relation.col → parent.id  (e.g. therapists ← bookings)
  const o2m = schema.foreignKeys.filter(fk => fk.table === relation && fk.refTable === parent && matches(fk))
  if (o2m.length) {
    const fk = o2m[0]
    return { kind: 'one-to-many', on: (p, c) => `${c}.${ident(fk.column)} = ${p}.${ident(fk.refColumn)}` }
  }
  throw new CompileError(`Could not find a relationship between '${parent}' and '${relation}' in the schema cache`, 'PGRST200')
}

let aliasSeq = 0
function nextAlias() { aliasSeq = (aliasSeq + 1) % 1_000_000; return `t${aliasSeq}` }

/** Builds a list of `expr AS "name"` select expressions for `table` aliased as `ta`. */
function selectList(schema: SchemaInfo, table: string, ta: string, items: SelectItem[], innerConds: string[]): string {
  const parts: string[] = []
  for (const item of items) {
    if (item.kind === 'star') { parts.push(`${ta}.*`); continue }
    if (item.kind === 'column') {
      assertColumn(schema, table, item.column)
      let expr = `${ta}.${ident(item.column)}`
      if (item.cast) {
        if (!IDENT.test(item.cast)) throw new CompileError(`Invalid cast: ${item.cast}`)
        expr += `::${item.cast}`
      }
      parts.push(item.alias ? `${expr} AS ${ident(item.alias)}` : expr)
      continue
    }
    tableExists(schema, item.relation)
    const join = resolveJoin(schema, table, item.relation, item.hint)
    const ca = nextAlias()
    const childInner: string[] = []
    const cols = selectList(schema, item.relation, ca, item.items, childInner)
    const where = [join.on(ta, ca), ...childInner].join(' AND ')
    const from = `public.${ident(item.relation)} ${ca}`
    const name = ident(item.alias ?? item.relation)
    if (join.kind === 'many-to-one') {
      parts.push(`(SELECT row_to_json(_r) FROM (SELECT ${cols} FROM ${from} WHERE ${where} LIMIT 1) _r) AS ${name}`)
      if (item.inner) innerConds.push(`EXISTS (SELECT 1 FROM ${from} WHERE ${where})`)
    } else {
      parts.push(`COALESCE((SELECT json_agg(_r) FROM (SELECT ${cols} FROM ${from} WHERE ${where}) _r), '[]'::json) AS ${name}`)
      if (item.inner) innerConds.push(`EXISTS (SELECT 1 FROM ${from} WHERE ${where})`)
    }
  }
  return parts.join(', ')
}

// ── Filters ───────────────────────────────────────────────────

const CMP: Record<string, string> = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' }

function filterSql(schema: SchemaInfo, table: string, ta: string, f: Filter, p: Params): string {
  if (f.column.includes('.')) throw new CompileError(`Filtering on embedded resources is not supported: ${f.column}`)
  assertColumn(schema, table, f.column)
  const col = `${ta}.${ident(f.column)}`
  const t = colType(schema, table, f.column)
  const jsonCast = isJsonType(t) ? t : undefined
  let sql: string
  switch (f.op as FilterOp) {
    case 'eq': case 'neq': case 'gt': case 'gte': case 'lt': case 'lte':
      if (f.value === null) { sql = f.op === 'neq' ? `${col} IS NOT NULL` : `${col} IS NULL`; break }
      sql = `${col} ${CMP[f.op]} ${p.add(f.value, jsonCast)}`
      break
    case 'like': case 'ilike':
      sql = `${col}::text ${f.op === 'like' ? 'LIKE' : 'ILIKE'} ${p.add(String(f.value).replace(/\*/g, '%'))}`
      break
    case 'in': {
      const arr = Array.isArray(f.value) ? f.value : [f.value]
      if (arr.length === 0) { sql = 'FALSE'; break }
      sql = `${col} IN (${arr.map(v => p.add(v, jsonCast)).join(', ')})`
      break
    }
    case 'is':
      if (f.value === null || f.value === 'null') sql = `${col} IS NULL`
      else if (f.value === true || f.value === 'true') sql = `${col} IS TRUE`
      else if (f.value === false || f.value === 'false') sql = `${col} IS FALSE`
      else throw new CompileError(`Invalid value for is(): ${String(f.value)}`)
      break
    case 'contains':    sql = `${col} @> ${p.add(f.value, t)}`; break
    case 'containedBy': sql = `${col} <@ ${p.add(f.value, t)}`; break
    case 'overlaps':    sql = `${col} && ${p.add(f.value, t)}`; break
    default:
      throw new CompileError(`Unsupported filter operator: ${String(f.op)}`)
  }
  return f.negate ? `NOT (${sql})` : sql
}

/** Parses a PostgREST `or` expression such as "status.eq.paid,total.gt.100". */
function parseOr(expr: string): Filter[] {
  return splitTopLevel(expr).map(part => {
    const m = part.match(/^([A-Za-z_][A-Za-z0-9_]*)\.(not\.)?([a-zA-Z]+)\.(.*)$/)
    if (!m) throw new CompileError(`Unsupported or() expression: ${part}`)
    const [, column, not, op, raw] = m
    let value: unknown = raw
    if (op === 'in') value = raw.replace(/^\(|\)$/g, '').split(',').map(s => s.trim().replace(/^"|"$/g, ''))
    else if (raw === 'null') value = null
    else if (raw === 'true') value = true
    else if (raw === 'false') value = false
    return { column, op: op as FilterOp, value, negate: !!not }
  })
}

function whereClause(schema: SchemaInfo, q: QueryDescriptor, ta: string, p: Params, extra: string[] = []): string {
  const conds = q.filters.map(f => filterSql(schema, q.table, ta, f, p))
  for (const expr of q.or) {
    const ors = parseOr(expr).map(f => filterSql(schema, q.table, ta, f, p))
    conds.push(`(${ors.join(' OR ')})`)
  }
  conds.push(...extra)
  return conds.length ? ` WHERE ${conds.join(' AND ')}` : ''
}

function orderClause(schema: SchemaInfo, q: QueryDescriptor, ta: string): string {
  if (!q.order.length) return ''
  return ' ORDER BY ' + q.order.map(o => {
    assertColumn(schema, q.table, o.column)
    const nulls = o.nullsFirst === undefined ? '' : o.nullsFirst ? ' NULLS FIRST' : ' NULLS LAST'
    return `${ta}.${ident(o.column)} ${o.ascending ? 'ASC' : 'DESC'}${nulls}`
  }).join(', ')
}

function limitClause(q: QueryDescriptor): string {
  let s = ''
  if (q.limit !== undefined) s += ` LIMIT ${Math.max(0, Math.floor(Number(q.limit)))}`
  if (q.offset !== undefined) s += ` OFFSET ${Math.max(0, Math.floor(Number(q.offset)))}`
  return s
}

// ── Public API ────────────────────────────────────────────────

export type Compiled = { text: string; values: unknown[]; countText?: string; countValues?: unknown[] }

export function compile(schema: SchemaInfo, q: QueryDescriptor): Compiled {
  ident(q.table)
  tableExists(schema, q.table)
  const ta = 't0'
  const table = `public.${ident(q.table)} ${ta}`

  if (q.action === 'select') {
    const inner: string[] = []
    const cols = selectList(schema, q.table, ta, parseSelect(q.columns || '*'), inner)
    const p = new Params()
    const where = whereClause(schema, q, ta, p, inner)
    const out: Compiled = { text: '', values: [] }
    if (q.count) {
      out.countText = `SELECT count(*)::int AS count FROM ${table}${where}`
      out.countValues = p.values
    }
    if (!q.head) {
      out.text = `SELECT ${cols} FROM ${table}${where}${orderClause(schema, q, ta)}${limitClause(q)}`
      out.values = p.values
    }
    return out
  }

  const p = new Params()
  const returning = q.columns !== null
    ? ` RETURNING ${selectList(schema, q.table, ta, parseSelect(q.columns || '*'), [])}`
    : ''

  if (q.action === 'insert' || q.action === 'upsert') {
    const rows = (Array.isArray(q.values) ? q.values : [q.values ?? {}]) as Record<string, unknown>[]
    if (!rows.length) throw new CompileError('No rows to insert')
    const keys = [...new Set(rows.flatMap(r => Object.keys(r)))]
    keys.forEach(k => assertColumn(schema, q.table, k))
    const valuesSql = rows.map(r =>
      `(${keys.map(k => (k in r && r[k] !== undefined) ? p.add(r[k], colType(schema, q.table, k)) : 'DEFAULT').join(', ')})`,
    ).join(', ')
    let sql = keys.length
      ? `INSERT INTO public.${ident(q.table)} AS ${ta} (${keys.map(ident).join(', ')}) VALUES ${valuesSql}`
      : `INSERT INTO public.${ident(q.table)} AS ${ta} DEFAULT VALUES`
    if (q.action === 'upsert') {
      const conflict = q.onConflict
        ? q.onConflict.split(',').map(s => s.trim()).filter(Boolean)
        : schema.primaryKeys.get(q.table) ?? []
      if (!conflict.length) throw new CompileError(`No conflict target for upsert on ${q.table}`)
      conflict.forEach(c => assertColumn(schema, q.table, c))
      const updates = keys.filter(k => !conflict.includes(k))
      sql += ` ON CONFLICT (${conflict.map(ident).join(', ')}) `
      sql += q.ignoreDuplicates || !updates.length
        ? 'DO NOTHING'
        : `DO UPDATE SET ${updates.map(k => `${ident(k)} = EXCLUDED.${ident(k)}`).join(', ')}`
    }
    return { text: sql + (returning), values: p.values }
  }

  if (q.action === 'update') {
    const vals = (q.values ?? {}) as Record<string, unknown>
    const keys = Object.keys(vals).filter(k => vals[k] !== undefined)
    if (!keys.length) throw new CompileError('No columns to update')
    keys.forEach(k => assertColumn(schema, q.table, k))
    const set = keys.map(k => `${ident(k)} = ${p.add(vals[k], colType(schema, q.table, k))}`).join(', ')
    const where = whereClause(schema, q, ta, p)
    return { text: `UPDATE public.${ident(q.table)} AS ${ta} SET ${set}${where}${returning}`, values: p.values }
  }

  if (q.action === 'delete') {
    const where = whereClause(schema, q, ta, p)
    return { text: `DELETE FROM public.${ident(q.table)} AS ${ta}${where}${returning}`, values: p.values }
  }

  throw new CompileError(`Unknown action: ${(q as any).action}`)
}
