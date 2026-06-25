import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { THERAPIST_PAYOUT_RATE } from '@/lib/bonus'

// GET — the therapist's past work: completed + cancelled sessions (with
// per-job take-home), plus requests they declined. The live dashboard only
// shows today/upcoming, so this is where therapists reconcile their history.
export async function GET() {
  const authed = await createClient()
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = await createServiceClient()
  const { data: t } = await svc.from('therapists').select('id').eq('email', user.email).maybeSingle()
  if (!t) return NextResponse.json({ error: 'Therapist not found' }, { status: 403 })

  const [{ data: past }, { data: declined }] = await Promise.all([
    svc.from('bookings')
      .select('id, service_id, booking_date, time_slot, status, subtotal, customer_name, address')
      .eq('therapist_id', t.id)
      .in('status', ['completed', 'cancelled'])
      .order('booking_date', { ascending: false })
      .order('time_slot', { ascending: false })
      .limit(200),
    svc.from('therapist_responses')
      .select('booking_id, created_at, bookings(service_id, booking_date)')
      .eq('therapist_id', t.id)
      .eq('response', 'declined')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const jobs = (past ?? []).map(b => ({
    id: b.id,
    service_id: b.service_id,
    booking_date: b.booking_date,
    time_slot: b.time_slot,
    status: b.status,
    customer_name: b.customer_name,
    address: b.address,
    payout: b.status === 'completed' ? Math.round((b.subtotal ?? 0) * THERAPIST_PAYOUT_RATE) : 0,
  }))

  const declinedList = (declined ?? []).map(r => {
    const bk = Array.isArray(r.bookings) ? r.bookings[0] : r.bookings
    return {
      booking_id: r.booking_id,
      declined_at: r.created_at,
      service_id: bk?.service_id ?? null,
      booking_date: bk?.booking_date ?? null,
    }
  })

  const completed = jobs.filter(j => j.status === 'completed')
  const summary = {
    completedCount: completed.length,
    cancelledCount: jobs.filter(j => j.status === 'cancelled').length,
    declinedCount:  declinedList.length,
    totalEarned:    completed.reduce((s, j) => s + j.payout, 0),
  }

  return NextResponse.json({ jobs, declined: declinedList, summary })
}
