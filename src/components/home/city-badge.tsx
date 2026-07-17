'use client'

import { MapPin, Loader2 } from 'lucide-react'
import { useGeoCity } from '@/components/geo/city-context'

export function CityBadge() {
  const { city, isLive, loading, detectByGPS, gpsLoading } = useGeoCity()

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 bg-[#F2D9CC] text-[#A05938] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
        <Loader2 size={12} className="animate-spin" />
        Detecting your city…
      </div>
    )
  }

  if (!city) return null

  return (
    <div className="flex flex-col items-start gap-1 mb-6">
      {isLive ? (
        <div className="inline-flex items-center gap-2 bg-[#F2D9CC] text-[#A05938] text-xs font-semibold px-3 py-1.5 rounded-full">
          <MapPin size={12} />
          Now serving {city.name}
        </div>
      ) : (
        <div className="inline-flex flex-col">
          <div className="inline-flex items-center gap-2 bg-[#EDE5DF] text-[#6E5F55] text-xs font-semibold px-3 py-1.5 rounded-full">
            <MapPin size={12} />
            Coming soon in {city.name}!
          </div>
          <a
            href="#waitlist"
            className="text-xs font-medium text-[#A85A38] hover:underline underline-offset-2 pl-1 py-2.5 inline-flex items-center"
          >
            Join the waitlist →
          </a>
        </div>
      )}
      {gpsLoading ? (
        <span className="text-xs text-[#A85A38] flex items-center gap-1 pl-1 py-2.5">
          <Loader2 size={10} className="animate-spin" /> Detecting…
        </span>
      ) : (
        <button
          onClick={detectByGPS}
          className="text-xs font-medium text-[#A85A38] hover:underline underline-offset-2 pl-1 py-2.5 inline-flex items-center"
        >
          Not your city? Click here.
        </button>
      )}
    </div>
  )
}
