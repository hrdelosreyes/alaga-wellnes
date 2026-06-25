'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Wallet, MapPin, CalendarDays, BarChart3, Banknote,
  UserCircle, History, Settings, ChevronDown, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Item = { href: string; label: string; icon: React.ComponentType<{ size?: number }> }
type Group = { label: string; icon: React.ComponentType<{ size?: number }>; items: Item[] }

const DASHBOARD: Item = { href: '/therapist/dashboard', label: 'Dashboard', icon: LayoutDashboard }

const GROUPS: Group[] = [
  {
    label: 'Business', icon: BarChart3,
    items: [
      { href: '/therapist/insights', label: 'Insights', icon: BarChart3 },
      { href: '/therapist/history',  label: 'History',  icon: History },
      { href: '/therapist/payout',   label: 'Payout',   icon: Banknote },
    ],
  },
  {
    label: 'Settings', icon: Settings,
    items: [
      { href: '/therapist/profile',      label: 'Profile',      icon: UserCircle },
      { href: '/therapist/availability', label: 'Availability', icon: CalendarDays },
      { href: '/therapist/rates',        label: 'My rates',     icon: Wallet },
      { href: '/therapist/service-area', label: 'Service area', icon: MapPin },
    ],
  },
]

export function TherapistNav() {
  const pathname = usePathname()
  const router   = useRouter()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const navRef = useRef<HTMLElement | null>(null)

  // Close any open dropdown on outside click or route change.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])
  useEffect(() => { setOpenMenu(null) }, [pathname])

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

        <nav ref={navRef} className="flex items-center gap-1">
          {/* Dashboard */}
          <Link
            href={DASHBOARD.href}
            className={cn(
              'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0',
              pathname === DASHBOARD.href ? 'bg-white/15 text-white' : 'text-[#C8A88A] hover:bg-white/10 hover:text-white',
            )}
          >
            <DASHBOARD.icon size={15} />
            <span className="hidden sm:inline">{DASHBOARD.label}</span>
          </Link>

          {/* Grouped dropdowns */}
          {GROUPS.map(group => {
            const groupActive = group.items.some(i => i.href === pathname)
            const isOpen      = openMenu === group.label
            return (
              <div key={group.label} className="relative shrink-0">
                <button
                  onClick={() => setOpenMenu(isOpen ? null : group.label)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                    groupActive || isOpen ? 'bg-white/15 text-white' : 'text-[#C8A88A] hover:bg-white/10 hover:text-white',
                  )}
                >
                  <group.icon size={15} />
                  <span>{group.label}</span>
                  <ChevronDown size={13} className={cn('transition-transform', isOpen && 'rotate-180')} />
                </button>

                {isOpen && (
                  <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-[#EDE5DF] py-1.5 z-40">
                    {group.items.map(item => {
                      const active = pathname === item.href
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpenMenu(null)}
                          className={cn(
                            'flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors',
                            active ? 'text-[#C4714A] font-semibold bg-[#FBF6F0]' : 'text-[#5C4B45] hover:bg-[#FBF6F0]',
                          )}
                        >
                          <item.icon size={15} />
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          <button
            onClick={logout}
            title="Sign out"
            className="p-2 rounded-lg text-[#C8A88A] hover:bg-white/10 hover:text-white transition-colors shrink-0"
          >
            <LogOut size={16} />
          </button>
        </nav>
      </div>
    </header>
  )
}
