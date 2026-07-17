'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Clock, MapPin, Calendar, User, AlertCircle, Loader2 } from 'lucide-react'
import { SERVICES } from '@/lib/constants'
import { formatPrice, formatDate, formatTime } from '@/lib/utils'
import { ChatThread } from '@/components/chat/chat-thread'
import { useGeoCity } from '@/components/geo/city-context'

type BookingRow = {
  id: string
  service_id: string
  booking_date: string
  time_slot: string
  address: string
  unit_notes: string | null
  customer_notes: string | null
  subtotal: number
  transport_fee: number
  total: number
  status: string
  payment_status: string
  therapist_selection_mode: string
  therapist_gender_pref: string
  created_at: string
  therapists: { name: string; phone: string } | null
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  confirmed:       'Booking confirmed',
  assigned:        'Therapist assigned',
  en_route:        'Therapist on the way',
  checked_in:      'Session in progress',
  completed:       'Session completed',
  cancelled:       'Booking cancelled',
}

const STATUS_COLORS: Record<string, string> = {
  pending_payment: 'text-amber-600 bg-amber-50 border-amber-200',
  confirmed:       'text-[#6B8C6E] bg-[#EBF3EC] border-[#B8D9BB]',
  assigned:        'text-[#6B8C6E] bg-[#EBF3EC] border-[#B8D9BB]',
  en_route:        'text-blue-700 bg-blue-50 border-blue-200',
  checked_in:      'text-blue-700 bg-blue-50 border-blue-200',
  completed:       'text-[#6B8C6E] bg-[#EBF3EC] border-[#B8D9BB]',
  cancelled:       'text-red-600 bg-red-50 border-red-200',
}

