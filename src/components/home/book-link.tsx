'use client'

import Link from 'next/link'
import { ReactNode } from 'react'
import { useGeoCity } from '@/components/geo/city-context'

// Wraps a "Book…" CTA — sends live-city visitors into the booking flow,
// and everyone else to the waitlist section instead. Uses a plain <a> for the
// waitlist case: Next's <Link> doesn't reliably scroll to a same-page hash
// target, while a native anchor tag does.
//
// Pass `waitlistChildren` to show different content (e.g. a "Join the
// waitlist" label) when the visitor's city isn't live — a "Book Now" button
// that lands on a waitlist form reads as bait-and-switch.
export function BookLink({
  children,
  waitlistChildren,
  className,
}: {
  children: ReactNode
  waitlistChildren?: ReactNode
  className?: string
}) {
  const { isLive } = useGeoCity()

  if (!isLive) {
    return (
      // eslint-disable-next-line @next/next/no-html-link-for-pages -- intentional: plain <a> so the browser natively scrolls to the same-page hash target, which next/link does not reliably do.
      <a href="/#waitlist" className={className}>
        {waitlistChildren ?? children}
      </a>
    )
  }

  return (
    <Link href="/book" className={className}>
      {children}
    </Link>
  )
}
