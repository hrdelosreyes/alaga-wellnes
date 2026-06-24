'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatTime, formatPrice } from '@/lib/utils'
import { generateReferralCode } from '@/lib/referral'
import { SERVICES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import {
  RefreshCw, MapPin, Search, ChevronDown, ChevronUp,
  ShieldCheck, FileText, ExternalLink, ToggleLeft, ToggleRight,
  ClipboardList, Users, Star,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab = 'bookings' | 'applicants' | 'therapists'

type BookingRow = {
  id: string
  service_id: string
  booking_date: string
  time_slot: string
  address: string
  status: string
  total: number
  therapists: { name: string } | null
}

type Extracted = {
  controlNumber?: string | null
  fullName?: string | null
  dateIssued?: string | null
  expiryDate?: string | null
  certificateNumber?: string | null
  qualification?: string | null
}

type Applicant = {
  id: string
  name: string
  phone: string
  gender: string
  zone: string
  years_experience: number | null
  specialties: string[]
  bio: string | null
  referral_source: string | null
  nbi_url: string | null
  tesda_url: string | null
  photo_url: string | null
  nbi_extracted: Extracted | null
  tesda_extracted: Extracted | null
  application_status: string
  created_at: string
  cities: { name: string; region: string } | null
}

type Therapist = {
  id: string
  name: string
  phone: string
  is_active: boolean
  nbi_cleared: boolean
  tesda_certified: boolean
  rating_avg: number
  total_bookings: number
  years_experience: number | null
  specialties: string[]
  bio: string | null
  created_at: string
  cities: { id: string; name: string; region: string } | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BOOKING_STATUS_COLOR: Record<string, string> = {
  pending_payment: 'bg-amber-100 text-amber-700',
  confirmed:       'bg-blue-100 text-blue-700',
  assigned:        'bg-purple-100 text-purple-700',
  en_route:        'bg-indigo-100 text-indigo-700',
  checked_in:      'bg-teal-100 text-teal-700',
  completed:       'bg-green-100 text-green-700',
  cancelled:       'bg-red-100 text-red-700',
}

const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Pending payment',
  confirmed:       'Confirmed',
  assigned:        'Assigned',
  en_route:        'En route',
  checked_in:      'Checked in',
  completed:       'Completed',
  cancelled:       'Cancelled',
}

const APPLICANT_STATUS_COLOR: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const SPECIALTIES_OPTIONS = [
  'Relaxation Massage','Deep Tissue','Sports Recovery','Hilot',
  'Postpartum Care','Senior Care','Foot Spa','Hot Stone',
  'Prenatal Massage','Reflexology',
]

// ── Main Component ─────────────────────────────────────────────────────────────

export default function StaffPage() {
  const router = useRouter()
  const [tab,        setTab]        = useState<Tab>('applicants')
  const [loading,    setLoading]    = useState(true)
  const [staffEmail, setStaffEmail] = useState('')

  // Bookings
  const [bookings,   setBookings]   = useState<BookingRow[]>([])

  // Applicants
  const [applicants,    setApplicants]    = useState<Applicant[]>([])
  const [appFilter,     setAppFilter]     = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [expandedApp,   setExpandedApp]   = useState<string | null>(null)
  const [docUrls,       setDocUrls]       = useState<Record<string, { nbi?: string; tesda?: string; photo?: string }>>({})
  const [updatingApp,   setUpdatingApp]   = useState<string | null>(null)

  // Therapists
  const [therapists,  setTherapists]  = useState<Therapist[]>([])
  const [cities,      setCities]      = useState<{ id: string; name: string; region: string }[]>([])
  const [thSearch,    setThSearch]    = useState('')
  const [thFilter,    setThFilter]    = useState<'all' | 'active' | 'inactive'>('all')
  const [expandedTh,  setExpandedTh]  = useState<string | null>(null)
  const [toggling,    setToggling]    = useState<string | null>(null)
  const [editing,     setEditing]     = useState<string | null>(null)
  const [editState,   setEditState]   = useState<{ cityId: string; yearsExperience: string; bio: string; specialties: string[] } | null>(null)
  const [saving,      setSaving]      = useState(false)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/admin/login'); return }

      const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()
      if (!roleRow || (roleRow.role !== 'staff' && roleRow.role !== 'admin')) {
        router.replace('/admin/login'); return
      }

      setStaffEmail(user.email ?? '')
      const { data: cityData } = await supabase.from('cities').select('id, name, region').order('name')
      setCities(cityData ?? [])
      setLoading(false)
      fetchApplicants(supabase, 'pending')
      fetchBookings(supabase)
      fetchTherapists(supabase)
    }
    init()
  }, [router])

  useEffect(() => {
    const supabase = createClient()
    fetchApplicants(supabase, appFilter)
  }, [appFilter])

  // ── Data fetchers ────────────────────────────────────────────────────────────

  async function fetchBookings(supabase = createClient()) {
    const { data } = await supabase
      .from('bookings')
      .select('id, service_id, booking_date, time_slot, address, status, total, therapists(name)')
      .order('booking_date', { ascending: false })
      .limit(100)
    setBookings((data ?? []) as unknown as BookingRow[])
  }

  async function fetchApplicants(supabase = createClient(), status = appFilter) {
    const { data } = await supabase
      .from('therapists')
      .select('*, cities(name, region), nbi_extracted, tesda_extracted')
      .eq('application_status', status)
      .order('created_at', { ascending: false })
    setApplicants((data ?? []) as Applicant[])
  }

  async function fetchTherapists(supabase = createClient()) {
    const { data } = await supabase
      .from('therapists')
      .select('id, name, phone, is_active, nbi_cleared, tesda_certified, rating_avg, total_bookings, years_experience, specialties, bio, created_at, cities(id, name, region)')
      .eq('application_status', 'approved')
      .order('name')
    setTherapists((data ?? []) as unknown as Therapist[])
  }

  async function refresh() {
    const supabase = createClient()
    await Promise.all([fetchBookings(supabase), fetchApplicants(supabase), fetchTherapists(supabase)])
  }

  // ── Applicant actions ────────────────────────────────────────────────────────

  async function expandApplicant(a: Applicant) {
    if (expandedApp === a.id) { setExpandedApp(null); return }
    setExpandedApp(a.id)
    if (docUrls[a.id]) return

    const supabase = createClient()
    const urls: { nbi?: string; tesda?: string; photo?: string } = {}
    async function signed(path: string | null) {
      if (!path) return undefined
      const { data } = await supabase.storage.from('therapist-docs').createSignedUrl(path, 300)
      return data?.signedUrl
    }
    const [nbi, tesda, photo] = await Promise.all([signed(a.nbi_url), signed(a.tesda_url), signed(a.photo_url)])
    if (nbi)   urls.nbi   = nbi
    if (tesda) urls.tesda = tesda
    if (photo) urls.photo = photo
    setDocUrls(prev => ({ ...prev, [a.id]: urls }))
  }

  async function updateAppStatus(id: string, status: 'approved' | 'rejected') {
    setUpdatingApp(id)
    const supabase = createClient()
    const applicant = applicants.find(a => a.id === id)
    let referralCode: string | undefined
    if (status === 'approved' && applicant) {
      let code = generateReferralCode(applicant.name)
      for (let i = 0; i < 5; i++) {
        const { data } = await supabase.from('therapists').select('id').eq('referral_code', code).maybeSingle()
        if (!data) break
        code = generateReferralCode(applicant.name)
      }
      referralCode = code
    }
    await supabase.from('therapists').update({
      application_status: status,
      is_active:          status === 'approved',
      nbi_cleared:        status === 'approved',
      tesda_certified:    status === 'approved',
      ...(referralCode ? { referral_code: referralCode } : {}),
    }).eq('id', id)
    setApplicants(prev => prev.filter(a => a.id !== id))
    setExpandedApp(null)
    setUpdatingApp(null)
  }

  async function reExtract(a: Applicant, docType: 'nbi' | 'tesda') {
    const storagePath = docType === 'nbi' ? a.nbi_url : a.tesda_url
    if (!storagePath) return
    const res = await fetch('/api/extract-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ therapistId: a.id, storagePath, documentType: docType }),
    })
    if (res.ok) {
      const { extracted } = await res.json()
      setApplicants(prev => prev.map(x => x.id === a.id ? { ...x, [`${docType}_extracted`]: extracted } : x))
    }
  }

  // ── Therapist actions ────────────────────────────────────────────────────────

  async function toggleActive(t: Therapist) {
    setToggling(t.id)
    await createClient().from('therapists').update({ is_active: !t.is_active }).eq('id', t.id)
    setTherapists(prev => prev.map(x => x.id === t.id ? { ...x, is_active: !x.is_active } : x))
    setToggling(null)
  }

  function startEdit(t: Therapist) {
    setEditing(t.id)
    setEditState({
      cityId: t.cities?.id ?? '',
      yearsExperience: t.years_experience?.toString() ?? '',
      bio: t.bio ?? '',
      specialties: t.specialties ?? [],
    })
  }

  async function saveEdit(t: Therapist) {
    if (!editState) return
    setSaving(true)
    await createClient().from('therapists').update({
      city_id: editState.cityId || null,
      years_experience: editState.yearsExperience ? parseInt(editState.yearsExperience) : null,
      bio: editState.bio || null,
      specialties: editState.specialties,
    }).eq('id', t.id)
    const city = cities.find(c => c.id === editState.cityId) ?? null
    setTherapists(prev => prev.map(x => x.id === t.id ? {
      ...x,
      cities: city ? { id: city.id, name: city.name, region: city.region } : null,
      years_experience: editState.yearsExperience ? parseInt(editState.yearsExperience) : null,
      bio: editState.bio || null,
      specialties: editState.specialties,
    } : x))
    setEditing(null)
    setEditState(null)
    setSaving(false)
  }

  // ── Filtered therapists ──────────────────────────────────────────────────────

  const filteredTherapists = therapists.filter(t => {
    const matchSearch = thSearch === '' ||
      t.name.toLowerCase().includes(thSearch.toLowerCase()) ||
      t.phone.includes(thSearch)
    const matchFilter = thFilter === 'all' ||
      (thFilter === 'active' && t.is_active) ||
      (thFilter === 'inactive' && !t.is_active)
    return matchSearch && matchFilter
  })

  const pendingCount = applicants.filter(a => a.application_status === 'pending').length

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF6F0] flex items-center justify-center">
        <p className="text-[#8C7B70] text-sm">Loading…</p>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F7F2EE]">

      {/* Header */}
      <header className="bg-[#2C2420] text-white px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <img src="/logo-vertical-dark.png" alt="Alaga Wellness" style={{ height: '36px', width: 'auto' }} />
          <nav className="flex gap-1">
            {([
              ['applicants', 'Applicants', Users],
              ['therapists', 'Therapists', ShieldCheck],
              ['bookings',   'Bookings',   ClipboardList],
            ] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === key ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon size={14} />
                {label}
                {key === 'applicants' && appFilter === 'pending' && applicants.length > 0 && (
                  <span className="bg-[#C4714A] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {applicants.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/50 hidden sm:block">{staffEmail}</span>
          <button onClick={refresh} className="p-1.5 text-white/60 hover:text-white transition-colors" title="Refresh">
            <RefreshCw size={15} />
          </button>
          <button
            onClick={async () => { await createClient().auth.signOut(); router.push('/admin/login') }}
            className="text-xs text-white/60 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── APPLICANTS TAB ── */}
        {tab === 'applicants' && (
          <div>
            <div className="flex gap-2 mb-6">
              {(['pending', 'approved', 'rejected'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setAppFilter(s)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-semibold border capitalize transition-colors',
                    appFilter === s
                      ? 'bg-[#2C2420] text-white border-[#2C2420]'
                      : 'border-[#EDE5DF] text-[#8C7B70] hover:border-[#2C2420] bg-white',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            {applicants.length === 0 ? (
              <div className="text-center py-20 text-[#8C7B70]">No {appFilter} applications.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {applicants.map(a => {
                  const isExpanded = expandedApp === a.id
                  const docs = docUrls[a.id]
                  return (
                    <div key={a.id} className="bg-white rounded-2xl border border-[#EDE5DF] overflow-hidden">
                      <button
                        onClick={() => expandApplicant(a)}
                        className="w-full text-left p-5 flex items-center gap-4 hover:bg-[#FBF6F0] transition-colors"
                      >
                        <div className="w-12 h-12 rounded-full bg-[#F2D9CC] flex items-center justify-center text-lg font-bold text-[#C4714A] flex-shrink-0 overflow-hidden">
                          {docs?.photo
                            ? <img src={docs.photo} alt={a.name} className="w-full h-full object-cover" />
                            : a.name.charAt(0)
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="font-bold text-[#2C2420]">{a.name}</span>
                            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full capitalize', APPLICANT_STATUS_COLOR[a.application_status])}>
                              {a.application_status}
                            </span>
                          </div>
                          <p className="text-sm text-[#8C7B70]">
                            {a.gender.charAt(0).toUpperCase() + a.gender.slice(1)}
                            {a.cities ? ` · ${a.cities.name}, ${a.cities.region}` : ''}
                            {a.years_experience ? ` · ${a.years_experience} yrs exp` : ''}
                          </p>
                          <p className="text-xs text-[#C8BDB8] mt-0.5">
                            Applied {new Date(a.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-[#8C7B70]">
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-[#F2EBE6] p-5 flex flex-col gap-5">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-2">Specialties</p>
                              <div className="flex flex-wrap gap-1.5">
                                {a.specialties.map(s => (
                                  <span key={s} className="text-xs bg-[#F2EBE6] text-[#8C7B70] px-2 py-0.5 rounded-full">{s}</span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-2">Contact</p>
                              <p className="text-sm text-[#2C2420]">{a.phone}</p>
                              {a.referral_source && <p className="text-xs text-[#8C7B70] mt-1">Referred via: {a.referral_source}</p>}
                            </div>
                          </div>

                          {a.bio && (
                            <div>
                              <p className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-2">Bio</p>
                              <p className="text-sm text-[#2C2420] leading-relaxed">"{a.bio}"</p>
                            </div>
                          )}

                          <div className="flex flex-col gap-4">
                            <p className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider">Documents</p>
                            <ExtractedDoc
                              label="NBI Clearance"
                              docUrl={docs?.nbi}
                              docsLoading={!docs}
                              extracted={a.nbi_extracted}
                              fields={[
                                { key: 'controlNumber', label: 'Control No.' },
                                { key: 'fullName',      label: 'Name on document' },
                                { key: 'dateIssued',    label: 'Date issued' },
                                { key: 'expiryDate',    label: 'Valid until' },
                              ]}
                              verifyUrl={a.nbi_extracted?.controlNumber ? 'https://clearance.nbi.gov.ph' : undefined}
                              verifyLabel="NBI Portal"
                              onReExtract={a.nbi_url ? () => reExtract(a, 'nbi') : undefined}
                            />
                            <ExtractedDoc
                              label="TESDA Certificate"
                              docUrl={docs?.tesda}
                              docsLoading={!docs}
                              extracted={a.tesda_extracted}
                              fields={[
                                { key: 'certificateNumber', label: 'Certificate No.' },
                                { key: 'fullName',          label: 'Name on document' },
                                { key: 'qualification',     label: 'Qualification' },
                                { key: 'dateIssued',        label: 'Date issued' },
                              ]}
                              verifyUrl={a.tesda_extracted?.fullName
                                ? `https://registry.tesda.gov.ph/Workers/search?name=${encodeURIComponent(a.tesda_extracted.fullName ?? '')}`
                                : 'https://registry.tesda.gov.ph'}
                              verifyLabel="TESDA Registry"
                              onReExtract={a.tesda_url ? () => reExtract(a, 'tesda') : undefined}
                            />
                          </div>

                          {a.application_status === 'pending' && (
                            <div className="flex gap-3 pt-2">
                              <button
                                onClick={() => updateAppStatus(a.id, 'approved')}
                                disabled={updatingApp === a.id}
                                className="flex-1 py-3 rounded-xl bg-[#6B8C6E] text-white font-semibold text-sm hover:bg-[#5a7a5d] transition-colors disabled:opacity-50"
                              >
                                {updatingApp === a.id ? 'Saving…' : '✓ Approve'}
                              </button>
                              <button
                                onClick={() => updateAppStatus(a.id, 'rejected')}
                                disabled={updatingApp === a.id}
                                className="flex-1 py-3 rounded-xl bg-red-50 text-red-600 border border-red-200 font-semibold text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
                              >
                                ✕ Reject
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── THERAPISTS TAB ── */}
        {tab === 'therapists' && (
          <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C7B70]" />
                <input
                  type="text"
                  placeholder="Search by name or phone…"
                  value={thSearch}
                  onChange={e => setThSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-[#EDE5DF] rounded-xl text-sm bg-white focus:outline-none focus:border-[#C4714A]"
                />
              </div>
              <div className="flex gap-2">
                {(['all', 'active', 'inactive'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setThFilter(f)}
                    className={cn(
                      'px-3 py-2 rounded-xl text-sm font-semibold border capitalize transition-colors',
                      thFilter === f
                        ? 'bg-[#2C2420] text-white border-[#2C2420]'
                        : 'border-[#EDE5DF] text-[#8C7B70] bg-white hover:border-[#2C2420]',
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {filteredTherapists.length === 0 ? (
              <div className="text-center py-20 text-[#8C7B70]">No therapists found.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredTherapists.map(t => {
                  const isExpanded = expandedTh === t.id
                  const isEditing  = editing === t.id
                  return (
                    <div key={t.id} className="bg-white rounded-2xl border border-[#EDE5DF] overflow-hidden">
                      <button
                        onClick={() => setExpandedTh(isExpanded ? null : t.id)}
                        className="w-full text-left p-4 flex items-center gap-4 hover:bg-[#FBF6F0] transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#F2D9CC] flex items-center justify-center font-bold text-[#C4714A] flex-shrink-0">
                          {t.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-[#2C2420]">{t.name}</span>
                            {t.nbi_cleared    && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-semibold">NBI ✓</span>}
                            {t.tesda_certified && <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-semibold">TESDA ✓</span>}
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-semibold', t.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500')}>
                              {t.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-xs text-[#8C7B70] mt-0.5">
                            {t.cities ? `${t.cities.name}` : 'No city'}
                            {t.rating_avg > 0 && <> · <Star size={10} className="inline mb-0.5" /> {t.rating_avg.toFixed(1)}</>}
                            {t.total_bookings > 0 && ` · ${t.total_bookings} bookings`}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-[#8C7B70]">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-[#F2EBE6] p-4 flex flex-col gap-4">
                          {/* Toggle active */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-[#2C2420]">Active on platform</span>
                            <button
                              onClick={() => toggleActive(t)}
                              disabled={toggling === t.id}
                              className="text-[#C4714A] disabled:opacity-40"
                            >
                              {t.is_active
                                ? <ToggleRight size={28} className="text-[#6B8C6E]" />
                                : <ToggleLeft size={28} className="text-[#C8BDB8]" />
                              }
                            </button>
                          </div>

                          {!isEditing ? (
                            <>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <InfoField label="Phone"       value={t.phone} />
                                <InfoField label="Experience"  value={t.years_experience ? `${t.years_experience} years` : '—'} />
                                <InfoField label="City"        value={t.cities ? `${t.cities.name}, ${t.cities.region}` : '—'} />
                              </div>
                              {t.bio && (
                                <div>
                                  <p className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-1">Bio</p>
                                  <p className="text-sm text-[#2C2420]">"{t.bio}"</p>
                                </div>
                              )}
                              {t.specialties?.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-2">Specialties</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {t.specialties.map(s => (
                                      <span key={s} className="text-xs bg-[#F2EBE6] text-[#8C7B70] px-2 py-0.5 rounded-full">{s}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <button
                                onClick={() => startEdit(t)}
                                className="text-sm font-semibold text-[#C4714A] hover:underline text-left"
                              >
                                Edit profile →
                              </button>
                            </>
                          ) : editState && (
                            <div className="flex flex-col gap-3">
                              <div>
                                <label className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-1 block">City</label>
                                <select
                                  value={editState.cityId}
                                  onChange={e => setEditState(s => s && ({ ...s, cityId: e.target.value }))}
                                  className="w-full border border-[#EDE5DF] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C4714A]"
                                >
                                  <option value="">— Select city —</option>
                                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}, {c.region}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-1 block">Years Experience</label>
                                <input
                                  type="number"
                                  value={editState.yearsExperience}
                                  onChange={e => setEditState(s => s && ({ ...s, yearsExperience: e.target.value }))}
                                  className="w-full border border-[#EDE5DF] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C4714A]"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-1 block">Bio</label>
                                <textarea
                                  rows={3}
                                  value={editState.bio}
                                  onChange={e => setEditState(s => s && ({ ...s, bio: e.target.value }))}
                                  className="w-full border border-[#EDE5DF] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C4714A] resize-none"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-2 block">Specialties</label>
                                <div className="flex flex-wrap gap-2">
                                  {SPECIALTIES_OPTIONS.map(s => (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={() => setEditState(prev => {
                                        if (!prev) return prev
                                        const has = prev.specialties.includes(s)
                                        return { ...prev, specialties: has ? prev.specialties.filter(x => x !== s) : [...prev.specialties, s] }
                                      })}
                                      className={cn(
                                        'text-xs px-2.5 py-1 rounded-full border transition-colors',
                                        editState.specialties.includes(s)
                                          ? 'bg-[#2C2420] text-white border-[#2C2420]'
                                          : 'border-[#EDE5DF] text-[#8C7B70] hover:border-[#2C2420]',
                                      )}
                                    >
                                      {s}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex gap-3 pt-1">
                                <button
                                  onClick={() => saveEdit(t)}
                                  disabled={saving}
                                  className="flex-1 py-2.5 rounded-xl bg-[#2C2420] text-white text-sm font-semibold hover:bg-[#C4714A] transition-colors disabled:opacity-50"
                                >
                                  {saving ? 'Saving…' : 'Save changes'}
                                </button>
                                <button
                                  onClick={() => { setEditing(null); setEditState(null) }}
                                  className="px-4 py-2.5 rounded-xl border border-[#EDE5DF] text-sm text-[#8C7B70] hover:border-[#2C2420] transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── BOOKINGS TAB ── */}
        {tab === 'bookings' && (
          <div>
            <h1 className="text-lg font-bold text-[#2C2420] mb-4">Recent Bookings</h1>
            {bookings.length === 0 ? (
              <p className="text-sm text-[#8C7B70]">No bookings yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {bookings.map(b => {
                  const svc = SERVICES.find(s => s.id === b.service_id)
                  return (
                    <div key={b.id} className="bg-white rounded-xl border border-[#EDE5DF] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold text-sm text-[#2C2420]">{svc?.name ?? b.service_id}</span>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', BOOKING_STATUS_COLOR[b.status] ?? 'bg-gray-100 text-gray-600')}>
                              {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                            </span>
                          </div>
                          <p className="text-xs text-[#8C7B70]">
                            {formatDate(b.booking_date)} · {formatTime(b.time_slot)}
                            {b.therapists && <> · <span className="text-[#2C2420]">{b.therapists.name}</span></>}
                          </p>
                          <p className="text-xs text-[#8C7B70] flex items-center gap-1 mt-1">
                            <MapPin size={10} />{b.address}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-[#2C2420] whitespace-nowrap">{formatPrice(b.total)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// ── Helper components ──────────────────────────────────────────────────────────

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-[#2C2420]">{value}</p>
    </div>
  )
}

function ExtractedDoc({
  label, docUrl, docsLoading, extracted, fields, verifyUrl, verifyLabel, onReExtract,
}: {
  label: string
  docUrl?: string
  docsLoading: boolean
  extracted: Extracted | null
  fields: { key: keyof Extracted; label: string }[]
  verifyUrl?: string
  verifyLabel: string
  onReExtract?: () => void
}) {
  const [reExtracting, setReExtracting] = useState(false)

  async function handleReExtract() {
    if (!onReExtract) return
    setReExtracting(true)
    await onReExtract()
    setReExtracting(false)
  }

  return (
    <div className="rounded-xl border border-[#EDE5DF] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#F7F2EE]">
        <span className="text-sm font-semibold text-[#2C2420] flex items-center gap-1.5">
          <FileText size={14} className="text-[#8C7B70]" /> {label}
        </span>
        <div className="flex items-center gap-2">
          {onReExtract && (
            <button
              onClick={handleReExtract}
              disabled={reExtracting}
              className="text-xs text-[#8C7B70] hover:text-[#C4714A] transition-colors disabled:opacity-40"
            >
              {reExtracting ? 'Extracting…' : '↺ Re-extract'}
            </button>
          )}
          {docsLoading ? (
            <span className="text-xs text-[#C8BDB8]">Loading…</span>
          ) : docUrl ? (
            <a href={docUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-semibold text-[#6B8C6E] hover:underline">
              View <ExternalLink size={11} />
            </a>
          ) : (
            <span className="text-xs text-[#C8BDB8]">Not uploaded</span>
          )}
        </div>
      </div>
      <div className="px-4 py-3 bg-white">
        {!extracted ? (
          <p className="text-xs text-[#C8BDB8] italic">
            {docUrl ? 'AI extraction pending — click Re-extract.' : 'No document uploaded.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {fields.map(f => (
              <div key={f.key}>
                <p className="text-[10px] font-semibold text-[#8C7B70] uppercase tracking-wider">{f.label}</p>
                <p className="text-sm text-[#2C2420] font-medium">
                  {extracted[f.key] ?? <span className="text-[#C8BDB8] italic">not found</span>}
                </p>
              </div>
            ))}
          </div>
        )}
        {extracted && verifyUrl && (
          <div className="mt-3 pt-3 border-t border-[#F2EBE6]">
            <a href={verifyUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#2C2420] px-3 py-1.5 rounded-lg hover:bg-[#C4714A] transition-colors">
              <ShieldCheck size={12} /> Verify on {verifyLabel} <ExternalLink size={11} />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
