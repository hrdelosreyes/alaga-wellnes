import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Use the implicit (hash) flow for email links (password reset / invite).
      // It returns tokens directly in the URL hash, so there's no PKCE code
      // verifier that must survive the email round-trip — far more reliable
      // when the link redirects through the site root before reaching the
      // set-password page.
      auth: { flowType: 'implicit' },
    }
  )
}
