import { NextRequest, NextResponse } from 'next/server'

// Sends a password-reset email via Supabase's /auth/v1/recover REST endpoint
// (server-side). This produces an IMPLICIT (hash) recovery link — no PKCE
// verifier to lose — matching the therapist invite flow. The set-password
// pages read the session straight from the URL hash.

const PORTAL_REDIRECT: Record<string, string> = {
  admin:     '/admin/reset-password',
  therapist: '/therapist/reset-password',
  account:   '/account/reset-password',
}

export async function POST(req: NextRequest) {
  try {
    const { email, portal } = await req.json()
    if (!email || !portal || !PORTAL_REDIRECT[portal]) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')
    const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? 'https://alagawellness.care'
    const redirectTo  = `${appUrl}${PORTAL_REDIRECT[portal]}`

    // GoTrue reads redirect_to from the QUERY STRING, not the JSON body.
    const recoverUrl = `${supabaseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`
    const res = await fetch(recoverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ email }),
    })

    // Supabase returns 200 even when the email doesn't exist (to avoid leaking
    // which addresses are registered). Treat any 2xx as success.
    if (!res.ok) {
      const body = await res.text()
      console.error('send-reset error:', res.status, body)
      // Don't leak details to the client.
      return NextResponse.json({ error: 'Could not send reset email. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('send-reset exception:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
