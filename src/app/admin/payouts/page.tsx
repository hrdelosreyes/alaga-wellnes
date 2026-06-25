'use client'

import { useEffect, useState } from 'react'
import { formatPrice } from '@/lib/utils'
import { AdminNav } from '@/components/layout/admin-nav'
import { Loader2, Wallet } from 'lucide-react'

type Row = {
  therapist_id: string
  name: string
  earned: number
  paidOut: number
  pending: number
}

export default function AdminPayoutsPage() {
  const [rows,    setRows]    = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [paying,  setPaying]  = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/payouts')
    const data = await res.json().catch(() => ({ rows: [] }))
    setRows(data.rows ?? [])
    setLoading(false)
  }

  async function recordPayout(row: Row) {
    const input = window.prompt(
      `Record a payout to ${row.name}.\nPending balance: ${formatPrice(row.pending)}\n\nEnter amount to pay (₱):`,
      String(row.pending),
    )
    if (input === null) return
    const amount = Math.round(Number(input))
    if (!amount || amount <= 0) { alert('Enter a positive amount.'); return }

    setPaying(row.therapist_id)
    const res = await fetch('/api/admin/payouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ therapistId: row.therapist_id, amount }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      alert(d.error ?? 'Could not record payout.')
    } else {
      await load()
    }
    setPaying(null)
  }

  const totalPending = rows.reduce((s, r) => s + r.pending, 0)
  const totalPaid    = rows.reduce((s, r) => s + r.paidOut, 0)
  const totalEarned  = rows.reduce((s, r) => s + r.earned, 0)

  return (
    <div className="min-h-screen bg-[#F7F2EE]">
      <AdminNav />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-1">
          <Wallet size={20} className="text-[#C4714A]" />
          <h1 className="text-2xl font-bold text-[#2C2420]">Therapist payouts</h1>
        </div>
        <p className="text-sm text-[#8C7B70] mb-6">Session take-home is 75% of each completed booking. Record payouts as you send them.</p>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-[#EDE5DF] p-4 text-center">
            <p className="text-xl font-bold text-[#2C2420]">{formatPrice(totalEarned)}</p>
            <p className="text-[10px] text-[#8C7B70] mt-1">Total earned (all)</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EDE5DF] p-4 text-center">
            <p className="text-xl font-bold text-[#6B8C6E]">{formatPrice(totalPaid)}</p>
            <p className="text-[10px] text-[#8C7B70] mt-1">Total paid out</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EDE5DF] p-4 text-center">
            <p className="text-xl font-bold text-[#C4714A]">{formatPrice(totalPending)}</p>
            <p className="text-[10px] text-[#8C7B70] mt-1">Total pending</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20"><Loader2 className="animate-spin text-[#C4714A] mx-auto" size={28} /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 text-[#8C7B70]">No therapist earnings yet.</div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#EDE5DF] overflow-hidden divide-y divide-[#F2EBE6]">
            {rows.map(row => (
              <div key={row.therapist_id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#2C2420] truncate">{row.name}</p>
                  <p className="text-xs text-[#8C7B70] mt-0.5">
                    Earned {formatPrice(row.earned)} · Paid {formatPrice(row.paidOut)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[#C4714A]">{formatPrice(row.pending)}</p>
                  <p className="text-[10px] text-[#8C7B70]">pending</p>
                </div>
                <button
                  onClick={() => recordPayout(row)}
                  disabled={paying === row.therapist_id || row.pending <= 0}
                  className="text-xs font-semibold bg-[#2C2420] text-white px-4 py-2 rounded-xl hover:bg-[#C4714A] transition-colors disabled:opacity-40 whitespace-nowrap"
                >
                  {paying === row.therapist_id ? 'Saving…' : 'Record payout'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