function BookingConfirmationPage() {
  const { id }          = useParams<{ id: string }>()
  const searchParams    = useSearchParams()
  const justPaid        = searchParams.get('payment') === 'success'
  const { isLive }      = useGeoCity()

  const [booking, setBooking] = useState<BookingRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetchBooking(true)
    // Poll for status changes (booking PII is read via a server endpoint, so
    // the table has no public realtime/SELECT access).
    const interval = setInterval(() => fetchBooking(false), 6000)
    return () => clearInterval(interval)
  }, [id])

  async function fetchBooking(first: boolean) {
    try {
      const res = await fetch(`/api/booking/${id}`)
      if (!res.ok) { if (first) { setNotFound(true); setLoading(false) } return }
      const { booking } = await res.json()
      setBooking(booking as BookingRow)
    } catch {
      if (first) setNotFound(true)
    } finally {
      if (first) setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#C4714A]" size={32} />
      </div>
    )
  }

  if (notFound || !booking) {
    return (
      <div className="container-alaga py-20 max-w-lg text-center">
        <AlertCircle size={40} className="text-[#6E5F55] mx-auto mb-4" />
        <h1 className="text-xl font-bold text-[#2C2420] mb-2">Booking not found</h1>
        <p className="text-[#6E5F55] mb-6">This link may be invalid or expired.</p>
        <Link href="/book" className="text-[#C4714A] font-semibold hover:underline">
          Start a new booking
        </Link>
      </div>
    )
  }

  const service    = SERVICES.find(s => s.id === booking.service_id)
  const isPaid     = booking.payment_status === 'paid'
  const isCancelled = booking.status === 'cancelled'
  const shortRef   = booking.id.slice(0, 8).toUpperCase()

  return (
    <div className="container-alaga py-12 max-w-lg">

      {/* Hero status */}
      <div className="text-center mb-8">
        {isPaid && !isCancelled ? (
          <>
            <CheckCircle size={56} className="text-[#6B8C6E] mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-[#2C2420] mb-1">
              {justPaid ? 'Payment received!' : 'Booking confirmed'}
            </h1>
            <p className="text-[#6E5F55]">
              {justPaid
                ? 'Your session is booked. We\'ll send a confirmation shortly.'
                : 'Here are your booking details.'}
            </p>
          </>
        ) : isCancelled ? (
          <>
            <AlertCircle size={56} className="text-red-400 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-[#2C2420] mb-1">Booking cancelled</h1>
            <p className="text-[#6E5F55]">This booking has been cancelled.</p>
          </>
        ) : (
          <>
            <Clock size={56} className="text-amber-400 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-[#2C2420] mb-1">Awaiting payment</h1>
            <p className="text-[#6E5F55]">Your booking is reserved but not yet paid.</p>
          </>
        )}
      </div>

      {/* Status badge */}
      <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold w-fit mx-auto mb-8 ${STATUS_COLORS[booking.status] ?? ''}`}>
        {STATUS_LABELS[booking.status] ?? booking.status}
      </div>

      {/* Booking ref */}
      <div className="text-center mb-6">
        <span className="text-xs text-[#6E5F55] uppercase tracking-widest">Booking reference</span>
        <p className="text-lg font-bold text-[#2C2420] tracking-widest">{shortRef}</p>
      </div>

      {/* Details card */}
      <div className="bg-white rounded-2xl border border-[#EDE5DF] divide-y divide-[#F2EBE6] mb-6">

        {service && (
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="font-bold text-[#2C2420]">{service.name}</p>
              <p className="text-sm text-[#6E5F55]">{service.duration} minutes</p>
            </div>
            <span className="font-bold text-[#2C2420]">{formatPrice(booking.subtotal)}</span>
          </div>
        )}

        <div className="p-5 flex items-center gap-3">
          <Calendar size={16} className="text-[#C4714A] flex-shrink-0" />
          <div>
            <p className="font-semibold text-[#2C2420] text-sm">{formatDate(booking.booking_date)}</p>
            <p className="text-sm text-[#6E5F55]">{formatTime(booking.time_slot)}</p>
          </div>
        </div>

        <div className="p-5 flex items-start gap-3">
          <MapPin size={16} className="text-[#C4714A] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-[#2C2420] text-sm">{booking.address}</p>
            {booking.unit_notes && (
              <p className="text-sm text-[#6E5F55]">{booking.unit_notes}</p>
            )}
          </div>
        </div>

        <div className="p-5 flex items-center gap-3">
          <User size={16} className="text-[#C4714A] flex-shrink-0" />
          <p className="text-sm text-[#2C2420]">
            {booking.therapists
              ? booking.therapists.name
              : booking.therapist_selection_mode === 'best_available'
                ? 'Being assigned — you\'ll be notified'
                : 'Therapist to be confirmed'}
            {booking.therapist_gender_pref !== 'any' && (
              <span className="text-[#6E5F55]"> · {booking.therapist_gender_pref} preferred</span>
            )}
          </p>
        </div>

        {booking.customer_notes && (
          <div className="p-5">
            <p className="text-xs font-semibold text-[#6E5F55] uppercase tracking-wider mb-1">Your notes</p>
            <p className="text-sm text-[#2C2420]">{booking.customer_notes}</p>
          </div>
        )}
      </div>

      {/* Price breakdown */}
      <div className="bg-white rounded-2xl border border-[#EDE5DF] p-5 mb-8">
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#6E5F55]">Service</span>
            <span className="text-[#2C2420]">{formatPrice(booking.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6E5F55]">Transport fee</span>
            <span className="text-[#2C2420]">{formatPrice(booking.transport_fee)}</span>
          </div>
          <div className="border-t border-[#F2EBE6] pt-2 mt-1 flex justify-between font-bold text-base">
            <span className="text-[#2C2420]">Total paid</span>
            <span className="text-[#C4714A]">{formatPrice(booking.total)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {booking.status === 'completed' && (
          <Link
            href={`/booking/${booking.id}/rate`}
            className="w-full text-center py-3.5 rounded-xl bg-[#C9A84C] text-white font-semibold hover:bg-[#A8883A] transition-colors"
          >
            Rate your session ★
          </Link>
        )}
        {isLive ? (
          <Link
            href="/book"
            className="w-full text-center py-3.5 rounded-xl bg-[#C4714A] text-white font-semibold hover:bg-[#A05938] transition-colors"
          >
            Book another session
          </Link>
        ) : (
          // eslint-disable-next-line @next/next/no-html-link-for-pages -- intentional: plain <a> so the browser natively scrolls to the same-page hash target, which next/link does not reliably do.
          <a
            href="/#waitlist"
            className="w-full text-center py-3.5 rounded-xl bg-[#B05C33] text-white font-semibold hover:bg-[#A05938] transition-colors"
          >
            Join the waitlist
          </a>
        )}
        <Link
          href="/"
          className="w-full text-center py-3.5 rounded-xl border-2 border-[#EDE5DF] text-[#6E5F55] font-semibold hover:border-[#C4714A] hover:text-[#C4714A] transition-colors"
        >
          Back to home
        </Link>
      </div>

      {/* Chat */}
      {isPaid && !isCancelled && booking.status !== 'pending_payment' && (
        <div className="mt-8">
          <h2 className="text-base font-bold text-[#2C2420] mb-3">Message your therapist</h2>
          <div className="bg-white rounded-2xl border border-[#EDE5DF] overflow-hidden" style={{ height: 380 }}>
            <ChatThread
              bookingId={booking.id}
              senderRole="customer"
              readonly={booking.status === 'completed' || booking.status === 'cancelled'}
            />
          </div>
        </div>
      )}

      {/* Live update note */}
      {isPaid && !isCancelled && (
        <p className="text-center text-xs text-[#6E5F55] mt-6">
          This page updates live as your booking status changes.
        </p>
      )}
    </div>
  )
}

export default function BookingPageWrapper() { return <Suspense><BookingConfirmationPage /></Suspense> }
