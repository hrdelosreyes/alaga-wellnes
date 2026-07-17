'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useGeoCity } from '@/components/geo/city-context'

type City = { id: string; name: string; region: string; province: string | null }

// Put the launch market first — the alphabetical region sort buries
// Metro Manila below BARMM and CAR otherwise.
function isNcr(region: string) {
  return /national capital|ncr|metro manila/i.test(region)
}

export default function WaitlistForm({ source = 'homepage' }: { source?: string }) {
  const [email,     setEmail]     = useState('')
  const [phone,     setPhone]     = useState('')
  const [city,      setCity]      = useState('')
  const [cityTouched, setCityTouched] = useState(false)
  const [cities,    setCities]    = useState<City[]>([])
  const [loading,   setLoading]   = useState(false)
  const [state,     setState]     = useState<'idle' | 'success' | 'already' | 'error'>('idle')
  const [errorMsg,  setErrorMsg]  = useState('')

  const { city: geoCity } = useGeoCity()

  useEffect(() => {
    createClient()
      .from('cities')
      .select('id, name, region, province')
      .order('region').order('name')
      .then(({ data }) => setCities((data ?? []) as City[]))
  }, [])

  // Pre-select the visitor's detected city so they don't have to hunt
  // through a 140+ entry dropdown. Never override a manual choice.
  useEffect(() => {
    if (cityTouched || city || !geoCity || cities.length === 0) return
    const match = cities.find(c => c.name.toLowerCase() === geoCity.name.toLowerCase())
    if (match) setCity(match.name)
  }, [geoCity, cities, city, cityTouched])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setErrorMsg('Please enter your email.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErrorMsg('Enter a valid email address.'); return }
    if (phone.trim() && !/^(\+?63|0)?[\d\s-]{9,13}$/.test(phone.trim())) { setErrorMsg('Enter a valid PH mobile number, e.g. 0917 123 4567.'); return }
    if (!city) { setErrorMsg('Please select your city.'); return }

    setLoading(true)
    setErrorMsg('')

    try {
      const res  = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), phone: phone.trim() || undefined, city, source }),
      })
      const data = await res.json()

      if (data.alreadyJoined) setState('already')
      else if (data.ok)       setState('success')
      else                    { setErrorMsg(data.error ?? 'Something went wrong.'); setLoading(false) }
    } catch {
      setErrorMsg('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (state === 'success') {
    return (
      <div className="flex items-center gap-3 bg-[#E8F0E9] border border-[#6B8C6E]/30 rounded-2xl px-5 py-4">
        <CheckCircle size={20} className="text-[#6B8C6E] flex-shrink-0" />
        <div className="text-left">
          <p className="font-semibold text-[#2C2420] text-sm">You're on the list!</p>
          <p className="text-xs text-[#6E5F55] mt-0.5">We'll notify you as soon as Alaga launches in your area.</p>
        </div>
      </div>
    )
  }

  if (state === 'already') {
    return (
      <div className="flex items-center gap-3 bg-[#FBF6F0] border border-[#EDE5DF] rounded-2xl px-5 py-4">
        <CheckCircle size={20} className="text-[#C9A84C] flex-shrink-0" />
        <div className="text-left">
          <p className="font-semibold text-[#2C2420] text-sm">You're already signed up!</p>
          <p className="text-xs text-[#6E5F55] mt-0.5">We'll be in touch when we launch in your area.</p>
        </div>
      </div>
    )
  }

  const ncrGroups: [string, City[]][] = []
  const otherGroups: [string, City[]][] = []
  for (const entry of Object.entries(
    cities.reduce<Record<string, City[]>>((acc, c) => {
      (acc[c.region] ??= []).push(c)
      return acc
    }, {})
  )) {
    (isNcr(entry[0]) ? ncrGroups : otherGroups).push(entry)
  }
  const groups = [...ncrGroups, ...otherGroups]

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setErrorMsg('') }}
          placeholder="your@email.com"
          aria-label="Email address"
          autoComplete="email"
          className={cn(
            'px-4 py-3 rounded-xl border text-sm focus:outline-none focus:border-[#C4714A] transition-colors bg-white',
            errorMsg ? 'border-red-400' : 'border-[#EDE5DF]',
          )}
        />
        <input
          type="tel"
          value={phone}
          onChange={e => { setPhone(e.target.value); setErrorMsg('') }}
          placeholder="Mobile number (optional)"
          aria-label="Mobile number (optional)"
          autoComplete="tel-national"
          inputMode="tel"
          className="px-4 py-3 rounded-xl border border-[#EDE5DF] text-sm focus:outline-none focus:border-[#C4714A] transition-colors bg-white"
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={city}
          onChange={e => { setCity(e.target.value); setCityTouched(true); setErrorMsg('') }}
          disabled={cities.length === 0}
          aria-label="Your city"
          className="flex-1 px-4 py-3 rounded-xl border border-[#EDE5DF] text-sm focus:outline-none focus:border-[#C4714A] transition-colors bg-white disabled:opacity-50"
        >
          <option value="">{cities.length === 0 ? 'Loading cities…' : 'Your city…'}</option>
          {groups.map(([region, regionCities]) => (
            <optgroup key={region} label={region}>
              {regionCities.map(c => (
                <option key={c.id} value={c.name}>
                  {c.name}{c.province ? ` — ${c.province}` : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-[#B05C33] hover:bg-[#A05938] text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? 'Joining…' : <><span>Notify me</span><ArrowRight size={15} /></>}
        </button>
      </div>
      {errorMsg && <p className="text-xs text-red-400 text-left">{errorMsg}</p>}
      <p className="text-xs text-[#C8BDB8] text-left">No spam — just a heads-up when we launch in your city.</p>
    </form>
  )
}
