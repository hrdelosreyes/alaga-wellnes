import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail, emailBookingConfirmed } from '@/lib/email'
import { formatDate, formatTime, formatPrice } from '@/lib/utils'
import { SERVICES } from '@/lib/constants'

// HitPay sends a POST with form-encoded body and an HMAC signature
export async function POST(req: NextRequest) {
  try {
    const body   = await req.text()
    const params = new URLSearchParams(body)

    // Verify HMAC signature
    const receivedHmac = params.get('hmac') ?? ''
    params.delete('hmac')

    // Sort keys alphabetically, join as key=value pairs, then HMAC-SHA256
    const message = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}${v}`)
      .join('')

    const expectedHmac = createHmac('sha256', process.env.HITPAY_SALT!)
      .update(message)
      .digest('hex')

    if (receivedHmac !== expectedHmac) {
      console.error('HitPay webhook HMAC mismatch')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const status           = params.get('status')
    const referenceNumber  = params.get('reference_number')  // our booking ID
    const paymentId        = params.get('payment_id')

    if (!referenceNumber) {
      return NextResponse.json({ error: 'Missing reference_number' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    if (status === 'completed') {
      await supabase
        .from('bookings')
        .update({
          payment_status:    'paid',
          status:            'confirmed',
          hitpay_payment_id: paymentId,
        })
        .eq('id', referenceNumber)

      // Fetch booking to email the customer a confirmation. The assigned
      // therapist is alerted via the dashboard (polling + sound), not SMS.
      const { data: booking } = await supabase
        .from('bookings')
        .select('id, booking_date, time_slot, address, service_id, total, customer_name, customer_email')
        .eq('id', referenceNumber)
        .single()

      // Email the customer a booking confirmation
      if (booking?.customer_email) {
        const service = SERVICES.find(s => s.id === booking.service_id)
        const { subject, html } = emailBookingConfirmed({
          firstName:   (booking.customer_name ?? '').split(' ')[0] || 'there',
          bookingId:   booking.id,
          serviceName: service?.name ?? booking.service_id,
          date:        formatDate(booking.booking_date),
          time:        formatTime(booking.time_slot),
          address:     booking.address,
          total:       formatPrice(booking.total),
        })
        await sendEmail({ to: booking.customer_email, subject, html })
      }

    } else if (status === 'failed') {
      await supabase
        .from('bookings')
        .update({ payment_status: 'pending', status: 'pending_payment' })
        .eq('id', referenceNumber)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('HitPay webhook error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
