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
  detectByGPS: () => Promise<void>
  gpsLoading: boolean
}

const Ctx = createContext<GeoCityContext>({
  city: null, isLive: false, pricing: [], allLiveCities: [], loading: true,
  detectByGPS: async () => {}, gpsLoading: false,
})

export function GeoCityProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GeoCityContext>({
    city: null, isLive: false, pricing: [], allLiveCities: [], loading: true,
    detectByGPS: async () => {}, gpsLoading: false,
  })

  async function fetchGeoCity(params?: string) {
    const res = await fetch(`/api/geo-city${params ? `?${params}` : ''}`)
    const data = await res.json()
    setState(s => ({
      ...s,
      city:          data.city,
      isLive:        data.isLive ?? false,
      pricing:       data.pricing ?? [],
      allLiveCities: data.allLiveCities ?? [],
      loading:       false,
      gpsLoading:    false,
    }))
  }

  async function detectByGPS() {
    if (!navigator.geolocation) return
    setState(s => ({ ...s, gpsLoading: true }))
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        fetchGeoCity(`lat=${latitude}&lng=${longitude}`)
      },
      () => setState(s => ({ ...s, gpsLoading: false })),
    )
  }

  useEffect(() => {
    fetchGeoCity()
      .catch(() => setState(s => ({ ...s, loading: false })))
  }, [])

  return <Ctx.Provider value={{ ...state, detectByGPS }}>{children}</Ctx.Provider>
}

export function useGeoCity() { return useContext(Ctx) }
