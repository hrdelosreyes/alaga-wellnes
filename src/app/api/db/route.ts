import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db/execute'
import { getCurrentUser } from '@/lib/auth/server'
import type { QueryDescriptor } from '@/lib/db/query-builder'

// Browser data endpoint. Runs a query descriptor built by QueryBuilder as the
// signed-in user (role `authenticated`) or as `anon` — never as the owner —
// so Postgres row-level security decides what each caller can read/write.

const ACTIONS = new Set(['select', 'insert', 'update', 'upsert', 'delete'])

export async function POST(req: NextRequest) {
  let q: QueryDescriptor
  try {
    q = await req.json()
  } catch {
    return NextResponse.json({ data: null, error: { message: 'Invalid JSON', code: 'PGRST102', details: null, hint: null }, count: null, status: 400, statusText: 'Error' }, { status: 400 })
  }
  if (!q || typeof q.table !== 'string' || !ACTIONS.has(q.action) || !Array.isArray(q.filters) || !Array.isArray(q.order) || !Array.isArray(q.or)) {
    return NextResponse.json({ data: null, error: { message: 'Malformed query', code: 'PGRST100', details: null, hint: null }, count: null, status: 400, statusText: 'Error' }, { status: 400 })
  }

  const user = await getCurrentUser()
  const result = await executeQuery(q, user
    ? { role: 'authenticated', userId: user.id, email: user.email }
    : { role: 'anon' })

  // Always 200 so the client can read `{ data, error }` like the old supabase-js client did.
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
}
