'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminNav } from '@/components/layout/admin-nav'
import { RefreshCw, Rocket, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

type CityRow = {
  id: string
  name: string
  region: string
  province: string | null
  island_group: string
  city_class: string | null
  population: number | null
  therapist_threshold: number
  is_customer_live: boolean
  launched_at: string | null
}

// Official PSGC 1Q 2026 region order
const REGIONS = [
  'All',
  'NCR',
  'CAR',
  'Region I',
  'Region II',
  'Region III',
  'Region IV-A',
  'MIMAROPA',
  'Region V',
  'Region VI',
  'NIR',
  'Region VII',
  'Region VIII',
  'Region IX',
  'Region X',
  'Region XI',
  'Region XII',
  'Region XIII',
  'BARMM',
] as const

type RegionFilter = typeof REGIONS[number]

const REGION_LABELS: Record<string, string> = {
  'NCR':        'NCR — Metro Manila',
  'CAR':        'CAR — Cordillera',
  'Region I':   'Region I — Ilocos',
  'Region II':  'Region II — Cagayan Valley',
  'Region III': 'Region III — Central Luzon',
  'Region IV-A':'Region IV-A — CALABARZON',
  'MIMAROPA':   'MIMAROPA',
  'Region V':   'Region V — Bicol',
  'Region VI':  'Region VI — Western Visayas',
  'NIR':        'NIR — Negros Island',
  'Region VII': 'Region VII — Central Visayas',
  'Region VIII':'Region VIII — Eastern Visayas',
  'Region IX':  'Region IX — Zamboanga',
  'Region X':   'Region X — Northern Mindanao',
  'Region XI':  'Region XI — Davao',
  'Region XII': 'Region XII — SOCCSKSARGEN',
  'Region XIII':'Region XIII — Caraga',
  'BARMM':      'BARMM',
}

export default function AdminCitiesPage() {
  const [cities,    setCities]    = useState<CityRow[]>([])
  const [counts,    setCounts]    = useState<Record<string, number>>({})
  const [loading,   setLoading]   = useState(true)
  const [launching, setLaunching] = useState<string | null>(null)
  const [region,    setRegion]    = useState<RegionFilter>('All')
  const [search,    setSearch]    = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const supabase = createClient()

    const [{ data: cityData }, { data: countData }] = await Promise.all([
      supabase.from('cities').select('*').order('region').order('name'),
      supabase.from('therapists')
        .select('city_id')
        .eq('application_status', 'approved')
        .eq('is_active', true),
    ])

    const tally: Record<string, number> = {}
    for (const t of countData ?? []) {
      if (t.city_id) tally[t.city_id] = (tally[t.city_id] ?? 0) + 1
    }

    setCities((cityData ?? []) as CityRow[])
    setCounts(tally)
    setLoading(false)
  }

  async function updateThreshold(cityId: string, threshold: number) {
    const supabase = createClient()
    await supabase.from('cities').update({ therapist_threshold: threshold }).eq('id', cityId)
    setCities(prev => prev.map(c => c.id === cityId ? { ...c, therapist_threshold: threshold } : c))
  }

  async function toggleLive(city: CityRow) {
    setLaunching(city.id)
    const supabase  = createClient()
    const goingLive = !city.is_customer_live
    await supabase
      .from('cities')
      .update({
        is_customer_live: goingLive,
        launched_at: goingLive ? new Date().toISOString() : null,
      })
      .eq('id', city.id)
    setCities(prev => prev.map(c =>
      c.id === city.id
        ? { ...c, is_customer_live: goingLive, launched_at: goingLive ? new Date().toISOString() : null }
        : c
    ))
    setLaunching(null)
  }

  const filtered = cities.filter(c => {
    const matchRegion = region === 'All' || c.region === region
    const q = search.toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.region.toLowerCase().includes(q) || (c.province ?? '').toLowerCase().includes(q)
    return matchRegion && matchSearch
  })

  const liveCount       = cities.filter(c => c.is_customer_live).length
  const readyCount      = cities.filter(c => !c.is_customer_live && (counts[c.id] ?? 0) >= c.therapist_threshold).length
  const totalTherapists = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div className="min-h-screen bg-[#F7F2EE]">

      {/* Header */}
      <AdminNav onRefresh={load} refreshing={loading} />

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Cities live',         value: liveCount },
            { label: 'Ready to launch',     value: readyCount },
            { label: 'Verified therapists', value: totalTherapists },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-[#EDE5DF] p-5">
              <p className="text-xs text-[#8C7B70] mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-[#2C2420]">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <select
            value={region}
            onChange={e => setRegion(e.target.value as RegionFilter)}
            className="border border-[#EDE5DF] rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:border-[#C4714A] transition-colors text-[#2C2420]"
          >
            <option value="All">All regions</option>
            <optgroup label="Luzon">
              {(['NCR','CAR','Region I','Region II','Region III','Region IV-A','MIMAROPA','Region V'] as const).map(r => (
                <option key={r} value={r}>{REGION_LABELS[r]}</option>
              ))}
            </optgroup>
            <optgroup label="Visayas">
              {(['Region VI','NIR','Region VII','Region VIII'] as const).map(r => (
                <option key={r} value={r}>{REGION_LABELS[r]}</option>
              ))}
            </optgroup>
            <optgroup label="Mindanao">
              {(['Region IX','Region X','Region XI','Region XII','Region XIII','BARMM'] as const).map(r => (
                <option key={r} value={r}>{REGION_LABELS[r]}</option>
              ))}
            </optgroup>
          </select>

          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search city or province…"
            className="flex-1 min-w-48 border border-[#EDE5DF] rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:border-[#C4714A] transition-colors"
          />

          <span className="text-xs text-[#8C7B70]">
            {filtered.length} of {cities.length} cities
          </span>
        </div>

        {/* City list */}
        {loading ? (
          <div className="text-center py-20 text-[#8C7B70]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-[#8C7B70]">No cities match your filter.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(city => {
              const therapistCount = counts[city.id] ?? 0
              const threshold      = city.therapist_threshold
              const isReady        = therapistCount >= threshold
              const pct            = Math.min(100, Math.round((therapistCount / threshold) * 100))

              return (
                <div key={city.id} className="bg-white rounded-2xl border border-[#EDE5DF] p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">

                    {/* City info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-bold text-[#2C2420]">{city.name}</span>
                        {city.city_class && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#F2EBE6] text-[#8C7B70]">
                            {city.city_class}
                          </span>
                        )}
                        {city.is_customer_live && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                            <Rocket size={10} /> Live
                          </span>
                        )}
                        {!city.is_customer_live && isReady && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            Ready to launch
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#8C7B70] mb-3">
                        {REGION_LABELS[city.region] ?? city.region}
                        {city.province && ` · ${city.province}`}
                        {city.population != null && ` · Pop. ${city.population.toLocaleString()}`}
                      </p>

                      {/* Progress bar */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-[#F2EBE6] rounded-full h-2">
                          <div
                            className={cn(
                              'h-2 rounded-full transition-all',
                              city.is_customer_live ? 'bg-green-500' : isReady ? 'bg-blue-500' : 'bg-[#C4714A]',
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-[#8C7B70] flex-shrink-0 flex items-center gap-1">
                          <Users size={11} />
                          {therapistCount} / {threshold}
                        </span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="flex items-center gap-2 text-xs text-[#8C7B70]">
                        <span>Threshold:</span>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={threshold}
                          onChange={e => updateThreshold(city.id, parseInt(e.target.value) || 1)}
                          className="w-14 border border-[#EDE5DF] rounded-lg px-2 py-1 text-center text-xs focus:outline-none focus:border-[#C4714A]"
                        />
                      </div>

                      <button
                        disabled={launching === city.id || (!city.is_customer_live && !isReady)}
                        onClick={() => toggleLive(city)}
                        className={cn(
                          'px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed',
                          city.is_customer_live
                            ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                            : 'bg-[#2C2420] text-white hover:bg-[#3D3430]',
                        )}
                      >
                        {launching === city.id ? '…' : city.is_customer_live ? 'Pause bookings' : 'Launch city'}
                      </button>

                      {city.launched_at && (
                        <span className="text-[10px] text-[#C8BDB8]">
                          Launched {new Date(city.launched_at).toLocaleDateString('en-PH')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
