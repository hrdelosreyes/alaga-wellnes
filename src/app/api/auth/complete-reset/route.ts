import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Completes a password reset reliably. The client sends the recovery session's
// access token (proof the user clicked the email link) + the new password.
// We validate the token to identify the user, then set the password via the
// Admin API — which actually persists, unlike client updateUser() on a recovery
// session in this setup.

export async function POST(req: NextRequest) {
  try {
    const { accessToken, password } = await req.json()
    if (!accessToken || !password || password.length < 8) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')
    const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // Validate the access token and resolve the user.
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { 'apikey': anonKey, 'Authorization': `Bearer ${accessToken}` },
    })
    if (!userRes.ok) {
      return NextResponse.json({ error: 'Your reset link has expired. Please request a new one.' }, { status: 401 })
    }
    const user = await userRes.json() as { id: string; email: string }
    if (!user?.id) {
      return NextResponse.json({ error: 'Could not verify your reset link.' }, { status: 401 })
    }

    // Set the password via the Admin API (reliably persists).
    const supabase = await createServiceClient()
    const { error } = await supabase.auth.admin.updateUserById(user.id, { password })
    if (error) {
      console.error('complete-reset updateUserById error:', error)
      return NextResponse.json({ error: 'Could not update password. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('complete-reset exception:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
