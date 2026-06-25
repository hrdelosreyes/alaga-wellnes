'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Banknote, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TherapistNav } from '@/components/therapist/therapist-nav'
import { cn, formatPrice, formatDate } from '@/lib/utils'

type PayoutRecord = {
  amount: number
  sent_at: string | null
  created_at: string
  method: string | null
  destination: string | null
  reference_no: string | null
}

type Method = 'gcash' | 'maya' | 'bank'

const METHODS: { id: Method; label: string }[] = [
  { id: 'gcash', label: 'GCash' },
  { id: 'maya',  label: 'Maya' },
  { id: 'bank',  label: 'Bank' },
]

export default function TherapistPayoutPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [method,        setMethod]        = useState<Method | null>(null)
  const [accountName,   setAccountName]   = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [bankName,      setBankName]      = useState('')
  const [history,       setHistory]       = useState<PayoutRecord[]>([])

  useEffect(() => {
    fetch('/api/therapist/payout-details')
      .then(async res => {
        if (res.status === 401 || res.status === 403) { router.replace('/therapist/login'); return null }
        return res.json()
      })
      .then(d => {
        if (d?.details) {
          setMethod(d.details.payout_method ?? null)
          setAccountName(d.details.payout_account_name ?? '')
          setAccountNumber(d.details.payout_account_number ?? '')
          setBankName(d.details.payout_bank_name ?? '')
        }
        if (d?.history) setHistory(d.history)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [router])

  async function save() {
    setError(null)
    setSaving(true)
    const res = await fetch('/api/therapist/payout-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, accountName, accountNumber, bankName }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Could not save. Please try again.')
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF6F0]">
        <Loader2 className="animate-spin text-[#C4714A]" size={32} />
      </div>
    )
  }

  const isWallet = method === 'gcash' || method === 'maya'
  const numberLabel = isWallet ? 'Mobile number' : 'Account number'
  const numberPlaceholder = isWallet ? '0917 123 4567' : '0000 0000 0000'

  return (
    <div className="min-h-screen bg-[#F7F2EE]">
      <TherapistNav />

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-1">
          <Banknote size={22} className="text-[#C4714A]" />
          <h1 className="text-2xl font-bold text-[#2C2420]">Payout details</h1>
        </div>
        <p className="text-sm text-[#8C7B70] mb-6">
          This is where Alaga sends your earnings. Payouts are processed weekly. Make sure the account
          name matches your registered name to avoid delays.
        </p>

        <div className="bg-white rounded-2xl border border-[#EDE5DF] p-5 flex flex-col gap-5">
          {/* Method */}
          <div>
            <label className="text-sm font-semibold text-[#2C2420] mb-2 block">Payout method</label>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={cn(
                    'py-2.5 rounded-xl text-sm font-semibold border transition-colors',
                    method === m.id
                      ? 'bg-[#2C2420] text-white border-[#2C2420]'
                      : 'bg-white text-[#8C7B70] border-[#EDE5DF] hover:border-[#C4714A]',
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {method && (
            <>
              {method === 'bank' && (
                <div>
                  <label className="text-sm font-semibold text-[#2C2420] mb-1.5 block">Bank name</label>
                  <input
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    placeholder="e.g. BPI, BDO, UnionBank"
                    className="w-full border border-[#EDE5DF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C4714A]"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-[#2C2420] mb-1.5 block">{numberLabel}</label>
                <input
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  placeholder={numberPlaceholder}
                  inputMode={isWallet ? 'tel' : 'numeric'}
                  className="w-full border border-[#EDE5DF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C4714A]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-[#2C2420] mb-1.5 block">Account name</label>
                <input
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  placeholder="Full name on the account"
                  className="w-full border border-[#EDE5DF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C4714A]"
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button size="lg" className="w-full" loading={saving} disabled={!method} onClick={save}>
            {saved ? <span className="flex items-center gap-1.5"><CheckCircle2 size={16} /> Saved!</span> : 'Save payout details'}
          </Button>
        </div>

        <p className="text-center text-xs text-[#8C7B70] mt-4">
          Your earnings are 75% of each completed session. See your balance on the dashboard.
        </p>

        {/* Payout history */}
        <div className="mt-2">
          <h2 className="text-sm font-bold text-[#2C2420] mb-3">Payout history</h2>
          {history.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#EDE5DF] p-5 text-center text-sm text-[#8C7B70]">
              No payouts yet. Once Alaga sends your earnings, each payment will appear here with its reference number.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#EDE5DF] overflow-hidden divide-y divide-[#F2EBE6]">
              {history.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#2C2420]">
                      {p.sent_at ? formatDate(p.sent_at.slice(0, 10)) : formatDate(p.created_at.slice(0, 10))}
                    </p>
                    <p className="text-xs text-[#8C7B70] truncate mt-0.5">
                      {p.destination || (p.method ? p.method.toUpperCase() : 'Manual')}
                      {p.reference_no && <span> · Ref {p.reference_no}</span>}
                    </p>
                  </div>
                  <span className="font-bold text-[#6B8C6E] shrink-0">{formatPrice(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
