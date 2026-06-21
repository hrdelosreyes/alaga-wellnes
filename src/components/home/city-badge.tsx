'use client'

import { MapPin } from 'lucide-react'
import { useGeoCity } from '@/components/geo/city-context'

export function CityBadge() {
  const { city, isLive, loading } = useGeoCity()

  if (loading || !city) {
    return (
      <div className="inline-flex items-center gap-2 bg-[#F2D9CC] text-[#A05938] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
        <MapPin size={12} />
        Now serving BGC &amp; Makati
      </div>
    )
  }

  return isLive ? (
    <div className="inline-flex items-center gap-2 bg-[#F2D9CC] text-[#A05938] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
      <MapPin size={12} />
      Now serving {city.name}
    </div>
  ) : (
    <div className="inline-flex items-center gap-2 bg-[#EDE5DF] text-[#8C7B70] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
      <MapPin size={12} />
      Coming soon in {city.name}
    </div>
  )
}
