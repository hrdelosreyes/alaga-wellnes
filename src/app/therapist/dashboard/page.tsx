'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatTime, formatPrice } from '@/lib/utils'
import { SERVICES } from '@/lib/constants'
import { LogOut, MapPin, Calendar, Clock, CheckCircle2, Loader2, MessageCircle, ChevronDown, Gift } from 'lucide-react'
import { currentQuarter, BONUS_MIN_BOOKINGS } from '@/lib/bonus'
import { ChatThread } from '@/components/chat/chat-thread'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type BookingRow = {
  id: string
  service_id: string
  booking_date: string
  time_slot: string
  address: string
  unit_notes: string | null
  customer_name: string | null
  customer_phone: string | null
  customer_notes: string | null
  status: string
  total: number
}

type Therapist = {
  id: string
  name: string
  zone: string
  rating_avg: number
  total_bookings: number
  referral_code: string | null
}

const ACTION: Record<string, { label: string; next: string; color: string } | null> = {
  confirmed:  { label: 'Check in',  next: 'checked_in', color: 'bg-[#C4714A] text-white' },
  assigned:   { label: 'Check in',  next: 'checked_in', color: 'bg-[#C4714A] text-white' },
  checked_in: { label: 'Check out', next: 'completed',  color: 'bg-[#6B8C6E] text-white' },
  en_route:   { label: 'Check in',  next: 'checked_in', color: 'bg-[#C4714A] text-white' },
  completed:  null,
  cancelled:  null,
}

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Pending payment',
  confirmed:       'Confirmed',
  assigned:        'Assigned to you',
  en_route:        'En route',
  checked_in:      'Session in progress',
  completed:       'Completed',
  cancelled:       'Cancelled',
}

const STATUS_COLOR: Record<string, string> = {
  confirmed:  'text-blue-700 bg-blue-50',
  assigned:   'text-purple-700 bg-purple-50',
  en_route:   'text-indigo-700 bg-indigo-50',
  checked_in: 'text-teal-700 bg-teal-50',
  completed:  'text-green-700 bg-green-50',
  cancelled:  'text-red-600 bg-red-50',
}

