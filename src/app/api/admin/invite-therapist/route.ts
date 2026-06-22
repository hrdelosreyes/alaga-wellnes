import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { therapistId, email, name } = await req.json()
    if (!therapistId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const redirectTo  = `${process.env.NEXT_PUBLIC_APP_URL}/therapist/dashboard`

    const res = await fetch(`${supabaseUrl}/auth/v1/invite`, {
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

    const body = await res.json()

    if (!res.ok) {
      console.error('invite error:', res.status, JSON.stringify(body))
      return NextResponse.json({ error: body.msg ?? body.message ?? 'Invite failed', code: res.status }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('invite-therapist error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
