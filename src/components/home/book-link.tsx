'use client'

import Link from 'next/link'
import { ReactNode } from 'react'
import { useGeoCity } from '@/components/geo/city-context'

// Wraps a "Book…" CTA — sends live-city visitors into the booking flow,
// and everyone else to the waitlist section instead.
export function BookLink({ children, className }: { children: ReactNode; className?: string }) {
  const { isLive } = useGeoCity()
  return (
    <Link href={isLive ? '/book' : '/#waitlist'} className={className}>
      {children}
    </Link>
  )
}
