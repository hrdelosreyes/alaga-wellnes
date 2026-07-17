'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Fades content up as it scrolls into view. Purely decorative: content is
// always present in the HTML, and prefers-reduced-motion disables the effect
// entirely (see globals.css).
//
// Robustness: a working IntersectionObserver always delivers an initial
// callback right after observe() (even for off-screen elements). If that
// callback doesn't arrive quickly, the observer is broken in this
// environment — force the content visible rather than leave it hidden.
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      el.classList.add('reveal-visible')
      return
    }

    const fallback = setTimeout(() => {
      el.classList.add('reveal-visible')
      io.disconnect()
    }, 1200)

    const io = new IntersectionObserver(
      ([entry]) => {
        clearTimeout(fallback)
        if (entry.isIntersecting) {
          el.classList.add('reveal-visible')
          io.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    )
    io.observe(el)

    return () => {
      clearTimeout(fallback)
      io.disconnect()
    }
  }, [])

  return (
    <div
      ref={ref}
      className={cn('reveal', className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
