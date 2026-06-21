'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProgressBar } from '@/components/booking/progress-bar'
import { Button } from '@/components/ui/button'
import { useBooking } from '@/lib/booking-context'
import { TIME_SLOTS, SERVICES } from '@/lib/constants'
import { formatTime, cn } from '@/lib/utils'
import { addDays, format, startOfToday, isToday } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { useGeoCity } from '@/components/geo/city-context'

const DAYS_SHOWN = 14
const LEAD_HOURS  = 2  // must be at least this many hours ahead

function buildDays() {
  const today = startOfToday()
  return Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(today, i))
}

// Returns the earliest bookable hour for a given date (null = no restriction)
function earliestHour(day: Date): number | null {
  if (!isToday(day)) return null
  return new Date().getHours() + LEAD_HOURS
}

// Parse 'HH:MM' → hour integer
function slotHour(slot: string): number {
  return parseInt(slot.split(':')[0], 10)
}

export default function SchedulePage() {
  const router  = useRouter()
  const { draft, update } = useBooking()
  const { city: geoCity } = useGeoCity()

  const days = buildDays()
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    draft.date ? new Date(draft.date + 'T00:00:00') : null
  )
  const [selectedSlot, setSelectedSlot] = useState<string | null>(draft.timeSlot)
  const [startIdx, setStartIdx] = useState(0)
  const [slotCounts, setSlotCounts] = useState<Record<string, number>>({})
  const [countsLoading, setCountsLoading] = useState(false)
  const [isHuc, setIsHuc] = useState(false)

  useEffect(() => {
    if (!draft.serviceId) router.replace('/book')
  }, [draft.serviceId, router])

  useEffect(() => {
    // Use draft.cityId if already set (returning to this step), else fall back to geo-detected city
    const cityId = draft.cityId ?? geoCity?.id
    if (!cityId) return
    createClient()
      .from('cities')
      .select('is_huc')
      .eq('id', cityId)
      .single()
      .then(({ data }) => setIsHuc(data?.is_huc ?? false))
  }, [draft.cityId, geoCity])

  useEffect(() => {
    if (!selectedDate) return
    fetchSlotCounts(format(selectedDate, 'yyyy-MM-dd'))
  }, [selectedDate])

  async function fetchSlotCounts(date: string) {
    setCountsLoading(true)
    setSlotCounts({})
    const supabase = createClient()

    // Get therapists marked available for this date
    const [{ data: avail }, { data: therapists }, { data: bookings }, { data: barangayTherapists }] = await Promise.all([
      supabase
        .from('therapist_availability')
        .select('therapist_id')
        .eq('date', date)
        .eq('is_blocked', false),
      supabase
        .from('therapists')
        .select('id')
        .eq('is_active', true),
      // Existing confirmed bookings on this date (to exclude booked slots)
      supabase
        .from('bookings')
        .select('therapist_id, time_slot, service_id')
        .eq('booking_date', date)
        .in('status', ['confirmed', 'assigned', 'en_route', 'checked_in']),
      // Filter by barangay service area if customer selected one
      draft.barangayPsgc
        ? supabase
            .from('therapist_barangays')
            .select('therapist_id')
            .eq('barangay_psgc', draft.barangayPsgc)
            .eq('status', 'approved')
        : Promise.resolve({ data: null }),
    ])

    const availableIds  = new Set((avail ?? []).map(a => a.therapist_id))
    const activeIds     = new Set((therapists ?? []).map(t => t.id))
    const barangayIds   = barangayTherapists ? new Set(barangayTherapists.map(b => b.therapist_id)) : null

    // Therapists available today, active, and serving the customer's barangay
    const eligibleIds = [...availableIds].filter(id =>
      activeIds.has(id) && (barangayIds === null || barangayIds.has(id))
    )

    if (eligibleIds.length === 0) { setCountsLoading(false); return }

    const TRAVEL_BUFFER = 30 // minutes before and after

    // Convert 'HH:MM' to total minutes since midnight
    function toMins(slot: string) {
      const [h, m] = slot.split(':').map(Number)
      return h * 60 + m
    }

    // Build a map of therapist_id → list of blocked minute ranges [start, end]
    const blockedRanges: Record<string, [number, number][]> = {}
    for (const b of bookings ?? []) {
      if (!b.therapist_id || !b.time_slot) continue
      const duration = SERVICES.find(s => s.id === b.service_id)?.duration ?? 60
      const start = toMins(b.time_slot) - TRAVEL_BUFFER
      const end   = toMins(b.time_slot) + duration + TRAVEL_BUFFER
      if (!blockedRanges[b.therapist_id]) blockedRanges[b.therapist_id] = []
      blockedRanges[b.therapist_id].push([start, end])
    }

    // For a given slot, a therapist is unavailable if the slot's window overlaps any blocked range
    // Slot window: [slotStart - TRAVEL_BUFFER, slotStart + requestedDuration + TRAVEL_BUFFER]
    const requestedDuration = SERVICES.find(s => s.id === draft.serviceId)?.duration ?? 60

    const counts: Record<string, number> = {}
    for (const slot of allowedSlots) {
      const slotStart = toMins(slot)
      const slotEnd   = slotStart + requestedDuration
      counts[slot] = eligibleIds.filter(id => {
        const ranges = blockedRanges[id] ?? []
        return !ranges.some(([bStart, bEnd]) =>
          // overlap: requested window (with buffers) overlaps blocked range
          (slotStart - TRAVEL_BUFFER < bEnd) && (slotEnd + TRAVEL_BUFFER > bStart)
        )
      }).length
    }

    setSlotCounts(counts)
    setCountsLoading(false)
  }

  const visibleDays = days.slice(startIdx, startIdx + 7)

  // HUC: last slot 22:00 (sessions end by 11:30PM)
  // Non-HUC: last slot 20:30 (sessions end by 10PM for 90-min)
  const lastSlot = isHuc ? '22:00' : '20:30'
  const allowedSlots = TIME_SLOTS.filter(s => s <= lastSlot)

  function pickDate(day: Date) {
    setSelectedDate(day)
    setSelectedSlot(null)
    setSlotCounts({})
  }

  function next() {
    if (!selectedDate || !selectedSlot) return
    update({
      date:     format(selectedDate, 'yyyy-MM-dd'),
      timeSlot: selectedSlot,
    })
    router.push('/book/address')
  }

  return (
    <>
      <ProgressBar current={1} />

      <div className="container-alaga py-12 max-w-2xl">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-[#8C7B70] hover:text-[#2C2420] mb-6 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>

        <h1 className="text-2xl font-bold text-[#2C2420] mb-2">Pick a date &amp; time</h1>
        <p className="text-[#8C7B70] mb-8">Sessions are available daily, 9AM – 10PM.</p>

        {/* Date picker */}
        <div className="bg-white rounded-2xl border border-[#EDE5DF] p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold text-[#2C2420]">
              {format(visibleDays[0], 'MMM d')} – {format(visibleDays[visibleDays.length - 1], 'MMM d, yyyy')}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setStartIdx(Math.max(0, startIdx - 7))}
                disabled={startIdx === 0}
                className="p-1 rounded-lg hover:bg-[#F2EBE6] disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setStartIdx(Math.min(DAYS_SHOWN - 7, startIdx + 7))}
                disabled={startIdx >= DAYS_SHOWN - 7}
                className="p-1 rounded-lg hover:bg-[#F2EBE6] disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {visibleDays.map((day) => {
              const isSelected = selectedDate
                ? format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                : false

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => pickDate(day)}
                  className={cn(
                    'flex flex-col items-center py-3 rounded-xl transition-all',
                    isSelected
                      ? 'bg-[#C4714A] text-white'
                      : 'hover:bg-[#F2EBE6] text-[#2C2420]',
                  )}
                >
                  <span className="text-[10px] font-medium mb-1 opacity-70">
                    {format(day, 'EEE')}
                  </span>
                  <span className="text-sm font-bold">{format(day, 'd')}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Time slots */}
        {selectedDate && (
          <div className="bg-white rounded-2xl border border-[#EDE5DF] p-5 mb-6">
            <p className="font-semibold text-[#2C2420] mb-4">
              Available times for {format(selectedDate, 'EEEE, MMM d')}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {allowedSlots.map((slot) => {
                const minHour    = earliestHour(selectedDate)
                const isPast     = minHour !== null && slotHour(slot) < minHour
                const count      = slotCounts[slot] ?? null
                const noOne      = !countsLoading && count !== null && count === 0
                const isDisabled = isPast || noOne
                const isSelected = selectedSlot === slot && !isDisabled

                return (
                  <button
                    key={slot}
                    disabled={isDisabled}
                    onClick={() => !isDisabled && setSelectedSlot(slot)}
                    className={cn(
                      'py-2.5 px-1 rounded-xl text-sm font-medium border transition-all flex flex-col items-center gap-0.5',
                      isDisabled
                        ? 'border-[#EDE5DF] text-[#C8BDB8] bg-[#FAFAFA] cursor-not-allowed'
                        : isSelected
                          ? 'bg-[#C4714A] text-white border-[#C4714A]'
                          : 'border-[#EDE5DF] text-[#2C2420] hover:border-[#C4714A] hover:text-[#C4714A]',
                    )}
                  >
                    <span className={isPast ? 'line-through' : ''}>{formatTime(slot)}</span>
                    {!isPast && (
                      <span className={cn(
                        'text-[10px] font-normal',
                        isSelected ? 'text-white/80' : noOne ? 'text-[#C8BDB8]' : 'text-[#6B8C6E]',
                      )}>
                        {countsLoading ? '…' : noOne ? 'Full' : count !== null ? `${count} avail.` : ''}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {isToday(selectedDate) && (
              <p className="text-xs text-[#8C7B70] mt-4">
                Showing slots at least {LEAD_HOURS} hours from now. Greyed-out times are no longer available today.
              </p>
            )}
          </div>
        )}

        <Button
          size="lg"
          className="w-full"
          disabled={!selectedDate || !selectedSlot}
          onClick={next}
        >
          Continue
        </Button>
      </div>
    </>
  )
}
