import type { SupabaseClient } from '@supabase/supabase-js'
import { getAnthropic, AI_MODEL_FAST, messageText, parseJsonResponse } from '@/lib/ai'

export type ModerationInput = {
  source: 'message' | 'review'
  text: string
  bookingId?: string | null
  ratingId?: string | null
  therapistId?: string | null
  sender?: 'customer' | 'therapist' | null
}

type Verdict = {
  category: 'off_platform_payment' | 'sexual_or_harassment' | 'safety_concern' | 'scam_or_spam' | 'none'
  severity: 'low' | 'medium' | 'high'
  reason: string
}

// Classifies a chat message or review and records a moderation flag when it
// finds a problem. Best-effort: throws nothing, blocks nothing.
export async function moderateContent(svc: SupabaseClient, input: ModerationInput): Promise<void> {
  const text = input.text?.trim()
  if (!text) return

  try {
    const message = await getAnthropic().messages.create({
      model: AI_MODEL_FAST,
      max_tokens: 200,
      system: `You are a trust & safety classifier for Alaga Wellness, a Philippine home-service massage platform where vetted therapists visit customers' homes. Classify the given ${input.source === 'review' ? 'customer review' : 'chat message between customer and therapist'}.

Categories:
- off_platform_payment: arranging payment or future bookings OUTSIDE the platform (cash deals to skip fees, "direct na lang tayo next time", sharing GCash/bank details to bypass the app)
- sexual_or_harassment: sexual requests or innuendo, harassment, threats, discrimination
- safety_concern: someone appears unsafe, scared, coerced, injured, or describes dangerous conditions
- scam_or_spam: phishing links, impersonation, obvious spam
- none: normal, harmless content (greetings, directions, session logistics, ordinary complaints or praise)

Notes: exchanging addresses, arrival times, and parking details is NORMAL for home service. Ordinary negative feedback ("late", "pressure too soft") is none. Tagalog/Taglish content is common — judge meaning, not language.

Return ONLY JSON: {"category": "...", "severity": "low|medium|high", "reason": "one short sentence"}`,
      messages: [{ role: 'user', content: text.slice(0, 2000) }],
    })

    const verdict = parseJsonResponse<Verdict>(messageText(message))
    const valid = ['off_platform_payment', 'sexual_or_harassment', 'safety_concern', 'scam_or_spam']
    if (!verdict || !valid.includes(verdict.category)) return

    await svc.from('moderation_flags').insert({
      source:       input.source,
      booking_id:   input.bookingId ?? null,
      rating_id:    input.ratingId ?? null,
      therapist_id: input.therapistId ?? null,
      sender:       input.sender ?? null,
      category:     verdict.category,
      severity:     ['low', 'medium', 'high'].includes(verdict.severity) ? verdict.severity : 'medium',
      reason:       String(verdict.reason ?? '').slice(0, 300) || 'Flagged by AI moderation',
      excerpt:      text.slice(0, 500),
    })
  } catch (err) {
    console.error('moderation error:', err)
  }
}
