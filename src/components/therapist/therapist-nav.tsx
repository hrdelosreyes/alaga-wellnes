'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, Wallet, MapPin, CalendarDays, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/therapist/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/therapist/availability', label: 'Availability', icon: CalendarDays },
  { href: '/therapist/rates',        label: 'My rates',     icon: Wallet },
  { href: '/therapist/service-area', label: 'Service area', icon: MapPin },
]

export function TherapistNav() {
  const pathname = usePathname()
  const router   = useRouter()

  async function logout() {
    await createClient().auth.signOut()
    router.push('/therapist/login')
  }

  return (
    <header className="bg-[#2C2420] text-white sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
        <Link href="/therapist/dashboard" className="font-bold text-base tracking-tight shrink-0">
          alaga <span className="text-[#C4714A]">pro</span>
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-1">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                  active ? 'bg-white/15 text-white' : 'text-[#C8A88A] hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            )
          })}
          <button
            onClick={logout}
            title="Sign out"
            className="p-2 rounded-lg text-[#C8A88A] hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={16} />
          </button>
        </nav>
      </div>
    </header>
  )
}
