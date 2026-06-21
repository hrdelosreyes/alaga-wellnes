'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { AdminNav } from '@/components/layout/admin-nav'
import { RefreshCw, Gift } from 'lucide-react'
import { currentQuarter, quarterDateRange, calculateQuarterlyPayouts, BONUS_MIN_BOOKINGS } from '@/lib/bonus'

type PoolEntry = { therapist_id: string; amount: number; therapists: { name: string } | null }
type Payout    = { id: string; therapist_id: string; quarter: string; booking_count: number; pool_share: number; status: string; paid_at: string | null; therapists: { name: string } | null }
type QuarterStat = { therapistId: string; name: string; bookingCount: number; contribution: number }

export default function AdminBonusPage() {
  const quarter = currentQuarter()
  const { start, end } = quarterDateRange(quarter)

  const [tab,          setTab]          = useState<'current' | 'payouts'>('current')
  const [stats,        setStats]        = useState<QuarterStat[]>([])
  const [totalPool,    setTotalPool]    = useState(0)
  const [payouts,      setPayouts]      = useState<Payout[]>([])
  const [loading,      setLoading]      = useState(true)
  const [calculating,  setCalculating]  = useState(false)
  const [marking,      setMarking]      = useState(false)
  const [calcResults,  setCalcResults]  = useState<{ name: string; share: number; bookingCount: number }[] | null>(null)

  useEffect(() => { tab === 'current' ? fetchCurrent() : fetchPayouts() }, [tab])

  async function fetchCurrent() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('alaga_bonus_pool')
      .select('therapist_id, amount, therapists(name)')
      .eq('quarter', quarter)

    const entries = (data ?? []) as unknown as PoolEntry[]
    const pool    = entries.reduce((s, e) => s + e.amount, 0)
    setTotalPool(pool)

    // Aggregate per therapist
    const map: Record<string, QuarterStat> = {}
    for (const e of entries) {
      const id   = e.therapist_id
      const name = (e.therapists as any)?.name ?? 'Unknown'
      if (!map[id]) map[id] = { therapistId: id, name, bookingCount: 0, contribution: 0 }
      map[id].bookingCount  += 1
      map[id].contribution  += e.amount
    }
    setStats(Object.values(map).sort((a, b) => b.bookingCount - a.bookingCount))
    setLoading(false)
  }

  async function fetchPayouts() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('alaga_bonus_payouts')
      .select('*, therapists(name)')
      .order('quarter', { ascending: false })
      .order('pool_share', { ascending: false })
    setPayouts((data ?? []) as unknown as Payout[])
    setLoading(false)
  }

  async function runCalculation() {
    setCalculating(true)
    setCalcResults(null)
    const supabase = createClient()
    const results  = await calculateQuarterlyPayouts(supabase, quarter)
    setCalcResults(results.map(r => ({ name: r.name, share: r.share, bookingCount: r.bookingCount })))
    setCalculating(false)
    fetchPayouts()
  }

  async function markAllPaid(q: string) {
    setMarking(true)
    const supabase = createClient()
    await supabase
      .from('alaga_bonus_payouts')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('quarter', q)
      .eq('status', 'pending')
    await fetchPayouts()
    setMarking(false)
  }

  const qualified    = stats.filter(s => s.bookingCount >= BONUS_MIN_BOOKINGS)
  const notQualified = stats.filter(s => s.bookingCount <  BONUS_MIN_BOOKINGS)
  const pendingPayouts = payouts.filter(p => p.status === 'pending')
  const quarters = [...new Set(payouts.map(p => p.quarter))].sort().reverse()

  return (
    <div className="min-h-screen bg-[#F7F2EE]">
      <AdminNav onRefresh={() => tab === 'current' ? fetchCurrent() : fetchPayouts()} refreshing={loading} />

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['current', 'payouts'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 py-2 rounded-full text-sm font-semibold border capitalize transition-colors',
                tab === t ? 'bg-[#2C2420] text-white border-[#2C2420]' : 'border-[#EDE5DF] text-[#8C7B70] hover:border-[#2C2420] bg-white'
              )}
            >
              {t === 'current' ? `${quarter} (Live)` : 'Payout history'}
            </button>
          ))}
        </div>

        {tab === 'current' && (
          <>
            {/* Pool summary */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-2xl border border-[#EDE5DF] p-5">
                <p className="text-xs text-[#8C7B70] mb-1">Pool this quarter</p>
                <p className="text-2xl font-bold text-[#C4714A]">{formatPrice(totalPool)}</p>
                <p className="text-xs text-[#C8BDB8] mt-1">{start} – {end}</p>
              </div>
              <div className="bg-white rounded-2xl border border-[#EDE5DF] p-5">
                <p className="text-xs text-[#8C7B70] mb-1">Qualified therapists</p>
                <p className="text-2xl font-bold text-[#6B8C6E]">{qualified.length}</p>
                <p className="text-xs text-[#C8BDB8] mt-1">≥ {BONUS_MIN_BOOKINGS} bookings</p>
              </div>
              <div className="bg-white rounded-2xl border border-[#EDE5DF] p-5">
                <p className="text-xs text-[#8C7B70] mb-1">Platform profit</p>
                <p className="text-2xl font-bold text-[#2C2420]">
                  {formatPrice(notQualified.reduce((s, t) => s + t.contribution, 0))}
                </p>
                <p className="text-xs text-[#C8BDB8] mt-1">from non-qualified therapists</p>
              </div>
              <div className="bg-white rounded-2xl border border-[#EDE5DF] p-5">
                <p className="text-xs text-[#8C7B70] mb-1">Highest est. share</p>
                <p className="text-2xl font-bold text-[#2C2420]">
                  {qualified.length > 0
                    ? formatPrice(Math.floor(totalPool * (Math.max(...qualified.map(s => s.bookingCount)) / qualified.reduce((s, q) => s + q.bookingCount, 0))))
                    : '—'}
                </p>
                <p className="text-xs text-[#C8BDB8] mt-1">proportional to bookings</p>
              </div>
            </div>

            {/* Calculate payout button */}
            <div className="bg-[#2C2420] rounded-2xl p-5 mb-8 flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-white flex items-center gap-2"><Gift size={16} className="text-[#C9A84C]" /> End of quarter payout</p>
                <p className="text-xs text-[#C8A88A] mt-1">
                  Run this at the end of {quarter} to calculate each therapist's share and queue payouts.
                  Only therapists with ≥ {BONUS_MIN_BOOKINGS} bookings this quarter qualify.
                </p>
              </div>
              <button
                onClick={runCalculation}
                disabled={calculating || qualified.length === 0}
                className="flex-shrink-0 bg-[#C9A84C] text-[#2C2420] font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-[#b8973b] transition-colors disabled:opacity-40"
              >
                {calculating ? 'Calculating…' : 'Calculate & Queue'}
              </button>
            </div>

            {/* Calc results */}
            {calcResults && (
              <div className="bg-[#E8F0E9] border border-[#6B8C6E] rounded-2xl p-5 mb-8">
                <p className="font-bold text-[#2C2420] mb-3">✓ Payouts queued for {calcResults.length} therapist{calcResults.length !== 1 ? 's' : ''}</p>
                <div className="flex flex-col gap-2">
                  {calcResults.map(r => (
                    <div key={r.name} className="flex justify-between text-sm">
                      <span className="text-[#2C2420]">{r.name} <span className="text-[#8C7B70]">({r.bookingCount} bookings)</span></span>
                      <span className="font-bold text-[#6B8C6E]">{formatPrice(r.share)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Therapist breakdown */}
            {loading ? (
              <div className="text-center py-10 text-[#8C7B70]">Loading…</div>
            ) : stats.length === 0 ? (
              <div className="text-center py-10 text-[#8C7B70]">No completed bookings this quarter yet.</div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#EDE5DF] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#F2EBE6] text-xs text-[#8C7B70] uppercase tracking-wider">
                      <th className="text-left px-5 py-3">Therapist</th>
                      <th className="text-center px-5 py-3">Bookings</th>
                      <th className="text-right px-5 py-3">Contributed</th>
                      <th className="text-center px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2EBE6]">
                    {stats.map(s => (
                      <tr key={s.therapistId} className="hover:bg-[#FBF6F0]">
                        <td className="px-5 py-3 font-semibold text-[#2C2420]">{s.name}</td>
                        <td className="px-5 py-3 text-center font-bold text-[#2C2420]">{s.bookingCount}</td>
                        <td className="px-5 py-3 text-right text-[#8C7B70]">{formatPrice(s.contribution)}</td>
                        <td className="px-5 py-3 text-center">
                          {s.bookingCount >= BONUS_MIN_BOOKINGS ? (
                            <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Qualified</span>
                          ) : (
                            <span className="text-xs text-[#C8BDB8]">{BONUS_MIN_BOOKINGS - s.bookingCount} more needed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'payouts' && (
          <>
            {pendingPayouts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-[#2C2420]">
                    {pendingPayouts.length} pending payout{pendingPayouts.length !== 1 ? 's' : ''} —{' '}
                    {formatPrice(pendingPayouts.reduce((s, p) => s + p.pool_share, 0))} total
                  </p>
                  <p className="text-xs text-[#8C7B70] mt-0.5">Mark all as paid once transfers are done.</p>
                </div>
                <button
                  onClick={() => markAllPaid(pendingPayouts[0].quarter)}
                  disabled={marking}
                  className="flex-shrink-0 bg-[#6B8C6E] text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-[#5a7a5d] transition-colors disabled:opacity-50"
                >
                  {marking ? 'Marking…' : 'Mark all paid'}
                </button>
              </div>
            )}

            {loading ? (
              <div className="text-center py-10 text-[#8C7B70]">Loading…</div>
            ) : payouts.length === 0 ? (
              <div className="text-center py-10 text-[#8C7B70]">No payouts yet. Run the quarterly calculation first.</div>
            ) : (
              quarters.map(q => {
                const qPayouts = payouts.filter(p => p.quarter === q)
                const qTotal   = qPayouts.reduce((s, p) => s + p.pool_share, 0)
                return (
                  <div key={q} className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider">{q}</h2>
                      <span className="text-sm font-bold text-[#2C2420]">{formatPrice(qTotal)} distributed</span>
                    </div>
                    <div className="bg-white rounded-2xl border border-[#EDE5DF] overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#F2EBE6] text-xs text-[#8C7B70] uppercase tracking-wider">
                            <th className="text-left px-5 py-3">Therapist</th>
                            <th className="text-center px-5 py-3">Bookings</th>
                            <th className="text-right px-5 py-3">Bonus</th>
                            <th className="text-center px-5 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F2EBE6]">
                          {qPayouts.map(p => (
                            <tr key={p.id} className="hover:bg-[#FBF6F0]">
                              <td className="px-5 py-3 font-semibold text-[#2C2420]">{(p.therapists as any)?.name ?? '—'}</td>
                              <td className="px-5 py-3 text-center text-[#8C7B70]">{p.booking_count}</td>
                              <td className="px-5 py-3 text-right font-bold text-[#C4714A]">{formatPrice(p.pool_share)}</td>
                              <td className="px-5 py-3 text-center">
                                {p.status === 'paid'
                                  ? <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Paid</span>
                                  : <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pending</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })
            )}
          </>
        )}
      </div>
    </div>
  )
}
