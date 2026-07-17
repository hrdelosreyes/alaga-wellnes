'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SERVICES } from '@/lib/constants'
import { formatPrice } from '@/lib/utils'
import { useGeoCity } from '@/components/geo/city-context'
import { MapPin, Loader2 } from 'lucide-react'
import { Reveal } from '@/components/motion/reveal'

export function ServicesSection() {
  const { city, pricing, isLive, loading, detectByGPS, gpsLoading } = useGeoCity()

  function getPricing(serviceId: string) {
    if (!pricing.length) return null
    return pricing.find(p => p.service_id === serviceId) ?? null
  }

  return (
    <section id="services" className="py-20">
      <div className="container-alaga">
        <Reveal>
          <div className="mb-12">
            <p className="text-[#A85A38] font-semibold text-sm uppercase tracking-widest mb-2">What We Offer</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#2C2420]">Choose your session</h2>
            <p className="text-[#6E5F55] mt-3 max-w-lg">
              Every session includes a verified therapist, premium oils, and a safe, professional experience at home.
            </p>
            {!loading && city && (
              <p className="text-sm text-[#6E5F55] mt-2 flex items-center gap-1.5 flex-wrap">
                <MapPin size={13} className="text-[#A85A38]" />
                Showing rates for <span className="font-semibold text-[#2C2420]">{city.name}</span>
                <span className="text-[#EDE5DF]">·</span>
                {gpsLoading ? (
                  <span className="flex items-center gap-1 text-[#A85A38]">
                    <Loader2 size={12} className="animate-spin" /> Detecting…
                  </span>
                ) : (
                  <button
                    onClick={detectByGPS}
                    className="text-[#A85A38] hover:underline underline-offset-2 py-2.5 -my-2.5"
                  >
                    Not your city? Click here.
                  </button>
                )}
              </p>
            )}
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SERVICES.map((service, i) => {
            const p = getPricing(service.id)
            return (
              <Reveal key={service.id} delay={i * 120} className="h-full">
                <div
                  className="bg-white rounded-2xl p-6 border border-[#EDE5DF] hover:border-[#C4714A] card-lift group flex flex-col h-full"
                >
                  {service.tag && (
                    <span className="badge-tag mb-4 inline-block">{service.tag}</span>
                  )}
                  <h3 className="text-xl font-bold text-[#2C2420] mb-2">{service.name}</h3>
                  <p className="text-[#6E5F55] text-sm leading-relaxed mb-5">{service.description}</p>

                  <div className="flex items-end justify-between pt-4 border-t border-[#F2EBE6] mt-auto">
                    <div>
                      {p ? (
                        <>
                          <span className="text-2xl font-bold text-[#2C2420]">{formatPrice(p.price_min)}</span>
                          {p.price_max > p.price_min && (
                            <span className="text-base text-[#6E5F55]"> – {formatPrice(p.price_max)}</span>
                          )}
                          <span className="text-sm text-[#6E5F55] ml-1">/ {service.duration} min</span>
                        </>
                      ) : (
                        <>
                          <span className="text-2xl font-bold text-[#2C2420]">{formatPrice(service.price)}</span>
                          <span className="text-sm text-[#6E5F55] ml-1">/ {service.duration} min</span>
                        </>
                      )}
                    </div>
                    {isLive ? (
                      <Link href="/book">
                        <Button size="sm" variant="outline" className="group-hover:bg-[#B05C33] group-hover:text-white group-hover:border-[#B05C33] transition-colors">
                          Book
                        </Button>
                      </Link>
                    ) : (
                      // eslint-disable-next-line @next/next/no-html-link-for-pages -- intentional: plain <a> so the browser natively scrolls to the same-page hash target, which next/link does not reliably do.
                      <a href="/#waitlist">
                        <Button size="sm" variant="outline" className="group-hover:bg-[#B05C33] group-hover:text-white group-hover:border-[#B05C33] transition-colors whitespace-nowrap">
                          Notify me
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>

        <div className="mt-6 text-center flex flex-col gap-2">
          <p className="text-xs text-[#6E5F55]">
            💡 Each therapist sets their own rate within this range — you&rsquo;ll see exact prices when you choose your therapist.
          </p>
          <p className="text-sm text-[#6E5F55]">
            More services coming soon — Postpartum Care, Senior Care, and more.
          </p>
        </div>
      </div>
    </section>
  )
}
