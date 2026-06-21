import Link from 'next/link'
import { Star, ShieldCheck, Clock, MapPin, CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import type { Therapist } from '@/types'
import WaitlistForm from '@/components/WaitlistForm'
import { ServicesSection } from '@/components/home/services-section'
import { CityBadge } from '@/components/home/city-badge'

async function getTopTherapists(): Promise<Therapist[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('therapists')
    .select('*')
    .eq('is_active', true)
    .order('rating_avg', { ascending: false })
    .limit(3)
  return data ?? []
}

export default async function HomePage() {
  const therapists = await getTopTherapists()

  return (
    <div className="bg-[#FBF6F0]">

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="container-alaga py-20 md:py-28">
          <div className="max-w-2xl">
            {/* Badge */}
            <CityBadge />

            <h1 className="text-4xl md:text-6xl font-bold text-[#2C2420] leading-tight mb-6">
              Wellness,<br />
              <span className="text-[#C4714A]">delivered</span><br />
              with care.
            </h1>

            <p className="text-lg text-[#8C7B70] leading-relaxed mb-8 max-w-lg">
              Book verified Filipino wellness professionals for premium massage and home spa rituals —
              safely delivered to your home, condo, or hotel.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/book">
                <Button size="lg" className="w-full sm:w-auto">
                  Book a Session
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  How It Works
                </Button>
              </Link>
            </div>

            {/* Trust bar */}
            <div className="flex flex-wrap gap-5 mt-10 text-sm text-[#8C7B70]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-[#6B8C6E]" />
                NBI &amp; TESDA verified
              </span>
              <span className="flex items-center gap-1.5">
                <Star size={16} className="text-[#C9A84C]" fill="#C9A84C" />
                4.8 average rating
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={16} className="text-[#C4714A]" />
                Book in under 2 minutes
              </span>
            </div>
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[#F2DDD0] opacity-30 rounded-l-[80px] -z-10 hidden md:block" />
      </section>

      {/* ── SERVICES ── */}
      <ServicesSection />

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="container-alaga">
          <div className="mb-12 text-center">
            <p className="text-[#C4714A] font-semibold text-sm uppercase tracking-widest mb-2">Simple &amp; Fast</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#2C2420]">How Alaga works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              {
                step: '01',
                title: 'Choose &amp; Book',
                desc: 'Pick your service, date, and therapist. Pay securely via GCash, Maya, or card — all in under 2 minutes.',
              },
              {
                step: '02',
                title: 'We Confirm',
                desc: 'Your verified therapist accepts the booking and you receive an SMS confirmation with their profile.',
              },
              {
                step: '03',
                title: 'Alaga Arrives',
                desc: 'Your therapist arrives at your door with everything needed. Track their arrival in real time.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#F2D9CC] text-[#C4714A] font-bold text-lg flex items-center justify-center mx-auto mb-5">
                  {step}
                </div>
                <h3
                  className="font-bold text-[#2C2420] text-lg mb-2"
                  dangerouslySetInnerHTML={{ __html: title }}
                />
                <p className="text-[#8C7B70] text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── THERAPISTS ── */}
      <section id="therapists" className="py-20">
        <div className="container-alaga">
          <div className="mb-12">
            <p className="text-[#C4714A] font-semibold text-sm uppercase tracking-widest mb-2">Our Team</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#2C2420]">Meet your wellness professionals</h2>
            <p className="text-[#8C7B70] mt-3 max-w-lg">
              Every Alaga therapist is NBI-cleared, TESDA-certified, and personally vetted before their first session.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {therapists.map((t) => (
              <div key={t.id} className="bg-white rounded-2xl p-6 border border-[#EDE5DF]">
                {/* Avatar placeholder */}
                <div className="w-16 h-16 rounded-full bg-[#F2D9CC] flex items-center justify-center text-2xl font-bold text-[#C4714A] mb-4">
                  {t.name.charAt(0)}
                </div>

                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-[#2C2420] text-lg">{t.name}</h3>
                  <span className="flex items-center gap-1 text-sm font-semibold text-[#2C2420]">
                    <Star size={14} fill="#C9A84C" className="text-[#C9A84C]" />
                    {t.rating_avg}
                  </span>
                </div>

                <p className="text-xs text-[#8C7B70] mb-3">{t.total_bookings} sessions · {t.zone}</p>

                {t.bio && (
                  <p className="text-sm text-[#8C7B70] leading-relaxed mb-4">&ldquo;{t.bio}&rdquo;</p>
                )}

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {t.specialties.map((s) => (
                    <span key={s} className="text-xs bg-[#F2EBE6] text-[#8C7B70] px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>

                <div className="flex gap-2">
                  {t.nbi_cleared && <span className="badge-verified">NBI ✓</span>}
                  {t.tesda_certified && <span className="badge-verified">TESDA ✓</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link href="/book">
              <Button variant="outline">
                Browse all therapists when booking
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── TRUST SIGNALS ── */}
      <section className="py-16 bg-white">
        <div className="container-alaga">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { label: 'Verified Therapists', value: '15+' },
              { label: 'Average Rating', value: '4.8 ★' },
              { label: 'Sessions Completed', value: '500+' },
              { label: 'Response Time', value: '< 1 hr' },
            ].map(({ label, value }) => (
              <div key={label} className="py-6">
                <div className="text-3xl font-bold text-[#C4714A] mb-1">{value}</div>
                <div className="text-sm text-[#8C7B70]">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20">
        <div className="container-alaga">
          <div className="mb-12 text-center">
            <p className="text-[#C4714A] font-semibold text-sm uppercase tracking-widest mb-2">What Clients Say</p>
            <h2 className="text-3xl font-bold text-[#2C2420]">Real alaga, real reviews</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Kristine M.',
                location: 'BGC, Taguig',
                stars: 5,
                text: 'I was nervous about having someone come home but the verification process made me feel so safe. Maria was amazing — thorough, professional, and on time.',
              },
              {
                name: 'Paolo R.',
                location: 'Makati',
                stars: 5,
                text: 'Booked for my mom\'s birthday and she loved every minute. The therapist brought everything — table, oils, towels. Better than going to a spa.',
              },
              {
                name: 'Denise A.',
                location: 'BGC, Taguig',
                stars: 5,
                text: 'After my night shift I\'m usually too tired to go anywhere. Alaga is perfect — I just book and sleep while the magic happens. Highly recommend.',
              },
            ].map(({ name, location, stars, text }) => (
              <div key={name} className="bg-white rounded-2xl p-6 border border-[#EDE5DF]">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} size={14} fill="#C9A84C" className="text-[#C9A84C]" />
                  ))}
                </div>
                <p className="text-[#2C2420] text-sm leading-relaxed mb-5">&ldquo;{text}&rdquo;</p>
                <div>
                  <p className="font-semibold text-[#2C2420] text-sm">{name}</p>
                  <p className="text-xs text-[#8C7B70]">{location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WAITLIST ── */}
      <section className="py-20 bg-[#2C2420]">
        <div className="container-alaga">
          <div className="max-w-xl mx-auto text-center">
            <p className="text-[#C8A88A] text-sm font-semibold uppercase tracking-widest mb-3">Coming to your city</p>
            <h2 className="text-3xl font-bold text-white mb-3">Be the first to know</h2>
            <p className="text-[#C8BDB8] text-sm leading-relaxed mb-8">
              We're expanding across Metro Manila and beyond. Drop your email and we'll let you know the moment Alaga is available in your area.
            </p>
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-20">
        <div className="container-alaga">
          <div className="bg-[#2C2420] rounded-3xl px-8 py-14 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready for your alaga moment?
            </h2>
            <p className="text-[#C4A899] mb-8 max-w-md mx-auto">
              Book a verified wellness professional today. Available in BGC and Makati, 9AM–10PM daily.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/book">
                <Button size="lg" className="w-full sm:w-auto">
                  Book Now — From ₱899
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </Link>
            </div>
            <div className="flex justify-center gap-6 mt-8 text-sm text-[#8C7B70]">
              <span className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-[#6B8C6E]" /> No hidden fees
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-[#6B8C6E]" /> Cashless payment
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-[#6B8C6E]" /> Cancel anytime
              </span>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
