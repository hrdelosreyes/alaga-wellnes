import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createReferralCommissions } from '@/lib/referral'
import { recordBonusContribution } from '@/lib/bonus'

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json()
    if (!bookingId) return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })

    const supabase = await createServiceClient()

    // Fetch the booking to get therapist and subtotal
    const { data: booking, error } = await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', bookingId)
      .select('therapist_id, subtotal')
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Calculate referral commissions + record Alaga Bonus contribution
    if (booking.therapist_id && booking.subtotal) {
      await Promise.all([
        createReferralCommissions(supabase, bookingId, booking.therapist_id, booking.subtotal),
        recordBonusContribution(supabase, bookingId, booking.therapist_id, booking.subtotal),
      ])
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('complete booking error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
