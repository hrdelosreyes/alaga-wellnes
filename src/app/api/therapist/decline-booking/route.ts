import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Therapist declines a booking → unassign so admin can reassign. Server-side
// (service role) because it nulls therapist_id, which a scoped RLS update
// policy would reject.
export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json()
    if (!bookingId) return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })

    const authed = await createClient()
    const { data: { user } } = await authed.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const svc = await createServiceClient()
    const { data: therapist } = await svc
      .from('therapists').select('id').eq('email', user.email).maybeSingle()
    if (!therapist) return NextResponse.json({ error: 'Therapist not found' }, { status: 403 })

    const { data: booking } = await svc
      .from('bookings').select('id, therapist_id').eq('id', bookingId).maybeSingle()
    if (!booking || booking.therapist_id !== therapist.id) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    await svc.from('bookings').update({ therapist_id: null, status: 'confirmed' }).eq('id', bookingId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('decline-booking error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
