'use client'

import Link from 'next/link'
import { ReactNode } from 'react'
import { useGeoCity } from '@/components/geo/city-context'

// Wraps a "Book…" CTA — sends live-city visitors into the booking flow,
// and everyone else to the waitlist section instead. Uses a plain <a> for the
// waitlist case: Next's <Link> doesn't reliably scroll to a same-page hash
// target, while a native anchor tag does.
export function BookLink({ children, className }: { children: ReactNode; className?: string }) {
  const { isLive } = useGeoCity()

  if (!isLive) {
    return (
      // eslint-disable-next-line @next/next/no-html-link-for-pages -- intentional: plain <a> so the browser natively scrolls to the same-page hash target, which next/link does not reliably do.
      <a href="/#waitlist" className={className}>
        {children}
      </a>
    )
  }

  return (
    <Link href="/book" className={className}>
      {children}
    </Link>
  )
}
