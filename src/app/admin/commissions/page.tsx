'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { AdminNav } from '@/components/layout/admin-nav'
import { RefreshCw } from 'lucide-react'

type Commission = {
  id: string
  level: number
  amount: number
  status: string
  created_at: string
  paid_at: string | null
  bookings: { booking_date: string; service_id: string } | null
  beneficiary: { name: string } | null
  source_therapist: { name: string } | null
}

type Summary = {
  therapist_id: string
  name: string
  total_pending: number
  total_paid: number
  count_pending: number
}

export default function AdminCommissionsPage() {
  const [tab,         setTab]         = useState<'pending' | 'paid'>('pending')
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [summaries,   setSummaries]   = useState<Summary[]>([])
  const [loading,     setLoading]     = useState(true)
  const [marking,     setMarking]     = useState<string | null>(null)

  useEffect(() => { fetchAll() }, [tab])

  async function fetchAll() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('referral_commissions')
      .select(`
        id, level, amount, status, created_at, paid_at,
        bookings(booking_date, service_id),
        beneficiary:therapists!referral_commissions_beneficiary_id_fkey(name),
        source_therapist:therapists!referral_commissions_source_therapist_id_fkey(name)
      `)
      .eq('status', tab)
      .order('created_at', { ascending: false })

    setCommissions((data ?? []) as unknown as Commission[])

    // Build per-therapist summaries for pending
    if (tab === 'pending') {
      const map: Record<string, Summary> = {}
      for (const c of (data ?? []) as unknown as Commission[]) {
        const id   = (c as any).beneficiary_id ?? ''
        const name = c.beneficiary?.name ?? 'Unknown'
        if (!map[id]) map[id] = { therapist_id: id, name, total_pending: 0, total_paid: 0, count_pending: 0 }
        map[id].total_pending  += c.amount
        map[id].count_pending  += 1
      }
      setSummaries(Object.values(map).sort((a, b) => b.total_pending - a.total_pending))
    }

    setLoading(false)
  }

  async function markPaid(ids: string[]) {
    setMarking('batch')
    const supabase = createClient()
    await supabase
      .from('referral_commissions')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .in('id', ids)
    await fetchAll()
    setMarking(null)
  }

  const totalPending = commissions.reduce((s, c) => s + c.amount, 0)

  return (
    <div className="min-h-screen bg-[#F7F2EE]">
      <AdminNav onRefresh={fetchAll} refreshing={loading} />

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['pending', 'paid'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-semibold border capitalize transition-colors',
                tab === t
                  ? 'bg-[#2C2420] text-white border-[#2C2420]'
                  : 'border-[#EDE5DF] text-[#8C7B70] hover:border-[#2C2420] bg-white',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'pending' && summaries.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider">
                By therapist — total pending: {formatPrice(totalPending)}
              </h2>
              <button
                onClick={() => markPaid(commissions.map(c => c.id))}
                disabled={marking === 'batch'}
                className="text-xs font-semibold text-white bg-[#6B8C6E] px-3 py-1.5 rounded-lg hover:bg-[#5a7a5d] transition-colors disabled:opacity-50"
              >
                {marking === 'batch' ? 'Marking…' : `Mark all paid (${commissions.length})`}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
              {summaries.map(s => (
                <div key={s.therapist_id} className="bg-white rounded-xl border border-[#EDE5DF] p-4">
                  <p className="font-bold text-[#2C2420] text-sm truncate">{s.name}</p>
                  <p className="text-2xl font-bold text-[#C4714A] mt-1">{formatPrice(s.total_pending)}</p>
                  <p className="text-xs text-[#8C7B70] mt-0.5">{s.count_pending} commission{s.count_pending !== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-[#8C7B70]">Loading…</div>
        ) : commissions.length === 0 ? (
          <div className="text-center py-20 text-[#8C7B70]">No {tab} commissions.</div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#EDE5DF] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#F2EBE6] text-xs text-[#8C7B70] uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Earner</th>
                  <th className="text-left px-5 py-3">From booking by</th>
                  <th className="text-left px-5 py-3">Date</th>
                  <th className="text-center px-5 py-3">Level</th>
                  <th className="text-right px-5 py-3">Amount</th>
                  {tab === 'pending' && <th className="px-5 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EBE6]">
                {commissions.map(c => (
                  <tr key={c.id} className="hover:bg-[#FBF6F0] transition-colors">
                    <td className="px-5 py-3 font-semibold text-[#2C2420]">{c.beneficiary?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-[#8C7B70]">{c.source_therapist?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-[#8C7B70]">
                      {c.bookings?.booking_date ? formatDate(c.bookings.booking_date) : '—'}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        c.level === 1 ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700',
                      )}>
                        L{c.level}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-[#2C2420]">{formatPrice(c.amount)}</td>
                    {tab === 'pending' && (
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => markPaid([c.id])}
                          disabled={!!marking}
                          className="text-xs text-[#6B8C6E] font-semibold hover:underline disabled:opacity-40"
                        >
                          Mark paid
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
