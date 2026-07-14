'use client'

import { useState } from 'react'
import { ChevronDown, BadgeCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

type FaqItem = { q: string; a: string; highlight?: boolean }
type FaqGroup = { title: string; items: FaqItem[] }

const FAQ_GROUPS: FaqGroup[] = [
  {
    title: 'Getting Started',
    items: [
      {
        q: 'Sino ang pwedeng mag-apply sa Alaga Wellness?',
        a: 'Anyone who has a valid NBI Clearance (or is willing to secure one before onboarding), is TESDA-certified in massage therapy (Swedish, Shiatsu, Hilot, Deep Tissue, etc.), is professional and client-focused, and is available for home service within their city. We welcome therapists from all cities across the Philippines — not just Metro Manila.',
      },
      {
        q: 'Libre ba mag-apply?',
        a: 'Yes, completely free. There are no application fees, no membership fees, and no upfront costs to join the platform. You only start earning when you start completing bookings.',
        highlight: true,
      },
      {
        q: 'Gaano katagal ang application process?',
        a: 'Typically 3–5 business days from submission: (1) Submit your application, (2) we verify your NBI Clearance and TESDA certificate, (3) once approved, we help you set up your profile and rates, (4) you’re live and ready to receive clients. We’ll email you at each step.',
      },
      {
        q: 'Kailangan ko bang pumunta sa isang opisina?',
        a: 'No. The entire application and onboarding process is done online. Once approved, you work directly from your home city — no commute to a head office required.',
      },
    ],
  },
  {
    title: 'Earnings & Payment',
    items: [
      {
        q: 'Magkano ang kikitain ko per session?',
        a: 'You set your own rates within Alaga’s service range — from ₱629 for Alaga Relax (60 min) up to ₱909 for Alaga Recovery (90 min). The more sessions you complete, the more you earn. Many active therapists complete 3–5 sessions a day.',
      },
      {
        q: 'Ilang porsyento ang napupunta sa akin?',
        a: 'You keep the majority of what the client pays. Alaga takes a small platform share to cover operations, booking technology, payment processing, and client support. The exact breakdown is shared with you during onboarding, before you accept your first booking.',
      },
      {
        q: 'Paano ako mababayaran?',
        a: 'Payments are cashless and processed through the platform. Your earnings are released after each confirmed and completed session. Payout details (GCash, bank transfer, etc.) are set up during your profile onboarding.',
      },
      {
        q: 'May referral earnings ba?',
        a: 'Yes. If you refer another therapist to Alaga and they start completing bookings, you earn a referral bonus every time they complete a session — even when you’re resting.',
      },
      {
        q: 'Ano ang Quarterly Alaga Bonus?',
        a: 'Every quarter, Alaga distributes a bonus pool among therapists who’ve been consistently active. If you’re active and reliable, you’ll receive a share of this bonus on top of your regular session earnings.',
      },
    ],
  },
  {
    title: 'Schedule & Flexibility',
    items: [
      {
        q: 'Pwede ba akong pumili ng sarili kong schedule?',
        a: 'Yes — completely. You set the days and hours you’re available, take breaks, mark yourself unavailable, and adjust anytime through your therapist portal.',
      },
      {
        q: 'May minimum number ba ng sessions na kailangan ko per week?',
        a: 'There’s no strict minimum to stay on the platform. However, consistent availability helps you qualify for the Quarterly Alaga Bonus and gives you priority placement in client searches.',
      },
      {
        q: 'Pwede ba akong magwork sa maraming lungsod?',
        a: 'Yes, as long as you can travel safely to the client’s location. During onboarding you’ll set your service area, and you can update it anytime.',
      },
      {
        q: 'Sino ang nagtatakda kung sino ang client ko?',
        a: 'Clients choose you based on your profile, rating, and availability. You can see client details before accepting a booking, and decline if needed.',
      },
    ],
  },
  {
    title: 'Safety & Verification',
    items: [
      {
        q: 'Paano ko malalaman na ligtas ang client?',
        a: 'Every client creates a verified account with a registered contact number and payment method. You can view booking details before accepting, and you’ll have real-time support from the Alaga team during all active bookings.',
      },
      {
        q: 'Bakit kailangan ng NBI Clearance?',
        a: 'It’s required for the safety of both therapists and clients, and it’s part of what makes Alaga a trusted platform. If your NBI is expired, we can guide you on renewing it online.',
      },
      {
        q: 'Makikita ng clients ang aking personal na impormasyon?',
        a: 'Clients see your first name, profile photo, specializations, rating, and general service area. Your personal address, phone number, and full legal name are never shared publicly.',
      },
    ],
  },
  {
    title: 'Using the Platform',
    items: [
      {
        q: 'Paano ko matatanggap ang bookings?',
        a: 'Once your profile is live, you’ll receive booking notifications via your therapist dashboard — with the client’s location, session type, and scheduled time. You can accept or decline each one.',
      },
      {
        q: 'Kailangan ko bang magdala ng sariling kagamitan?',
        a: 'Yes — therapists bring their own professional kit (massage oils, linens, portable table if applicable). This is outlined during onboarding.',
      },
      {
        q: 'Paano kung may problema during a session?',
        a: 'The Alaga support team is available 8AM–10PM daily via hello@alagawellness.care. For urgent concerns during an active session, contact us immediately.',
      },
      {
        q: 'Maaari ba akong mag-offer ng ibang services bukod sa listed?',
        a: 'Currently, bookings are structured around our core services (Alaga Relax, Alaga Hilot, Alaga Recovery). As we expand — including Postpartum Care and Senior Care — approved therapists with relevant specialties will be invited to offer these first.',
      },
    ],
  },
]

export function TherapistFaq() {
  const [openKey, setOpenKey] = useState<string | null>(null)

  return (
    <div className="px-4 max-w-lg mx-auto pb-8">
      <div className="text-center mb-5">
        <h2 className="text-2xl font-bold text-white mb-1">May tanong? Nandito kami.</h2>
        <p className="text-sm text-[#C8BDB8]">Everything you need to know before you apply.</p>
      </div>

      <div className="flex items-center gap-3 bg-[#6B8C6E]/15 border border-[#6B8C6E]/40 rounded-2xl px-4 py-3 mb-6">
        <BadgeCheck size={22} className="text-[#6B8C6E] flex-shrink-0" />
        <p className="text-sm text-[#C8BDB8]">
          <span className="font-bold text-white">100% free to apply.</span> No application fees, no membership fees, no upfront costs — ever.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {FAQ_GROUPS.map(group => (
          <div key={group.title}>
            <p className="text-xs font-bold uppercase tracking-widest text-[#C8A88A] mb-2">{group.title}</p>
            <div className="flex flex-col gap-2">
              {group.items.map(item => {
                const key = `${group.title}__${item.q}`
                const open = openKey === key
                return (
                  <div
                    key={key}
                    className={cn(
                      'rounded-xl border overflow-hidden transition-colors',
                      item.highlight ? 'border-[#6B8C6E]/50 bg-[#6B8C6E]/10' : 'border-white/10 bg-white/5',
                    )}
                  >
                    <button
                      onClick={() => setOpenKey(open ? null : key)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                    >
                      <span className="text-sm font-semibold text-white">{item.q}</span>
                      <ChevronDown
                        size={16}
                        className={cn('text-[#C8BDB8] flex-shrink-0 transition-transform', open && 'rotate-180')}
                      />
                    </button>
                    {open && (
                      <div className="px-4 pb-4 text-sm text-[#C8BDB8] leading-relaxed">
                        {item.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-[#C8BDB8] mt-6">
        Still have questions? Reach us at{' '}
        <a href="mailto:hello@alagawellness.care" className="text-[#C8A88A] underline font-semibold">
          hello@alagawellness.care
        </a>{' '}
        — available 8AM–10PM daily.
      </p>
    </div>
  )
}
