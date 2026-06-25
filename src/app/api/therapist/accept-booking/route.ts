import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail, emailTherapistAssigned } from '@/lib/email'
import { formatDate, formatTime } from '@/lib/utils'
import { SERVICES } from '@/lib/constants'

// Therapist accepts a booking from the dashboard → mark assigned + email the
// customer that their therapist is confirmed. (Replaces the old SMS ACCEPT.)
export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json()
    if (!bookingId) return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })

    // Authenticate the therapist via their session cookie.
    const authed = await createClient()
    const { data: { user } } = await authed.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const svc = await createServiceClient()
    const { data: therapist } = await svc
      .from('therapists')
      .select('id, name')
      .eq('email', user.email)
      .maybeSingle()
    if (!therapist) return NextResponse.json({ error: 'Therapist not found' }, { status: 403 })

    // Verify the booking is theirs and awaiting acceptance.
    const { data: booking } = await svc
      .from('bookings')
      .select('id, therapist_id, status, booking_date, time_slot, service_id, customer_name, customer_email')
      .eq('id', bookingId)
      .maybeSingle()
    if (!booking || booking.therapist_id !== therapist.id) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }
    if (booking.status !== 'confirmed') {
      return NextResponse.json({ error: 'Booking is no longer awaiting acceptance' }, { status: 409 })
    }

    await svc.from('bookings').update({ status: 'assigned' }).eq('id', bookingId)

    // Log the response for acceptance-rate tracking.
    await svc.from('therapist_responses').insert({
      therapist_id: therapist.id, booking_id: booking.id, response: 'accepted',
    })

    // Notify the customer.
    if (booking.customer_email) {
      const service = SERVICES.find(s => s.id === booking.service_id)
      const { subject, html } = emailTherapistAssigned({
        firstName:     (booking.customer_name ?? '').split(' ')[0] || 'there',
        bookingId:     booking.id,
        therapistName: therapist.name,
        serviceName:   service?.name ?? booking.service_id,
        date:          formatDate(booking.booking_date),
        time:          formatTime(booking.time_slot),
      })
      await sendEmail({ to: booking.customer_email, subject, html })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('accept-booking error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
