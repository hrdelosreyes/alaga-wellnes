import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { anthropic, AI_MODEL, messageText } from '@/lib/ai'
import { SERVICES } from '@/lib/constants'

// Turns the therapist's insights stats into a short plain-language coach note.
export async function POST(req: NextRequest) {
  const authed = await createClient()
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = await createServiceClient()
  const { data: t } = await svc.from('therapists').select('id, name').eq('email', user.email).maybeSingle()
  if (!t) return NextResponse.json({ error: 'Therapist not found' }, { status: 403 })

  try {
    const insights = await req.json()
    if (!insights?.earnings || !insights?.volume) {
      return NextResponse.json({ error: 'Missing insights data' }, { status: 400 })
    }

    const serviceNames = Object.fromEntries(SERVICES.map(s => [s.id, s.name]))
    const stats = JSON.stringify({ ...insights, serviceNames }).slice(0, 6000)

    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 400,
      system: `You are a friendly business coach for home-service massage therapists on Alaga Wellness (Philippines). You are given a therapist's stats as JSON: earnings in PHP (their 75% take-home), session volume, acceptance/completion rates, per-service breakdown, repeat customers, and reviews.

Write a short coach note:
- 1-2 sentences summarizing how their business is doing (mention the most notable number).
- Then 2-3 short, concrete suggestions as lines starting with "• " (e.g. push their best-rated service, improve acceptance rate, thank repeat clients, ask happy clients for reviews).
- Warm, encouraging, plain English with a light Filipino touch (an occasional "po" or "kaya mo yan" is fine, don't overdo it).
- Under 120 words total. Plain text only, no markdown headings or bold.
- If there is very little data yet, keep it encouraging and focus on how to get their first bookings and reviews.`,
      messages: [{ role: 'user', content: `Therapist first name: ${t.name.split(' ')[0]}\nStats JSON:\n${stats}` }],
    })

    const summary = messageText(message)
    if (!summary) return NextResponse.json({ error: 'No summary generated' }, { status: 502 })

    return NextResponse.json({ summary })
  } catch (err) {
    console.error('insights summary error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
