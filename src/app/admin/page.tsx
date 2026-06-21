'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPrice, formatDate, formatTime } from '@/lib/utils'
import { SERVICES } from '@/lib/constants'
import { ChevronDown, RefreshCw, Users } from 'lucide-react'
import { AdminNav } from '@/components/layout/admin-nav'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type BookingRow = {
  id: string
  service_id: string
  booking_date: string
  time_slot: string
  address: string
  status: string
  payment_status: string
  total: number
  created_at: string
  therapist_selection_mode: string
  therapists: { name: string } | null
}

const STATUSES = ['pending_payment','confirmed','assigned','en_route','checked_in','completed','cancelled']

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Pending payment',
  confirmed:       'Confirmed',
  assigned:        'Assigned',
  en_route:        'En route',
  checked_in:      'Checked in',
  completed:       'Completed',
  cancelled:       'Cancelled',
}

const STATUS_COLOR: Record<string, string> = {
  pending_payment: 'bg-amber-100 text-amber-700',
  confirmed:       'bg-blue-100 text-blue-700',
  assigned:        'bg-purple-100 text-purple-700',
  en_route:        'bg-indigo-100 text-indigo-700',
  checked_in:      'bg-teal-100 text-teal-700',
  completed:       'bg-green-100 text-green-700',
  cancelled:       'bg-red-100 text-red-700',
}

export default function AdminPage() {
  const router = useRouter()
  const [bookings,        setBookings]        = useState<BookingRow[]>([])
  const [pendingApps,     setPendingApps]     = useState<number>(0)
  const [loading,         setLoading]         = useState(true)
  const [filter,          setFilter]          = useState<string>('all')
  const [updating,        setUpdating]        = useState<string | null>(null)

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/admin/login'); return }
      const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()
      if (roleRow?.role !== 'admin') { router.replace('/admin/login'); return }
      fetchBookings()
    }
    checkAuth()
  }, [router])

  async function fetchBookings() {
    setLoading(true)
    const supabase = createClient()
    const [{ data }, { count }] = await Promise.all([
      supabase
        .from('bookings')
        .select('*, therapists(name)')
        .order('booking_date', { ascending: false })
        .order('time_slot',    { ascending: false }),
      supabase
        .from('therapists')
        .select('id', { count: 'exact', head: true })
        .eq('application_status', 'pending'),
    ])
    setBookings((data ?? []) as BookingRow[])
    setPendingApps(count ?? 0)
    setLoading(false)
  }

  async function updateStatus(bookingId: string, status: string) {
    setUpdating(bookingId)
    if (status === 'completed') {
      // Server route handles the update + referral commission calculation
      await fetch('/api/bookings/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
    } else {
      const supabase = createClient()
      await supabase.from('bookings').update({ status }).eq('id', bookingId)
    }
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b))
    setUpdating(null)
  }

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

  // Stats
  const today      = new Date().toISOString().slice(0, 10)
  const todayCount = bookings.filter(b => b.booking_date === today && b.status !== 'cancelled').length
  const revenue    = bookings.filter(b => b.payment_status === 'paid').reduce((s, b) => s + b.total, 0)
  const pending    = bookings.filter(b => b.status === 'confirmed' || b.status === 'assigned').length

  return (
    <div className="min-h-screen bg-[#F7F2EE]">
      <AdminNav onRefresh={fetchBookings} refreshing={loading} pendingApps={pendingApps} />

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Today's bookings", value: todayCount },
            { label: 'Pending dispatch',  value: pending },
            { label: 'Total revenue',     value: formatPrice(revenue) },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-[#EDE5DF] p-5">
              <p className="text-xs text-[#8C7B70] mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-[#2C2420]">{stat.value}</p>
            </div>
          ))}
          <Link
            href="/admin/applicants"
            className="bg-white rounded-2xl border border-[#EDE5DF] p-5 hover:border-[#C4714A] transition-colors group"
          >
            <p className="text-xs text-[#8C7B70] mb-1 flex items-center gap-1">
              <Users size={11} /> Pending applicants
            </p>
            <p className={cn('text-2xl font-bold', pendingApps > 0 ? 'text-[#C4714A]' : 'text-[#2C2420]')}>
              {pendingApps}
            </p>
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-5">
          {['all', ...STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors capitalize',
                filter === s
                  ? 'bg-[#2C2420] text-white border-[#2C2420]'
                  : 'border-[#EDE5DF] text-[#8C7B70] hover:border-[#2C2420] bg-white',
              )}
            >
              {s === 'all' ? `All (${bookings.length})` : STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {/* Bookings table */}
        {loading ? (
          <div className="text-center py-20 text-[#8C7B70]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-[#8C7B70]">No bookings found.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(booking => {
              const service = SERVICES.find(s => s.id === booking.service_id)
              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-2xl border border-[#EDE5DF] p-5"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* Left: booking info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-[#2C2420]">
                          {service?.name ?? booking.service_id}
                        </span>
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_COLOR[booking.status])}>
                          {STATUS_LABEL[booking.status]}
                        </span>
                        {booking.payment_status === 'paid' && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            Paid
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-[#8C7B70] mb-0.5">
                        {formatDate(booking.booking_date)} · {formatTime(booking.time_slot)}
                      </p>
                      <p className="text-sm text-[#8C7B70] truncate mb-0.5">{booking.address}</p>
                      <p className="text-sm text-[#8C7B70]">
                        Therapist:{' '}
                        {booking.therapists?.name ?? (
                          booking.therapist_selection_mode === 'best_available'
                            ? <em>Best available</em>
                            : <em>Unassigned</em>
                        )}
                      </p>
                    </div>

                    {/* Right: total + status changer */}
                    <div className="flex flex-col items-end gap-3 flex-shrink-0">
                      <span className="font-bold text-[#2C2420]">{formatPrice(booking.total)}</span>

                      <div className="relative">
                        <select
                          value={booking.status}
                          disabled={updating === booking.id}
                          onChange={e => updateStatus(booking.id, e.target.value)}
                          className="appearance-none bg-[#F7F2EE] border border-[#EDE5DF] rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-[#2C2420] focus:outline-none focus:border-[#C4714A] cursor-pointer disabled:opacity-50"
                        >
                          {STATUSES.map(s => (
                            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                          ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8C7B70] pointer-events-none" />
                      </div>

                      <span className="text-[10px] text-[#C8BDB8]">
                        #{booking.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
