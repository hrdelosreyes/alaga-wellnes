// Allow up to 60s — Claude calls can exceed Vercel's 10s default function limit
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getAnthropic, AI_MODEL, messageText, parseJsonResponse } from '@/lib/ai'
import { SERVICES, BOOKING_STATUSES } from '@/lib/constants'

// Suggests short professional chat replies for a therapist's booking thread.
export async function POST(req: NextRequest) {
  const authed = await createClient()
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = await createServiceClient()
  const { data: t } = await svc.from('therapists').select('id').eq('email', user.email).maybeSingle()
  if (!t) return NextResponse.json({ error: 'Therapist not found' }, { status: 403 })

  try {
    const { bookingId } = await req.json()
    if (!bookingId) return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })

    const { data: booking } = await svc
      .from('bookings')
      .select('id, therapist_id, service_id, booking_date, time_slot, status')
      .eq('id', bookingId)
      .maybeSingle()

    if (!booking || booking.therapist_id !== t.id) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const { data: msgs } = await svc
      .from('messages')
      .select('sender, body')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(10)

    const thread = (msgs ?? [])
      .reverse()
      .map(m => `${m.sender === 'therapist' ? 'Me (therapist)' : 'Client'}: ${m.body.slice(0, 300)}`)
      .join('\n')

    const service = SERVICES.find(s => s.id === booking.service_id)
    const statusLabel = BOOKING_STATUSES[booking.status as keyof typeof BOOKING_STATUSES] ?? booking.status

    const message = await getAnthropic().messages.create({
      model: AI_MODEL,
      max_tokens: 300,
      system: `You suggest chat replies for a massage therapist messaging a client on Alaga Wellness (Philippine home-service massage). Given the booking context and conversation, propose 3 short replies the therapist could send next.

Rules:
- Each reply under 120 characters, friendly and professional. Taglish is fine if the client uses it.
- Make them meaningfully different (e.g. confirm/answer, give an update, ask a helpful question).
- Never promise anything off-platform (no cash deals, no direct bookings outside the app) and never share personal contact details.
- If there are no messages yet, suggest good opening messages (greeting, confirming the schedule, asking about the space/parking).
- Return ONLY a JSON array of 3 strings, no other text.`,
      messages: [{
        role: 'user',
        content: `Booking: ${service?.name ?? booking.service_id} on ${booking.booking_date} at ${booking.time_slot} — status: ${statusLabel}\n\nConversation so far:\n${thread || '(no messages yet)'}`,
      }],
    })

    let suggestions: string[]
    try {
      suggestions = parseJsonResponse<string[]>(messageText(message))
    } catch {
      return NextResponse.json({ error: 'Could not generate suggestions' }, { status: 502 })
    }
    if (!Array.isArray(suggestions)) {
      return NextResponse.json({ error: 'Could not generate suggestions' }, { status: 502 })
    }

    suggestions = suggestions
      .filter((s): s is string => typeof s === 'string' && !!s.trim())
      .map(s => s.trim().slice(0, 160))
      .slice(0, 3)

    return NextResponse.json({ suggestions })
  } catch (err) {
    console.error('suggest-replies error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
