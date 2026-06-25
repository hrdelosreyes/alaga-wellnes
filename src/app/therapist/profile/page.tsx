'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { TherapistNav } from '@/components/therapist/therapist-nav'
import { cn } from '@/lib/utils'
import { Loader2, Star, ShieldCheck, Camera, CheckCircle2, Lock } from 'lucide-react'

const SPECIALTIES_OPTIONS = [
  'Relaxation Massage','Deep Tissue','Sports Recovery','Hilot',
  'Postpartum Care','Senior Care','Foot Spa','Hot Stone',
  'Prenatal Massage','Reflexology',
]

type Editable = {
  name: string; phone: string; gender: string
  years_experience: number | null; bio: string; specialties: string[]
}
type ReadOnly = {
  email: string | null; referral_code: string | null
  city_name: string | null; region: string | null
  rating_avg: number; total_bookings: number
  nbi_cleared: boolean; tesda_certified: boolean; created_at: string
}

export default function TherapistProfilePage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading]   = useState(true)
  const [saving,  setSaving]    = useState(false)
  const [saved,   setSaved]     = useState(false)
  const [error,   setError]     = useState<string | null>(null)

  const [form, setForm]         = useState<Editable | null>(null)
  const [ro,   setRo]           = useState<ReadOnly | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null) // signed display URL
  const [photoPath, setPhotoPath] = useState<string | null>(null) // new uploaded path (pending save)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function load() {
    fetch('/api/therapist/profile')
      .then(async res => {
        if (res.status === 401 || res.status === 403) { router.replace('/therapist/login'); return null }
        return res.json()
      })
      .then(d => {
        if (d && !d.error) {
          setForm(d.editable)
          setRo(d.readonly)
          setPhotoUrl(d.photoSignedUrl)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const supabase = createClient()
      const ext  = file.name.split('.').pop()
      const path = `photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('therapist-docs').upload(path, file)
      if (upErr) throw upErr
      setPhotoPath(path)
      // Preview the local file immediately
      setPhotoUrl(URL.createObjectURL(file))
    } catch {
      setError('Could not upload photo. Please try a different image.')
    } finally {
      setUploading(false)
    }
  }

  function toggleSpecialty(s: string) {
    setForm(p => p ? ({
      ...p,
      specialties: p.specialties.includes(s) ? p.specialties.filter(x => x !== s) : [...p.specialties, s],
    }) : p)
  }

  async function save() {
    if (!form) return
    setError(null)
    setSaving(true)
    const res = await fetch('/api/therapist/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name, phone: form.phone, gender: form.gender,
        yearsExperience: form.years_experience, bio: form.bio,
        specialties: form.specialties, photoPath,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Could not save. Please try again.')
      return
    }
    setPhotoPath(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading || !form || !ro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF6F0]">
        <Loader2 className="animate-spin text-[#C4714A]" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F2EE]">
      <TherapistNav />

      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-bold text-[#2C2420]">My profile</h1>
          <p className="text-sm text-[#8C7B70] mt-1">This is how you appear to customers. Keep it polished — it helps you get booked.</p>
        </div>

        {/* Public preview card */}
        <div className="bg-white rounded-2xl border border-[#EDE5DF] p-5 flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full bg-[#F2D9CC] flex items-center justify-center text-xl font-bold text-[#C4714A] overflow-hidden flex-shrink-0">
            {photoUrl
              ? <img src={photoUrl} alt={form.name} className="w-full h-full object-cover" />
              : form.name.charAt(0)}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center text-white transition-opacity"
              title="Change photo"
            >
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[#2C2420] truncate">{form.name || 'Your name'}</span>
              {ro.nbi_cleared && <span className="flex items-center gap-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full"><ShieldCheck size={9}/> NBI</span>}
              {ro.tesda_certified && <span className="flex items-center gap-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full"><ShieldCheck size={9}/> TESDA</span>}
            </div>
            <p className="text-xs text-[#8C7B70] mt-0.5">
              <span className="text-[#C9A84C]">★ {ro.rating_avg}</span> · {ro.total_bookings} sessions
              {ro.city_name ? ` · ${ro.city_name}` : ''}
            </p>
            <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-[#C4714A] hover:underline mt-1">
              {photoUrl ? 'Change photo' : 'Add a photo'}
            </button>
          </div>
        </div>

        {/* Editable fields */}
        <div className="bg-white rounded-2xl border border-[#EDE5DF] p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-1.5 block">Full name</label>
              <input value={form.name} onChange={e => setForm(p => p ? { ...p, name: e.target.value } : p)}
                className="w-full border border-[#EDE5DF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C4714A]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-1.5 block">Gender</label>
              <select value={form.gender} onChange={e => setForm(p => p ? { ...p, gender: e.target.value } : p)}
                className="w-full border border-[#EDE5DF] rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#C4714A]">
                <option value="">Select…</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-1.5 block">Mobile number</label>
              <input type="tel" value={form.phone} onChange={e => setForm(p => p ? { ...p, phone: e.target.value } : p)}
                className="w-full border border-[#EDE5DF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C4714A]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-1.5 block">Years experience</label>
              <input type="number" min={0} max={50} value={form.years_experience ?? ''}
                onChange={e => setForm(p => p ? { ...p, years_experience: e.target.value ? parseInt(e.target.value) : null } : p)}
                className="w-full border border-[#EDE5DF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C4714A]" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-1.5 block">Bio</label>
            <textarea value={form.bio} rows={3}
              onChange={e => setForm(p => p ? { ...p, bio: e.target.value } : p)}
              placeholder="Tell customers about your style, training, and what makes your sessions special."
              className="w-full border border-[#EDE5DF] rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[#C4714A]" />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-2 block">Specialties</label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES_OPTIONS.map(s => (
                <button key={s} type="button" onClick={() => toggleSpecialty(s)}
                  className={cn('text-xs px-3 py-1.5 rounded-full border transition-colors',
                    form.specialties.includes(s) ? 'bg-[#2C2420] text-white border-[#2C2420]' : 'border-[#EDE5DF] text-[#8C7B70] hover:border-[#C4714A]')}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button size="lg" className="w-full" loading={saving} disabled={uploading} onClick={save}>
            {saved ? <span className="flex items-center gap-1.5"><CheckCircle2 size={16} /> Saved!</span> : 'Save profile'}
          </Button>
        </div>

        {/* Admin-controlled (read-only) */}
        <div className="bg-white rounded-2xl border border-[#EDE5DF] p-5">
          <h2 className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Lock size={12} /> Managed by Alaga
          </h2>
          <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
            <RoField label="Email" value={ro.email ?? '—'} />
            <RoField label="Referral code" value={ro.referral_code ?? '—'} mono />
            <RoField label="City" value={ro.city_name ? `${ro.city_name}${ro.region ? ', ' + ro.region : ''}` : '—'} />
            <RoField label="Verification" value={[ro.nbi_cleared && 'NBI', ro.tesda_certified && 'TESDA'].filter(Boolean).join(' · ') || 'Pending'} />
          </div>
          <p className="text-[11px] text-[#8C7B70] mt-3">
            To change your email, referral code, city, or verification status, please contact Alaga support.
          </p>
        </div>
      </div>
    </div>
  )
}

function RoField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-[#8C7B70] uppercase tracking-wider">{label}</p>
      <p className={cn('text-sm text-[#2C2420] mt-0.5 font-medium break-words', mono && 'font-mono tracking-widest text-[#C4714A]')}>{value}</p>
    </div>
  )
}
