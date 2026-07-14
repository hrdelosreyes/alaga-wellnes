import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const authed = await createClient()
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = await createServiceClient()
  const { data: role } = await svc.from('user_roles').select('role').eq('user_id', user.id).maybeSingle()
  if (role?.role !== 'admin' && role?.role !== 'staff') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: waitlist } = await svc.from('waitlist').select('city')

  const byCity: Record<string, number> = {}
  for (const w of waitlist ?? []) {
    const c = (w.city ?? '').trim()
    if (!c) continue
    byCity[c] = (byCity[c] ?? 0) + 1
  }

  return NextResponse.json({ total: (waitlist ?? []).length, byCity })
}
