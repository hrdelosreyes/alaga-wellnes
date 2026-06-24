import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Public read of a single booking by its UUID (the UUID is the access token).
// Used by the customer confirmation + rating pages so the `bookings` table can
// have RLS locked down (no public SELECT / enumeration of all bookings).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('bookings')
    .select('*, therapists(name, phone)')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  return NextResponse.json({ booking: data })
}
