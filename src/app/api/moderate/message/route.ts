import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { moderateContent } from '@/lib/moderation'

// Screens a just-sent chat message for safety issues. Runs after the response
// is sent and always returns a generic OK, so senders can't probe the result.
export async function POST(req: NextRequest) {
  try {
    const { bookingId, sender, body } = await req.json()

    if (!bookingId || typeof body !== 'string' || !body.trim()) {
      return NextResponse.json({ ok: true })
    }
    const senderRole = sender === 'therapist' ? 'therapist' : 'customer'

    const svc = await createServiceClient()
    const { data: booking } = await svc
      .from('bookings')
      .select('id, therapist_id')
      .eq('id', bookingId)
      .maybeSingle()

    if (!booking) return NextResponse.json({ ok: true })

    after(async () => {
      await moderateContent(svc, {
        source: 'message',
        text: body,
        bookingId: booking.id,
        therapistId: booking.therapist_id,
        sender: senderRole,
      })
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
