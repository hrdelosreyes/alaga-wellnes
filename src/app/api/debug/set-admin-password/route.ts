import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// TEMP DEBUG — sets a user's password directly via the Supabase Admin API,
// bypassing the email recovery flow. Visit:
//   /api/debug/set-admin-password?secret=alaga-temp-9271&email=...&password=...
// DELETE this file immediately after use.

const SECRET = 'alaga-temp-9271'

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('secret') !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const email    = req.nextUrl.searchParams.get('email')
  const password = req.nextUrl.searchParams.get('password')
  if (!email || !password) {
    return NextResponse.json({ error: 'Provide ?email= and ?password=' }, { status: 400 })
  }

  try {
    const supabase = await createServiceClient()

    const { data, error } = await supabase.auth.admin.listUsers()
    if (error) {
      return NextResponse.json({ error: 'listUsers failed: ' + error.message }, { status: 500 })
    }
    const user = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (!user) {
      return NextResponse.json({ error: 'User not found', emailsSeen: data.users.map(u => u.email) }, { status: 404 })
    }

    const { error: updErr } = await supabase.auth.admin.updateUserById(user.id, { password })
    if (updErr) {
      return NextResponse.json({ error: 'updateUserById failed: ' + updErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      email: user.email,
      id: user.id,
      email_confirmed_at: user.email_confirmed_at,
      message: 'Password set directly. Try logging in now.',
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
