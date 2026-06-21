import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  let detectedCity: string | null = null

  // If GPS coords provided, reverse geocode via ipapi.co
  if (lat && lng) {
    try {
      const geo = await fetch(`https://ipapi.co/json/?lat=${lat}&lon=${lng}`)
      const data = await geo.json()
      detectedCity = data.city ?? null
    } catch {
      // ignore
    }
  } else {
    // Try Vercel's geo header first (works in production), fall back to ipapi.co
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('x-real-ip') ??
      ''

    // Vercel geo header
    const vercelCity = req.headers.get('x-vercel-ip-city')
    if (vercelCity) {
      detectedCity = decodeURIComponent(vercelCity)
    } else if (ip && ip !== '127.0.0.1' && ip !== '::1') {
      try {
        const geo = await fetch(`https://ipapi.co/${ip}/json/`, { next: { revalidate: 3600 } })
        const data = await geo.json()
        detectedCity = data.city ?? null
      } catch {
        // ignore
      }
    }
  }

  const supabase = await createClient()

  // Fetch all live cities with their pricing
  const { data: cities } = await supabase
    .from('cities')
    .select('id, name, region, is_customer_live')
    .eq('is_customer_live', true)
    .order('name')

  if (!cities || cities.length === 0) {
    return NextResponse.json({ city: null, isLive: false, pricing: null })
  }

  // Try to match detected city to a live city
  let matchedCity = detectedCity
    ? cities.find(c =>
        c.name.toLowerCase() === detectedCity!.toLowerCase() ||
        c.name.toLowerCase().includes(detectedCity!.toLowerCase()) ||
        detectedCity!.toLowerCase().includes(c.name.toLowerCase())
      )
    : null

  // Fall back to first live city if no match
  if (!matchedCity) matchedCity = cities[0]

  // Fetch pricing for the matched city
  const { data: pricing } = await supabase
    .from('city_pricing')
    .select('service_id, price_min, price_max')
    .eq('city_id', matchedCity.id)

  return NextResponse.json({
    city: { id: matchedCity.id, name: matchedCity.name, region: matchedCity.region },
    isLive: true,
    pricing: pricing ?? [],
    allLiveCities: cities.map(c => c.name),
  })
}
