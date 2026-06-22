'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, CheckCircle, Upload, Wallet, Users, Gift, Star, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type City = { id: string; name: string; region: string; province: string }

const SPECIALTIES_OPTIONS = [
  'Relaxation Massage',
  'Deep Tissue',
  'Sports Recovery',
  'Hilot',
  'Postpartum Care',
  'Senior Care',
  'Foot Spa',
  'Hot Stone',
  'Prenatal Massage',
  'Reflexology',
]

// Step 0 = Benefits landing, steps 1–3 = form pages
const FORM_STEPS = ['Personal Info', 'Professional', 'Documents']

type FormData = {
  name: string
  email: string
  phone: string
  gender: string
  cityId: string
  referralCode: string
  yearsExperience: string
  specialties: string[]
  bio: string
  referralSource: string
  nbiFile: File | null
  tesdaFile: File | null
  photoFile: File | null
}

const EMPTY: FormData = {
  name: '', email: '', phone: '', gender: '', cityId: '',
  referralCode: '',
  yearsExperience: '', specialties: [], bio: '',
  referralSource: '',
  nbiFile: null, tesdaFile: null, photoFile: null,
}

export default function TherapistRegisterPage() {
  const router = useRouter()

  // step -1 = benefits screen, 0–2 = form steps
  const [step,          setStep]          = useState(-1)
  const [form,          setForm]          = useState<FormData>(EMPTY)
  const [cities,        setCities]        = useState<City[]>([])
  const [errors,        setErrors]        = useState<Partial<Record<keyof FormData, string>>>({})
  const [referrerName,  setReferrerName]  = useState<string | null>(null)
  const [referrerId,    setReferrerId]    = useState<string | null>(null)
  const [loading,       setLoading]       = useState(false)
  const [done,          setDone]          = useState(false)
  const [submitError,   setSubmitError]   = useState<string | null>(null)

  useEffect(() => {
    createClient()
      .from('cities')
      .select('id, name, region, province')
      .order('region').order('name')
      .then(({ data }) => setCities((data ?? []) as City[]))
  }, [])

  function patch(updates: Partial<FormData>) {
    setForm(prev => ({ ...prev, ...updates }))
    setErrors({})
    setSubmitError(null)
  }

  async function lookupReferralCode(code: string) {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) { setReferrerName(null); setReferrerId(null); return }
    const { data } = await createClient()
      .from('therapists')
      .select('id, name')
      .eq('referral_code', trimmed)
      .eq('application_status', 'approved')
      .single()
    if (data) { setReferrerName(data.name); setReferrerId(data.id) }
    else       { setReferrerName(null);     setReferrerId(null)   }
  }

  function toggleSpecialty(s: string) {
    setForm(prev => ({
      ...prev,
      specialties: prev.specialties.includes(s)
        ? prev.specialties.filter(x => x !== s)
        : [...prev.specialties, s],
    }))
  }

  function validateStep(): boolean {
    const e: typeof errors = {}
    if (step === 0) {
      if (!form.name.trim())  e.name   = 'Full name is required.'
      if (!form.email.trim()) e.email  = 'Email address is required.'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
        e.email = 'Enter a valid email address.'
      if (!form.phone.trim()) e.phone  = 'Mobile number is required.'
      else if (!/^(09|\+639)\d{9}$/.test(form.phone.replace(/\s/g, '')))
        e.phone = 'Enter a valid PH mobile number.'
      if (!form.gender)       e.gender = 'Please select your gender.'
      if (!form.cityId)       e.cityId = 'Please select your city.'
    }
    if (step === 1) {
      if (form.specialties.length === 0) e.specialties     = 'Select at least one specialty.'
      if (!form.yearsExperience)         e.yearsExperience = 'Years of experience is required.'
    }
    if (step === 2) {
      if (!form.nbiFile)   e.nbiFile   = 'NBI clearance is required.'
      if (!form.tesdaFile) e.tesdaFile = 'TESDA certificate is required.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (validateStep()) setStep(s => s + 1)
  }

  async function submit() {
    if (!validateStep()) return
    setLoading(true)

    try {
      const supabase = createClient()

      async function uploadFile(file: File, folder: string): Promise<string> {
        const ext  = file.name.split('.').pop()
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from('therapist-docs').upload(path, file)
        if (error) throw error
        return path
      }

      const [nbiUrl, tesdaUrl, photoUrl] = await Promise.all([
        form.nbiFile   ? uploadFile(form.nbiFile,   'nbi')    : Promise.resolve(null),
        form.tesdaFile ? uploadFile(form.tesdaFile, 'tesda')  : Promise.resolve(null),
        form.photoFile ? uploadFile(form.photoFile, 'photos') : Promise.resolve(null),
      ])

      const phone = form.phone.replace(/\s/g, '').replace(/^0/, '+63')

      const { error } = await supabase.from('therapists').insert({
        name:               form.name.trim(),
        email:              form.email.trim().toLowerCase(),
        phone,
        gender:             form.gender,
        city_id:            form.cityId,
        zone:               cities.find(c => c.id === form.cityId)?.name ?? '',
        years_experience:   parseInt(form.yearsExperience),
        specialties:        form.specialties,
        bio:                form.bio.trim() || null,
        referral_source:    form.referralSource || null,
        nbi_url:            nbiUrl,
        tesda_url:          tesdaUrl,
        photo_url:          photoUrl,
        referred_by_id:     referrerId ?? null,
        application_status: 'pending',
        is_active:          false,
        nbi_cleared:        false,
        tesda_certified:    false,
      })

      if (error) {
        if (error.code === '23505') {
          if (error.message.includes('phone')) {
            setSubmitError('This mobile number is already registered. If you already applied, please wait for our review.')
          } else if (error.message.includes('email')) {
            setSubmitError('This email address is already registered. If you already applied, please wait for our review.')
          } else {
            setSubmitError('An application with this information already exists.')
          }
          return
        }
        throw error
      }

      const { data: therapistRow } = await supabase
        .from('therapists')
        .select('id')
        .eq('phone', phone)
        .single()

      if (therapistRow) {
        if (nbiUrl) {
          fetch('/api/extract-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ therapistId: therapistRow.id, storagePath: nbiUrl, documentType: 'nbi' }),
          }).catch(() => {})
        }
        if (tesdaUrl) {
          fetch('/api/extract-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ therapistId: therapistRow.id, storagePath: tesdaUrl, documentType: 'tesda' }),
          }).catch(() => {})
        }
      }

      setDone(true)
    } catch (err: unknown) {
      console.error('Registration error:', err)
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setSubmitError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Success screen ───────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-[#FBF6F0] flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <CheckCircle size={56} className="text-[#6B8C6E] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#2C2420] mb-2">Application submitted!</h1>
          <p className="text-[#8C7B70] mb-6">
            Thank you for applying to join Alaga Wellness. Our team will review your documents and get in touch within 3–5 business days.
          </p>
          <Button className="w-full" onClick={() => router.push('/')}>Back to home</Button>
        </div>
      </div>
    )
  }

  // ── Benefits landing screen (step === -1) ────────────────────────
  if (step === -1) {
    return (
      <div className="min-h-screen bg-[#2C2420] text-white">

        {/* Hero — hard split: solid text column + image column */}
        <div className="flex flex-col md:flex-row">

          {/* Left: solid dark text column */}
          <div className="md:w-1/2 bg-[#2C2420] flex flex-col justify-center px-6 py-12 md:px-12 md:py-16">
            <img src="/logo-vertical-dark.png" alt="Alaga Wellness" className="h-12 w-auto mb-8" />
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4 text-white">
              Your skills deserve to be seen — and paid.
            </h1>
            <p className="text-[#C8BDB8] text-sm leading-relaxed">
              Alaga connects certified massage therapists with clients who want quality home wellness sessions. No chasing customers, no awkward haggling — just bookings waiting for you.
            </p>
          </div>

          {/* Right: image column */}
          <div className="md:w-1/2 h-72 md:h-auto md:min-h-[480px]">
            <img
              src="/therapist-hero.png"
              alt="Alaga Wellness therapist"
              className="w-full h-full object-cover object-center"
            />
          </div>

        </div>

        {/* Benefit cards */}
        <div className="px-4 max-w-lg mx-auto flex flex-col gap-4 pb-6">

          {/* Earnings */}
          <div className="bg-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#C4714A] flex items-center justify-center flex-shrink-0">
                <Wallet size={18} className="text-white" />
              </div>
              <h2 className="font-bold" style={{ color: '#C4714A' }}>You keep most of what you earn</h2>
            </div>
            <p className="text-sm text-[#C8BDB8] leading-relaxed">
              You set your own price for every service. Most of what the client pays goes directly to you — Alaga only takes a small platform share to keep everything running. Full details are explained when you're approved and ready to set your rates.
            </p>
          </div>

          {/* Referral */}
          <div className="bg-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#6B8C6E] flex items-center justify-center flex-shrink-0">
                <Users size={18} className="text-white" />
              </div>
              <h2 className="font-bold" style={{ color: '#6B8C6E' }}>Earn even when you're off-duty</h2>
            </div>
            <p className="text-sm text-[#C8BDB8] leading-relaxed">
              Know other therapists who'd be great on Alaga? Invite them. Every time they complete a booking, you earn — even while you're resting. Your network works for you.
            </p>
          </div>

          {/* Alaga Bonus */}
          <div className="bg-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#C9A84C] flex items-center justify-center flex-shrink-0">
                <Gift size={18} className="text-white" />
              </div>
              <h2 className="font-bold" style={{ color: '#C9A84C' }}>Quarterly Alaga Bonus</h2>
            </div>
            <p className="text-sm text-[#C8BDB8] leading-relaxed">
              Every quarter, Alaga shares a bonus pool with the therapists who showed up consistently. Stay active, complete bookings, and claim your share at the end of every quarter — on top of everything you already earned.
            </p>
          </div>

          {/* What we look for */}
          <div className="bg-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#C4714A]/60 flex items-center justify-center flex-shrink-0">
                <Star size={18} className="text-white" />
              </div>
              <h2 className="font-bold" style={{ color: '#C4714A' }}>Who can apply?</h2>
            </div>
            <ul className="flex flex-col gap-2 text-sm text-[#C8BDB8]">
              {[
                'Holds a valid NBI Clearance',
                'TESDA-certified in massage therapy',
                'Professional, reliable, and client-focused',
                'Available for home service within your city',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-[#6B8C6E] mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="sticky bottom-0 bg-[#2C2420] border-t border-white/10 px-4 py-4">
          <div className="max-w-lg mx-auto flex flex-col gap-2">
            <button
              onClick={() => setStep(0)}
              className="w-full bg-[#C4714A] hover:bg-[#b56340] text-white font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2 transition-colors"
            >
              Apply now <ArrowRight size={18} />
            </button>
            <p className="text-center text-xs text-[#C8BDB8]">
              Already applied?{' '}
              <a href="/therapist/login" className="text-[#C8A88A] hover:underline font-semibold">Log in here</a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Form steps (step 0–2) ────────────────────────────────────────
  const cityGroups = cities.reduce<Record<string, City[]>>((acc, c) => {
    if (!acc[c.region]) acc[c.region] = []
    acc[c.region].push(c)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-[#FBF6F0]">

      {/* Header */}
      <div className="bg-[#2C2420] text-white px-5 py-4 text-center">
        <h1 className="font-bold text-base">Join Alaga Wellness</h1>
        <p className="text-xs text-[#C8A88A] mt-0.5">Therapist application</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Progress */}
        <div className="flex items-center mb-8">
          {FORM_STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                  i < step  && 'bg-[#C4714A] text-white',
                  i === step && 'bg-[#2C2420] text-white',
                  i > step  && 'bg-[#EDE5DF] text-[#8C7B70]',
                )}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={cn(
                  'text-[10px] font-medium hidden sm:block',
                  i === step ? 'text-[#2C2420]' : 'text-[#8C7B70]',
                )}>{label}</span>
              </div>
              {i < FORM_STEPS.length - 1 && (
                <div className={cn('flex-1 h-px mx-2', i < step ? 'bg-[#C4714A]' : 'bg-[#EDE5DF]')} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-[#EDE5DF] p-6 flex flex-col gap-5">

          {/* ── Step 0: Personal Info ─────────────────────────── */}
          {step === 0 && (
            <>
              <h2 className="font-bold text-[#2C2420] text-lg">Personal information</h2>

              <div>
                <label className="block text-sm font-semibold text-[#2C2420] mb-2">Full name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => patch({ name: e.target.value })}
                  placeholder="e.g. Maria Santos"
                  className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors"
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#2C2420] mb-2">Email address <span className="text-red-400">*</span></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => patch({ email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors"
                />
                <p className="text-xs text-[#8C7B70] mt-1">You'll use this to log in to your therapist portal once approved.</p>
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#2C2420] mb-2">Mobile number <span className="text-red-400">*</span></label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => patch({ phone: e.target.value })}
                  placeholder="09XX XXX XXXX"
                  className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors"
                />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#2C2420] mb-2">Gender <span className="text-red-400">*</span></label>
                <div className="flex gap-3">
                  {['female', 'male'].map(g => (
                    <button
                      key={g}
                      onClick={() => patch({ gender: g })}
                      className={cn(
                        'flex-1 py-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all',
                        form.gender === g
                          ? 'border-[#C4714A] bg-[#FFF7F3] text-[#C4714A]'
                          : 'border-[#EDE5DF] text-[#8C7B70] hover:border-[#C4714A]',
                      )}
                    >{g}</button>
                  ))}
                </div>
                {errors.gender && <p className="text-xs text-red-500 mt-1">{errors.gender}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#2C2420] mb-2">City you will serve <span className="text-red-400">*</span></label>
                <select
                  value={form.cityId}
                  onChange={e => patch({ cityId: e.target.value })}
                  className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors bg-white"
                >
                  <option value="">Select a city…</option>
                  {Object.entries(cityGroups).map(([region, regionCities]) => (
                    <optgroup key={region} label={region}>
                      {regionCities.map(c => (
                        <option key={c.id} value={c.id}>{c.name} — {c.province}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {errors.cityId && <p className="text-xs text-red-500 mt-1">{errors.cityId}</p>}
              </div>

              {/* Referral code */}
              <div>
                <label className="block text-sm font-semibold text-[#2C2420] mb-2">
                  Referral code <span className="text-[#8C7B70] font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.referralCode}
                  onChange={e => { patch({ referralCode: e.target.value.toUpperCase() }); setReferrerName(null) }}
                  onBlur={e => lookupReferralCode(e.target.value)}
                  placeholder="e.g. JUAN1234"
                  className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors uppercase"
                />
                {form.referralCode && (
                  referrerName
                    ? <p className="text-xs text-[#6B8C6E] mt-1 font-semibold">✓ Referred by {referrerName}</p>
                    : <p className="text-xs text-[#C8BDB8] mt-1">Code not recognised — leave blank to continue without one.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#2C2420] mb-2">How did you hear about us?</label>
                <select
                  value={form.referralSource}
                  onChange={e => patch({ referralSource: e.target.value })}
                  className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors bg-white"
                >
                  <option value="">Select…</option>
                  {['Facebook', 'Instagram', 'TikTok', 'Friend / Referral', 'Flyer / Poster', 'SMS', 'Other'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* ── Step 1: Professional Info ─────────────────────── */}
          {step === 1 && (
            <>
              <h2 className="font-bold text-[#2C2420] text-lg">Professional background</h2>

              <div>
                <label className="block text-sm font-semibold text-[#2C2420] mb-2">Years of experience <span className="text-red-400">*</span></label>
                <select
                  value={form.yearsExperience}
                  onChange={e => patch({ yearsExperience: e.target.value })}
                  className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors bg-white"
                >
                  <option value="">Select…</option>
                  {['Less than 1 year','1–2 years','3–5 years','6–10 years','10+ years'].map((v, i) => (
                    <option key={v} value={String(i + 1)}>{v}</option>
                  ))}
                </select>
                {errors.yearsExperience && <p className="text-xs text-red-500 mt-1">{errors.yearsExperience}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#2C2420] mb-3">
                  Specialties <span className="text-red-400">*</span>
                  <span className="text-[#8C7B70] font-normal ml-1">(select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTIES_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => toggleSpecialty(s)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm border font-medium transition-all',
                        form.specialties.includes(s)
                          ? 'bg-[#C4714A] text-white border-[#C4714A]'
                          : 'border-[#EDE5DF] text-[#8C7B70] hover:border-[#C4714A]',
                      )}
                    >{s}</button>
                  ))}
                </div>
                {errors.specialties && <p className="text-xs text-red-500 mt-1">{errors.specialties}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#2C2420] mb-2">
                  Short bio <span className="text-[#8C7B70] font-normal">(optional)</span>
                </label>
                <textarea
                  value={form.bio}
                  onChange={e => patch({ bio: e.target.value })}
                  placeholder="Tell clients a little about your approach and style…"
                  rows={3}
                  className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors resize-none"
                />
                <p className="text-xs text-[#8C7B70] mt-1">This will be shown on your therapist card.</p>
              </div>
            </>
          )}

          {/* ── Step 2: Documents ─────────────────────────────── */}
          {step === 2 && (
            <>
              <h2 className="font-bold text-[#2C2420] text-lg">Upload documents</h2>
              <p className="text-sm text-[#8C7B70] -mt-2">All documents are kept confidential and used for verification only.</p>

              {[
                { key: 'nbiFile'   as const, label: 'NBI Clearance',    required: true,  hint: 'Upload a clear photo or scan. Must be valid (not expired).' },
                { key: 'tesdaFile' as const, label: 'TESDA Certificate', required: true,  hint: 'Any TESDA massage therapy NC (NC II preferred).' },
                { key: 'photoFile' as const, label: 'Profile photo',     required: false, hint: 'Clear headshot on a plain background. Shown to clients.' },
              ].map(({ key, label, required, hint }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-[#2C2420] mb-1">
                    {label} {required && <span className="text-red-400">*</span>}
                  </label>
                  <p className="text-xs text-[#8C7B70] mb-2">{hint}</p>
                  <label className={cn(
                    'flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-4 cursor-pointer transition-colors',
                    form[key]
                      ? 'border-[#6B8C6E] bg-[#EBF3EC]'
                      : 'border-[#EDE5DF] hover:border-[#C4714A]',
                  )}>
                    <Upload size={18} className={form[key] ? 'text-[#6B8C6E]' : 'text-[#8C7B70]'} />
                    <span className="text-sm text-[#8C7B70]">
                      {form[key] ? (form[key] as File).name : 'Tap to upload (JPG, PNG, PDF)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={e => patch({ [key]: e.target.files?.[0] ?? null } as Partial<FormData>)}
                    />
                  </label>
                  {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
                </div>
              ))}

              <div className="bg-[#FBF6F0] rounded-xl p-4 text-xs text-[#8C7B70] leading-relaxed">
                By submitting, you agree to Alaga Wellness's therapist terms and consent to a background verification. Your documents will not be shared with third parties.
              </div>
            </>
          )}
        </div>

        {/* Submit error */}
        {submitError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {submitError}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={() => setStep(s => s - 1)}
          >
            <ChevronLeft size={16} /> Back
          </Button>
          {step < FORM_STEPS.length - 1 ? (
            <Button size="lg" className="flex-1" onClick={next}>
              Continue <ChevronRight size={16} />
            </Button>
          ) : (
            <Button size="lg" className="flex-1" loading={loading} onClick={submit}>
              Submit application
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-[#8C7B70] mt-4">
          Already applied?{' '}
          <a href="/therapist/login" className="text-[#C4714A] hover:underline">Log in here</a>
        </p>
      </div>
    </div>
  )
}
