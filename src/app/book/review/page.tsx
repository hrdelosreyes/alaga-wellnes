'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronLeft, MapPin, Clock, User, Calendar } from 'lucide-react'
import { ProgressBar } from '@/components/booking/progress-bar'
import { Button } from '@/components/ui/button'
import { useBooking } from '@/lib/booking-context'
import { SERVICES, TRANSPORT_FEE } from '@/lib/constants'
import { formatPrice, formatDate, formatTime } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

export default function ReviewPage() {
  const router = useRouter()
  const { draft } = useBooking()
  const [loading,  setLoading]  = useState(false)
  const [priceLoading, setPriceLoading] = useState(false)
  const [subtotal, setSubtotal] = useState<number | null>(draft.resolvedPrice)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    if (!draft.serviceId) { router.replace('/book'); return }
    // If resolvedPrice wasn't stored (e.g. user navigated back), re-fetch it
    if (!subtotal && draft.cityId) resolvePrice()
  }, [draft.serviceId])

  async function resolvePrice() {
    setPriceLoading(true)
    const supabase = createClient()
    if (draft.therapistId) {
      // Use the specific therapist's rate
      const { data } = await supabase
        .from('therapist_rates')
        .select('rate')
        .eq('therapist_id', draft.therapistId)
        .eq('service_id', draft.serviceId)
        .single()
      setSubtotal(data?.rate ?? null)
    } else {
      // Use city base rate for best_available
      const { data } = await supabase
        .from('city_service_rates')
        .select('base_rate')
        .eq('city_id', draft.cityId)
        .eq('service_id', draft.serviceId)
        .single()
      setSubtotal(data?.base_rate ?? null)
    }
    setPriceLoading(false)
  }

  const service = SERVICES.find(s => s.id === draft.serviceId)
  if (!service) return null

  const total = subtotal != null ? subtotal + TRANSPORT_FEE : null

  async function checkout() {
    if (!subtotal || !total) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId:          draft.serviceId,
          date:               draft.date,
          timeSlot:           draft.timeSlot,
          address:            draft.address,
          unitNotes:          draft.unitNotes,
          customerId:         draft.customerId,
          cityId:             draft.cityId,
          barangayPsgc:       draft.barangayPsgc,
          therapistId:        draft.therapistId,
          selectionMode:      draft.selectionMode,
          genderPreference:   draft.genderPreference,
          customerName:       draft.customerName,
          customerPhone:      draft.customerPhone,
          customerNotes:      draft.customerNotes,
          subtotal,
          transportFee:       TRANSPORT_FEE,
          total,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')

      // Redirect to HitPay checkout
      window.location.href = data.checkoutUrl
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <ProgressBar current={5} />

      <div className="container-alaga py-12 max-w-2xl">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-[#8C7B70] hover:text-[#2C2420] mb-6 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>

        <h1 className="text-2xl font-bold text-[#2C2420] mb-2">Review your booking</h1>
        <p className="text-[#8C7B70] mb-8">Make sure everything looks right before you pay.</p>

        {/* Summary card */}
        <div className="bg-white rounded-2xl border border-[#EDE5DF] divide-y divide-[#F2EBE6] mb-6">

          {/* Service */}
          <div className="p-5">
            <p className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-2">Service</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[#2C2420]">{service.name}</p>
                <p className="text-sm text-[#8C7B70]">{service.duration} minutes</p>
              </div>
              <span className="font-bold text-[#2C2420]">
                {priceLoading ? '…' : subtotal ? formatPrice(subtotal) : '—'}
              </span>
            </div>
          </div>

          {/* Date & time */}
          {draft.date && draft.timeSlot && (
            <div className="p-5 flex items-center gap-3">
              <Calendar size={16} className="text-[#C4714A] flex-shrink-0" />
              <div>
                <p className="font-semibold text-[#2C2420] text-sm">{formatDate(draft.date)}</p>
                <p className="text-sm text-[#8C7B70]">{formatTime(draft.timeSlot)}</p>
              </div>
            </div>
          )}

          {/* Address */}
          {draft.address && (
            <div className="p-5 flex items-start gap-3">
              <MapPin size={16} className="text-[#C4714A] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#2C2420] text-sm">{draft.address}</p>
                {draft.unitNotes && (
                  <p className="text-sm text-[#8C7B70]">{draft.unitNotes}</p>
                )}
              </div>
            </div>
          )}

          {/* Therapist */}
          <div className="p-5 flex items-center gap-3">
            <User size={16} className="text-[#C4714A] flex-shrink-0" />
            <p className="text-sm text-[#2C2420]">
              {draft.selectionMode === 'best_available'
                ? 'Best available therapist (assigned after booking)'
                : `Specific therapist selected`}
              {draft.genderPreference !== 'any' && (
                <span className="text-[#8C7B70]"> · {draft.genderPreference} preferred</span>
              )}
            </p>
          </div>

          {/* Notes */}
          {draft.customerNotes && (
            <div className="p-5">
              <p className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-1">Your notes</p>
              <p className="text-sm text-[#2C2420]">{draft.customerNotes}</p>
            </div>
          )}
        </div>

        {/* Price breakdown */}
        <div className="bg-white rounded-2xl border border-[#EDE5DF] p-5 mb-6">
          <p className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-4">Price breakdown</p>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#8C7B70]">{service.name}</span>
              <span className="text-[#2C2420]">{subtotal ? formatPrice(subtotal) : '…'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8C7B70]">Transport fee</span>
              <span className="text-[#2C2420]">{formatPrice(TRANSPORT_FEE)}</span>
            </div>
            <div className="border-t border-[#F2EBE6] pt-2 mt-1 flex justify-between font-bold text-base">
              <span className="text-[#2C2420]">Total</span>
              <span className="text-[#C4714A]">{total ? formatPrice(total) : '…'}</span>
            </div>
          </div>
        </div>

        {/* Payment methods */}
        <div className="flex items-center gap-3 mb-6 text-sm text-[#8C7B70]">
          <span className="font-medium">Pay with:</span>
          <span className="bg-white border border-[#EDE5DF] px-3 py-1 rounded-lg font-semibold text-[#2C2420]">GCash</span>
          <span className="bg-white border border-[#EDE5DF] px-3 py-1 rounded-lg font-semibold text-[#2C2420]">Maya</span>
          <span className="bg-white border border-[#EDE5DF] px-3 py-1 rounded-lg font-semibold text-[#2C2420]">Card</span>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        <Button size="lg" className="w-full" onClick={checkout} loading={loading} disabled={!total || priceLoading}>
          {loading ? 'Redirecting to payment…' : total ? `Pay ${formatPrice(total)}` : 'Loading price…'}
        </Button>

        <p className="text-center text-xs text-[#8C7B70] mt-3">
          Secure payment via HitPay · GCash, Maya &amp; cards accepted
        </p>
      </div>
    </>
  )
}
