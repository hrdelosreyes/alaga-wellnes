'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import { AdminNav } from '@/components/layout/admin-nav'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  TrendingUp, TrendingDown, Users, Star, AlertTriangle,
  Wallet, MapPin, Activity,
} from 'lucide-react'

type Overview = {
  money: {
    gmv: number; platformRev: number; therapistShare: number
    netProfit: number; referralPool: number; bonusPool: number
    outstandingPayouts: number
    revThisMonth: number; revLastMonth: number; revMoM: number | null
  }
  growth: {
    bookingsThisWeek: number; bookingsThisMonth: number
    newCustomers: number; newTherapists: number; totalCustomers: number
  }
  health: {
    activeTherapists: number; approvedTherapists: number; utilization: number
    completionRate: number | null; cancellationRate: number | null
    acceptanceRate: number | null; accepted: number; declined: number
    avgRating: number | null; reviewCount: number
  }
  waitlistByCity: { city: string; count: number }[]
  alerts: { unassignedConfirmed: number; pendingApplicants: number; outstandingPayouts: number }
}

function Stat({ label, value, sub, accent, hint }: { label: string; value: string; sub?: React.ReactNode; accent?: string; hint?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EDE5DF] p-4">
      <p className="text-[10px] text-[#8C7B70] uppercase tracking-wider font-semibold">{label}</p>
      <p className={cn('text-2xl font-bold mt-1', accent ?? 'text-[#2C2420]')}>{value}</p>
      {sub && <div className="text-[11px] text-[#8C7B70] mt-0.5">{sub}</div>}
      {hint && <p className="text-[10px] text-[#B0A399] mt-1 leading-snug">{hint}</p>}
    </div>
  )
}

