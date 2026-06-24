'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SERVICES } from '@/lib/constants'
import { formatPrice } from '@/lib/utils'
import { useGeoCity } from '@/components/geo/city-context'
import { MapPin, Loader2 } from 'lucide-react'

export function ServicesSection() {
  const { city, pricing, isLive, loading, detectByGPS, gpsLoading } = useGeoCity()

  function getPricing(serviceId: string) {
    if (!pricing.length) return null
    return pricing.find(p => p.service_id === serviceId) ?? null
  }

  return (
    <section id="services" className="py-20">
      <div className="container-alaga">
        <div className="mb-12">
          <p className="text-[#C4714A] font-semibold text-sm uppercase tracking-widest mb-2">What We Offer</p>
          <h2 className="text-3xl md:text-4xl font-bold text-[#2C2420]">Choose your session</h2>
          <p className="text-[#8C7B70] mt-3 max-w-lg">
            Every session includes a verified therapist, premium oils, and a safe, professional experience at home.
          </p>
          {!loading && city && (
            <p className="text-sm text-[#8C7B70] mt-2 flex items-center gap-1.5 flex-wrap">
              <MapPin size={13} className="text-[#C4714A]" />
              Showing rates for <span className="font-semibold text-[#2C2420]">{city.name}</span>
              <span className="text-[#EDE5DF]">·</span>
              {gpsLoading ? (
                <span className="flex items-center gap-1 text-[#C4714A]">
                  <Loader2 size={12} className="animate-spin" /> Detecting…
                </span>
              ) : (
                <button
                  onClick={detectByGPS}
                  className="text-[#C4714A] hover:underline underline-offset-2"
                >
                  Not your city? Click here.
                </button>
              )}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SERVICES.map((service) => {
            const p = getPricing(service.id)
            return (
              <div
                key={service.id}
                className="bg-white rounded-2xl p-6 border border-[#EDE5DF] hover:border-[#C4714A] hover:shadow-md transition-all duration-200 group"
              >
                {service.tag && (
                  <span className="badge-tag mb-4 inline-block">{service.tag}</span>
                )}
                <h3 className="text-xl font-bold text-[#2C2420] mb-2">{service.name}</h3>
                <p className="text-[#8C7B70] text-sm leading-relaxed mb-5">{service.description}</p>

                <div className="flex items-end justify-between pt-4 border-t border-[#F2EBE6]">
                  <div>
                    {p ? (
                      <>
                        <span className="text-2xl font-bold text-[#2C2420]">{formatPrice(p.price_min)}</span>
                        {p.price_max > p.price_min && (
                          <span className="text-base text-[#8C7B70]"> – {formatPrice(p.price_max)}</span>
                        )}
                        <span className="text-sm text-[#8C7B70] ml-1">/ {service.duration} min</span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-[#2C2420]">{formatPrice(service.price)}</span>
                        <span className="text-sm text-[#8C7B70] ml-1">/ {service.duration} min</span>
                      </>
                    )}
                  </div>
                  <Link href="/book">
                    <Button size="sm" variant="outline" className="group-hover:bg-[#C4714A] group-hover:text-white group-hover:border-[#C4714A] transition-colors">
                      Book
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 text-center flex flex-col gap-2">
          <p className="text-xs text-[#8C7B70]">
            💡 Each therapist sets their own rate within this range — you&rsquo;ll see exact prices when you choose your therapist.
          </p>
          <p className="text-sm text-[#8C7B70]">
            More services coming soon — Postpartum Care, Senior Care, and more.
          </p>
        </div>
      </div>
    </section>
  )
}
