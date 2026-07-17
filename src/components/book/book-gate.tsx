'use client'

import { useEffect, type ReactNode } from 'react'
import { useGeoCity } from '@/components/geo/city-context'

// The booking flow is only for live cities. CTAs already point elsewhere
// when a city isn't live, but /book is still reachable directly (search
// results, shared links) — without this gate those visitors dead-end at an
// empty city dropdown. Plain location.replace: the target is a same-page
// hash on the homepage, which client-side navigation doesn't scroll to
// reliably.
export function BookGate({ children }: { children: ReactNode }) {
  const { isLive, loading } = useGeoCity()

  useEffect(() => {
    if (!loading && !isLive) window.location.replace('/#waitlist')
  }, [loading, isLive])

  if (!loading && !isLive) return null

  return <>{children}</>
}
