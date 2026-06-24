'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TherapistNav } from '@/components/therapist/therapist-nav'
import { Loader2, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const DAYS_AHEAD = 30

function buildDays() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    return d
  })
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function TherapistAvailabilityPage() {
  const router = useRouter()
  const [loading, setLoading]   = useState(true)
  const [blocked, setBlocked]   = useState<Set<string>>(new Set())
  const [saving,  setSaving]    = useState<string | null>(null)

  const days = buildDays()

  useEffect(() => { init() }, [])

  async function init() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/therapist/login'); return }

    const { data: t } = await supabase
      .from('therapists')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()
    if (!t) { router.replace('/therapist/login'); return }

    const { data: rows } = await supabase
      .from('therapist_availability')
      .select('date, is_blocked')
      .eq('therapist_id', t.id)
      .eq('is_blocked', true)

    setBlocked(new Set((rows ?? []).map(r => r.date)))
    setLoading(false)
  }

  async function toggle(date: string) {
    const willBlock = !blocked.has(date)
    setSaving(date)
    // Optimistic update
    setBlocked(prev => {
      const next = new Set(prev)
      willBlock ? next.add(date) : next.delete(date)
      return next
    })
    const res = await fetch('/api/therapist/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, blocked: willBlock }),
    })
    if (!res.ok) {
      // Revert on failure
      setBlocked(prev => {
        const next = new Set(prev)
        willBlock ? next.delete(date) : next.add(date)
        return next
      })
    }
    setSaving(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF6F0]">
        <Loader2 className="animate-spin text-[#C4714A]" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F2EE]">
      <TherapistNav />

      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-[#2C2420] mb-1">My availability</h1>
        <p className="text-sm text-[#8C7B70] mb-6">
          You&rsquo;re available for bookings every day by default. Tap any day to mark it as a <strong>day off</strong> — you won&rsquo;t receive bookings then.
        </p>

        <div className="flex flex-col gap-2">
          {days.map(d => {
            const date    = ymd(d)
            const isOff   = blocked.has(date)
            const isToday = ymd(new Date()) === date
            return (
              <button
                key={date}
                onClick={() => toggle(date)}
                disabled={saving === date}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors disabled:opacity-60',
                  isOff
                    ? 'bg-[#FEF2F2] border-[#FECACA]'
                    : 'bg-white border-[#EDE5DF] hover:border-[#6B8C6E]',
                )}
              >
                <div>
                  <p className="font-semibold text-[#2C2420] text-sm">
                    {d.toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' })}
                    {isToday && <span className="ml-2 text-[10px] font-bold text-[#C4714A]">TODAY</span>}
                  </p>
                  <p className={cn('text-xs mt-0.5', isOff ? 'text-[#B91C1C]' : 'text-[#6B8C6E]')}>
                    {isOff ? 'Day off — not accepting bookings' : 'Available'}
                  </p>
                </div>
                <span className={cn(
                  'flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full shrink-0',
                  saving === date ? 'text-[#8C7B70]'
                    : isOff ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#EBF3EC] text-[#2C4A2E]',
                )}>
                  {saving === date
                    ? <Loader2 size={13} className="animate-spin" />
                    : isOff ? <><X size={13}/> Day off</> : <><Check size={13}/> Available</>}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
