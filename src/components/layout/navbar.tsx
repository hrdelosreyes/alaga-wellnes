'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useGeoCity } from '@/components/geo/city-context'

export function Navbar() {
  const [open,       setOpen]       = useState(false)
  const [customerName, setCustomerName] = useState<string | null>(null)
  const { isLive } = useGeoCity()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('customers')
        .select('name')
        .eq('id', user.id)
        .maybeSingle()
      if (data) setCustomerName(data.name.split(' ')[0]) // first name only
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setCustomerName(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <header className="sticky top-0 z-50 bg-[#FBF6F0]/95 backdrop-blur-sm border-b border-[#E8DDD5]">
      <div className="container-alaga flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Alaga Wellness" style={{ height: '48px', width: 'auto' }} />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#8C7B70]">
          <Link href="/#services" className="hover:text-[#2C2420] transition-colors">Services</Link>
          <Link href="/#how-it-works" className="hover:text-[#2C2420] transition-colors">How It Works</Link>
          {isLive && <Link href="/#therapists" className="hover:text-[#2C2420] transition-colors">Our Therapists</Link>}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/therapist/register" className="text-sm font-medium text-[#8C7B70] hover:text-[#2C2420] transition-colors">
            Join as Therapist
          </Link>
          {customerName ? (
            <div className="flex items-center gap-2">
              <Link href="/account">
                <Button variant="ghost" size="sm">Hi, {customerName}</Button>
              </Link>
              <button
                onClick={async () => {
                  const supabase = (await import('@/lib/supabase/client')).createClient()
                  await supabase.auth.signOut()
                  setCustomerName(null)
                }}
                className="text-sm text-[#8C7B70] hover:text-[#2C2420] transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link href="/account/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
          )}
          <Link href="/book">
            <Button size="sm">Book Now</Button>
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 text-[#2C2420]"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-[#E8DDD5] bg-[#FBF6F0] px-6 py-4 flex flex-col gap-4">
          <Link href="/#services" onClick={() => setOpen(false)} className="text-sm font-medium text-[#2C2420]">Services</Link>
          <Link href="/#how-it-works" onClick={() => setOpen(false)} className="text-sm font-medium text-[#2C2420]">How It Works</Link>
          {isLive && <Link href="/#therapists" onClick={() => setOpen(false)} className="text-sm font-medium text-[#2C2420]">Our Therapists</Link>}
          <Link href="/therapist/register" onClick={() => setOpen(false)} className="text-sm font-medium text-[#2C2420]">Join as Therapist</Link>
          {customerName ? (
            <>
              <Link href="/account" onClick={() => setOpen(false)} className="text-sm font-medium text-[#2C2420]">My bookings</Link>
              <button
                onClick={async () => {
                  const supabase = (await import('@/lib/supabase/client')).createClient()
                  await supabase.auth.signOut()
                  setCustomerName(null)
                  setOpen(false)
                }}
                className="text-sm font-medium text-[#8C7B70] text-left hover:text-[#2C2420] transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link href="/account/login" onClick={() => setOpen(false)} className="text-sm font-medium text-[#2C2420]">Sign in</Link>
          )}
          <Link href="/book" onClick={() => setOpen(false)}>
            <Button className="w-full">Book Now</Button>
          </Link>
        </div>
      )}
    </header>
  )
}
