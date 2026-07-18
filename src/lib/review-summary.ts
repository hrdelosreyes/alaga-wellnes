import type { SupabaseClient } from '@supabase/supabase-js'
import { getAnthropic, AI_MODEL_FAST, messageText } from '@/lib/ai'

const MIN_RATINGS = 3

// Regenerates the therapist's "What customers say" blurb from their ratings.
// Best-effort: throws nothing, blocks nothing.
export async function refreshReviewSummary(svc: SupabaseClient, therapistId: string): Promise<void> {
  try {
    const { data: ratings } = await svc
      .from('ratings')
      .select('stars, tags, review_text')
      .eq('therapist_id', therapistId)
      .order('created_at', { ascending: false })
      .limit(50)

    const rs = ratings ?? []
    if (rs.length < MIN_RATINGS) return

    const avg = Math.round((rs.reduce((s, r) => s + r.stars, 0) / rs.length) * 10) / 10
    const tagCounts: Record<string, number> = {}
    for (const r of rs) for (const tag of (r.tags ?? [])) tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
    const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t)
    const texts = rs.filter(r => r.review_text).slice(0, 20).map(r => `${r.stars}★ "${r.review_text!.slice(0, 250)}"`)

    const message = await getAnthropic().messages.create({
      model: AI_MODEL_FAST,
      max_tokens: 150,
      system: `You summarize customer reviews of a home-service massage therapist into ONE short "What customers say" blurb (max 2 sentences, under 40 words) shown on their public profile.

Rules:
- Only state what the reviews actually support. Warm, concrete, third person ("Clients praise her thorough back work…" — use "Clients" as the subject, no names, no pronoun guessing: say "Clients love the…" style if gender is unknown).
- No star numbers, no counts, no superlatives that reviews don't back up.
- If reviews are mixed, emphasize genuine positives honestly without hiding weaknesses behind hype.
- Return ONLY the blurb text, nothing else.`,
      messages: [{
        role: 'user',
        content: `Average: ${avg} stars across ${rs.length} ratings.\nTop tags: ${topTags.join(', ') || 'none'}\nWritten reviews:\n${texts.join('\n') || '(none — use the tags)'}`,
      }],
    })

    const summary = messageText(message).slice(0, 300)
    if (!summary) return

    await svc
      .from('therapists')
      .update({ review_summary: summary, review_summary_updated_at: new Date().toISOString() })
      .eq('id', therapistId)
  } catch (err) {
    console.error('review summary error:', err)
  }
}
