import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

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
        .single()
      if (band && (subtotal < band.min_rate || subtotal > band.max_rate)) {
        return NextResponse.json({ error: 'Price is outside the allowed range for this city.' }, { status: 400 })
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
      // TEMP DEBUG: surface the real DB error so we can diagnose in the browser
      return NextResponse.json({
        error: 'Failed to create booking',
        debug: {
          message: bookingError.message,
          details: bookingError.details,
          hint:    bookingError.hint,
          code:    bookingError.code,
        },
      }, { status: 500 })
    }

    // Create HitPay payment request
    const hitpayMode = process.env.NEXT_PUBLIC_HITPAY_MODE ?? 'sandbox'
    const hitpayBase = hitpayMode === 'sandbox'
      ? 'https://api.sandbox.hit-pay.com/v1'
      : 'https://api.hit-pay.com/v1'

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const hitpayRes = await fetch(`${hitpayBase}/payment-requests`, {
      method: 'POST',
      headers: {
        'X-BUSINESS-API-KEY': process.env.HITPAY_API_KEY!,
        'Content-Type':       'application/json',
      },
      body: JSON.stringify({
        amount:       total.toFixed(2), // pesos as decimal string, e.g. "1200.00"
        currency:     'PHP',
        name:         'Alaga Wellness Booking',
        description:  `Booking #${booking.id.slice(0, 8).toUpperCase()} — ${serviceId}`,
        redirect_url: `${appUrl}/booking/${booking.id}?payment=success`,
        webhook:      `${appUrl}/api/webhooks/hitpay`,
        reference_number: booking.id,
        // Philippine payment methods (GCash, Maya, card). Omit to let HitPay
        // show all methods enabled for the merchant account.
        payment_methods: ['gcash', 'paymaya', 'card'],
      }),
    })

    if (!hitpayRes.ok) {
      const err = await hitpayRes.text()
      console.error('HitPay error:', err)
      // Still return booking ID so we can show confirmation even if payment link fails
      return NextResponse.json({
        error: 'Payment gateway error — please try again',
        bookingId: booking.id,
        debug: err, // TEMP
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
