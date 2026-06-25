'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatPrice, formatDate, formatTime } from '@/lib/utils'
import { SERVICES } from '@/lib/constants'
import { TherapistNav } from '@/components/therapist/therapist-nav'
import { Loader2, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

type Job = {
  id: string
  service_id: string
  booking_date: string
  time_slot: string
  status: string
  customer_name: string | null
  address: string | null
  payout: number
}
type Declined = {
  booking_id: string
  declined_at: string
  service_id: string | null
  booking_date: string | null
}
type Data = {
  jobs: Job[]
  declined: Declined[]
  summary: { completedCount: number; cancelledCount: number; declinedCount: number; totalEarned: number }
}

const STATUS_BADGE: Record<string, string> = {
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-600',
}

function serviceName(id: string | null) {
  return SERVICES.find(s => s.id === id)?.name ?? id ?? 'Session'
}

export default function TherapistHistoryPage() {
  const router = useRouter()
  const [data, setData]       = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<'sessions' | 'declined'>('sessions')

  useEffect(() => {
    fetch('/api/therapist/history')
      .then(async res => {
        if (res.status === 401 || res.status === 403) { router.replace('/therapist/login'); return null }
        return res.json()
      })
      .then(d => { if (d && !d.error) setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF6F0]">
        <Loader2 className="animate-spin text-[#C4714A]" size={32} />
      </div>
    )
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-[#F7F2EE]"><TherapistNav />
        <div className="max-w-lg mx-auto px-4 py-10 text-center text-[#8C7B70]">Couldn&rsquo;t load your history.</div>
      </div>
    )
  }

  const { jobs, declined, summary } = data

  return (
    <div className="min-h-screen bg-[#F7F2EE]">
      <TherapistNav />

      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-bold text-[#2C2420]">History</h1>
          <p className="text-sm text-[#8C7B70] mt-1">Your past sessions and declined requests.</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-[#EDE5DF] p-4 text-center">
            <p className="text-xl font-bold text-[#6B8C6E]">{summary.completedCount}</p>
            <p className="text-[10px] text-[#8C7B70] mt-1">Completed</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EDE5DF] p-4 text-center">
            <p className="text-xl font-bold text-[#2C2420]">{formatPrice(summary.totalEarned)}</p>
            <p className="text-[10px] text-[#8C7B70] mt-1">Earned (all time)</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EDE5DF] p-4 text-center">
            <p className="text-xl font-bold text-[#C4714A]">{summary.cancelledCount + summary.declinedCount}</p>
            <p className="text-[10px] text-[#8C7B70] mt-1">Cancelled / declined</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {([['sessions', `Sessions (${jobs.length})`], ['declined', `Declined (${declined.length})`]] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors',
                tab === id ? 'bg-[#2C2420] text-white border-[#2C2420]' : 'bg-white border-[#EDE5DF] text-[#8C7B70]',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sessions */}
        {tab === 'sessions' && (
          jobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#EDE5DF] p-8 text-center text-sm text-[#8C7B70]">
              No completed or cancelled sessions yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {jobs.map(j => (
                <div key={j.id} className="bg-white rounded-2xl border border-[#EDE5DF] p-4">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="font-bold text-[#2C2420]">{serviceName(j.service_id)}</p>
                    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full capitalize shrink-0', STATUS_BADGE[j.status] ?? 'bg-[#F2EBE6] text-[#8C7B70]')}>
                      {j.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#8C7B70]">{formatDate(j.booking_date)} · {formatTime(j.time_slot)}</p>
                  {j.customer_name && (
                    <p className="text-xs text-[#8C7B70] mt-0.5">{j.customer_name}</p>
                  )}
                  {j.address && (
                    <p className="text-xs text-[#8C7B70] mt-0.5 flex items-start gap-1"><MapPin size={11} className="mt-0.5 shrink-0" /><span className="truncate">{j.address}</span></p>
                  )}
                  <div className="mt-2.5 pt-2.5 border-t border-[#F2EBE6] flex items-center justify-between">
                    <span className="text-xs text-[#8C7B70]">{j.status === 'completed' ? 'Your payout' : 'No payout'}</span>
                    <span className={cn('font-bold', j.status === 'completed' ? 'text-[#2C2420]' : 'text-[#C8BDB8]')}>
                      {j.status === 'completed' ? formatPrice(j.payout) : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Declined */}
        {tab === 'declined' && (
          declined.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#EDE5DF] p-8 text-center text-sm text-[#8C7B70]">
              You haven&rsquo;t declined any requests.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#EDE5DF] overflow-hidden divide-y divide-[#F2EBE6]">
              {declined.map((d, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#2C2420]">{serviceName(d.service_id)}</p>
                    <p className="text-xs text-[#8C7B70] mt-0.5">
                      {d.booking_date ? `Requested ${formatDate(d.booking_date)}` : 'Booking removed'}
                    </p>
                  </div>
                  <span className="text-xs text-[#8C7B70] shrink-0">Declined {formatDate(d.declined_at.slice(0, 10))}</span>
                </div>
              ))}
            </div>
          )
        )}

        <p className="text-center text-[11px] text-[#8C7B70]">
          A high acceptance rate helps you get more bookings. See your rate in Insights.
        </p>
      </div>
    </div>
  )
}
