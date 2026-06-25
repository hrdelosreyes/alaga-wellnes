'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  RefreshCw, MapPin, DollarSign, Users, UserPlus, ShieldCheck, Gift, Wallet,
  LayoutDashboard, CalendarDays, Tag, Banknote, ClipboardList, Settings, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Item = { href: string; label: string; icon: React.ComponentType<{ size?: number }>; badgeKey?: 'pendingApps' }
type Group = { label: string; icon: React.ComponentType<{ size?: number }>; items: Item[]; badgeKey?: 'pendingApps' }

const OVERVIEW: Item = { href: '/admin', label: 'Overview', icon: LayoutDashboard }

const GROUPS: Group[] = [
  {
    label: 'Operations', icon: ClipboardList, badgeKey: 'pendingApps',
    items: [
      { href: '/admin/bookings',   label: 'Bookings',   icon: CalendarDays },
      { href: '/admin/applicants', label: 'Applicants', icon: UserPlus, badgeKey: 'pendingApps' },
      { href: '/admin/therapists', label: 'Therapists', icon: Users },
    ],
  },
  {
    label: 'Finance', icon: Banknote,
    items: [
      { href: '/admin/payouts',     label: 'Payouts',     icon: Wallet },
      { href: '/admin/commissions', label: 'Commissions', icon: DollarSign },
      { href: '/admin/bonus',       label: 'Alaga Bonus', icon: Gift },
    ],
  },
  {
    label: 'Setup', icon: Settings,
    items: [
      { href: '/admin/cities',  label: 'Cities',  icon: MapPin },
      { href: '/admin/pricing', label: 'Pricing', icon: Tag },
      { href: '/admin/users',   label: 'Users',   icon: ShieldCheck },
    ],
  },
]

type Props = {
  subtitle?: string
  onRefresh?: () => void
  refreshing?: boolean
  pendingApps?: number
}

function Badge({ value }: { value?: number }) {
  if (!value || value <= 0) return null
  return (
    <span className="bg-[#C4714A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{value}</span>
  )
}

export function AdminNav({ subtitle, onRefresh, refreshing, pendingApps }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const navRef = useRef<HTMLElement | null>(null)

  const badges = { pendingApps }

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])
  useEffect(() => { setOpenMenu(null) }, [pathname])

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/admin/login')
  }

  return (
    <div className="bg-[#2C2420] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-1 flex-shrink-0 mr-3">
        <img src="/logo-vertical-dark.png" alt="Alaga Wellness" style={{ height: '32px', width: 'auto' }} />
        {subtitle && <span className="text-xs text-[#C8A88A] ml-2 hidden sm:block">{subtitle}</span>}
      </div>

      <nav ref={navRef} className="flex items-center gap-1 flex-1 justify-center flex-wrap">
        {/* Overview */}
        <Link
          href={OVERVIEW.href}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
            pathname === OVERVIEW.href ? 'bg-white/25 text-white' : 'bg-white/10 hover:bg-white/20 text-white/80',
          )}
        >
          <OVERVIEW.icon size={13} />
          {OVERVIEW.label}
        </Link>

        {/* Grouped dropdowns */}
        {GROUPS.map(group => {
          const groupActive = group.items.some(i => i.href === pathname)
          const isOpen      = openMenu === group.label
          const groupBadge  = group.badgeKey ? badges[group.badgeKey] : undefined
          return (
            <div key={group.label} className="relative">
              <button
                onClick={() => setOpenMenu(isOpen ? null : group.label)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                  groupActive || isOpen ? 'bg-white/25 text-white' : 'bg-white/10 hover:bg-white/20 text-white/80',
                )}
              >
                <group.icon size={13} />
                {group.label}
                {!isOpen && <Badge value={groupBadge} />}
                <ChevronDown size={12} className={cn('transition-transform', isOpen && 'rotate-180')} />
              </button>

              {isOpen && (
                <div className="absolute left-0 mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-[#EDE5DF] py-1.5 z-40">
                  {group.items.map(item => {
                    const active = pathname === item.href
                    const itemBadge = item.badgeKey ? badges[item.badgeKey] : undefined
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
                        <span className="flex-1">{item.label}</span>
                        <Badge value={itemBadge} />
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        {onRefresh && (
          <button onClick={onRefresh} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Refresh">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
        )}
        <button onClick={signOut} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors whitespace-nowrap">
          Sign out
        </button>
      </div>
    </div>
  )
}
