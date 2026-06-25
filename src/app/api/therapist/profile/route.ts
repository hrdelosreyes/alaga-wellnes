import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET — the therapist's profile: editable fields, read-only (admin-controlled)
// fields, and a short-lived signed URL for their photo (private bucket).
export async function GET() {
  const authed = await createClient()
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = await createServiceClient()
  const { data: t } = await svc
    .from('therapists')
    .select(`
      id, name, phone, gender, years_experience, bio, specialties, photo_url,
      email, referral_code, rating_avg, total_bookings, nbi_cleared, tesda_certified,
      created_at, cities(name, region)
    `)
    .eq('email', user.email)
    .maybeSingle()

  if (!t) return NextResponse.json({ error: 'Therapist not found' }, { status: 403 })

  let photoSignedUrl: string | null = null
  if (t.photo_url) {
    const { data } = await svc.storage.from('therapist-docs').createSignedUrl(t.photo_url, 600)
    photoSignedUrl = data?.signedUrl ?? null
  }

  const city = Array.isArray(t.cities) ? t.cities[0] : t.cities

  return NextResponse.json({
    editable: {
      name:             t.name ?? '',
      phone:            t.phone ?? '',
      gender:           t.gender ?? '',
      years_experience: t.years_experience ?? null,
      bio:              t.bio ?? '',
      specialties:      t.specialties ?? [],
    },
    readonly: {
      email:           t.email ?? null,
      referral_code:   t.referral_code ?? null,
      city_name:       city?.name ?? null,
      region:          city?.region ?? null,
      rating_avg:      t.rating_avg ?? 0,
      total_bookings:  t.total_bookings ?? 0,
      nbi_cleared:     t.nbi_cleared ?? false,
      tesda_certified: t.tesda_certified ?? false,
      created_at:      t.created_at,
    },
    photoSignedUrl,
  })
}

// POST — save editable fields. Never touches email, referral_code, city, or
// verification flags (those are admin-controlled).
export async function POST(req: NextRequest) {
  const authed = await createClient()
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, phone, gender, yearsExperience, bio, specialties, photoPath } = await req.json()

  if (!name?.trim())  return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  if (!phone?.trim()) return NextResponse.json({ error: 'Mobile number is required.' }, { status: 400 })
  if (gender !== 'male' && gender !== 'female') {
    return NextResponse.json({ error: 'Select a gender.' }, { status: 400 })
  }

  const update: Record<string, unknown> = {
    name:             name.trim(),
    phone:            phone.trim(),
    gender,
    years_experience: yearsExperience ? parseInt(String(yearsExperience)) : null,
    bio:              bio?.trim() || null,
    specialties:      Array.isArray(specialties) ? specialties : [],
  }
  if (typeof photoPath === 'string' && photoPath) update.photo_url = photoPath

  const svc = await createServiceClient()
  const { error } = await svc.from('therapists').update(update).eq('email', user.email)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
