'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RefreshCw, MapPin, DollarSign, Users, ShieldCheck, Gift } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon?: React.ReactNode
  badge?: number
}

type Props = {
  subtitle?: string
  onRefresh?: () => void
  refreshing?: boolean
  pendingApps?: number
}

export function AdminNav({ subtitle, onRefresh, refreshing, pendingApps }: Props) {
  const pathname = usePathname()
  const router   = useRouter()

  const navItems: NavItem[] = [
    { href: '/admin',              label: 'Bookings' },
    { href: '/admin/applicants',   label: 'Applicants',  icon: <Users size={13} />,      badge: pendingApps },
    { href: '/admin/therapists',   label: 'Therapists',  icon: <Users size={13} /> },
    { href: '/admin/cities',       label: 'Cities',      icon: <MapPin size={13} /> },
    { href: '/admin/pricing',      label: 'Pricing',     icon: <DollarSign size={13} /> },
    { href: '/admin/commissions',  label: 'Commissions', icon: <DollarSign size={13} /> },
    { href: '/admin/bonus',        label: 'Alaga Bonus', icon: <Gift size={13} /> },
    { href: '/admin/users',        label: 'Users',       icon: <ShieldCheck size={13} /> },
  ]

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/admin/login')
  }

  return (
    <div className="bg-[#2C2420] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 overflow-x-auto">
      <div className="flex items-center gap-1 flex-shrink-0 mr-3">
        <img src="/logo-vertical-dark.png" alt="Alaga Wellness" style={{ height: '32px', width: 'auto' }} />
        {subtitle && <span className="text-xs text-[#C8A88A] ml-2 hidden sm:block">{subtitle}</span>}
      </div>
      <nav className="flex items-center gap-1 overflow-x-auto flex-1">
        {navItems.map(item => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0',
                active ? 'bg-white/25 text-white' : 'bg-white/10 hover:bg-white/20 text-white/80',
              )}
            >
              {item.icon}
              {item.label}
              {item.badge != null && item.badge > 0 && (
                <span className="bg-[#C4714A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {item.badge}
                </span>
              )}
            </Link>
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
