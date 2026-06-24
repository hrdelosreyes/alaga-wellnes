'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/utils'
import Link from 'next/link'
import { AdminNav } from '@/components/layout/admin-nav'
import {
  RefreshCw,
  Search, ChevronDown, ChevronUp, ShieldCheck,
  ToggleLeft, ToggleRight, ExternalLink, Star,
} from 'lucide-react'

type Therapist = {
  id: string
  name: string
  phone: string
  email: string | null
  address: string | null
  address_barangay_psgc: string | null
  address_barangay: string | null
  gender: string
  zone: string
  is_active: boolean
  application_status: string
  nbi_cleared: boolean
  tesda_certified: boolean
  rating_avg: number
  total_bookings: number
  years_experience: number | null
  specialties: string[]
  bio: string | null
  referral_code: string | null
  referred_by_id: string | null
  photo_url: string | null
  created_at: string
  cities: { id: string; name: string; region: string } | null
  referred_by: { name: string } | null
}

type EditState = {
  name: string
  phone: string
  email: string
  gender: string
  address: string               // street
  addressBarangayPsgc: string
  cityId: string
  yearsExperience: string
  bio: string
  specialties: string[]
}

const SPECIALTIES_OPTIONS = [
  'Relaxation Massage','Deep Tissue','Sports Recovery','Hilot',
  'Postpartum Care','Senior Care','Foot Spa','Hot Stone',
  'Prenatal Massage','Reflexology',
]

