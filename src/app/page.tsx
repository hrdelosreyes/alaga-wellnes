import Link from 'next/link'
import Image from 'next/image'
import { Star, ShieldCheck, Clock, CheckCircle, ArrowRight, Sparkles, Heart, Zap, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import type { Therapist } from '@/types'
import WaitlistForm from '@/components/WaitlistForm'
import { ServicesSection } from '@/components/home/services-section'
import { CityBadge } from '@/components/home/city-badge'
import { BookLink } from '@/components/home/book-link'
import { FromPrice } from '@/components/home/from-price'
import { Reveal } from '@/components/motion/reveal'
import { HashScroll } from '@/components/home/hash-scroll'
import heroImg from '../../public/hero-massage.png'
import howItWorksBg from '../../public/how-it-works-bg.png'
import heroBanner from '../../public/hero-massage-2.png'

async function getTopTherapists(): Promise<Therapist[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('therapists')
    .select('*')
    .eq('is_active', true)
    .gt('total_bookings', 0)
    .not('bio', 'is', null)
    .order('rating_avg', { ascending: false })
    .limit(3)
  return data ?? []
}

async function getHasLiveCities(): Promise<boolean> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('cities')
    .select('id', { count: 'exact', head: true })
    .eq('is_customer_live', true)
  return (count ?? 0) > 0
}

const AVATAR_GRADIENTS = [
  'from-[#C4714A] to-[#E8956D]',
  'from-[#6B8C6E] to-[#8AAD8D]',
  'from-[#C9A84C] to-[#E0C06A]',
]

