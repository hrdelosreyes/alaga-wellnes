'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AdminNav } from '@/components/layout/admin-nav'
import { Loader2, ShieldAlert, Check, X, MessageCircle, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

type Flag = {
  id: string
  source: 'message' | 'review'
  booking_id: string | null
  therapist_id: string | null
  therapist_name: string | null
  sender: 'customer' | 'therapist' | null
  category: string
  severity: 'low' | 'medium' | 'high'
  reason: string
  excerpt: string
  status: 'open' | 'reviewed' | 'dismissed'
  created_at: string
}

const CATEGORY_LABELS: Record<string, string> = {
  off_platform_payment: 'Off-platform payment',
  sexual_or_harassment: 'Harassment / inappropriate',
  safety_concern:       'Safety concern',
  scam_or_spam:         'Scam / spam',
}

const SEVERITY_STYLES: Record<string, string> = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-[#F9EAD9] text-[#A05938]',
  low:    'bg-[#F2EBE6] text-[#6E5F55]',
}

const FILTERS = ['open', 'reviewed', 'dismissed', 'all'] as const

export default function AdminSafetyPage() {
  const router = useRouter()
  const [flags,    setFlags]    = useState<Flag[] | null>(null)  // null = loading
  const [filter,   setFilter]   = useState<(typeof FILTERS)[number]>('open')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/admin/login'); return }
      const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()
      if (roleRow?.role !== 'admin' && roleRow?.role !== 'staff') { router.replace('/admin/login') }
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    fetch('/api/admin/safety?status=open')
      .then(res => res.ok ? res.json() : { flags: [] })
      .then(d => setFlags(d.flags ?? []))
      .catch(() => setFlags([]))
  }, [])

  function changeFilter(f: (typeof FILTERS)[number]) {
    setFilter(f)
    setFlags(null)
    fetch(`/api/admin/safety?status=${f}`)
      .then(res => res.ok ? res.json() : { flags: [] })
      .then(d => setFlags(d.flags ?? []))
      .catch(() => setFlags([]))
  }

  async function setStatus(id: string, status: Flag['status']) {
    setUpdating(id)
    const res = await fetch('/api/admin/safety', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    if (res.ok) {
      setFlags(prev => prev && (filter === 'all'
        ? prev.map(f => f.id === id ? { ...f, status } : f)
        : prev.filter(f => f.id !== id)))
    }
    setUpdating(null)
  }

  return (
    <div className="min-h-screen bg-[#F7F2EE]">
      <AdminNav subtitle="Safety" />

      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-[#2C2420] flex items-center gap-2">
            <ShieldAlert size={22} className="text-[#C4714A]" /> Safety flags
          </h1>
          <div className="flex items-center gap-1.5">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => changeFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors',
                  filter === f ? 'bg-[#2C2420] text-white' : 'bg-white border border-[#EDE5DF] text-[#6E5F55] hover:border-[#C4714A]',
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-[#6E5F55]">
          Chat messages and reviews are screened automatically by AI. Flags are signals for human review — always read the excerpt and check the booking before acting.
        </p>

        {flags === null ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#C4714A]" size={28} /></div>
        ) : flags.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#EDE5DF] p-10 text-center text-sm text-[#6E5F55]">
            No {filter === 'all' ? '' : filter} flags. All clear!
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {flags.map(f => (
              <div key={f.id} className="bg-white rounded-2xl border border-[#EDE5DF] p-4">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full', SEVERITY_STYLES[f.severity])}>
                    {f.severity.toUpperCase()}
                  </span>
                  <span className="text-xs font-semibold text-[#2C2420]">
                    {CATEGORY_LABELS[f.category] ?? f.category}
                  </span>
                  <span className="text-[11px] text-[#6E5F55] flex items-center gap-1">
                    {f.source === 'message' ? <MessageCircle size={11} /> : <Star size={11} />}
                    {f.source === 'message' ? `Chat message from ${f.sender ?? 'unknown'}` : 'Customer review'}
                  </span>
                  <span className="text-[11px] text-[#C8BDB8] ml-auto">
                    {new Date(f.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>

                <p className="text-sm text-[#2C2420] bg-[#FBF6F0] border border-[#F2EBE6] rounded-lg px-3 py-2 mb-2 whitespace-pre-wrap">
                  &ldquo;{f.excerpt}&rdquo;
                </p>
                <p className="text-xs text-[#6E5F55] mb-3">{f.reason}</p>

                <div className="flex items-center gap-2 flex-wrap">
                  {f.therapist_name && (
                    <span className="text-xs text-[#6E5F55]">Therapist: <strong className="text-[#2C2420]">{f.therapist_name}</strong></span>
                  )}
                  {f.booking_id && (
                    <Link href={`/admin/bookings`} className="text-xs text-[#C4714A] hover:underline">
                      Booking {f.booking_id.slice(0, 8)}…
                    </Link>
                  )}

                  <div className="ml-auto flex items-center gap-1.5">
                    {f.status !== 'reviewed' && (
                      <button
                        onClick={() => setStatus(f.id, 'reviewed')}
                        disabled={updating === f.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#6B8C6E] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
                      >
                        <Check size={12} /> Mark reviewed
                      </button>
                    )}
                    {f.status !== 'dismissed' && (
                      <button
                        onClick={() => setStatus(f.id, 'dismissed')}
                        disabled={updating === f.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#EDE5DF] text-[#6E5F55] text-xs font-semibold hover:border-[#C4714A] disabled:opacity-40 transition-colors"
                      >
                        <X size={12} /> Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
