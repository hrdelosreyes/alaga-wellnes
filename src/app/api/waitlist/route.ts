import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { email, phone, city, source } = await req.json()

    if (!email && !phone) {
      return NextResponse.json({ error: 'Email or phone is required.' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    const { error } = await supabase.from('waitlist').insert({
      email:  email?.trim().toLowerCase() || null,
      phone:  phone?.trim() || null,
      city:   city?.trim() || null,
      source: source ?? 'homepage',
    })

    if (error) {
      // Unique constraint = already signed up
      if (error.code === '23505') {
        return NextResponse.json({ alreadyJoined: true })
      }
      throw error
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('waitlist error:', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
