'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ServiceId = 'relax-60' | 'recovery-90' | 'hilot-75'

const SERVICES: { id: ServiceId; label: string; duration: string; description: string }[] = [
  { id: 'relax-60',    label: 'Alaga Relax', duration: '60 min', description: 'Full-body relaxation massage' },
  { id: 'hilot-75',    label: 'Alaga Hilot', duration: '75 min', description: 'Traditional Filipino healing massage' },
  { id: 'recovery-90', label: 'Recovery',    duration: '90 min', description: 'Deep tissue + stretching' },
]

type Band = { min_rate: number; base_rate: number; max_rate: number }

function TherapistRatesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextUrl = searchParams.get('next')

  const [therapistId, setTherapistId] = useState<string | null>(null)
  const [cityId,      setCityId]      = useState<string | null>(null)
  const [bands,       setBands]       = useState<Record<ServiceId, Band>>({} as Record<ServiceId, Band>)
  const [rates,       setRates]       = useState<Record<ServiceId, number>>({} as Record<ServiceId, number>)
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/therapist/login'); return }

    const { data: t } = await supabase
      .from('therapists')
      .select('id, city_id')
      .eq('email', user.email)
      .single()

    if (!t) { router.replace('/therapist/login'); return }
    setTherapistId(t.id)
    setCityId(t.city_id)

    // Load city bands + therapist's current rates in parallel
    const [{ data: bandData }, { data: rateData }] = await Promise.all([
      supabase.from('city_service_rates').select('*').eq('city_id', t.city_id),
      supabase.from('therapist_rates').select('*').eq('therapist_id', t.id),
    ])

    const bandMap: Record<ServiceId, Band> = {} as Record<ServiceId, Band>
    for (const b of bandData ?? []) bandMap[b.service_id as ServiceId] = b

    const rateMap: Record<ServiceId, number> = {} as Record<ServiceId, number>
    for (const r of rateData ?? []) rateMap[r.service_id as ServiceId] = r.rate
    // Default to base_rate if therapist hasn't set a rate yet
    for (const svc of SERVICES) {
      if (!rateMap[svc.id] && bandMap[svc.id]) rateMap[svc.id] = bandMap[svc.id].base_rate
    }

    setBands(bandMap)
    setRates(rateMap)
    setLoading(false)
  }

  async function save() {
    if (!therapistId) return
    setSaving(true)
    const supabase = createClient()
    const rows = SERVICES.map(s => ({
      therapist_id: therapistId,
      service_id:   s.id,
      rate:         rates[s.id],
      updated_at:   new Date().toISOString(),
    }))
    await supabase.from('therapist_rates').upsert(rows, { onConflict: 'therapist_id,service_id' })
    setSaving(false)
    if (nextUrl) {
      router.push(nextUrl)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
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
      <div className="bg-[#2C2420] text-white px-5 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/therapist/dashboard')} className="p-1 hover:opacity-70">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-bold text-base">My rates</h1>
          <p className="text-xs text-[#C8A88A]">Set what you charge per service</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <p className="text-sm text-[#8C7B70] mb-6">
          Your rates must stay within the range set for your city. Clients see your rate before booking.
        </p>

        <div className="flex flex-col gap-4">
          {SERVICES.map(svc => {
            const band = bands[svc.id]
            const rate = rates[svc.id] ?? band?.base_rate ?? 0
            if (!band) return null

            const pct = Math.round(((rate - band.min_rate) / (band.max_rate - band.min_rate)) * 100)

            return (
              <div key={svc.id} className="bg-white rounded-2xl border border-[#EDE5DF] p-5">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="font-bold text-[#2C2420]">{svc.label}</p>
                    <p className="text-xs text-[#8C7B70]">{svc.duration} · {svc.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-[#2C2420]">₱{rate.toLocaleString()}</span>
                  </div>
                </div>

                {/* Slider */}
                <div className="mt-4">
                  <input
                    type="range"
                    min={band.min_rate}
                    max={band.max_rate}
                    step={50}
                    value={rate}
                    onChange={e => setRates(prev => ({ ...prev, [svc.id]: parseInt(e.target.value) }))}
                    className="w-full accent-[#C4714A]"
                  />
                  <div className="flex justify-between text-xs text-[#8C7B70] mt-1">
                    <span>Min ₱{band.min_rate.toLocaleString()}</span>
                    <span className={cn(
                      'font-semibold',
                      rate === band.base_rate ? 'text-[#C4714A]' : 'text-[#8C7B70]',
                    )}>
                      {rate === band.base_rate ? 'Suggested ₱' + band.base_rate.toLocaleString() : `${pct}% of range`}
                    </span>
                    <span>Max ₱{band.max_rate.toLocaleString()}</span>
                  </div>
                </div>

                {/* Manual input */}
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-sm text-[#8C7B70]">Or type:</span>
                  <input
                    type="number"
                    min={band.min_rate}
                    max={band.max_rate}
                    step={50}
                    value={rate}
                    onChange={e => {
                      const v = Math.min(band.max_rate, Math.max(band.min_rate, parseInt(e.target.value) || band.min_rate))
                      setRates(prev => ({ ...prev, [svc.id]: v }))
                    }}
                    className="w-28 border border-[#EDE5DF] rounded-xl px-3 py-1.5 text-sm text-center focus:outline-none focus:border-[#C4714A]"
                  />
                  <button
                    onClick={() => setRates(prev => ({ ...prev, [svc.id]: band.base_rate }))}
                    className="text-xs text-[#C4714A] hover:underline"
                  >
                    Reset to suggested
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <Button size="lg" className="w-full mt-6" loading={saving} onClick={save}>
          {saved ? '✓ Rates saved!' : 'Save my rates'}
        </Button>

        <p className="text-center text-xs text-[#8C7B70] mt-3">
          You can update your rates anytime. Changes apply to new bookings only.
        </p>
      </div>
    </div>
  )
}

export default function TherapistRatesPageWrapper() { return <Suspense><TherapistRatesPage /></Suspense> }
