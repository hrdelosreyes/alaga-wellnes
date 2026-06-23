import { NextRequest, NextResponse } from 'next/server'

// TEMP DEBUG endpoint — verifies RESEND_API_KEY works from the deployed
// runtime and surfaces Resend's exact response. Visit:
//   /api/debug/test-email?to=you@email.com
// DELETE this file once email sending is confirmed.

export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get('to')
  if (!to) {
    return NextResponse.json({ error: 'Add ?to=your@email.com' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const keyPresent = !!apiKey
  const keyPreview = apiKey ? `${apiKey.slice(0, 6)}…${apiKey.slice(-4)}` : null

  if (!apiKey) {
    return NextResponse.json({
      keyPresent: false,
      message: 'RESEND_API_KEY is NOT set in this runtime environment.',
    })
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    'Alaga Wellness <bookings@alagawellness.care>',
        to:      [to],
        subject: 'Alaga test email',
        html:    '<p>This is a test from the Alaga debug endpoint. If you received this, Resend API sending works. 🎉</p>',
      }),
    })

    const body = await res.text()
    return NextResponse.json({
      keyPresent,
      keyPreview,
      resendStatus: res.status,
      resendOk:     res.ok,
      resendBody:   body,
    })
  } catch (err) {
    return NextResponse.json({
      keyPresent,
      keyPreview,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
