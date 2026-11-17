// ============================================================
//  Alaga Wellness — Postgres query builder (Supabase-compatible API)
// ============================================================
// A small, isomorphic, chainable query builder that mirrors the subset of
// the supabase-js / PostgREST API this app uses:
//
//   db.from('bookings').select('id, therapists(name)').eq('id', x).single()
//
// The builder only produces a serialisable QueryDescriptor. Execution is
// delegated to an executor: on the server it compiles to parameterised SQL
// and runs on Neon (see ./execute.ts); in the browser it POSTs the
// descriptor to /api/db, which runs it under the caller's RLS role.

/* eslint-disable @typescript-eslint/no-explicit-any */

export type FilterOp =
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'like' | 'ilike' | 'in' | 'is'
  | 'contains' | 'containedBy' | 'overlaps'

export type Filter = {
  column: string
  op: FilterOp
  value: unknown
  negate?: boolean
}

export type OrderSpec = {
  column: string
  ascending: boolean
  nullsFirst?: boolean
}

export type QueryAction = 'select' | 'insert' | 'update' | 'upsert' | 'delete'

export type QueryDescriptor = {
  table: string
  action: QueryAction
  /** Select list for reads, or the RETURNING list after .select() on a mutation. */
  columns: string | null
  count: 'exact' | null
  head: boolean
  values?: Record<string, unknown> | Record<string, unknown>[]
  onConflict?: string
  ignoreDuplicates?: boolean
  filters: Filter[]
  /** Raw PostgREST-style `or` expressions, e.g. "status.eq.a,status.eq.b". */
  or: string[]
  order: OrderSpec[]
  limit?: number
  offset?: number
  single?: 'single' | 'maybeSingle'
}

export type DbError = {
  message: string
  code: string
  details: string | null
  hint: string | null
}

export type DbResponse<T = any> = {
  data: T
  error: DbError | null
  count: number | null
  status: number
  statusText: string
}

export type Executor = (q: QueryDescriptor) => Promise<DbResponse>

export function makeError(message: string, code = 'ERROR', details: string | null = null, hint: string | null = null): DbError {
  return { message, code, details, hint }
}

export class QueryBuilder<T = any> implements PromiseLike<DbResponse<T[]>> {
  private q: QueryDescriptor

  constructor(private executor: Executor, table: string) {
    this.q = {
      table,
      action: 'select',
      columns: '*',
      count: null,
      head: false,
      filters: [],
      or: [],
      order: [],
    }
  }

  // ── Actions ──────────────────────────────────────────────

  select(columns = '*', opts: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean } = {}): QueryBuilder<T> {
    if (this.q.action === 'select') {
      this.q.columns = columns
      this.q.count = opts.count ? 'exact' : null
      this.q.head = !!opts.head
    } else {
      // .insert(...).select() → RETURNING
      this.q.columns = columns
    }
    return this
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[], opts: { count?: 'exact' } = {}): QueryBuilder<T> {
    this.q.action = 'insert'
    this.q.values = values
    this.q.columns = null
    this.q.count = opts.count ? 'exact' : null
    return this
  }

  upsert(
    values: Record<string, unknown> | Record<string, unknown>[],
    opts: { onConflict?: string; ignoreDuplicates?: boolean; count?: 'exact' } = {},
  ): QueryBuilder<T> {
    this.q.action = 'upsert'
    this.q.values = values
    this.q.columns = null
    this.q.onConflict = opts.onConflict
    this.q.ignoreDuplicates = opts.ignoreDuplicates
    this.q.count = opts.count ? 'exact' : null
    return this
  }

  update(values: Record<string, unknown>, opts: { count?: 'exact' } = {}): QueryBuilder<T> {
    this.q.action = 'update'
    this.q.values = values
    this.q.columns = null
    this.q.count = opts.count ? 'exact' : null
    return this
  }

  delete(opts: { count?: 'exact' } = {}): QueryBuilder<T> {
    this.q.action = 'delete'
    this.q.columns = null
    this.q.count = opts.count ? 'exact' : null
    return this
  }

  // ── Filters ──────────────────────────────────────────────

  private add(column: string, op: FilterOp, value: unknown, negate = false): QueryBuilder<T> {
    this.q.filters.push({ column, op, value, negate })
    return this
  }

  eq(column: string, value: unknown)  { return this.add(column, 'eq', value) }
  neq(column: string, value: unknown) { return this.add(column, 'neq', value) }
  gt(column: string, value: unknown)  { return this.add(column, 'gt', value) }
  gte(column: string, value: unknown) { return this.add(column, 'gte', value) }
  lt(column: string, value: unknown)  { return this.add(column, 'lt', value) }
  lte(column: string, value: unknown) { return this.add(column, 'lte', value) }
  like(column: string, pattern: string)  { return this.add(column, 'like', pattern) }
  ilike(column: string, pattern: string) { return this.add(column, 'ilike', pattern) }
  in(column: string, values: readonly unknown[]) { return this.add(column, 'in', [...values]) }
  is(column: string, value: null | boolean) { return this.add(column, 'is', value) }
  contains(column: string, value: unknown)    { return this.add(column, 'contains', value) }
  containedBy(column: string, value: unknown) { return this.add(column, 'containedBy', value) }
  overlaps(column: string, value: unknown)    { return this.add(column, 'overlaps', value) }

  match(query: Record<string, unknown>) {
    for (const [k, v] of Object.entries(query)) this.add(k, 'eq', v)
    return this
  }

  /** .not('col', 'is', null) / .not('col', 'eq', 'x') / .not('col', 'in', '(a,b)') */
  not(column: string, operator: string, value: unknown) {
    const op = operator as FilterOp
    let v = value
    if (op === 'in' && typeof value === 'string') {
      v = value.replace(/^\(|\)$/g, '').split(',').map(s => s.trim().replace(/^"|"$/g, ''))
    }
    return this.add(column, op, v, true)
  }

  /** .filter('col', 'eq', value) — PostgREST generic filter. */
  filter(column: string, operator: string, value: unknown) {
    if (operator.startsWith('not.')) return this.not(column, operator.slice(4), value)
    return this.add(column, operator as FilterOp, value)
  }

  or(expression: string) {
    this.q.or.push(expression)
    return this
  }

  // ── Modifiers ────────────────────────────────────────────

  order(column: string, opts: { ascending?: boolean; nullsFirst?: boolean } = {}) {
    this.q.order.push({ column, ascending: opts.ascending ?? true, nullsFirst: opts.nullsFirst })
    return this
  }

  limit(n: number) { this.q.limit = n; return this }

  range(from: number, to: number) {
    this.q.offset = from
    this.q.limit = to - from + 1
    return this
  }

  single(): PromiseLike<DbResponse<T>> {
    this.q.single = 'single'
    return this as unknown as PromiseLike<DbResponse<T>>
  }

  maybeSingle(): PromiseLike<DbResponse<T | null>> {
    this.q.single = 'maybeSingle'
    return this as unknown as PromiseLike<DbResponse<T | null>>
  }

  /** Exposed for the browser → /api/db transport and for tests. */
  toDescriptor(): QueryDescriptor {
    return JSON.parse(JSON.stringify(this.q))
  }

  then<R1 = DbResponse<T[]>, R2 = never>(
    onfulfilled?: ((value: DbResponse<T[]>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: any) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    return this.executor(this.toDescriptor()).then(onfulfilled as any, onrejected)
  }
}

/** The `.from()` entry point shared by browser and server clients. */
export function fromFactory(executor: Executor) {
  return function from<T = any>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(executor, table)
  }
}
