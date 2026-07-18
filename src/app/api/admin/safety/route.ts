import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function requireStaff() {
  const authed = await createClient()
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return null

  const svc = await createServiceClient()
  const { data: role } = await svc.from('user_roles').select('role').eq('user_id', user.id).maybeSingle()
  if (role?.role !== 'admin' && role?.role !== 'staff') return null
  return svc
}

export async function GET(req: NextRequest) {
  const svc = await requireStaff()
  if (!svc) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const status = req.nextUrl.searchParams.get('status') ?? 'open'

  let query = svc
    .from('moderation_flags')
    .select('id, source, booking_id, therapist_id, sender, category, severity, reason, excerpt, status, created_at')
    .order('created_at', { ascending: false })
    .limit(200)
  if (status !== 'all') query = query.eq('status', status)

  const { data: flags, error } = await query
  if (error) {
    console.error('safety list error:', error)
    return NextResponse.json({ error: 'Failed to load flags' }, { status: 500 })
  }

  // Attach therapist names for context
  const therapistIds = [...new Set((flags ?? []).map(f => f.therapist_id).filter(Boolean))]
  const names: Record<string, string> = {}
  if (therapistIds.length) {
    const { data: therapists } = await svc.from('therapists').select('id, name').in('id', therapistIds)
    for (const t of therapists ?? []) names[t.id] = t.name
  }

  return NextResponse.json({
    flags: (flags ?? []).map(f => ({ ...f, therapist_name: f.therapist_id ? names[f.therapist_id] ?? null : null })),
  })
}

export async function PATCH(req: NextRequest) {
  const svc = await requireStaff()
  if (!svc) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, status } = await req.json()
  if (!id || !['open', 'reviewed', 'dismissed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { error } = await svc
    .from('moderation_flags')
    .update({ status, reviewed_at: status === 'open' ? null : new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('safety update error:', error)
    return NextResponse.json({ error: 'Failed to update flag' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
