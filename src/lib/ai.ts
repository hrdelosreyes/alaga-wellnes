import Anthropic from '@anthropic-ai/sdk'

// Customer-facing features (concierge, coach, suggested replies)
export const AI_MODEL = 'claude-sonnet-4-6'

// Background classification/summarization (moderation, review blurbs) —
// Haiku is ~3x cheaper and plenty capable for these.
export const AI_MODEL_FAST = 'claude-haiku-4-5'

// Lazy singleton so a missing key surfaces as a clear, catchable error inside
// route handlers (with a helpful log line) instead of crashing module load.
let client: Anthropic | null = null

export function getAnthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set — add it in Vercel → Project → Settings → Environment Variables (Production) and redeploy')
    }
    client = new Anthropic({ apiKey })
  }
  return client
}

// Concatenate the text blocks of a Claude response.
export function messageText(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim()
}

// Parse a JSON payload from a Claude response, tolerating ```json fences.
export function parseJsonResponse<T>(raw: string): T {
  const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(json) as T
}
