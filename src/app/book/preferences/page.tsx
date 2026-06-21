'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronLeft, UserCircle } from 'lucide-react'
import Link from 'next/link'
import { ProgressBar } from '@/components/booking/progress-bar'
import { Button } from '@/components/ui/button'
import { useBooking } from '@/lib/booking-context'
import { createClient } from '@/lib/supabase/client'

export default function PreferencesPage() {
  const router = useRouter()
  const { draft, update } = useBooking()

  const [name,        setName]        = useState(draft.customerName  ?? '')
  const [phone,       setPhone]       = useState(draft.customerPhone ?? '')
  const [notes,       setNotes]       = useState(draft.customerNotes ?? '')
  const [errors,      setErrors]      = useState<{ name?: string; phone?: string }>({})
  const [customerId,  setCustomerId]  = useState<string | null>(null)
  const [prefilled,   setPrefilled]   = useState(false)

  useEffect(() => {
    if (!draft.serviceId) { router.replace('/book'); return }

    // Pre-fill from customer profile if signed in
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const supabase = createClient()
      const { data: profile } = await supabase
        .from('customers')
        .select('id, name, phone')
        .eq('id', user.id)
        .single()
      if (profile) {
        setCustomerId(profile.id)
        if (!draft.customerName)  { setName(profile.name ?? '');  setPrefilled(true) }
        if (!draft.customerPhone) { setPhone(profile.phone ?? '') }
      }
    })
  }, [draft.serviceId, router])

  function validate() {
    const e: { name?: string; phone?: string } = {}
    if (!name.trim())  e.name  = 'Please enter your name.'
    if (!phone.trim()) e.phone = 'Please enter your mobile number.'
    else if (!/^(09|\+639)\d{9}$/.test(phone.replace(/\s/g, '')))
      e.phone = 'Please enter a valid PH mobile number (e.g. 09171234567).'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (!validate()) return
    update({
      customerName:  name.trim(),
      customerPhone: phone.trim(),
      customerNotes: notes.trim() || null,
      customerId:    customerId,
    })
    router.push('/book/review')
  }

  return (
    <>
      <ProgressBar current={4} />

      <div className="container-alaga py-12 max-w-2xl">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-[#8C7B70] hover:text-[#2C2420] mb-6 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>

        <h1 className="text-2xl font-bold text-[#2C2420] mb-2">Your details</h1>
        {prefilled ? (
          <div className="flex items-center gap-2 mb-6 text-sm text-[#6B8C6E] bg-[#E8F0E9] rounded-xl px-4 py-2.5">
            <UserCircle size={15} />
            <span>Pre-filled from your account. You can edit if needed.</span>
          </div>
        ) : (
          <p className="text-[#8C7B70] mb-6">
            So your therapist knows who to look for.{' '}
            {!customerId && (
              <Link href="/account/login?next=/book/preferences" className="text-[#C4714A] font-medium hover:underline">
                Sign in
              </Link>
            )}{!customerId && ' to pre-fill.'}
          </p>
        )}

        <div className="flex flex-col gap-5">

          {/* Contact info */}
          <div className="bg-white rounded-2xl border border-[#EDE5DF] p-5 flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#2C2420] mb-2">
                Full name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: undefined })) }}
                placeholder="e.g. Juan dela Cruz"
                className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#2C2420] mb-2">
                Mobile number <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: undefined })) }}
                placeholder="e.g. 09171234567"
                className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors"
              />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              <p className="text-xs text-[#8C7B70] mt-1">Shared with your therapist after they accept the booking.</p>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-[#EDE5DF] p-5">
            <label className="block font-semibold text-[#2C2420] mb-1">
              Notes for your therapist <span className="text-[#8C7B70] font-normal">(optional)</span>
            </label>
            <p className="text-sm text-[#8C7B70] mb-3">
              Areas to focus on, pressure preference, allergies, or anything else.
            </p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Please focus on lower back and shoulders. Medium pressure. Allergic to eucalyptus."
              rows={4}
              className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors resize-none"
            />
          </div>

        </div>

        <div className="mt-8">
          <Button size="lg" className="w-full" onClick={next}>
            Review Booking
          </Button>
        </div>
      </div>
    </>
  )
}