export default function AdminTherapistsPage() {
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [cities,     setCities]     = useState<{ id: string; name: string; region: string }[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [filter,     setFilter]     = useState<'all' | 'active' | 'inactive'>('all')
  const [expanded,   setExpanded]   = useState<string | null>(null)
  const [editing,    setEditing]    = useState<string | null>(null)
  const [editState,  setEditState]  = useState<EditState | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [toggling,   setToggling]   = useState<string | null>(null)
  type BarangayRow = { psgc_code: string; name: string; status: string }
  const [serviceAreas, setServiceAreas] = useState<Record<string, BarangayRow[]>>({})
  const [saUpdating, setSaUpdating] = useState<string | null>(null)
  const [saEditing, setSaEditing] = useState<string | null>(null) // therapist id being edited
  const [saAllBarangays, setSaAllBarangays] = useState<{ psgc_code: string; name: string }[]>([])
  const [saSelected, setSaSelected] = useState<Set<string>>(new Set())
  const [saSaving, setSaSaving] = useState(false)
  const [saSearch, setSaSearch] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const supabase = createClient()
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase
        .from('therapists')
        .select(`*, cities(id, name, region)`)
        .eq('application_status', 'approved')
        .order('name'),
      supabase
        .from('cities')
        .select('id, name, region')
        .order('region').order('name'),
    ])
    setTherapists((t ?? []) as unknown as Therapist[])
    setCities(c ?? [])
    setLoading(false)
  }

  async function toggleActive(therapist: Therapist) {
    setToggling(therapist.id)
    const supabase = createClient()
    const newActive = !therapist.is_active
    await supabase
      .from('therapists')
      .update({ is_active: newActive })
      .eq('id', therapist.id)
    setTherapists(prev =>
      prev.map(t => t.id === therapist.id ? { ...t, is_active: newActive } : t)
    )
    setToggling(null)
  }

  async function startEdit(t: Therapist) {
    setEditing(t.id)
    setEditState({
      name:                t.name ?? '',
      phone:               t.phone ?? '',
      email:               t.email ?? '',
      gender:              t.gender ?? '',
      address:             t.address ?? '',
      addressBarangayPsgc: t.address_barangay_psgc ?? '',
      cityId:              t.cities?.id ?? '',
      yearsExperience:     String(t.years_experience ?? ''),
      bio:                 t.bio ?? '',
      specialties:         [...t.specialties],
    })
    // Load all barangays for the city + current approved selections
    const cityName = t.cities?.name ?? ''
    const supabase = createClient()
    const [{ data: allBgy }, { data: current }] = await Promise.all([
      supabase.from('barangays').select('psgc_code, name')
        .in('city_name', [cityName, `City of ${cityName}`]).order('name'),
      supabase.from('therapist_barangays').select('barangay_psgc, status')
        .eq('therapist_id', t.id),
    ])
    setSaAllBarangays((allBgy ?? []) as { psgc_code: string; name: string }[])
    setSaSelected(new Set((current ?? []).filter((r: any) => r.status === 'approved').map((r: any) => r.barangay_psgc)))
    setSaSearch('')
  }

  async function saveEdit(therapistId: string) {
    if (!editState) return
    setSaving(true)
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('therapists')
      .update({
        name:             editState.name.trim(),
        phone:            editState.phone.trim(),
        email:            editState.email.trim().toLowerCase() || null,
        gender:           editState.gender,
        address:               editState.address.trim() || null,
        address_barangay_psgc: editState.addressBarangayPsgc || null,
        address_barangay:      saAllBarangays.find(b => b.psgc_code === editState.addressBarangayPsgc)?.name ?? null,
        city_id:          editState.cityId || null,
        zone:             cities.find(c => c.id === editState.cityId)?.name ?? '',
        years_experience: editState.yearsExperience ? parseInt(editState.yearsExperience) : null,
        bio:              editState.bio.trim() || null,
        specialties:      editState.specialties,
      })
      .eq('id', therapistId)

    if (updateError) { setSaving(false); return }

    const { data } = await supabase
      .from('therapists')
      .select('*, cities(id, name, region)')
      .eq('id', therapistId)
      .single()

    if (data) {
      setTherapists(prev => prev.map(t => t.id === therapistId ? data as unknown as Therapist : t))
    }

    // Save barangays
    await supabase.from('therapist_barangays').delete().eq('therapist_id', therapistId)
    if (saSelected.size > 0) {
      await supabase.from('therapist_barangays').insert(
        Array.from(saSelected).map(psgc => ({ therapist_id: therapistId, barangay_psgc: psgc, status: 'approved' }))
      )
    }
    loadServiceArea(therapistId)

    setSaving(false)
    setEditing(null)
    setEditState(null)
  }

  async function loadServiceArea(therapistId: string) {
    const { data } = await createClient()
      .from('therapist_barangays')
      .select('barangay_psgc, status, barangays(name)')
      .eq('therapist_id', therapistId)
      .order('barangay_psgc')
    const rows = (data ?? []).map((r: any) => ({
      psgc_code: r.barangay_psgc,
      name: r.barangays?.name ?? r.barangay_psgc,
      status: r.status,
    }))
    setServiceAreas(p => ({ ...p, [therapistId]: rows }))
  }

  async function updateBarangayStatus(therapistId: string, psgcCode: string, status: 'approved' | 'rejected') {
    setSaUpdating(psgcCode)
    await createClient()
      .from('therapist_barangays')
      .update({ status })
      .eq('therapist_id', therapistId)
      .eq('barangay_psgc', psgcCode)
    setSaUpdating(null)
    loadServiceArea(therapistId)
  }

  async function removeBarangay(therapistId: string, psgcCode: string) {
    setSaUpdating(psgcCode)
    await createClient()
      .from('therapist_barangays')
      .delete()
      .eq('therapist_id', therapistId)
      .eq('barangay_psgc', psgcCode)
    setSaUpdating(null)
    loadServiceArea(therapistId)
  }

  async function startSaEdit(therapist: Therapist) {
    const cityName = therapist.cities?.name ?? ''
    const supabase = createClient()
    const [{ data: allBgy }, { data: current }] = await Promise.all([
      supabase.from('barangays').select('psgc_code, name')
        .in('city_name', [cityName, `City of ${cityName}`]).order('name'),
      supabase.from('therapist_barangays').select('barangay_psgc, status')
        .eq('therapist_id', therapist.id),
    ])
    setSaAllBarangays((allBgy ?? []) as { psgc_code: string; name: string }[])
    setSaSelected(new Set((current ?? []).filter((r: any) => r.status === 'approved').map((r: any) => r.barangay_psgc)))
    setSaSearch('')
    setSaEditing(therapist.id)
  }

  async function saveSaEdit(therapistId: string) {
    setSaSaving(true)
    const supabase = createClient()
    // Delete all existing rows then re-insert selected as approved
    await supabase.from('therapist_barangays').delete().eq('therapist_id', therapistId)
    if (saSelected.size > 0) {
      await supabase.from('therapist_barangays').insert(
        Array.from(saSelected).map(psgc => ({ therapist_id: therapistId, barangay_psgc: psgc, status: 'approved' }))
      )
    }
    setSaSaving(false)
    setSaEditing(null)
    loadServiceArea(therapistId)
  }

  function toggleSpecialty(s: string) {
    if (!editState) return
    setEditState(prev => prev ? ({
      ...prev,
      specialties: prev.specialties.includes(s)
        ? prev.specialties.filter(x => x !== s)
        : [...prev.specialties, s],
    }) : prev)
  }

  const filtered = therapists.filter(t => {
    const matchesSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.phone.includes(search) ||
      t.zone.toLowerCase().includes(search.toLowerCase())
    const matchesFilter =
      filter === 'all'      ? true :
      filter === 'active'   ? t.is_active :
      !t.is_active
    return matchesSearch && matchesFilter
  })

  const activeCount   = therapists.filter(t =>  t.is_active).length
  const inactiveCount = therapists.filter(t => !t.is_active).length
  const avgRating     = therapists.length
    ? (therapists.reduce((s, t) => s + t.rating_avg, 0) / therapists.length).toFixed(1)
    : '—'

  return (
    <div className="min-h-screen bg-[#F7F2EE]">
      <AdminNav onRefresh={fetchAll} refreshing={loading} />

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total approved',  value: therapists.length },
            { label: 'Active',          value: activeCount,   color: 'text-[#6B8C6E]' },
            { label: 'Inactive',        value: inactiveCount, color: inactiveCount > 0 ? 'text-[#C4714A]' : undefined },
            { label: 'Avg rating',      value: `★ ${avgRating}`, color: 'text-[#C9A84C]' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-[#EDE5DF] p-5">
              <p className="text-xs text-[#8C7B70] mb-1">{s.label}</p>
              <p className={cn('text-2xl font-bold', s.color ?? 'text-[#2C2420]')}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search + filter */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-3.5 text-[#8C7B70]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, phone, or city…"
              className="w-full border border-[#EDE5DF] rounded-xl pl-9 pr-4 py-3 text-sm bg-white focus:outline-none focus:border-[#C4714A] transition-colors"
            />
          </div>
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-semibold border capitalize transition-colors',
                filter === f
                  ? 'bg-[#2C2420] text-white border-[#2C2420]'
                  : 'border-[#EDE5DF] bg-white text-[#8C7B70] hover:border-[#2C2420]',
              )}
            >
              {f} {f === 'active' ? `(${activeCount})` : f === 'inactive' ? `(${inactiveCount})` : `(${therapists.length})`}
            </button>
          ))}
        </div>

        {/* Therapist list */}
        {loading ? (
          <div className="text-center py-20 text-[#8C7B70]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-[#8C7B70]">No therapists found.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(t => {
              const isExpanded = expanded === t.id
              const isEditing  = editing  === t.id

              return (
                <div key={t.id} className="bg-white rounded-2xl border border-[#EDE5DF] overflow-hidden">

                  {/* Summary row */}
                  <div className="flex items-center gap-4 p-5">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full bg-[#F2D9CC] flex items-center justify-center text-base font-bold text-[#C4714A] flex-shrink-0 overflow-hidden">
                      {t.photo_url
                        ? <img src={t.photo_url} alt={t.name} className="w-full h-full object-cover" />
                        : t.name.charAt(0)
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#2C2420]">{t.name}</span>
                        <span className={cn(
                          'text-xs font-semibold px-2 py-0.5 rounded-full',
                          t.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600',
                        )}>
                          {t.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {t.nbi_cleared && (
                          <span className="flex items-center gap-0.5 text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            <ShieldCheck size={10}/> NBI
                          </span>
                        )}
                        {t.tesda_certified && (
                          <span className="flex items-center gap-0.5 text-xs font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                            <ShieldCheck size={10}/> TESDA
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#8C7B70] mt-0.5 truncate">
                        {t.gender.charAt(0).toUpperCase() + t.gender.slice(1)}
                        {t.cities ? ` · ${t.cities.name}` : ''}
                        {t.years_experience ? ` · ${t.years_experience} yrs` : ''}
                        {' · '}
                        <span className="text-[#C9A84C]">★ {t.rating_avg}</span>
                        {' · '}
                        {t.total_bookings} sessions
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Active toggle */}
                      <button
                        onClick={() => toggleActive(t)}
                        disabled={toggling === t.id}
                        title={t.is_active ? 'Deactivate therapist' : 'Activate therapist'}
                        className="text-[#8C7B70] hover:text-[#2C2420] transition-colors disabled:opacity-40"
                      >
                        {t.is_active
                          ? <ToggleRight size={28} className="text-[#6B8C6E]" />
                          : <ToggleLeft  size={28} />
                        }
                      </button>

                      {/* Expand */}
                      <button
                        onClick={() => {
                          const next = isExpanded ? null : t.id
                          setExpanded(next)
                          setEditing(null)
                          if (next) loadServiceArea(next)
                        }}
                        className="text-[#8C7B70] hover:text-[#2C2420] transition-colors p-1"
                      >
                        {isExpanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-[#F2EBE6] p-5 flex flex-col gap-5">

                      {!isEditing ? (
                        <>
                          {/* Info grid */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <InfoField label="Email"       value={t.email ?? '—'} />
                            <InfoField label="Phone"       value={t.phone} />
                            <InfoField label="Gender"      value={t.gender ? t.gender.charAt(0).toUpperCase() + t.gender.slice(1) : '—'} />
                            <InfoField label="Address"     value={[t.address, t.address_barangay, t.cities?.name].filter(Boolean).join(', ') || '—'} />
                            <InfoField label="City"        value={t.cities ? `${t.cities.name}, ${t.cities.region}` : '—'} />
                            <InfoField label="Experience"  value={t.years_experience ? `${t.years_experience} years` : '—'} />
                            <InfoField label="Referral code" value={t.referral_code ?? '—'} mono />
                            <InfoField label="Referred by" value={(t.referred_by as any)?.name ?? '—'} />
                            <InfoField label="Member since" value={new Date(t.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} />
                          </div>

                          {/* Specialties */}
                          <div>
                            <p className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-2">Specialties</p>
                            <div className="flex flex-wrap gap-1.5">
                              {t.specialties.map(s => (
                                <span key={s} className="text-xs bg-[#F2EBE6] text-[#8C7B70] px-2 py-0.5 rounded-full">{s}</span>
                              ))}
                            </div>
                          </div>

                          {/* Bio */}
                          {t.bio && (
                            <div>
                              <p className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-1">Bio</p>
                              <p className="text-sm text-[#2C2420] leading-relaxed">"{t.bio}"</p>
                            </div>
                          )}

                          {/* Service area */}
                          <div>
                            <p className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-2">Service Area</p>
                            {!serviceAreas[t.id] ? (
                              <p className="text-xs text-[#8C7B70]">Loading…</p>
                            ) : serviceAreas[t.id].length === 0 ? (
                              <p className="text-xs text-[#8C7B70]">No barangays set — therapist hasn't configured their service area yet.</p>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                {serviceAreas[t.id].some(b => b.status === 'pending') && (
                                  <p className="text-xs text-[#7A5C00] bg-[#FFF8E6] border border-[#F0D080] rounded-lg px-3 py-2 mb-1">
                                    ⏳ Some barangays are pending your approval.
                                  </p>
                                )}
                                {serviceAreas[t.id].map(b => (
                                  <div key={b.psgc_code} className={cn(
                                    'flex items-center gap-2 px-3 py-2 rounded-xl text-xs border',
                                    b.status === 'approved' ? 'bg-[#EBF3EC] border-[#B8D9BB] text-[#2C4A2E]' :
                                    b.status === 'rejected' ? 'bg-[#FEF2F2] border-[#FECACA] text-[#7F1D1D]' :
                                    'bg-[#FFFBEB] border-[#FDE68A] text-[#713F12]'
                                  )}>
                                    <span className="flex-1 font-medium">{b.name}</span>
                                    <span className="capitalize opacity-70">{b.status}</span>
                                    {b.status === 'pending' && (
                                      <>
                                        <button disabled={saUpdating === b.psgc_code} onClick={() => updateBarangayStatus(t.id, b.psgc_code, 'approved')} className="ml-1 bg-[#6B8C6E] text-white px-2 py-0.5 rounded-lg hover:bg-[#4A6A4D] disabled:opacity-40 transition-colors">Approve</button>
                                        <button disabled={saUpdating === b.psgc_code} onClick={() => updateBarangayStatus(t.id, b.psgc_code, 'rejected')} className="bg-[#C4714A] text-white px-2 py-0.5 rounded-lg hover:bg-[#A0522D] disabled:opacity-40 transition-colors">Reject</button>
                                      </>
                                    )}
                                    {b.status === 'approved' && (
                                      <button disabled={saUpdating === b.psgc_code} onClick={() => removeBarangay(t.id, b.psgc_code)} className="ml-1 text-[#8C7B70] hover:text-red-600 disabled:opacity-40 transition-colors px-1" title="Remove">✕</button>
                                    )}
                                    {b.status === 'rejected' && (
                                      <button disabled={saUpdating === b.psgc_code} onClick={() => updateBarangayStatus(t.id, b.psgc_code, 'approved')} className="ml-1 text-[#6B8C6E] hover:underline disabled:opacity-40 text-[10px]">Re-approve</button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-3 pt-1 flex-wrap">
                            <button
                              onClick={() => startEdit(t)}
                              className="text-xs font-semibold border border-[#EDE5DF] px-4 py-2 rounded-xl hover:border-[#C4714A] hover:text-[#C4714A] transition-colors"
                            >
                              Edit details
                            </button>
                            <Link
                              href={`/admin/applicants`}
                              className="flex items-center gap-1 text-xs font-semibold border border-[#EDE5DF] px-4 py-2 rounded-xl hover:border-[#2C2420] transition-colors text-[#8C7B70]"
                            >
                              View documents <ExternalLink size={11}/>
                            </Link>
                            <button
                              onClick={() => toggleActive(t)}
                              disabled={toggling === t.id}
                              className={cn(
                                'text-xs font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-40',
                                t.is_active
                                  ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                                  : 'bg-[#E8F0E9] text-[#6B8C6E] border border-[#6B8C6E] hover:bg-[#d4e5d6]',
                              )}
                            >
                              {t.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </>
                      ) : (
                        /* Edit form */
                        <div className="flex flex-col gap-4">
                          <p className="text-sm font-bold text-[#2C2420]">Edit therapist details</p>

                          <div className="grid grid-cols-2 gap-4">
                            {/* Name */}
                            <div>
                              <label className="block text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-2">Full name</label>
                              <input
                                type="text"
                                value={editState?.name ?? ''}
                                onChange={e => setEditState(p => p ? { ...p, name: e.target.value } : p)}
                                className="w-full border border-[#EDE5DF] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C4714A]"
                              />
                            </div>

                            {/* Gender */}
                            <div>
                              <label className="block text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-2">Gender</label>
                              <select
                                value={editState?.gender ?? ''}
                                onChange={e => setEditState(p => p ? { ...p, gender: e.target.value } : p)}
                                className="w-full border border-[#EDE5DF] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C4714A] bg-white"
                              >
                                <option value="">Select…</option>
                                <option value="female">Female</option>
                                <option value="male">Male</option>
                              </select>
                            </div>

                            {/* Phone */}
                            <div>
                              <label className="block text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-2">Mobile number</label>
                              <input
                                type="tel"
                                value={editState?.phone ?? ''}
                                onChange={e => setEditState(p => p ? { ...p, phone: e.target.value } : p)}
                                className="w-full border border-[#EDE5DF] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C4714A]"
                              />
                            </div>

                            {/* Email */}
                            <div>
                              <label className="block text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-2">Email</label>
                              <input
                                type="email"
                                value={editState?.email ?? ''}
                                onChange={e => setEditState(p => p ? { ...p, email: e.target.value } : p)}
                                className="w-full border border-[#EDE5DF] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C4714A]"
                              />
                            </div>
                          </div>

                          {/* Home address: barangay (from city) + street */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-2">Home barangay</label>
                              <select
                                value={editState?.addressBarangayPsgc ?? ''}
                                onChange={e => setEditState(p => p ? { ...p, addressBarangayPsgc: e.target.value } : p)}
                                className="w-full border border-[#EDE5DF] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C4714A] bg-white"
                              >
                                <option value="">Select barangay…</option>
                                {saAllBarangays.map(b => (
                                  <option key={b.psgc_code} value={b.psgc_code}>{b.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-2">Street address</label>
                              <input
                                type="text"
                                value={editState?.address ?? ''}
                                onChange={e => setEditState(p => p ? { ...p, address: e.target.value } : p)}
                                placeholder="e.g. 123 Mabini St."
                                className="w-full border border-[#EDE5DF] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C4714A]"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            {/* City */}
                            <div>
                              <label className="block text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-2">City</label>
                              <select
                                value={editState?.cityId ?? ''}
                                onChange={e => setEditState(p => p ? { ...p, cityId: e.target.value } : p)}
                                className="w-full border border-[#EDE5DF] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C4714A] bg-white"
                              >
                                <option value="">Select city…</option>
                                {cities.map(c => (
                                  <option key={c.id} value={c.id}>{c.name} — {c.region}</option>
                                ))}
                              </select>
                            </div>

                            {/* Years experience */}
                            <div>
                              <label className="block text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-2">Years experience</label>
                              <input
                                type="number"
                                min={0}
                                max={50}
                                value={editState?.yearsExperience ?? ''}
                                onChange={e => setEditState(p => p ? { ...p, yearsExperience: e.target.value } : p)}
                                className="w-full border border-[#EDE5DF] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C4714A]"
                              />
                            </div>
                          </div>

                          {/* Bio */}
                          <div>
                            <label className="block text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-2">Bio</label>
                            <textarea
                              value={editState?.bio ?? ''}
                              onChange={e => setEditState(p => p ? { ...p, bio: e.target.value } : p)}
                              rows={3}
                              className="w-full border border-[#EDE5DF] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C4714A] resize-none"
                            />
                          </div>

                          {/* Specialties */}
                          <div>
                            <label className="block text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-2">Specialties</label>
                            <div className="flex flex-wrap gap-2">
                              {SPECIALTIES_OPTIONS.map(s => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => toggleSpecialty(s)}
                                  className={cn(
                                    'text-xs px-3 py-1.5 rounded-full border transition-colors',
                                    editState?.specialties.includes(s)
                                      ? 'bg-[#2C2420] text-white border-[#2C2420]'
                                      : 'border-[#EDE5DF] text-[#8C7B70] hover:border-[#C4714A]',
                                  )}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Service area barangays */}
                          <div>
                            <label className="block text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-2">
                              Service Area — {saSelected.size} barangay{saSelected.size !== 1 ? 's' : ''} selected
                            </label>
                            {saAllBarangays.length === 0 ? (
                              <p className="text-xs text-[#8C7B70]">No barangay data available for this city.</p>
                            ) : (
                              <div className="border border-[#EDE5DF] rounded-xl overflow-hidden">
                                <div className="p-2 border-b border-[#F2EBE6] flex gap-2 items-center bg-[#FAFAFA]">
                                  <input
                                    type="text"
                                    value={saSearch}
                                    onChange={e => setSaSearch(e.target.value)}
                                    placeholder="Search barangay…"
                                    className="flex-1 border border-[#EDE5DF] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#C4714A] bg-white"
                                  />
                                  <button type="button" onClick={() => setSaSelected(new Set(saAllBarangays.map(b => b.psgc_code)))} className="text-xs text-[#C4714A] hover:underline whitespace-nowrap">All</button>
                                  <button type="button" onClick={() => setSaSelected(new Set())} className="text-xs text-[#8C7B70] hover:underline whitespace-nowrap">Clear</button>
                                </div>
                                <div className="max-h-48 overflow-y-auto divide-y divide-[#F2EBE6]">
                                  {saAllBarangays
                                    .filter(b => !saSearch || b.name.toLowerCase().includes(saSearch.toLowerCase()))
                                    .map(b => (
                                      <label key={b.psgc_code} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-[#FBF6F0] transition-colors">
                                        <input
                                          type="checkbox"
                                          checked={saSelected.has(b.psgc_code)}
                                          onChange={e => setSaSelected(prev => {
                                            const next = new Set(prev)
                                            e.target.checked ? next.add(b.psgc_code) : next.delete(b.psgc_code)
                                            return next
                                          })}
                                          className="accent-[#C4714A] w-3.5 h-3.5 flex-shrink-0"
                                        />
                                        <span className="text-xs text-[#2C2420]">{b.name}</span>
                                      </label>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={() => saveEdit(t.id)}
                              disabled={saving}
                              className="flex-1 py-2.5 bg-[#2C2420] text-white font-semibold text-sm rounded-xl hover:bg-[#C4714A] transition-colors disabled:opacity-50"
                            >
                              {saving ? 'Saving…' : 'Save changes'}
                            </button>
                            <button
                              onClick={() => { setEditing(null); setEditState(null) }}
                              className="px-5 py-2.5 border border-[#EDE5DF] text-[#8C7B70] font-semibold text-sm rounded-xl hover:border-[#2C2420] transition-colors"
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
    </div>
  )
}

function InfoField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-[#8C7B70] uppercase tracking-wider">{label}</p>
      <p className={cn('text-sm text-[#2C2420] mt-0.5 font-medium', mono && 'font-mono tracking-widest text-[#C4714A]')}>
        {value}
      </p>
    </div>
  )
}
