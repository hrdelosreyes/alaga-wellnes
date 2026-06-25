import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { THERAPIST_PAYOUT_RATE } from '@/lib/bonus'

async function requireAdmin() {
  const authed = await createClient()
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return null
  const svc = await createServiceClient()
  const { data: role } = await svc.from('user_roles').select('role').eq('user_id', user.id).maybeSingle()
  if (role?.role !== 'admin' && role?.role !== 'staff') return null
  return svc
}

// GET — per-therapist earnings (session take-home), paid out, and pending balance.
export async function GET() {
  const svc = await requireAdmin()
  if (!svc) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: therapists }, { data: completed }, { data: payouts }] = await Promise.all([
    svc.from('therapists').select('id, name, payout_method, payout_account_name, payout_account_number, payout_bank_name'),
    svc.from('bookings').select('therapist_id, subtotal').eq('status', 'completed').not('therapist_id', 'is', null),
    svc.from('payout_records').select('therapist_id, amount, status'),
  ])

  const earnedMap: Record<string, number> = {}
  for (const b of completed ?? []) {
    if (!b.therapist_id) continue
    earnedMap[b.therapist_id] = (earnedMap[b.therapist_id] ?? 0) + Math.round((b.subtotal ?? 0) * THERAPIST_PAYOUT_RATE)
  }
  const paidMap: Record<string, number> = {}
  for (const p of payouts ?? []) {
    if (p.status !== 'sent') continue
    paidMap[p.therapist_id] = (paidMap[p.therapist_id] ?? 0) + (p.amount ?? 0)
  }

  const rows = (therapists ?? [])
    .map(t => {
      const earned  = earnedMap[t.id] ?? 0
      const paidOut = paidMap[t.id] ?? 0
      return {
        therapist_id: t.id,
        name: t.name,
        earned, paidOut,
        pending: Math.max(0, earned - paidOut),
        payout_method:         t.payout_method ?? null,
        payout_account_name:   t.payout_account_name ?? null,
        payout_account_number: t.payout_account_number ?? null,
        payout_bank_name:      t.payout_bank_name ?? null,
      }
    })
    .filter(r => r.earned > 0 || r.paidOut > 0)
    .sort((a, b) => b.pending - a.pending)

  return NextResponse.json({ rows })
}

// POST — record a payout to a therapist.
export async function POST(req: NextRequest) {
  const svc = await requireAdmin()
  if (!svc) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { therapistId, amount, referenceNo } = await req.json()
  const amt = Math.round(Number(amount))
  if (!therapistId || !amt || amt <= 0) {
    return NextResponse.json({ error: 'Provide a therapist and a positive amount.' }, { status: 400 })
  }

  // Snapshot the therapist's payout destination at the time of sending, so the
  // record stays accurate even if they later change their details.
  const { data: t } = await svc
    .from('therapists')
    .select('payout_method, payout_account_name, payout_account_number, payout_bank_name')
    .eq('id', therapistId)
    .maybeSingle()

  let method: string | null = null
  let destination: string | null = null
  if (t?.payout_method) {
    method = t.payout_method
    const label = t.payout_method === 'gcash' ? 'GCash' : t.payout_method === 'maya' ? 'Maya' : (t.payout_bank_name || 'Bank')
    destination = [label, t.payout_account_number, t.payout_account_name].filter(Boolean).join(' · ')
  }

  const { error } = await svc.from('payout_records').insert({
    therapist_id: therapistId,
    amount:       amt,
    status:       'sent',
    sent_at:      new Date().toISOString(),
    method,
    destination,
    reference_no: referenceNo?.trim() || null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