export default async function HomePage() {
  const hasLiveCities = await getHasLiveCities()
  // Only surface real, working therapists — never seed/test rows — and only
  // once at least one city is actually live.
  const therapists = hasLiveCities ? await getTopTherapists() : []

  return (
    <div className="bg-[#FBF6F0]">
      <HashScroll />

      {/* ── HERO ── */}
      <section className="relative min-h-[600px] md:min-h-[700px] overflow-hidden">
        {/* Full-bleed background image */}
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={heroImg}
            alt="Professional home massage therapy"
            fill
            priority
            placeholder="blur"
            sizes="100vw"
            className="object-cover object-center hero-zoom"
          />
          {/* Gradient overlay — strong on left for text legibility, fades right */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#FBF6F0] via-[#FBF6F0]/80 to-[#FBF6F0]/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#FBF6F0]/60 via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="relative container-alaga py-20 md:py-32">
          <div className="max-w-xl">
            <div className="hero-enter hero-enter-1">
              <CityBadge />
            </div>

            <h1 className="hero-enter hero-enter-2 text-4xl md:text-6xl font-bold text-[#2C2420] leading-tight mb-6 mt-4">
              Wellness,<br />
              <span className="text-[#C4714A]">delivered</span><br />
              with care.
            </h1>

            <p className="hero-enter hero-enter-3 text-lg text-[#6E5F55] leading-relaxed mb-8 max-w-lg">
              Book verified Filipino wellness professionals for premium massage and home spa rituals —
              safely delivered to your home, condo, or hotel.
            </p>

            <div className="hero-enter hero-enter-4 flex flex-col sm:flex-row gap-3">
              <BookLink
                waitlistChildren={
                  <Button size="lg" className="w-full sm:w-auto shadow-lg">
                    Join the Waitlist
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                }
              >
                <Button size="lg" className="w-full sm:w-auto shadow-lg">
                  Book a Session
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </BookLink>
              <Link href="#how-it-works">
                <Button variant="outline" size="lg" className="w-full sm:w-auto bg-white/80 backdrop-blur-sm">
                  How It Works
                </Button>
              </Link>
            </div>

            {/* Trust bar */}
            <div className="hero-enter hero-enter-4 flex flex-wrap gap-5 mt-10 text-sm text-[#6E5F55]">
              <span className="flex items-center gap-1.5 bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <ShieldCheck size={15} className="text-[#6B8C6E]" />
                NBI &amp; TESDA verified
              </span>
              <span className="flex items-center gap-1.5 bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <Sparkles size={15} className="text-[#C9A84C]" />
                Premium oils included
              </span>
              <span className="flex items-center gap-1.5 bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <Wallet size={15} className="text-[#A85A38]" />
                Cashless — GCash, Maya &amp; card
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <ServicesSection />

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 relative overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src={howItWorksBg}
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
          {/* Light cream overlay to keep text readable */}
          <div className="absolute inset-0 bg-[#FBF6F0]/88" />
        </div>
        <div className="relative container-alaga">
          <Reveal>
            <div className="mb-14 text-center">
              <p className="text-[#A85A38] font-semibold text-sm uppercase tracking-widest mb-2">Simple &amp; Fast</p>
              <h2 className="text-3xl md:text-4xl font-bold text-[#2C2420]">How Alaga works</h2>
            </div>
          </Reveal>

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
                desc: 'Your verified therapist accepts the booking and you get an email confirmation with their profile.',
              },
              {
                step: '03',
                icon: <Heart size={22} className="text-[#C9A84C]" />,
                title: 'Alaga Arrives',
                desc: 'Your therapist arrives at your door with everything needed. Track their arrival in real time.',
              },
            ].map(({ step, icon, title, desc }, i) => (
              <Reveal key={step} delay={i * 120}>
                <div className="flex flex-col items-center text-center px-6">
                  <div className="relative z-10 w-20 h-20 rounded-2xl bg-[#FBF6F0] border-2 border-[#EDE5DF] flex flex-col items-center justify-center mb-5 shadow-sm">
                    {icon}
                    <span className="text-[10px] font-bold text-[#C8BDB8] mt-1">{step}</span>
                  </div>
                  <h3 className="font-bold text-[#2C2420] text-lg mb-2">{title}</h3>
                  <p className="text-[#6E5F55] text-sm leading-relaxed">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── THERAPISTS — only shown once a city is live, and only real profiles ── */}
      {therapists.length > 0 && (
        <section id="therapists" className="py-20">
          <div className="container-alaga">
            <Reveal>
              <div className="mb-12">
                <p className="text-[#A85A38] font-semibold text-sm uppercase tracking-widest mb-2">Our Team</p>
                <h2 className="text-3xl md:text-4xl font-bold text-[#2C2420]">Meet your wellness professionals</h2>
                <p className="text-[#6E5F55] mt-3 max-w-lg">
                  Every Alaga therapist is NBI-cleared, TESDA-certified, and personally vetted before their first session.
                </p>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {therapists.map((t, i) => (
                <Reveal key={t.id} delay={i * 120}>
                  <div className="bg-white rounded-2xl p-6 border border-[#EDE5DF] card-lift h-full">
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
                        <p className="text-xs text-[#6E5F55] mt-0.5">
                          {t.total_bookings} {t.total_bookings === 1 ? 'session' : 'sessions'} · {t.zone}
                        </p>
                        <div className="flex gap-1.5 mt-1.5">
                          {t.nbi_cleared && <span className="badge-verified text-[10px]">NBI ✓</span>}
                          {t.tesda_certified && <span className="badge-verified text-[10px]">TESDA ✓</span>}
                        </div>
                      </div>
                    </div>

                    {t.bio && (
                      <p className="text-sm text-[#6E5F55] leading-relaxed mb-4 italic">&ldquo;{t.bio}&rdquo;</p>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {t.specialties.slice(0, 3).map((s) => (
                        <span key={s} className="text-xs bg-[#F2EBE6] text-[#6E5F55] px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                      {t.specialties.length > 3 && (
                        <span className="text-xs bg-[#F2EBE6] text-[#6E5F55] px-2 py-0.5 rounded-full">+{t.specialties.length - 3} more</span>
                      )}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            <div className="mt-8 text-center">
              <BookLink>
                <Button variant="outline">
                  Browse all therapists when booking
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </BookLink>
            </div>
          </div>
        </section>
      )}

      {/* ── TRUST SIGNALS ── */}
      <section className="py-16 bg-[#2C2420]">
        <div className="container-alaga">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { label: 'of therapists NBI & TESDA verified', value: '100%', icon: <ShieldCheck size={20} className="text-[#C4714A]" /> },
              { label: 'hidden fees — the price you see is the price you pay', value: '₱0', icon: <Sparkles size={20} className="text-[#6B8C6E]" /> },
              { label: 'open daily, right at your door', value: '9AM–10PM', icon: <Clock size={20} className="text-[#C8A88A]" /> },
              { label: 'cashless — GCash, Maya & card', value: '100%', icon: <Wallet size={20} className="text-[#C9A84C]" /> },
            ].map(({ label, value, icon }, i) => (
              <Reveal key={label} delay={i * 100}>
                <div className="py-6 flex flex-col items-center gap-2">
                  {icon}
                  <div className="text-3xl font-bold text-white">{value}</div>
                  <div className="text-xs text-[#C8BDB8] max-w-[180px]">{label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE ALAGA STANDARD ── */}
      <section className="py-20">
        <div className="container-alaga">
          <Reveal>
            <div className="mb-12 text-center">
              <p className="text-[#A85A38] font-semibold text-sm uppercase tracking-widest mb-2">Our Promise</p>
              <h2 className="text-3xl font-bold text-[#2C2420]">The Alaga standard</h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <ShieldCheck size={22} className="text-[#6B8C6E]" />,
                iconBg: 'bg-[#EBF3EC]',
                title: 'Verified, not just listed',
                text: 'Every therapist passes an NBI clearance check, holds a TESDA massage certification, and is personally interviewed before their first booking.',
              },
              {
                icon: <Sparkles size={22} className="text-[#C9A84C]" />,
                iconBg: 'bg-[#F8F1DE]',
                title: 'Premium by default',
                text: 'Premium oils, fresh towels, and professional equipment are included in every session — your therapist arrives with everything needed.',
              },
              {
                icon: <Heart size={22} className="text-[#C4714A]" />,
                iconBg: 'bg-[#F2D9CC]',
                title: 'Safe and respectful, always',
                text: 'In-app chat, live arrival tracking, and a support team available 8AM–10PM daily — for you and for your therapist.',
              },
            ].map(({ icon, iconBg, title, text }, i) => (
              <Reveal key={title} delay={i * 120}>
                <div className="bg-white rounded-2xl p-6 border border-[#EDE5DF] card-lift h-full">
                  <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
                    {icon}
                  </div>
                  <h3 className="font-bold text-[#2C2420] text-lg mb-2">{title}</h3>
                  <p className="text-[#6E5F55] text-sm leading-relaxed">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── IMAGE BREAK ── */}
      <section className="relative h-[420px] overflow-hidden">
        <Image
          src={heroBanner}
          alt="Home wellness session"
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#2C2420]/70 via-[#2C2420]/30 to-transparent flex items-center">
          <div className="container-alaga">
            <Reveal>
              <div className="max-w-md">
                <p className="text-[#C8A88A] text-sm font-semibold uppercase tracking-widest mb-3">For everyone</p>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                  Wellness that comes to you
                </h2>
                <p className="text-[#C8BDB8] text-sm leading-relaxed mb-6">
                  Whether you need to unwind after a long week or recover from an intense workout — your verified Alaga therapist is ready.
                </p>
                <BookLink
                  waitlistChildren={
                    <Button size="lg">
                      Join the waitlist <ArrowRight size={18} className="ml-2" />
                    </Button>
                  }
                >
                  <Button size="lg">
                    Book a session <ArrowRight size={18} className="ml-2" />
                  </Button>
                </BookLink>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── WAITLIST ── */}
      <section id="waitlist" className="py-20 bg-[#2C2420]">
        <div className="container-alaga">
          <div className="max-w-xl mx-auto text-center">
            <p className="text-[#C8A88A] text-sm font-semibold uppercase tracking-widest mb-3">Coming to your city</p>
            <h2 className="text-3xl font-bold text-white mb-3">Be the first to know</h2>
            <p className="text-[#C8BDB8] text-sm leading-relaxed mb-8">
              We're expanding across Metro Manila and beyond. Leave your details and we'll message you the moment Alaga is available in your area.
            </p>
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-20">
        <div className="container-alaga">
          <Reveal>
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
                  <BookLink
                    waitlistChildren={
                      <Button size="lg" className="w-full sm:w-auto">
                        Get early access
                        <ArrowRight size={18} className="ml-2" />
                      </Button>
                    }
                  >
                    <Button size="lg" className="w-full sm:w-auto">
                      Book Now — From <FromPrice />
                      <ArrowRight size={18} className="ml-2" />
                    </Button>
                  </BookLink>
                </div>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8 text-sm text-[#C8BDB8]">
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
          </Reveal>
        </div>
      </section>

    </div>
  )
}
