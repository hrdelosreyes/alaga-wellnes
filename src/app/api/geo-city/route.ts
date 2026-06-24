import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  let detectedCity: string | null = null

  // If GPS coords provided, reverse geocode via OpenStreetMap Nominatim
  if (lat && lng) {
    try {
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
        { headers: { 'User-Agent': 'AlagaWellness/1.0 (alagawellness.care)', 'Accept-Charset': 'utf-8' } }
      )
      const text = await geo.text()
      const data = JSON.parse(text)
      detectedCity = data.address?.city ?? data.address?.town ?? data.address?.municipality ?? null
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

  // Fetch ALL cities (live and not live)
  const { data: allCities } = await supabase
    .from('cities')
    .select('id, name, region, is_customer_live')
    .order('name')

  if (!allCities || allCities.length === 0) {
    return NextResponse.json({ city: null, isLive: false, pricing: [] })
  }

  const liveCities = allCities.filter(c => c.is_customer_live)

  // Normalize: remove accents, strip "City of"/"City", lowercase
  function normalize(s: string) {
    return s
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // ñ → n, etc.
      .replace(/\bcity\b/gi, '')
      .replace(/\bof\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
  }

  const normalizedDetected = detectedCity ? normalize(detectedCity) : null

  function matchCity<T extends { name: string }>(list: T[]) {
    if (!normalizedDetected) return null
    return list.find(c => {
      const n = normalize(c.name)
      return n === normalizedDetected || n.includes(normalizedDetected!) || normalizedDetected!.includes(n)
    }) ?? null
  }

  // First try to match against a live city
  const liveMatch = matchCity(liveCities)
  if (liveMatch) {
    const { data: pricing } = await supabase
      .from('city_service_rates')
      .select('service_id, price_min:min_rate, price_max:max_rate')
      .eq('city_id', liveMatch.id)

    const debug = searchParams.get('debug') === '1'
    return NextResponse.json({
      city: { id: liveMatch.id, name: liveMatch.name, region: liveMatch.region },
      isLive: true,
      pricing: pricing ?? [],
      allLiveCities: liveCities.map(c => c.name),
      ...(debug && { _debug: { detectedCity, normalizedDetected } }),
    })
  }

  // Try to match against any city (not live)
  const anyMatch = matchCity(allCities)
  if (anyMatch) {
    const debug = searchParams.get('debug') === '1'
    return NextResponse.json({
      city: { id: anyMatch.id, name: anyMatch.name, region: anyMatch.region },
      isLive: false,
      pricing: [],
      allLiveCities: liveCities.map(c => c.name),
      ...(debug && { _debug: { detectedCity, normalizedDetected } }),
    })
  }

  // City not in DB at all — show detected name as coming soon
  if (detectedCity) {
    const debug = searchParams.get('debug') === '1'
    return NextResponse.json({
      city: { id: null, name: detectedCity, region: null },
      isLive: false,
      pricing: [],
      allLiveCities: liveCities.map(c => c.name),
      ...(debug && { _debug: { detectedCity, normalizedDetected } }),
    })
  }

  // No detection at all — fall back to first live city
  const fallback = liveCities[0]
  const { data: pricing } = await supabase
    .from('city_service_rates')
    .select('service_id, price_min:min_rate, price_max:max_rate')
    .eq('city_id', fallback.id)

  return NextResponse.json({
    city: { id: fallback.id, name: fallback.name, region: fallback.region },
    isLive: true,
    pricing: pricing ?? [],
    allLiveCities: liveCities.map(c => c.name),
  })
}
