import Anthropic from '@anthropic-ai/sdk'

// Shared Anthropic client for all AI features (concierge, copilot, moderation).
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export const AI_MODEL = 'claude-sonnet-4-6'

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
