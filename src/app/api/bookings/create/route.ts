import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { SERVICES } from '@/lib/constants'

const TRAVEL_BUFFER = 30 // minutes between sessions for the same therapist
const slotToMins = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      customerId, serviceId, date, timeSlot, address, unitNotes,
      cityId, barangayPsgc,
      therapistId, selectionMode, genderPreference,
      customerName, customerPhone, customerEmail, customerNotes,
      subtotal, transportFee, total,
    } = body

    if (!serviceId || !date || !timeSlot || !address) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Server-side: validate submitted price is within the city's allowed band
    if (cityId && subtotal) {
      const { data: band } = await supabase
        .from('city_service_rates')
        .select('min_rate, max_rate')
        .eq('city_id', cityId)
        .eq('service_id', serviceId)
        .maybeSingle()
      if (band && (subtotal < band.min_rate || subtotal > band.max_rate)) {
        return NextResponse.json({ error: 'Price is outside the allowed range for this city.' }, { status: 400 })
      }
    }

    // Double-booking guard: if a specific therapist was chosen, ensure they
    // aren't already booked (with a travel buffer) at the requested time.
    if (therapistId) {
      const { data: existing } = await supabase
        .from('bookings')
        .select('time_slot, service_id')
        .eq('therapist_id', therapistId)
        .eq('booking_date', date)
        .in('status', ['confirmed', 'assigned', 'en_route', 'checked_in'])

      const reqDur   = SERVICES.find(s => s.id === serviceId)?.duration ?? 60
      const reqStart = slotToMins(timeSlot)
      const reqEnd   = reqStart + reqDur

      const conflict = (existing ?? []).some(b => {
        if (!b.time_slot) return false
        const bDur   = SERVICES.find(s => s.id === b.service_id)?.duration ?? 60
        const bStart = slotToMins(b.time_slot)
        const bEnd   = bStart + bDur
        // Need at least TRAVEL_BUFFER between the two sessions.
        return reqStart < bEnd + TRAVEL_BUFFER && reqEnd + TRAVEL_BUFFER > bStart
      })

      if (conflict) {
        return NextResponse.json(
          { error: 'This therapist was just booked for that time. Please choose another slot or therapist.' },
          { status: 409 },
        )
      }
    }

    // Create booking record
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        customer_id:              customerId ?? null,
        service_id:               serviceId,
        therapist_id:             therapistId ?? null,
        booking_date:             date,
        time_slot:                timeSlot,
        address,
        unit_notes:               unitNotes ?? null,
        therapist_gender_pref:    genderPreference ?? 'any',
        customer_name:            customerName ?? null,
        customer_phone:           customerPhone ?? null,
        customer_email:           customerEmail ?? null,
        customer_notes:           customerNotes ?? null,
        city_id:                  cityId ?? null,
        barangay_psgc:            barangayPsgc ?? null,
        transport_fee:            transportFee,
        subtotal,
        discount:                 0,
        total,
        status:                   'pending_payment',
        therapist_selection_mode: selectionMode ?? 'best_available',
        payment_status:           'pending',
        // Hold slot for 10 minutes if specific therapist chosen
        slot_held_until: therapistId
          ? new Date(Date.now() + 10 * 60 * 1000).toISOString()
          : null,
      })
      .select()
      .single()

    if (bookingError) {
      console.error('Booking insert error:', bookingError)
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }

    // Create HitPay payment request
    const hitpayMode = process.env.NEXT_PUBLIC_HITPAY_MODE ?? 'sandbox'
    const isSandbox  = hitpayMode === 'sandbox'
    const hitpayBase = isSandbox
      ? 'https://api.sandbox.hit-pay.com/v1'
      : 'https://api.hit-pay.com/v1'

    // HitPay sandbox is a Singapore environment (SGD + PayNow). Production is
    // the live PH account (PHP + GCash/Maya). Use the right pair per mode.
    const hitpayCurrency = isSandbox ? 'SGD' : 'PHP'
    const hitpayMethods  = isSandbox
      ? ['paynow_online']
      : ['gcash', 'paymaya', 'card']

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const hitpayRes = await fetch(`${hitpayBase}/payment-requests`, {
      method: 'POST',
      headers: {
        'X-BUSINESS-API-KEY': process.env.HITPAY_API_KEY!,
        'Content-Type':       'application/json',
      },
      body: JSON.stringify({
        amount:       total.toFixed(2), // decimal string, e.g. "1200.00"
        currency:     hitpayCurrency,
        name:         'Alaga Wellness Booking',
        description:  `Booking #${booking.id.slice(0, 8).toUpperCase()} — ${serviceId}`,
        redirect_url: `${appUrl}/booking/${booking.id}?payment=success`,
        webhook:      `${appUrl}/api/webhooks/hitpay`,
        reference_number: booking.id,
        payment_methods: hitpayMethods,
      }),
    })

    if (!hitpayRes.ok) {
      const err = await hitpayRes.text()
      console.error('HitPay error:', err)
      // Still return booking ID so we can show confirmation even if payment link fails
      return NextResponse.json({
        error: 'Payment gateway error — please try again',
        bookingId: booking.id,
      }, { status: 502 })
    }

    const hitpay = await hitpayRes.json()

    // Store payment request ID on booking
    await supabase
      .from('bookings')
      .update({ hitpay_payment_request_id: hitpay.id })
      .eq('id', booking.id)

    return NextResponse.json({
      bookingId:   booking.id,
      checkoutUrl: hitpay.url,
    })

  } catch (err) {
    console.error('Create booking error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
