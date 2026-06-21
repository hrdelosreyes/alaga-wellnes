'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, MapPin } from 'lucide-react'
import { ProgressBar } from '@/components/booking/progress-bar'
import { Button } from '@/components/ui/button'
import { useBooking } from '@/lib/booking-context'
import { createClient } from '@/lib/supabase/client'
import { useGeoCity } from '@/components/geo/city-context'

type City      = { id: string; name: string; region: string; province: string | null }
type Barangay  = { psgc_code: string; name: string }

export default function AddressPage() {
  const router = useRouter()
  const { draft, update } = useBooking()
  const { city: geoCity } = useGeoCity()

  const [cities,     setCities]     = useState<City[]>([])
  const [barangays,  setBarangays]  = useState<Barangay[]>([])
  const [bgyLoading, setBgyLoading] = useState(false)

  const [cityId,     setCityId]     = useState(draft.cityId    ?? '')
  const [barangay,   setBarangay]   = useState<Barangay | null>(null)
  const [address,    setAddress]    = useState(draft.address   ?? '')
  const [unitNotes,  setUnitNotes]  = useState(draft.unitNotes ?? '')
  const [waitlist,   setWaitlist]   = useState(false)
  const [waitEmail,  setWaitEmail]  = useState('')
  const [waitSent,   setWaitSent]   = useState(false)
  const [errors,     setErrors]     = useState<{ cityId?: string; barangay?: string; address?: string }>({})

  useEffect(() => {
    if (!draft.serviceId) router.replace('/book')
  }, [draft.serviceId, router])

  // Load live cities, then pre-select from geo context
  useEffect(() => {
    createClient()
      .from('cities')
      .select('id, name, region, province')
      .eq('is_customer_live', true)
      .order('region').order('name')
      .then(({ data }) => {
        const list = (data ?? []) as City[]
        setCities(list)
        if (draft.cityId) return
        // Use already-detected geo city (avoids extra IP call)
        if (geoCity) {
          const match = list.find(c => c.id === geoCity.id) ?? null
          if (match) setCityId(match.id)
        }
      })
  }, [geoCity])

  // Load barangays whenever city changes
  useEffect(() => {
    if (!cityId) { setBarangays([]); setBarangay(null); return }
    const city = cities.find(c => c.id === cityId)
    if (!city) return
    setBgyLoading(true)
    setBarangay(null)
    // Barangays are stored as "City of X" — try both formats
    const cityNameVariants = [
      city.name,
      `City of ${city.name}`,
    ]
    createClient()
      .from('barangays')
      .select('psgc_code, name')
      .in('city_name', cityNameVariants)
      .order('name')
      .then(({ data }) => {
        setBarangays((data ?? []) as Barangay[])
        setBgyLoading(false)
      })
  }, [cityId, cities])

  function validate() {
    const e: typeof errors = {}
    if (!cityId)           e.cityId   = 'Please select your city.'
    if (barangays.length > 0 && !barangay) e.barangay = 'Please select your barangay.'

    if (!address.trim())   e.address  = 'Please enter your street address.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (!validate()) return
    const city = cities.find(c => c.id === cityId)
    const fullAddress = [address.trim(), barangay?.name, city?.name].filter(Boolean).join(', ')
    update({
      cityId,
      cityName:     city?.name ?? '',
      barangayPsgc: barangay?.psgc_code ?? null,
      address:      fullAddress,
      unitNotes:    unitNotes.trim() || null,
    })
    router.push('/book/therapist')
  }

  // Group live cities by region
  const cityGroups = cities.reduce<Record<string, City[]>>((acc, c) => {
    if (!acc[c.region]) acc[c.region] = []
    acc[c.region].push(c)
    return acc
  }, {})

  const selectedCity = cities.find(c => c.id === cityId)

  return (
    <>
      <ProgressBar current={2} />

      <div className="container-alaga py-12 max-w-2xl">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-[#8C7B70] hover:text-[#2C2420] mb-6 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>

        <h1 className="text-2xl font-bold text-[#2C2420] mb-2">Where should we come?</h1>
        <p className="text-[#8C7B70] mb-8">Select your city and enter your address.</p>

        <div className="bg-white rounded-2xl border border-[#EDE5DF] p-6 flex flex-col gap-5">

          {/* City */}
          <div>
            <label className="block text-sm font-semibold text-[#2C2420] mb-2">
              City <span className="text-red-400">*</span>
            </label>
            {cities.length === 0 ? (
              <div className="border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm text-[#8C7B70]">
                Loading available cities…
              </div>
            ) : (
              <select
                value={cityId}
                onChange={e => { setCityId(e.target.value); setBarangay(null); setErrors(p => ({ ...p, cityId: undefined, barangay: undefined })) }}
                className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors bg-white"
              >
                <option value="">Select your city…</option>
                {Object.entries(cityGroups).map(([region, regionCities]) => (
                  <optgroup key={region} label={region}>
                    {regionCities.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.province ? ` — ${c.province}` : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
            {errors.cityId && <p className="text-xs text-red-500 mt-1">{errors.cityId}</p>}

            {!waitlist && (
              <p className="text-xs text-[#8C7B70] mt-2">
                Don't see your city?{' '}
                <button onClick={() => setWaitlist(true)} className="text-[#C4714A] underline font-medium">
                  Join the waitlist
                </button>
                {' '}and we'll notify you when we launch there.
              </p>
            )}
          </div>

          {/* Waitlist */}
          {waitlist && !waitSent && (
            <div className="bg-[#FBF6F0] rounded-xl p-4 flex flex-col gap-3">
              <p className="text-sm font-semibold text-[#2C2420]">Leave your email and we'll notify you</p>
              <input
                type="email"
                value={waitEmail}
                onChange={e => setWaitEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full border border-[#EDE5DF] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C4714A]"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={async () => { if (!waitEmail.includes('@')) return; setWaitSent(true) }}>
                  Notify me
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setWaitlist(false)}>Cancel</Button>
              </div>
            </div>
          )}
          {waitSent && (
            <div className="flex items-center gap-2 text-sm text-[#6B8C6E] bg-[#EBF3EC] border border-[#B8D9BB] rounded-xl p-3">
              ✓ Got it! We'll email you when we launch in your area.
            </div>
          )}

          {/* Barangay — shown after city is selected */}
          {cityId && (
            <div>
              <label className="block text-sm font-semibold text-[#2C2420] mb-2">
                Barangay <span className="text-red-400">*</span>
              </label>
              {bgyLoading ? (
                <div className="border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm text-[#8C7B70]">
                  Loading barangays for {selectedCity?.name}…
                </div>
              ) : barangays.length === 0 ? (
                <div className="border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm text-[#8C7B70]">
                  No barangay data available for {selectedCity?.name} — type it in your address below.
                </div>
              ) : (
                <select
                  value={barangay?.psgc_code ?? ''}
                  onChange={e => {
                    const found = barangays.find(b => b.psgc_code === e.target.value) ?? null
                    setBarangay(found)
                    setErrors(p => ({ ...p, barangay: undefined }))
                  }}
                  className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors bg-white"
                >
                  <option value="">Select your barangay…</option>
                  {barangays.map(b => (
                    <option key={b.psgc_code} value={b.psgc_code}>{b.name}</option>
                  ))}
                </select>
              )}
              {errors.barangay && <p className="text-xs text-red-500 mt-1">{errors.barangay}</p>}
            </div>
          )}

          {/* Street address */}
          <div>
            <label className="block text-sm font-semibold text-[#2C2420] mb-2">
              Street address / building <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-3.5 text-[#8C7B70]" />
              <input
                type="text"
                value={address}
                onChange={e => { setAddress(e.target.value); setErrors(p => ({ ...p, address: undefined })) }}
                placeholder="e.g. One Bonifacio High Street"
                className="w-full border border-[#EDE5DF] rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors"
              />
            </div>
            {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
          </div>

          {/* Unit notes */}
          <div>
            <label className="block text-sm font-semibold text-[#2C2420] mb-2">
              Unit / floor / access notes <span className="text-[#8C7B70] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={unitNotes}
              onChange={e => setUnitNotes(e.target.value)}
              placeholder="e.g. Unit 12B, 12th floor — call guard on arrival"
              className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors"
            />
          </div>

          {/* Address preview */}
          {(barangay || address) && (
            <div className="bg-[#F7F2EE] rounded-xl px-4 py-3 text-xs text-[#5C4B45]">
              <span className="font-semibold text-[#2C2420]">Full address: </span>
              {[address.trim(), barangay?.name, selectedCity?.name].filter(Boolean).join(', ')}
              {unitNotes && <span className="text-[#8C7B70]"> · {unitNotes}</span>}
            </div>
          )}
        </div>

        <div className="mt-8">
          <Button size="lg" className="w-full" onClick={next}>
            Continue
          </Button>
          <p className="text-center text-xs text-[#8C7B70] mt-3">
            A ₱100 transport fee will be added at checkout.
          </p>
        </div>
      </div>
    </>
  )
}