export default function TherapistDashboard() {
  const router = useRouter()
  const [therapist,         setTherapist]         = useState<Therapist | null>(null)
  const [bookings,          setBookings]          = useState<BookingRow[]>([])
  const [referralEarnings,  setReferralEarnings]  = useState<{ pending: number; paid: number; referees: number }>({ pending: 0, paid: 0, referees: 0 })
  const [bonusStats,        setBonusStats]        = useState<{ quarterBookings: number; pendingBonus: number }>({ quarterBookings: 0, pendingBonus: 0 })
  const [loading,           setLoading]           = useState(true)
  const [updating,          setUpdating]          = useState<string | null>(null)
  const [tab,               setTab]               = useState<'today' | 'upcoming'>('today')
  const [openChat,          setOpenChat]           = useState<string | null>(null)
  const [copied,            setCopied]            = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/therapist/login'); return }

    // Look up therapist by email (auth accounts are email-based)
    const { data: t } = await supabase
      .from('therapists')
      .select('id, name, zone, rating_avg, total_bookings, referral_code')
      .eq('email', user.email)
      .single()

    if (!t) { router.replace('/therapist/login'); return }

    // After approval, require therapist to complete onboarding (rates + service area)
    // Check if they have at least one barangay set
    const { count } = await supabase
      .from('therapist_barangays')
      .select('therapist_id', { count: 'exact', head: true })
      .eq('therapist_id', t.id)

    if ((count ?? 0) === 0) {
      router.replace('/therapist/onboarding')
      return
    }

    setTherapist(t)

    // Fetch referral earnings + referees count
    const [{ data: commissions }, { count: refCount }] = await Promise.all([
      supabase
        .from('referral_commissions')
        .select('amount, status')
        .eq('beneficiary_id', t.id),
      supabase
        .from('therapists')
        .select('id', { count: 'exact', head: true })
        .eq('referred_by_id', t.id),
    ])
    const pending = (commissions ?? []).filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0)
    const paid    = (commissions ?? []).filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0)
    setReferralEarnings({ pending, paid, referees: refCount ?? 0 })

    // Alaga Bonus stats for current quarter
    const quarter = currentQuarter()
    const [{ count: qBookings }, { data: bonusPayout }] = await Promise.all([
      supabase
        .from('alaga_bonus_pool')
        .select('id', { count: 'exact', head: true })
        .eq('therapist_id', t.id)
        .eq('quarter', quarter),
      supabase
        .from('alaga_bonus_payouts')
        .select('pool_share')
        .eq('therapist_id', t.id)
        .eq('quarter', quarter)
        .eq('status', 'pending')
        .maybeSingle(),
    ])
    setBonusStats({
      quarterBookings: qBookings ?? 0,
      pendingBonus:    bonusPayout?.pool_share ?? 0,
    })

    await loadBookings(t.id)
  }

  async function loadBookings(therapistId: string) {
    const supabase = createClient()
    const today    = new Date().toISOString().slice(0, 10)

    const { data } = await supabase
      .from('bookings')
      .select('id, service_id, booking_date, time_slot, address, unit_notes, customer_name, customer_phone, customer_notes, status, total')
      .eq('therapist_id', therapistId)
      .neq('status', 'cancelled')
      .neq('status', 'pending_payment')
      .gte('booking_date', today)
      .order('booking_date', { ascending: true })
      .order('time_slot',    { ascending: true })

    setBookings((data ?? []) as BookingRow[])
    setLoading(false)
  }

  async function updateStatus(bookingId: string, nextStatus: string) {
    setUpdating(bookingId)
    const supabase = createClient()

    const update: Record<string, unknown> = { status: nextStatus }
    if (nextStatus === 'checked_in') update.checked_in_at  = new Date().toISOString()
    if (nextStatus === 'completed')  update.checked_out_at = new Date().toISOString()

    await supabase.from('bookings').update(update).eq('id', bookingId)
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: nextStatus } : b))
    setUpdating(null)
  }

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/therapist/login')
  }

  const today    = new Date().toISOString().slice(0, 10)
  const todayBookings    = bookings.filter(b => b.booking_date === today)
  const upcomingBookings = bookings.filter(b => b.booking_date >  today)
  const displayed = tab === 'today' ? todayBookings : upcomingBookings

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF6F0]">
        <Loader2 className="animate-spin text-[#C4714A]" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F2EE]">

      {/* Header */}
      <div className="relative bg-[#2C2420] text-white overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="/therapist-dashboard-hero.png"
            alt=""
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-[#2C2420]/75" />
        </div>
        <div className="relative px-5 py-6 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-base">Hi, {therapist?.name?.split(' ')[0]} 👋</h1>
          <p className="text-xs text-[#C8A88A]">
            ★ {therapist?.rating_avg} · {therapist?.total_bookings} sessions · {therapist?.zone}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <a
            href="/therapist/service-area"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 transition-colors"
          >
            Service area
          </a>
          <a
            href="/therapist/rates"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 transition-colors"
          >
            My rates
          </a>
          <button onClick={logout} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">

        {/* Referral card */}
        {therapist?.referral_code && (
          <div className="bg-[#2C2420] rounded-2xl p-5 mb-6 text-white">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-xs text-[#C8A88A] font-semibold uppercase tracking-wider mb-1">Your referral code</p>
                <p className="text-2xl font-bold tracking-widest text-[#C9A84C]">{therapist.referral_code}</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(therapist.referral_code!)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="text-xs font-semibold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-[#C8A88A] mb-3">
              Earn 5% of every booking from therapists you invite — for their first 100 bookings. Works 2 levels deep.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-lg font-bold">{referralEarnings.referees}</p>
                <p className="text-[10px] text-[#C8A88A] mt-0.5">Therapists referred</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-[#C9A84C]">₱{referralEarnings.pending.toLocaleString()}</p>
                <p className="text-[10px] text-[#C8A88A] mt-0.5">Pending payout</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-[#6B8C6E]">₱{referralEarnings.paid.toLocaleString()}</p>
                <p className="text-[10px] text-[#C8A88A] mt-0.5">Total earned</p>
              </div>
            </div>
          </div>
        )}

        {/* Alaga Bonus card */}
        <div className="bg-white rounded-2xl border border-[#EDE5DF] p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Gift size={16} className="text-[#C9A84C]" />
            <p className="font-bold text-[#2C2420] text-sm">Alaga Bonus — {currentQuarter()}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-[#2C2420]">{bonusStats.quarterBookings}</p>
              <p className="text-[10px] text-[#8C7B70] mt-0.5">Bookings this quarter</p>
            </div>
            <div>
              <p className={cn('text-2xl font-bold', bonusStats.quarterBookings >= BONUS_MIN_BOOKINGS ? 'text-[#6B8C6E]' : 'text-[#C8BDB8]')}>
                {bonusStats.quarterBookings >= BONUS_MIN_BOOKINGS ? '✓' : `${BONUS_MIN_BOOKINGS - bonusStats.quarterBookings} more`}
              </p>
              <p className="text-[10px] text-[#8C7B70] mt-0.5">
                {bonusStats.quarterBookings >= BONUS_MIN_BOOKINGS ? 'Qualified!' : `to qualify`}
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#C9A84C]">
                {bonusStats.pendingBonus > 0 ? `₱${bonusStats.pendingBonus.toLocaleString()}` : '—'}
              </p>
              <p className="text-[10px] text-[#8C7B70] mt-0.5">Bonus queued</p>
            </div>
          </div>
          {bonusStats.quarterBookings < BONUS_MIN_BOOKINGS && (
            <p className="text-xs text-[#8C7B70] mt-3 text-center">
              Complete {BONUS_MIN_BOOKINGS} bookings this quarter to receive your Alaga Bonus payout.
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['today', 'upcoming'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors capitalize',
                tab === t
                  ? 'bg-[#2C2420] text-white border-[#2C2420]'
                  : 'bg-white border-[#EDE5DF] text-[#8C7B70]',
              )}
            >
              {t === 'today'
                ? `Today (${todayBookings.length})`
                : `Upcoming (${upcomingBookings.length})`}
            </button>
          ))}
        </div>

        {/* Booking cards */}
        {displayed.length === 0 ? (
          <div className="text-center py-16 text-[#8C7B70]">
            <CheckCircle2 size={36} className="mx-auto mb-3 text-[#EDE5DF]" />
            <p className="font-semibold text-[#2C2420]">
              {tab === 'today' ? 'No bookings today' : 'No upcoming bookings'}
            </p>
            <p className="text-sm mt-1">Check back later.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {displayed.map(booking => {
              const service = SERVICES.find(s => s.id === booking.service_id)
              const action  = ACTION[booking.status]

              return (
                <div key={booking.id} className="bg-white rounded-2xl border border-[#EDE5DF] p-5">

                  {/* Status + service */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-bold text-[#2C2420]">{service?.name ?? booking.service_id}</p>
                      <p className="text-xs text-[#8C7B70]">{service?.duration} minutes</p>
                    </div>
                    <span className={cn(
                      'text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0',
                      STATUS_COLOR[booking.status] ?? 'bg-[#F2EBE6] text-[#8C7B70]'
                    )}>
                      {STATUS_LABEL[booking.status] ?? booking.status}
                    </span>
                  </div>

                  {/* Date / time */}
                  <div className="flex items-center gap-4 text-sm text-[#8C7B70] mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} />
                      {formatDate(booking.booking_date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={13} />
                      {formatTime(booking.time_slot)}
                    </span>
                  </div>

                  {/* Address + client — only shown after accepting */}
                  {['assigned','en_route','checked_in','completed'].includes(booking.status) ? (
                    <>
                      <div className="flex items-start gap-1.5 text-sm text-[#8C7B70] mb-1">
                        <MapPin size={13} className="mt-0.5 flex-shrink-0" />
                        <span>
                          {booking.unit_notes && `${booking.unit_notes}, `}{booking.address}
                        </span>
                      </div>
                      {booking.customer_name && (
                        <div className="mt-2 bg-[#FBF6F0] rounded-xl px-3 py-2.5 flex flex-col gap-0.5">
                          <p className="text-xs font-semibold text-[#2C2420]">{booking.customer_name}</p>
                          {booking.customer_phone && (
                            <a
                              href={`tel:${booking.customer_phone}`}
                              className="text-xs text-[#C4714A] font-medium"
                            >
                              {booking.customer_phone}
                            </a>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-start gap-1.5 text-sm text-[#8C7B70] mb-1">
                      <MapPin size={13} className="mt-0.5 flex-shrink-0" />
                      <span className="italic">Address shown after accepting</span>
                    </div>
                  )}

                  {/* Customer notes */}
                  {booking.customer_notes && ['assigned','en_route','checked_in','completed'].includes(booking.status) && (
                    <p className="text-xs text-[#8C7B70] italic mt-2 bg-[#FBF6F0] rounded-lg px-3 py-2">
                      "{booking.customer_notes}"
                    </p>
                  )}

                  {/* Earnings */}
                  <div className="mt-3 pt-3 border-t border-[#F2EBE6] flex items-center justify-between">
                    <span className="text-xs text-[#8C7B70]">Your payout</span>
                    <span className="font-bold text-[#2C2420]">
                      {formatPrice(service?.therapistPayout ?? 0)}
                    </span>
                  </div>

                  {/* Action button */}
                  {action && (
                    <Button
                      className={cn('w-full mt-3', action.color)}
                      loading={updating === booking.id}
                      onClick={() => updateStatus(booking.id, action.next)}
                    >
                      {action.label}
                    </Button>
                  )}

                  {booking.status === 'completed' && (
                    <p className="text-center text-xs text-[#6B8C6E] mt-3 font-semibold">
                      ✓ Session completed
                    </p>
                  )}

                  {/* Chat toggle — available once assigned */}
                  {['assigned','en_route','checked_in','completed'].includes(booking.status) && (
                    <div className="mt-3 border-t border-[#F2EBE6] pt-3">
                      <button
                        onClick={() => setOpenChat(openChat === booking.id ? null : booking.id)}
                        className="w-full flex items-center justify-between text-sm font-semibold text-[#8C7B70] hover:text-[#2C2420] transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <MessageCircle size={15} />
                          Message client
                        </span>
                        <ChevronDown
                          size={15}
                          className={cn('transition-transform', openChat === booking.id && 'rotate-180')}
                        />
                      </button>

                      {openChat === booking.id && (
                        <div className="mt-3 rounded-xl border border-[#EDE5DF] overflow-hidden" style={{ height: 320 }}>
                          <ChatThread
                            bookingId={booking.id}
                            senderRole="therapist"
                            readonly={booking.status === 'completed'}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
