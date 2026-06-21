import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { bookingId, therapistId, stars, tags, reviewText } = await req.json()

    if (!bookingId || !stars || stars < 1 || stars > 5) {
      return NextResponse.json({ error: 'Invalid rating data' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Verify booking exists and is completed
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, status, customer_id')
      .eq('id', bookingId)
      .single()

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }
    if (booking.status !== 'completed') {
      return NextResponse.json({ error: 'Booking is not completed' }, { status: 400 })
    }

    // Prevent duplicate ratings
    const { data: existing } = await supabase
      .from('ratings')
      .select('id')
      .eq('booking_id', bookingId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already rated' }, { status: 409 })
    }

    const { error } = await supabase
      .from('ratings')
      .insert({
        booking_id:   bookingId,
        customer_id:  booking.customer_id ?? null,
        therapist_id: therapistId ?? null,
        stars,
        tags:         tags ?? [],
        review_text:  reviewText ?? null,
      })

    if (error) {
      console.error('Rating insert error:', error)
      return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Rating error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
