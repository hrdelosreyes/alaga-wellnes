import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { therapistId, email, name } = await req.json()
    if (!therapistId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/therapist/dashboard`,
      data: { therapistId, name },
    })

    if (error) {
      console.error('invite error:', JSON.stringify(error))
      return NextResponse.json({ error: error.message, code: error.status }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('invite-therapist error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