export default function AdminOverviewPage() {
  const router = useRouter()
  const [data, setData]       = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetch('/api/admin/overview')
      .then(async res => {
        if (res.status === 401 || res.status === 403) { router.replace('/admin/login'); return null }
        return res.json()
      })
      .then(d => { if (d && !d.error) setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F2EE]">
        <AdminNav />
        <div className="max-w-5xl mx-auto px-4 py-20 text-center text-[#8C7B70]">Loading overview…</div>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-[#F7F2EE]">
        <AdminNav />
        <div className="max-w-5xl mx-auto px-4 py-20 text-center text-[#8C7B70]">Couldn&rsquo;t load the dashboard.</div>
      </div>
    )
  }

  const { money, growth, health, waitlistByCity, alerts } = data
  const maxCity = Math.max(1, ...waitlistByCity.map(c => c.count))
  const totalAlerts = alerts.unassignedConfirmed + alerts.pendingApplicants + (alerts.outstandingPayouts > 0 ? 1 : 0)

  return (
    <div className="min-h-screen bg-[#F7F2EE]">
      <AdminNav onRefresh={load} refreshing={loading} pendingApps={alerts.pendingApplicants} />

      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
        <div className="flex items-end justify-between">
          <h1 className="text-2xl font-bold text-[#2C2420]">Business overview</h1>
          <Link href="/admin/bookings" className="text-xs font-semibold text-[#C4714A] hover:underline">Manage bookings →</Link>
        </div>

        {/* Alerts */}
        {totalAlerts > 0 && (
          <section className="bg-[#FCF3EE] border border-[#EAD0C2] rounded-2xl p-4">
            <h2 className="text-sm font-bold text-[#9A4A28] mb-2 flex items-center gap-1.5"><AlertTriangle size={15} /> Needs attention</h2>
            <div className="flex flex-wrap gap-2">
              {alerts.unassignedConfirmed > 0 && (
                <Link href="/admin/bookings" className="bg-white border border-[#EAD0C2] rounded-xl px-3 py-2 text-sm hover:border-[#C4714A]">
                  <strong className="text-[#C4714A]">{alerts.unassignedConfirmed}</strong> unassigned booking{alerts.unassignedConfirmed === 1 ? '' : 's'} — dispatch a therapist
                </Link>
              )}
              {alerts.pendingApplicants > 0 && (
                <Link href="/admin/applicants" className="bg-white border border-[#EAD0C2] rounded-xl px-3 py-2 text-sm hover:border-[#C4714A]">
                  <strong className="text-[#C4714A]">{alerts.pendingApplicants}</strong> applicant{alerts.pendingApplicants === 1 ? '' : 's'} awaiting review
                </Link>
              )}
              {alerts.outstandingPayouts > 0 && (
                <Link href="/admin/payouts" className="bg-white border border-[#EAD0C2] rounded-xl px-3 py-2 text-sm hover:border-[#C4714A]">
                  <strong className="text-[#C4714A]">{formatPrice(alerts.outstandingPayouts)}</strong> in therapist payouts owed
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Money */}
        <section>
          <h2 className="text-sm font-bold text-[#2C2420] mb-3 flex items-center gap-1.5"><Wallet size={15} /> Money</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat
              label="Platform revenue" value={formatPrice(money.platformRev)} accent="text-[#C4714A]"
              hint="Your 25% cut of paid bookings"
            />
            <Stat
              label="Revenue this month" value={formatPrice(money.revThisMonth)}
              sub={money.revMoM !== null && (
                <span className={cn('inline-flex items-center gap-0.5', money.revMoM >= 0 ? 'text-[#6B8C6E]' : 'text-red-500')}>
                  {money.revMoM >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {Math.abs(money.revMoM)}% vs last month
                </span>
              )}
            />
            <Stat label="GMV (gross)" value={formatPrice(money.gmv)} hint="Total booking value. 75% is therapists' money." />
            <Stat
              label="Outstanding payouts" value={formatPrice(money.outstandingPayouts)}
              accent={money.outstandingPayouts > 0 ? 'text-[#9A4A28]' : undefined}
              hint="Earned by therapists, not yet paid"
            />
          </div>
          {/* 25% breakdown */}
          <div className="bg-white rounded-2xl border border-[#EDE5DF] p-4 mt-3">
            <p className="text-[10px] text-[#8C7B70] uppercase tracking-wider font-semibold mb-3">Where the platform&rsquo;s 25% goes (realized on completed sessions)</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-bold text-[#6B8C6E]">{formatPrice(money.netProfit)}</p>
                <p className="text-[10px] text-[#8C7B70] mt-0.5">Net profit (~10%)</p>
              </div>
              <div>
                <p className="text-xl font-bold text-[#2C2420]">{formatPrice(money.referralPool)}</p>
                <p className="text-[10px] text-[#8C7B70] mt-0.5">Referral commissions</p>
              </div>
              <div>
                <p className="text-xl font-bold text-[#C9A84C]">{formatPrice(money.bonusPool)}</p>
                <p className="text-[10px] text-[#8C7B70] mt-0.5">Alaga Bonus pool</p>
              </div>
            </div>
          </div>
        </section>

        {/* Growth */}
        <section>
          <h2 className="text-sm font-bold text-[#2C2420] mb-3 flex items-center gap-1.5"><TrendingUp size={15} /> Growth</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Bookings this week" value={String(growth.bookingsThisWeek)} />
            <Stat label="Bookings this month" value={String(growth.bookingsThisMonth)} accent="text-[#C4714A]" />
            <Stat label="New customers (mo.)" value={String(growth.newCustomers)} sub={`${growth.totalCustomers} total`} />
            <Stat label="New therapists (mo.)" value={String(growth.newTherapists)} />
          </div>
        </section>

        {/* Marketplace health */}
        <section>
          <h2 className="text-sm font-bold text-[#2C2420] mb-3 flex items-center gap-1.5"><Activity size={15} /> Marketplace health</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat
              label="Active therapists" value={String(health.activeTherapists)}
              sub={`${health.approvedTherapists} approved`}
            />
            <Stat
              label="Utilization" value={String(health.utilization)}
              hint="Avg completed sessions per active therapist"
            />
            <Stat
              label="Acceptance rate" value={health.acceptanceRate !== null ? `${health.acceptanceRate}%` : '—'}
              sub={health.acceptanceRate !== null ? `${health.accepted} accepted · ${health.declined} declined` : 'No responses yet'}
            />
            <Stat
              label="Completion rate" value={health.completionRate !== null ? `${health.completionRate}%` : '—'}
              sub={health.cancellationRate !== null ? `${health.cancellationRate}% cancelled` : undefined}
            />
          </div>
          <div className="bg-white rounded-2xl border border-[#EDE5DF] p-4 mt-3 flex items-center gap-3">
            <Star size={18} className="text-[#C9A84C]" fill="#C9A84C" />
            <div>
              <span className="text-xl font-bold text-[#2C2420]">{health.avgRating ?? '—'}</span>
              <span className="text-sm text-[#8C7B70]"> avg rating across {health.reviewCount} review{health.reviewCount === 1 ? '' : 's'}</span>
            </div>
          </div>
        </section>

        {/* Expansion */}
        <section>
          <h2 className="text-sm font-bold text-[#2C2420] mb-3 flex items-center gap-1.5"><MapPin size={15} /> Where demand is (waitlist)</h2>
          <div className="bg-white rounded-2xl border border-[#EDE5DF] p-5">
            {waitlistByCity.length === 0 ? (
              <p className="text-sm text-[#8C7B70]">No waitlist sign-ups yet.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {waitlistByCity.map(c => (
                  <div key={c.city} className="flex items-center gap-3">
                    <span className="text-sm text-[#2C2420] w-32 truncate">{c.city}</span>
                    <div className="flex-1 h-3 bg-[#F2EBE6] rounded-full overflow-hidden">
                      <div className="h-full bg-[#C4714A] rounded-full" style={{ width: `${(c.count / maxCity) * 100}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-[#2C2420] w-8 text-right">{c.count}</span>
                  </div>
                ))}
                <p className="text-[11px] text-[#8C7B70] mt-2 flex items-center gap-1">
                  <Users size={11} /> Cities with the most sign-ups are your strongest expansion candidates.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
