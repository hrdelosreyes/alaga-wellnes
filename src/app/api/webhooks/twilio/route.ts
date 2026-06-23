import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendSms, smsBookingAccepted } from '@/lib/sms'
import { sendEmail, emailTherapistAssigned } from '@/lib/email'
import { formatDate, formatTime } from '@/lib/utils'
import { SERVICES } from '@/lib/constants'

export async function POST(req: NextRequest) {
  try {
    const body   = await req.text()
    const params = new URLSearchParams(body)

    const from = params.get('From') ?? ''
    const text = (params.get('Body') ?? '').trim().toUpperCase()

    if (!from) return twiml('')

    const supabase = await createServiceClient()

    // Look up therapist by phone
    const { data: therapist } = await supabase
      .from('therapists')
      .select('id, name')
      .eq('phone', from)
      .single()

    if (!therapist) return twiml('')

    const firstName = therapist.name.split(' ')[0]
    const today     = new Date().toISOString().slice(0, 10)

    // ── ACCEPT ──────────────────────────────────────────────────
    if (text === 'ACCEPT') {
      const { data: booking } = await supabase
        .from('bookings')
        .select('id, status, booking_date, time_slot, service_id, customer_name, customer_email')
        .eq('therapist_id', therapist.id)
        .eq('booking_date', today)
        .in('status', ['confirmed'])
        .order('time_slot', { ascending: true })
        .limit(1)
        .single()

      if (!booking) {
        return twiml(`Hi ${firstName}, no pending booking found for today. Please log in to the app to check your schedule.`)
      }

      await supabase
        .from('bookings')
        .update({ status: 'assigned' })
        .eq('id', booking.id)

      try {
        await sendSms(from, smsBookingAccepted({ firstName }))
      } catch (err) {
        console.error('Accepted SMS failed:', err)
      }

      // Email the customer that their therapist is confirmed
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

      return twiml(`Got it ${firstName}! Booking accepted.`)
    }

    // ── DECLINE ─────────────────────────────────────────────────
    if (text === 'DECLINE') {
      const { data: booking } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('therapist_id', therapist.id)
        .eq('booking_date', today)
        .in('status', ['confirmed'])
        .order('time_slot', { ascending: true })
        .limit(1)
        .single()

      if (!booking) {
        return twiml(`Hi ${firstName}, no pending booking to decline for today.`)
      }

      // Unassign therapist so admin can reassign
      await supabase
        .from('bookings')
        .update({ therapist_id: null, status: 'confirmed' })
        .eq('id', booking.id)

      return twiml(`Understood ${firstName}, you've been unassigned. Our team will reassign the booking. Thank you for letting us know!`)
    }

    // ── IN ───────────────────────────────────────────────────────
    if (text === 'IN') {
      const { data: booking } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('therapist_id', therapist.id)
        .eq('booking_date', today)
        .in('status', ['assigned', 'confirmed', 'en_route'])
        .order('time_slot', { ascending: true })
        .limit(1)
        .single()

      if (!booking) {
        return twiml(`Hi ${firstName}, no active booking found for today. Please log in to the app if you need help.`)
      }

      await supabase
        .from('bookings')
        .update({ status: 'checked_in', checked_in_at: new Date().toISOString() })
        .eq('id', booking.id)

      return twiml(`Checked in! ${firstName}, enjoy the session. Reply OUT when you're done.`)
    }

    // ── OUT ──────────────────────────────────────────────────────
    if (text === 'OUT') {
      const { data: booking } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('therapist_id', therapist.id)
        .eq('booking_date', today)
        .eq('status', 'checked_in')
        .order('time_slot', { ascending: true })
        .limit(1)
        .single()

      if (!booking) {
        return twiml(`Hi ${firstName}, no session in progress found. Please log in to the app if you need help.`)
      }

      await supabase
        .from('bookings')
        .update({ status: 'completed', checked_out_at: new Date().toISOString() })
        .eq('id', booking.id)

      return twiml(`Session complete! Great work today ${firstName}. Thank you!`)
    }

    // ── UNRECOGNISED ─────────────────────────────────────────────
    return twiml(`Hi ${firstName}! Valid replies: ACCEPT (new booking), DECLINE (pass), IN (arrived), OUT (session done).`)

  } catch (err) {
    console.error('Twilio inbound error:', err)
    return twiml('')
  }
}

function twiml(message: string) {
  const xml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`

  return new NextResponse(xml, { headers: { 'Content-Type': 'text/xml' } })
}
