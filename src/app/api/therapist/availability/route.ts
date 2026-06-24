import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Therapist blocks/unblocks a date (day off). Opt-out model: a blocked row
// = day off; no row = available by default. Writes via service role after
// verifying the therapist owns the request (therapist_availability has no
// therapist-write RLS policy).
export async function POST(req: NextRequest) {
  try {
    const { date, blocked } = await req.json()
    if (!date || typeof blocked !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const authed = await createClient()
    const { data: { user } } = await authed.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const svc = await createServiceClient()
    const { data: therapist } = await svc
      .from('therapists')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()
    if (!therapist) return NextResponse.json({ error: 'Therapist not found' }, { status: 403 })

    if (blocked) {
      const { error } = await svc
        .from('therapist_availability')
        .upsert(
          { therapist_id: therapist.id, date, is_blocked: true },
          { onConflict: 'therapist_id,date' },
        )
      if (error) throw error
    } else {
      // Remove the row → revert to default-available.
      const { error } = await svc
        .from('therapist_availability')
        .delete()
        .eq('therapist_id', therapist.id)
        .eq('date', date)
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('availability error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
