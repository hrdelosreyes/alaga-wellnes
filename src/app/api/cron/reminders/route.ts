import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail, emailBookingReminder } from '@/lib/email'
import { formatDate, formatTime } from '@/lib/utils'
import { SERVICES } from '@/lib/constants'

// Daily cron (configured in vercel.json) — emails customers whose
// confirmed/assigned session is TODAY or TOMORROW (Asia/Manila) and hasn't
// been reminded yet. Idempotent via `reminder_sent_at` so each booking is
// reminded exactly once. Covering both days closes the gap on same-day and
// late bookings that a tomorrow-only query would miss (Hobby plan = 1 run/day).

export async function GET(req: NextRequest) {
  // Protect: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    // Today & tomorrow in Asia/Manila (UTC+8), as YYYY-MM-DD
    const phToday = new Date(Date.now() + 8 * 60 * 60 * 1000)
    const today = phToday.toISOString().slice(0, 10)
    const phTomorrow = new Date(phToday)
    phTomorrow.setUTCDate(phTomorrow.getUTCDate() + 1)
    const tomorrow = phTomorrow.toISOString().slice(0, 10)

    const supabase = await createServiceClient()

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, booking_date, time_slot, address, service_id, customer_name, customer_email, reminder_sent_at, therapists(name)')
      .in('booking_date', [today, tomorrow])
      .in('status', ['confirmed', 'assigned'])
      .is('reminder_sent_at', null)
      .not('customer_email', 'is', null)

    if (error) {
      console.error('Reminder query error:', error)
      return NextResponse.json({ error: 'Query failed' }, { status: 500 })
    }

    let sent = 0
    for (const b of bookings ?? []) {
      const service   = SERVICES.find(s => s.id === b.service_id)
      const therapist = b.therapists as unknown as { name: string } | null
      const { subject, html } = emailBookingReminder({
        firstName:     (b.customer_name ?? '').split(' ')[0] || 'there',
        bookingId:     b.id,
        therapistName: therapist?.name ?? null,
        serviceName:   service?.name ?? b.service_id,
        date:          formatDate(b.booking_date),
        time:          formatTime(b.time_slot),
        address:       b.address,
        whenLabel:     b.booking_date === today ? 'today' : 'tomorrow',
      })
      const ok = await sendEmail({ to: b.customer_email as string, subject, html })
      if (ok) {
        await supabase
          .from('bookings')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', b.id)
        sent++
      }
    }

    return NextResponse.json({ success: true, today, tomorrow, candidates: bookings?.length ?? 0, sent })
  } catch (err) {
    console.error('Reminder cron error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
