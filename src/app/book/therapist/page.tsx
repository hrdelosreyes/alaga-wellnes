'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronLeft, Star, ShieldCheck, CalendarX } from 'lucide-react'
import { ProgressBar } from '@/components/booking/progress-bar'
import { Button } from '@/components/ui/button'
import { useBooking } from '@/lib/booking-context'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Therapist, GenderPreference, TherapistSelectionMode } from '@/types'

export default function TherapistPage() {
  const router = useRouter()
  const { draft, update } = useBooking()

  const [therapists,    setTherapists]    = useState<Therapist[]>([])
  const [therapistRates,setTherapistRates]= useState<Record<string, number>>({})
  const [cityBaseRate,  setCityBaseRate]  = useState<number | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [filter,        setFilter]        = useState<GenderPreference>('any')
  const [selected,      setSelected]      = useState<string | null>(draft.therapistId)
  const [mode,          setMode]          = useState<TherapistSelectionMode>('customer_pick')

  useEffect(() => {
    if (!draft.serviceId) { router.replace('/book'); return }
    loadTherapists()
  }, [draft.serviceId])

  async function loadTherapists() {
    setLoading(true)
    const supabase = createClient()

    // Get therapist IDs that have marked themselves available on the selected date
    // (row exists and is_blocked = false)
    const { data: availability } = await supabase
      .from('therapist_availability')
      .select('therapist_id')
      .eq('date', draft.date)
      .eq('is_blocked', false)

    const availableIds = (availability ?? []).map(a => a.therapist_id)

    if (availableIds.length === 0) {
      setTherapists([])
      setLoading(false)
      return
    }

    // If the customer selected a barangay, further filter to therapists who serve it
    let eligibleIds = availableIds
    if (draft.barangayPsgc) {
      const { data: serviceArea } = await supabase
        .from('therapist_barangays')
        .select('therapist_id')
        .eq('barangay_psgc', draft.barangayPsgc)
        .eq('status', 'approved')
        .in('therapist_id', availableIds)
      eligibleIds = (serviceArea ?? []).map(r => r.therapist_id)
    }

    if (eligibleIds.length === 0) {
      setTherapists([])
      setLoading(false)
      return
    }

    const [{ data }, { data: rateData }, { data: cityRate }] = await Promise.all([
      supabase
        .from('therapists')
        .select('*')
        .eq('is_active', true)
        .in('id', eligibleIds)
        .order('rating_avg', { ascending: false }),
      // Each therapist's rate for the selected service
      supabase
        .from('therapist_rates')
        .select('therapist_id, rate')
        .eq('service_id', draft.serviceId)
        .in('therapist_id', eligibleIds),
      // City base rate (shown on Best Available card)
      draft.cityId
        ? supabase
            .from('city_service_rates')
            .select('base_rate')
            .eq('city_id', draft.cityId)
            .eq('service_id', draft.serviceId)
            .single()
        : Promise.resolve({ data: null }),
    ])

    const rateMap: Record<string, number> = {}
    for (const r of rateData ?? []) rateMap[r.therapist_id] = r.rate

    setTherapists(data ?? [])
    setTherapistRates(rateMap)
    setCityBaseRate((cityRate as any)?.base_rate ?? null)
    setLoading(false)
  }

  const filtered = therapists.filter(t =>
    filter === 'any' ? true : t.gender === filter
  )

  function pickTherapist(id: string) {
    setMode('customer_pick')
    setSelected(id)
  }

  function next() {
    update({
      therapistId:      selected,
      selectionMode:    'customer_pick',
      genderPreference: filter,
      resolvedPrice:    selected ? (therapistRates[selected] ?? cityBaseRate) : cityBaseRate,
    })
    router.push('/book/preferences')
  }

  const canContinue = selected !== null

  return (
    <>
      <ProgressBar current={2} />

      <div className="container-alaga py-12 max-w-2xl">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-[#8C7B70] hover:text-[#2C2420] mb-6 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>

        <h1 className="text-2xl font-bold text-[#2C2420] mb-2">Choose your therapist</h1>
        <p className="text-[#8C7B70] mb-6">All therapists are NBI-cleared and TESDA-certified.</p>

        {/* Gender filter */}
        <div className="flex gap-2 mb-6">
          {(['any', 'female', 'male'] as GenderPreference[]).map(g => (
            <button
              key={g}
              onClick={() => setFilter(g)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize',
                filter === g
                  ? 'bg-[#2C2420] text-white border-[#2C2420]'
                  : 'border-[#EDE5DF] text-[#8C7B70] hover:border-[#C4714A]',
              )}
            >
              {g === 'any' ? 'Any gender' : g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4">

          {/* Therapist list */}
          {loading ? (
            <div className="text-center py-10 text-[#8C7B70] text-sm">Finding available therapists…</div>
          ) : therapists.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-[#EDE5DF] p-8">
              <CalendarX size={36} className="text-[#C4714A] mx-auto mb-3" />
              <p className="font-semibold text-[#2C2420] mb-1">No therapists available for this slot</p>
              <p className="text-sm text-[#8C7B70] mb-5">All our therapists are booked for this date and time. Please try a different schedule.</p>
              <button
                onClick={() => router.push('/book/schedule')}
                className="text-sm font-semibold text-[#C4714A] hover:underline"
              >
                ← Change date or time
              </button>
            </div>
          ) : (
            filtered.map(t => {
              const isSelected = selected === t.id && mode === 'customer_pick'

              return (
                <button
                  key={t.id}
                  onClick={() => pickTherapist(t.id)}
                  className={cn(
                    'w-full text-left rounded-2xl border-2 p-5 transition-all',
                    isSelected
                      ? 'border-[#C4714A] bg-[#FFF7F3]'
                      : 'border-[#EDE5DF] bg-white hover:border-[#C4714A]',
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full bg-[#F2D9CC] flex items-center justify-center text-xl font-bold text-[#C4714A] flex-shrink-0">
                      {t.name.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#2C2420]">{t.name}</span>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {therapistRates[t.id] && (
                            <span className="text-base font-bold text-[#C4714A]">
                              ₱{therapistRates[t.id].toLocaleString()}
                            </span>
                          )}
                          <div className="flex items-center gap-1 text-sm font-semibold text-[#2C2420]">
                            <Star size={13} fill="#C9A84C" className="text-[#C9A84C]" />
                            {t.rating_avg}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-[#8C7B70] mt-0.5 mb-2">
                        {t.total_bookings} sessions · {t.zone}
                        {' · '}
                        {t.gender === 'female' ? 'Female' : 'Male'}
                      </p>

                      {t.bio && (
                        <p className="text-sm text-[#8C7B70] leading-relaxed mb-3 line-clamp-2">
                          &ldquo;{t.bio}&rdquo;
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-1.5">
                        {t.specialties.slice(0, 3).map(s => (
                          <span key={s} className="text-xs bg-[#F2EBE6] text-[#8C7B70] px-2 py-0.5 rounded-full">
                            {s}
                          </span>
                        ))}
                        {t.nbi_cleared && (
                          <span className="badge-verified">
                            <ShieldCheck size={10} /> NBI
                          </span>
                        )}
                        {t.tesda_certified && (
                          <span className="badge-verified">
                            <ShieldCheck size={10} /> TESDA
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1',
                      isSelected ? 'border-[#C4714A] bg-[#C4714A]' : 'border-[#D1C4BC]',
                    )} />
                  </div>
                </button>
              )
            })
          )}
        </div>

        <div className="mt-8">
          <Button size="lg" className="w-full" disabled={!canContinue} onClick={next}>
            Continue
          </Button>
          {selected && (
            <p className="text-center text-xs text-[#8C7B70] mt-3">
              Your slot will be held for 10 minutes while you complete the booking.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
