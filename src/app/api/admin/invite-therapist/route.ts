import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { therapistId, email, name } = await req.json()
    if (!therapistId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const redirectTo  = `${process.env.NEXT_PUBLIC_APP_URL}/therapist/set-password`

    // Try invite first; if user already exists, send a password reset instead
    const inviteRes = await fetch(`${supabaseUrl}/auth/v1/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        email,
        data: { therapistId, name },
        redirect_to: redirectTo,
      }),
    })

    const inviteBody = await inviteRes.json()

    if (!inviteRes.ok) {
      // User already exists — send a password reset link instead
      if (inviteRes.status === 422) {
        const resetRes = await fetch(`${supabaseUrl}/auth/v1/recover`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ email, redirect_to: redirectTo }),
        })
        if (!resetRes.ok) {
          const resetBody = await resetRes.json()
          return NextResponse.json({ error: resetBody.msg ?? 'Failed to send reset email', code: resetRes.status }, { status: 500 })
        }
      } else {
        console.error('invite error:', inviteRes.status, JSON.stringify(inviteBody))
        return NextResponse.json({ error: inviteBody.msg ?? inviteBody.message ?? 'Invite failed', code: inviteRes.status }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('invite-therapist error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
