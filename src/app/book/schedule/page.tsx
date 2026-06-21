'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProgressBar } from '@/components/booking/progress-bar'
import { Button } from '@/components/ui/button'
import { useBooking } from '@/lib/booking-context'
import { TIME_SLOTS } from '@/lib/constants'
import { formatTime, cn } from '@/lib/utils'
import { addDays, format, startOfToday, isToday } from 'date-fns'

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

  const days = buildDays()
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    draft.date ? new Date(draft.date + 'T00:00:00') : null
  )
  const [selectedSlot, setSelectedSlot] = useState<string | null>(draft.timeSlot)
  const [startIdx, setStartIdx] = useState(0)

  useEffect(() => {
    if (!draft.serviceId) router.replace('/book')
  }, [draft.serviceId, router])

  const visibleDays = days.slice(startIdx, startIdx + 7)

  function pickDate(day: Date) {
    setSelectedDate(day)
    setSelectedSlot(null)
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
              {TIME_SLOTS.map((slot) => {
                const minHour   = earliestHour(selectedDate)
                const isPast    = minHour !== null && slotHour(slot) < minHour
                const isSelected = selectedSlot === slot && !isPast

                return (
                  <button
                    key={slot}
                    disabled={isPast}
                    onClick={() => !isPast && setSelectedSlot(slot)}
                    className={cn(
                      'py-2.5 rounded-xl text-sm font-medium border transition-all',
                      isPast
                        ? 'border-[#EDE5DF] text-[#C8BDB8] bg-[#FAFAFA] cursor-not-allowed line-through'
                        : isSelected
                          ? 'bg-[#C4714A] text-white border-[#C4714A]'
                          : 'border-[#EDE5DF] text-[#2C2420] hover:border-[#C4714A] hover:text-[#C4714A]',
                    )}
                  >
                    {formatTime(slot)}
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
