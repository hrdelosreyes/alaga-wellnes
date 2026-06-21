'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { SERVICES } from '@/lib/constants'
import { formatPrice, formatDate, formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { LogOut, ChevronRight } from 'lucide-react'

type Customer = { id: string; name: string; phone: string | null; email: string | null }

type Booking = {
  id: string
  service_id: string
  booking_date: string
  time_slot: string
  address: string
  status: string
  total: number
  therapists: { name: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Pending payment',
  confirmed:       'Confirmed',
  assigned:        'Assigned',
  en_route:        'On the way',
  checked_in:      'In progress',
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

export default function AccountPage() {
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { init() }, [])

  async function init() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/account/login'); return }

    const [{ data: profile }, { data: bks }] = await Promise.all([
      supabase.from('customers').select('*').eq('id', user.id).single(),
      supabase
        .from('bookings')
        .select('id, service_id, booking_date, time_slot, address, status, total, therapists(name)')
        .eq('customer_id', user.id)
        .order('booking_date', { ascending: false })
        .order('time_slot',    { ascending: false }),
    ])

    if (!profile) { router.replace('/account/login'); return }
    setCustomer(profile)
    setBookings((bks ?? []) as unknown as Booking[])
    setLoading(false)
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF6F0] flex items-center justify-center">
        <p className="text-[#8C7B70] text-sm">Loading…</p>
      </div>
    )
  }

  const upcoming  = bookings.filter(b => !['completed', 'cancelled'].includes(b.status))
  const past      = bookings.filter(b =>  ['completed', 'cancelled'].includes(b.status))

  return (
    <div className="min-h-screen bg-[#FBF6F0]">
      {/* Header */}
      <div className="bg-[#2C2420] text-white px-6 py-5 flex items-center justify-between">
        <div>
          <Link href="/" className="text-xs text-[#C8A88A] hover:text-white transition-colors">← Home</Link>
          <h1 className="text-lg font-bold mt-1">{customer?.name}</h1>
          <p className="text-xs text-[#C8A88A]">{customer?.email}</p>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 text-xs text-[#C8A88A] hover:text-white transition-colors p-2"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">

        <Link href="/book">
          <div className="bg-[#C4714A] text-white rounded-2xl p-5 mb-8 flex items-center justify-between hover:bg-[#b36540] transition-colors">
            <div>
              <p className="font-bold text-base">Book a session</p>
              <p className="text-sm text-[#F2D9CC] mt-0.5">Your details will be pre-filled.</p>
            </div>
            <ChevronRight size={20} />
          </div>
        </Link>

        {upcoming.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-3">Upcoming</h2>
            <div className="flex flex-col gap-3">
              {upcoming.map(b => <BookingCard key={b.id} booking={b} />)}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-3">Past bookings</h2>
            <div className="flex flex-col gap-3">
              {past.map(b => <BookingCard key={b.id} booking={b} />)}
            </div>
          </section>
        )}

        {bookings.length === 0 && (
          <div className="text-center py-16 text-[#8C7B70]">
            <p className="font-semibold text-[#2C2420] mb-1">No bookings yet</p>
            <p className="text-sm">Your booking history will appear here.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function BookingCard({ booking }: { booking: Booking }) {
  const service = SERVICES.find(s => s.id === booking.service_id)
  return (
    <Link href={`/booking/${booking.id}`}>
      <div className="bg-white rounded-2xl border border-[#EDE5DF] p-5 hover:border-[#C4714A] transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-[#2C2420]">{service?.name ?? booking.service_id}</span>
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_COLOR[booking.status])}>
                {STATUS_LABEL[booking.status]}
              </span>
            </div>
            <p className="text-sm text-[#8C7B70]">
              {formatDate(booking.booking_date)} · {formatTime(booking.time_slot)}
            </p>
            <p className="text-sm text-[#8C7B70] truncate mt-0.5">{booking.address}</p>
            {booking.therapists?.name && (
              <p className="text-xs text-[#8C7B70] mt-0.5">Therapist: {booking.therapists.name}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-bold text-[#2C2420]">{formatPrice(booking.total)}</p>
            <ChevronRight size={14} className="text-[#C8BDB8] mt-2 ml-auto" />
          </div>
        </div>
      </div>
    </Link>
  )
}
