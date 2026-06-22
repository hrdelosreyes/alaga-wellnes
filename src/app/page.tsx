import Link from 'next/link'
import { Star, ShieldCheck, Clock, MapPin, CheckCircle, ArrowRight, Sparkles, Heart, Zap } from 'lucide-react'
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

const AVATAR_GRADIENTS = [
  'from-[#C4714A] to-[#E8956D]',
  'from-[#6B8C6E] to-[#8AAD8D]',
  'from-[#C9A84C] to-[#E0C06A]',
]

export default async function HomePage() {
  const therapists = await getTopTherapists()

  return (
    <div className="bg-[#FBF6F0]">

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="container-alaga py-16 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

            {/* Left: copy */}
            <div>
              <CityBadge />

              <h1 className="text-4xl md:text-6xl font-bold text-[#2C2420] leading-tight mb-6 mt-4">
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

            {/* Right: visual panel */}
            <div className="relative hidden md:flex items-center justify-center">
              {/* Main card */}
              <div className="relative w-full max-w-sm">
                {/* Background blob */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#F2D9CC] to-[#EDE5DF] rounded-[40px] rotate-3" />

                {/* Center illustration */}
                <div className="relative bg-white rounded-[32px] p-10 shadow-xl flex flex-col items-center gap-4">
                  {/* Icon circle */}
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#C4714A] to-[#E8956D] flex items-center justify-center shadow-lg">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M24 8C24 8 14 16 14 26C14 31.5 18.5 36 24 36C29.5 36 34 31.5 34 26C34 16 24 8 24 8Z" fill="white" fillOpacity="0.9"/>
                      <path d="M18 28C18 28 20 32 24 32C28 32 30 28 30 28" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="20" cy="24" r="2" fill="white" fillOpacity="0.6"/>
                      <circle cx="28" cy="24" r="2" fill="white" fillOpacity="0.6"/>
                    </svg>
                  </div>
                  <p className="font-bold text-[#2C2420] text-lg text-center">Premium Home Wellness</p>
                  <p className="text-[#8C7B70] text-sm text-center leading-relaxed">
                    Professional therapists. Your comfort. Your schedule.
                  </p>

                  {/* Mini service pills */}
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {['Swedish Massage', 'Deep Tissue', 'Hilot', 'Foot Spa'].map(s => (
                      <span key={s} className="text-xs bg-[#FBF6F0] border border-[#EDE5DF] text-[#8C7B70] px-3 py-1 rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Floating: rating card */}
                <div className="absolute -top-5 -right-6 bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-2.5 border border-[#EDE5DF]">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#E0C06A] flex items-center justify-center flex-shrink-0">
                    <Star size={14} fill="white" className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#2C2420]">4.8 Rating</p>
                    <p className="text-[10px] text-[#8C7B70]">500+ sessions done</p>
                  </div>
                </div>

                {/* Floating: verified badge */}
                <div className="absolute -bottom-5 -left-6 bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-2.5 border border-[#EDE5DF]">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6B8C6E] to-[#8AAD8D] flex items-center justify-center flex-shrink-0">
                    <ShieldCheck size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#2C2420]">NBI + TESDA</p>
                    <p className="text-[10px] text-[#8C7B70]">Every therapist verified</p>
                  </div>
                </div>

                {/* Floating: time card */}
                <div className="absolute top-1/2 -right-10 -translate-y-1/2 bg-[#2C2420] rounded-2xl shadow-lg px-4 py-3 text-white">
                  <p className="text-xs font-bold">Available</p>
                  <p className="text-[10px] text-[#C8A88A]">9AM – 10PM daily</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <ServicesSection />

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="container-alaga">
          <div className="mb-14 text-center">
            <p className="text-[#C4714A] font-semibold text-sm uppercase tracking-widest mb-2">Simple &amp; Fast</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#2C2420]">How Alaga works</h2>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-0 max-w-4xl mx-auto">
            {/* Connecting line (desktop) */}
            <div className="absolute top-10 left-[17%] right-[17%] h-px bg-gradient-to-r from-[#F2D9CC] via-[#C4714A] to-[#F2D9CC] hidden md:block" />

            {[
              {
                step: '01',
                icon: <Zap size={22} className="text-[#C4714A]" />,
                title: 'Choose & Book',
                desc: 'Pick your service, date, and therapist. Pay securely via GCash, Maya, or card — all in under 2 minutes.',
              },
              {
                step: '02',
                icon: <ShieldCheck size={22} className="text-[#6B8C6E]" />,
                title: 'We Confirm',
                desc: 'Your verified therapist accepts the booking and you receive an SMS confirmation with their profile.',
              },
              {
                step: '03',
                icon: <Heart size={22} className="text-[#C9A84C]" />,
                title: 'Alaga Arrives',
                desc: 'Your therapist arrives at your door with everything needed. Track their arrival in real time.',
              },
            ].map(({ step, icon, title, desc }, i) => (
              <div key={step} className="flex flex-col items-center text-center px-6">
                <div className="relative z-10 w-20 h-20 rounded-2xl bg-[#FBF6F0] border-2 border-[#EDE5DF] flex flex-col items-center justify-center mb-5 shadow-sm">
                  {icon}
                  <span className="text-[10px] font-bold text-[#C8BDB8] mt-1">{step}</span>
                </div>
                <h3 className="font-bold text-[#2C2420] text-lg mb-2">{title}</h3>
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
            {therapists.map((t, i) => (
              <div key={t.id} className="bg-white rounded-2xl p-6 border border-[#EDE5DF] hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]} flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 shadow-sm`}>
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-[#2C2420] text-base">{t.name}</h3>
                      <span className="flex items-center gap-1 text-sm font-semibold text-[#2C2420]">
                        <Star size={13} fill="#C9A84C" className="text-[#C9A84C]" />
                        {t.rating_avg}
                      </span>
                    </div>
                    <p className="text-xs text-[#8C7B70] mt-0.5">{t.total_bookings} sessions · {t.zone}</p>
                    <div className="flex gap-1.5 mt-1.5">
                      {t.nbi_cleared && <span className="badge-verified text-[10px]">NBI ✓</span>}
                      {t.tesda_certified && <span className="badge-verified text-[10px]">TESDA ✓</span>}
                    </div>
                  </div>
                </div>

                {t.bio && (
                  <p className="text-sm text-[#8C7B70] leading-relaxed mb-4 italic">&ldquo;{t.bio}&rdquo;</p>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {t.specialties.slice(0, 3).map((s) => (
                    <span key={s} className="text-xs bg-[#F2EBE6] text-[#8C7B70] px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                  {t.specialties.length > 3 && (
                    <span className="text-xs bg-[#F2EBE6] text-[#8C7B70] px-2 py-0.5 rounded-full">+{t.specialties.length - 3} more</span>
                  )}
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
      <section className="py-16 bg-[#2C2420]">
        <div className="container-alaga">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { label: 'Verified Therapists', value: '15+', icon: <ShieldCheck size={20} className="text-[#C4714A]" /> },
              { label: 'Average Rating', value: '4.8', icon: <Star size={20} fill="#C9A84C" className="text-[#C9A84C]" /> },
              { label: 'Sessions Completed', value: '500+', icon: <Sparkles size={20} className="text-[#6B8C6E]" /> },
              { label: 'Response Time', value: '< 1 hr', icon: <Clock size={20} className="text-[#C8A88A]" /> },
            ].map(({ label, value, icon }) => (
              <div key={label} className="py-6 flex flex-col items-center gap-2">
                {icon}
                <div className="text-3xl font-bold text-white">{value}</div>
                <div className="text-xs text-[#8C7B70]">{label}</div>
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
                initial: 'K',
                color: 'from-[#C4714A] to-[#E8956D]',
                text: 'I was nervous about having someone come home but the verification process made me feel so safe. Maria was amazing — thorough, professional, and on time.',
              },
              {
                name: 'Paolo R.',
                location: 'Makati',
                stars: 5,
                initial: 'P',
                color: 'from-[#6B8C6E] to-[#8AAD8D]',
                text: "Booked for my mom's birthday and she loved every minute. The therapist brought everything — table, oils, towels. Better than going to a spa.",
              },
              {
                name: 'Denise A.',
                location: 'BGC, Taguig',
                stars: 5,
                initial: 'D',
                color: 'from-[#C9A84C] to-[#E0C06A]',
                text: "After my night shift I'm usually too tired to go anywhere. Alaga is perfect — I just book and sleep while the magic happens. Highly recommend.",
              },
            ].map(({ name, location, stars, initial, color, text }) => (
              <div key={name} className="bg-white rounded-2xl p-6 border border-[#EDE5DF] hover:shadow-md transition-shadow relative overflow-hidden">
                {/* Decorative quote mark */}
                <div className="absolute top-4 right-5 text-[80px] font-serif leading-none text-[#F2EBE6] select-none pointer-events-none">
                  &ldquo;
                </div>

                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} size={14} fill="#C9A84C" className="text-[#C9A84C]" />
                  ))}
                </div>
                <p className="text-[#2C2420] text-sm leading-relaxed mb-6 relative z-10">{text}</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                    {initial}
                  </div>
                  <div>
                    <p className="font-semibold text-[#2C2420] text-sm">{name}</p>
                    <p className="text-xs text-[#8C7B70] flex items-center gap-1">
                      <MapPin size={10} /> {location}
                    </p>
                  </div>
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
          <div className="relative bg-[#2C2420] rounded-3xl px-8 py-16 text-center overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-[#C4714A] opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#6B8C6E] opacity-10 rounded-full translate-x-1/3 translate-y-1/3" />

            <div className="relative z-10">
              <p className="text-[#C8A88A] text-sm font-semibold uppercase tracking-widest mb-3">Book Today</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready for your alaga moment?
              </h2>
              <p className="text-[#C4A899] mb-8 max-w-md mx-auto">
                Book a verified wellness professional today. Available in select cities, 9AM–10PM daily.
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
        </div>
      </section>

    </div>
  )
}
