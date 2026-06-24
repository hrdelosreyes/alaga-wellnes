import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createReferralCommissions } from '@/lib/referral'
import { recordBonusContribution } from '@/lib/bonus'

// Marks a booking completed and runs referral commissions + Alaga Bonus.
// Authorized for the booking's assigned therapist OR an admin/staff user.
export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json()
    if (!bookingId) return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })

    const authed = await createClient()
    const { data: { user } } = await authed.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createServiceClient()

    const { data: booking } = await supabase
      .from('bookings')
      .select('id, status, therapist_id, subtotal')
      .eq('id', bookingId)
      .maybeSingle()
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    // Authorize: admin/staff, or the therapist assigned to this booking.
    const { data: role } = await supabase
      .from('user_roles').select('role').eq('user_id', user.id).maybeSingle()
    const isStaff = role?.role === 'admin' || role?.role === 'staff'

    let isOwnTherapist = false
    if (!isStaff && booking.therapist_id) {
      const { data: t } = await supabase
        .from('therapists').select('id').eq('email', user.email).maybeSingle()
      isOwnTherapist = t?.id === booking.therapist_id
    }
    if (!isStaff && !isOwnTherapist) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await supabase
      .from('bookings')
      .update({ status: 'completed', checked_out_at: new Date().toISOString() })
      .eq('id', bookingId)

    if (booking.therapist_id) {
      if (booking.subtotal) {
        // Referral commissions + Alaga Bonus (both idempotent via upsert).
        await Promise.all([
          createReferralCommissions(supabase, bookingId, booking.therapist_id, booking.subtotal),
          recordBonusContribution(supabase, bookingId, booking.therapist_id, booking.subtotal),
        ])
      }
      // Keep total_bookings accurate (the rating trigger only fires on rating).
      const { count } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('therapist_id', booking.therapist_id)
        .eq('status', 'completed')
      await supabase.from('therapists').update({ total_bookings: count ?? 0 }).eq('id', booking.therapist_id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('complete booking error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
