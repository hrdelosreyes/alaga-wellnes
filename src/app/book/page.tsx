'use client'

import { useRouter } from 'next/navigation'
import { Clock, Leaf } from 'lucide-react'
import { ProgressBar } from '@/components/booking/progress-bar'
import { Button } from '@/components/ui/button'
import { useBooking } from '@/lib/booking-context'
import { useGeoCity } from '@/components/geo/city-context'
import { SERVICES } from '@/lib/constants'
import { formatPrice, cn } from '@/lib/utils'
import type { ServiceId } from '@/types'

export default function BookServicePage() {
  const router = useRouter()
  const { draft, update } = useBooking()
  const { pricing } = useGeoCity()

  function select(id: ServiceId) {
    update({ serviceId: id })
  }

  function next() {
    if (!draft.serviceId) return
    router.push('/book/address')
  }

  return (
    <>
      <ProgressBar current={0} />

      <div className="container-alaga py-12 max-w-2xl">
        <h1 className="text-2xl font-bold text-[#2C2420] mb-2">Choose your service</h1>
        <p className="text-[#8C7B70] mb-8">All sessions include a verified therapist, premium oils, and towels. Prices show the range for your area — each therapist sets their exact rate within it.</p>

        <div className="flex flex-col gap-4">
          {SERVICES.map((service) => {
            const selected = draft.serviceId === service.id
            const p = pricing.find(x => x.service_id === service.id)
            const hasRange = !!p && p.price_max > p.price_min

            return (
              <button
                key={service.id}
                onClick={() => select(service.id)}
                className={cn(
                  'w-full text-left rounded-2xl border-2 p-6 transition-all duration-150 hover:border-[#C4714A]',
                  selected
                    ? 'border-[#C4714A] bg-[#FFF7F3] shadow-sm'
                    : 'border-[#EDE5DF] bg-white',
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-[#2C2420] text-lg">{service.name}</h3>
                      {service.tag && (
                        <span className="badge-tag">{service.tag}</span>
                      )}
                    </div>
                    <p className="text-[#8C7B70] text-sm leading-relaxed mb-3">{service.description}</p>
                    <div className="flex items-center gap-4 text-sm text-[#8C7B70]">
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {service.duration} minutes
                      </span>
                      {service.id === 'hilot-75' && (
                        <span className="flex items-center gap-1">
                          <Leaf size={14} />
                          Traditional Filipino
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    {hasRange ? (
                      <>
                        <div className="text-xl font-bold text-[#2C2420] whitespace-nowrap">{formatPrice(p!.price_min)}–{formatPrice(p!.price_max)}</div>
                        <div className="text-xs text-[#8C7B70]">price range</div>
                      </>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-[#2C2420]">{formatPrice(p ? p.price_min : service.price)}</div>
                        <div className="text-xs text-[#8C7B70]">guide price</div>
                      </>
                    )}
                    {/* Radio indicator */}
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 mt-3 ml-auto transition-colors',
                      selected
                        ? 'border-[#C4714A] bg-[#C4714A]'
                        : 'border-[#D1C4BC] bg-white',
                    )}>
                      {selected && (
                        <div className="w-full h-full rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-8">
          <Button
            size="lg"
            className="w-full"
            disabled={!draft.serviceId}
            onClick={next}
          >
            Continue
          </Button>
          <p className="text-center text-xs text-[#8C7B70] mt-3">
            Transport fee of ₱100 applies. Cashless payment only.
          </p>
        </div>
      </div>
    </>
  )
}
