import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, setPassword, setSessionCookie } from '@/lib/auth/server'

// Completes a password reset. The emailed link (/auth/callback) has already
// signed the user in, so the session cookie identifies who is resetting.
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Your reset link has expired. Please request a new one.' }, { status: 401 })
    }
    await setPassword(user.id, password)
    await setSessionCookie(user)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('complete-reset exception:', err)
    return NextResponse.json({ error: 'Could not update password. Please try again.' }, { status: 500 })
  }
}
