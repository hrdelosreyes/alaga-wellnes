'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type PricingRow = { service_id: string; price_min: number; price_max: number }

type GeoCity = {
  id: string
  name: string
  region: string
} | null

type GeoCityContext = {
  city: GeoCity
  isLive: boolean
  pricing: PricingRow[]
  allLiveCities: string[]
  loading: boolean
}

const Ctx = createContext<GeoCityContext>({
  city: null, isLive: false, pricing: [], allLiveCities: [], loading: true,
})

export function GeoCityProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GeoCityContext>({
    city: null, isLive: false, pricing: [], allLiveCities: [], loading: true,
  })

  useEffect(() => {
    fetch('/api/geo-city')
      .then(r => r.json())
      .then(data => setState({
        city:           data.city,
        isLive:         data.isLive ?? false,
        pricing:        data.pricing ?? [],
        allLiveCities:  data.allLiveCities ?? [],
        loading:        false,
      }))
      .catch(() => setState(s => ({ ...s, loading: false })))
  }, [])

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>
}

export function useGeoCity() { return useContext(Ctx) }
