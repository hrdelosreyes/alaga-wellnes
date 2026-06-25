'use client'

import { useEffect, useState } from 'react'
import { formatPrice } from '@/lib/utils'
import { AdminNav } from '@/components/layout/admin-nav'
import { Loader2, Wallet, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Row = {
  therapist_id: string
  name: string
  earned: number
  paidOut: number
  pending: number
  payout_method: string | null
  payout_account_name: string | null
  payout_account_number: string | null
  payout_bank_name: string | null
}

const MIN_PAYOUT = 500

function destinationLabel(row: Row): string | null {
  if (!row.payout_method) return null
  const label = row.payout_method === 'gcash' ? 'GCash'
    : row.payout_method === 'maya' ? 'Maya'
    : (row.payout_bank_name || 'Bank')
  return [label, row.payout_account_number, row.payout_account_name].filter(Boolean).join(' · ')
}

export default function AdminPayoutsPage() {
  const [rows,    setRows]    = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [paying,  setPaying]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // Modal state
  const [active,    setActive]    = useState<Row | null>(null)
  const [amount,    setAmount]    = useState('')
  const [reference, setReference] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/payouts')
    const data = await res.json().catch(() => ({ rows: [] }))
    setRows(data.rows ?? [])
    setLoading(false)
  }

  function openModal(row: Row) {
    setActive(row)
    setAmount(String(row.pending))
    setReference('')
    setError(null)
  }

  async function submitPayout() {
    if (!active) return
    const amt = Math.round(Number(amount))
    if (!amt || amt <= 0) { setError('Enter a positive amount.'); return }

    setPaying(true)
    setError(null)
    const res = await fetch('/api/admin/payouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ therapistId: active.therapist_id, amount: amt, referenceNo: reference }),
    })
    setPaying(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Could not record payout.')
      return
    }
    setActive(null)
    await load()
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
        <p className="text-sm text-[#8C7B70] mb-6">
          Take-home is 75% of each completed booking. Pay weekly via the therapist&rsquo;s saved method,
          then record the transaction reference here. Suggested minimum per payout: {formatPrice(MIN_PAYOUT)}.
        </p>

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
            {rows.map(row => {
              const dest = destinationLabel(row)
              return (
                <div key={row.therapist_id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#2C2420] truncate">{row.name}</p>
                    <p className="text-xs text-[#8C7B70] mt-0.5">
                      Earned {formatPrice(row.earned)} · Paid {formatPrice(row.paidOut)}
                    </p>
                    {dest ? (
                      <p className="text-xs text-[#6B8C6E] mt-1 truncate">{dest}</p>
                    ) : (
                      <p className="text-xs text-[#C4714A] mt-1 flex items-center gap-1">
                        <AlertCircle size={12} /> No payout details on file
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#C4714A]">{formatPrice(row.pending)}</p>
                    <p className="text-[10px] text-[#8C7B70]">pending</p>
                  </div>
                  <button
                    onClick={() => openModal(row)}
                    disabled={row.pending <= 0}
                    className="text-xs font-semibold bg-[#2C2420] text-white px-4 py-2 rounded-xl hover:bg-[#C4714A] transition-colors disabled:opacity-40 whitespace-nowrap"
                  >
                    Record payout
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Record-payout modal */}
      {active && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => !paying && setActive(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-lg font-bold text-[#2C2420]">Record payout</h2>
              <button onClick={() => !paying && setActive(null)} className="text-[#8C7B70] hover:text-[#2C2420]"><X size={18} /></button>
            </div>
            <p className="text-sm text-[#8C7B70] mb-4">{active.name} · pending {formatPrice(active.pending)}</p>

            {/* Destination */}
            {destinationLabel(active) ? (
              <div className="bg-[#F3F6F2] border border-[#D9E5D8] rounded-xl px-3 py-2.5 mb-4">
                <p className="text-[10px] text-[#6B8C6E] uppercase tracking-wide font-semibold">Send to</p>
                <p className="text-sm text-[#2C2420] mt-0.5">{destinationLabel(active)}</p>
              </div>
            ) : (
              <div className="bg-[#FCF3EE] border border-[#EAD0C2] rounded-xl px-3 py-2.5 mb-4 flex items-start gap-2">
                <AlertCircle size={15} className="text-[#C4714A] mt-0.5 shrink-0" />
                <p className="text-sm text-[#9A4A28]">
                  This therapist hasn&rsquo;t added payout details yet. Ask them to fill in their
                  payout method in the therapist portal before sending.
                </p>
              </div>
            )}

            <label className="text-sm font-semibold text-[#2C2420] mb-1.5 block">Amount paid (₱)</label>
            <input
              type="number" min={1} value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full border border-[#EDE5DF] rounded-xl px-3 py-2.5 text-sm mb-4 focus:outline-none focus:border-[#C4714A]"
            />

            <label className="text-sm font-semibold text-[#2C2420] mb-1.5 block">
              Reference number <span className="text-[#8C7B70] font-normal">(from GCash/bank receipt)</span>
            </label>
            <input
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="e.g. 1234567890"
              className="w-full border border-[#EDE5DF] rounded-xl px-3 py-2.5 text-sm mb-4 focus:outline-none focus:border-[#C4714A]"
            />

            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

            <button
              onClick={submitPayout}
              disabled={paying}
              className={cn(
                'w-full font-semibold text-white py-3 rounded-xl transition-colors',
                'bg-[#2C2420] hover:bg-[#C4714A] disabled:opacity-50',
              )}
            >
              {paying ? 'Saving…' : 'Mark as paid'}
            </button>
            <p className="text-[11px] text-[#8C7B70] text-center mt-2">
              This records that you sent the money. It does not transfer funds automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
