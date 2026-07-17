'use client'

import { useEffect } from 'react'

// Browsers don't reliably scroll to a #hash target on a fresh page load of
// this app (verified on prod: loading /#waitlist lands at scrollY 0), so
// every cross-page CTA that targets /#waitlist or /#services silently
// no-ops. This scrolls to the hash target after hydration, with one retry
// in case late layout (fonts, lazy sections) shifts the target.
export function HashScroll() {
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return

    let cancelled = false
    const scrollToTarget = () => {
      if (cancelled) return false
      const el = document.getElementById(hash)
      if (!el) return false
      // 'instant', not the page's smooth default: arriving at a section on
      // page load should position immediately, and smooth scrolling can be
      // interrupted by late hydration/layout work.
      el.scrollIntoView({ behavior: 'instant', block: 'start' })
      return true
    }

    const raf = requestAnimationFrame(() => {
      scrollToTarget()
    })
    // Retry once after layout settles — but never fight the user's own scroll.
    const timer = setTimeout(() => {
      const el = document.getElementById(hash)
      if (!el) return
      const r = el.getBoundingClientRect()
      const inView = r.top < window.innerHeight && r.bottom > 0
      if (!inView && window.scrollY === 0) scrollToTarget()
    }, 400)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [])

  return null
}
