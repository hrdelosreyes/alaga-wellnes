import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/db/server'
import { createOneTimeToken, createUser, findUserByEmail, verifyLink } from '@/lib/auth/server'
import { sendEmail, emailTherapistInvite } from '@/lib/email'

export async function POST(req: NextRequest) {
  const authed = await createClient()
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = await createServiceClient()
  const { data: role } = await svc.from('user_roles').select('role').eq('user_id', user.id).maybeSingle()
  if (role?.role !== 'admin' && role?.role !== 'staff') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { therapistId, email, name } = await req.json()
    if (!therapistId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create the therapist's login (no password yet) if it doesn't exist,
    // then email a one-time link that signs them in on /therapist/set-password.
    // Existing accounts get the same kind of link, which works as a reset.
    let account = await findUserByEmail(email)
    if (!account) {
      account = await createUser({ email, password: null, metadata: { therapistId, name }, confirmed: false })
    }
    const token = await createOneTimeToken(account.id, 'invite', 60 * 60 * 24 * 7)
    const sent  = await sendEmail({
      to: account.email ?? email,
      ...emailTherapistInvite({ name, link: verifyLink(token, '/therapist/set-password') }),
    })
    if (!sent) {
      return NextResponse.json({ error: 'Could not send the invite email. Check RESEND_API_KEY.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('invite-therapist error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
