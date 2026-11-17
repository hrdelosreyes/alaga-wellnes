import { NextRequest, NextResponse } from 'next/server'
import { AuthError, consumeOneTimeToken, safeNext, setSessionCookie } from '@/lib/auth/server'

// Landing endpoint for emailed links (password reset, therapist invite,
// signup confirmation): /auth/callback?token=…&next=/path
// Consumes the one-time token, signs the user in, and redirects to `next`.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const next  = safeNext(searchParams.get('next'), '/')

  if (!token) return NextResponse.redirect(new URL('/', req.url))

  try {
    const { user } = await consumeOneTimeToken(token)
    await setSessionCookie(user)
    return NextResponse.redirect(new URL(next, req.url))
  } catch (e) {
    const msg = e instanceof AuthError ? e.message : 'Something went wrong verifying your link'
    const dest = new URL(next, req.url)
    dest.searchParams.set('error_description', msg)
    return NextResponse.redirect(dest)
  }
}
