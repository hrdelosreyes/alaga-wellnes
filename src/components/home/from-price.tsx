'use client'

import { useGeoCity } from '@/components/geo/city-context'
import { SERVICES } from '@/lib/constants'
import { formatPrice } from '@/lib/utils'

// Lowest starting price across all services — uses the city's actual rate
// band when known, falling back to the services' base guide prices.
export function FromPrice() {
  const { pricing } = useGeoCity()

  const min = pricing.length
    ? Math.min(...pricing.map(p => p.price_min))
    : Math.min(...SERVICES.map(s => s.price))

  return <>{formatPrice(min)}</>
}
