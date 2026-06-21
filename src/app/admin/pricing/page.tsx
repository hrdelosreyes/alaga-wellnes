'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminNav } from '@/components/layout/admin-nav'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

type ServiceId = 'relax-60' | 'recovery-90' | 'hilot-75'

const SERVICES: { id: ServiceId; label: string; duration: string }[] = [
  { id: 'relax-60',    label: 'Alaga Relax', duration: '60 min' },
  { id: 'hilot-75',    label: 'Hilot',       duration: '75 min' },
  { id: 'recovery-90', label: 'Recovery',    duration: '90 min' },
]

type RateRow = {
  id: string
  city_id: string
  service_id: ServiceId
  base_rate: number
  min_rate: number
  max_rate: number
}

type CityRow = {
  id: string
  name: string
  region: string
  city_class: string
  rates: Record<ServiceId, RateRow>
}

const REGIONS = [
  'All','NCR','CAR','Region I','Region II','Region III','Region IV-A',
  'MIMAROPA','Region V','Region VI','NIR','Region VII','Region VIII',
  'Region IX','Region X','Region XI','Region XII','Region XIII','BARMM',
]

const TIER_LABEL: Record<string, string> = {
  HUC: 'HUC', ICC: 'ICC', CC: 'CC',
}

export default function AdminPricingPage() {
  const [cities,   setCities]   = useState<CityRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState<string | null>(null)
  const [region,   setRegion]   = useState('All')
  const [search,   setSearch]   = useState('')
  const [service,  setService]  = useState<ServiceId>('relax-60')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const supabase = createClient()
    const [{ data: cityData }, { data: rateData }] = await Promise.all([
      supabase.from('cities').select('id, name, region, city_class').order('region').order('name'),
      supabase.from('city_service_rates').select('*'),
    ])

    const rateMap: Record<string, Record<ServiceId, RateRow>> = {}
    for (const r of rateData ?? []) {
      if (!rateMap[r.city_id]) rateMap[r.city_id] = {} as Record<ServiceId, RateRow>
      rateMap[r.city_id][r.service_id as ServiceId] = r
    }

    setCities((cityData ?? []).map(c => ({
      ...c,
      rates: rateMap[c.id] ?? {},
    })) as CityRow[])
    setLoading(false)
  }

  async function updateRate(cityId: string, svcId: ServiceId, field: 'base_rate' | 'min_rate' | 'max_rate', value: number) {
    // Optimistic local update
    setCities(prev => prev.map(c => {
      if (c.id !== cityId) return c
      return {
        ...c,
        rates: {
          ...c.rates,
          [svcId]: { ...c.rates[svcId], [field]: value },
        },
      }
    }))
  }

  async function saveRate(cityId: string, svcId: ServiceId) {
    const city = cities.find(c => c.id === cityId)
    const rate = city?.rates[svcId]
    if (!rate) return
    setSaving(`${cityId}-${svcId}`)
    const supabase = createClient()
    await supabase
      .from('city_service_rates')
      .upsert({
        city_id:    cityId,
        service_id: svcId,
        base_rate:  rate.base_rate,
        min_rate:   rate.min_rate,
        max_rate:   rate.max_rate,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'city_id,service_id' })
    setSaving(null)
  }

  const filtered = cities.filter(c => {
    const matchRegion = region === 'All' || c.region === region
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    return matchRegion && matchSearch
  })

  const svc = SERVICES.find(s => s.id === service)!

  return (
    <div className="min-h-screen bg-[#F7F2EE]">
      <AdminNav onRefresh={load} refreshing={loading} />

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Tier legend */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { tier: 'NCR',  rates: '₱750–₱1,200', label: 'Metro Manila' },
            { tier: 'HUC',  rates: '₱600–₱1,000', label: 'Major cities' },
            { tier: 'ICC',  rates: '₱500–₱850',   label: 'Independent cities' },
            { tier: 'CC',   rates: '₱400–₱700',   label: 'Component cities' },
        // Hilot rates are ₱50–₱100 above Relax within each tier
          ].map(t => (
            <div key={t.tier} className="bg-white rounded-xl border border-[#EDE5DF] p-3">
              <p className="text-[10px] font-bold text-[#8C7B70] uppercase tracking-wider">{t.tier} — {t.label}</p>
              <p className="text-sm font-bold text-[#2C2420] mt-0.5">{t.rates}</p>
              <p className="text-[10px] text-[#C8A88A]">Relax 60 min range</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          {/* Service tabs */}
          <div className="flex gap-2">
            {SERVICES.map(s => (
              <button
                key={s.id}
                onClick={() => setService(s.id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                  service === s.id
                    ? 'bg-[#2C2420] text-white border-[#2C2420]'
                    : 'bg-white border-[#EDE5DF] text-[#8C7B70]',
                )}
              >{s.label} <span className="opacity-60">{s.duration}</span></button>
            ))}
          </div>

          <select
            value={region}
            onChange={e => setRegion(e.target.value)}
            className="border border-[#EDE5DF] rounded-xl px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-[#C4714A]"
          >
            {REGIONS.map(r => <option key={r} value={r}>{r === 'All' ? 'All regions' : r}</option>)}
          </select>

          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search city…"
            className="flex-1 min-w-40 border border-[#EDE5DF] rounded-xl px-4 py-1.5 text-sm bg-white focus:outline-none focus:border-[#C4714A]"
          />
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[1fr_80px_100px_100px_100px_80px] gap-2 px-4 pb-2 text-xs font-semibold text-[#8C7B70] uppercase tracking-wide">
          <span>City</span>
          <span>Class</span>
          <span className="text-center">Min (₱)</span>
          <span className="text-center">Base (₱)</span>
          <span className="text-center">Max (₱)</span>
          <span></span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-[#8C7B70]">Loading…</div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(city => {
              const rate = city.rates[service]
              const key  = `${city.id}-${service}`
              if (!rate) return null
              return (
                <div
                  key={city.id}
                  className="bg-white rounded-xl border border-[#EDE5DF] px-4 py-3 grid grid-cols-[1fr_80px_100px_100px_100px_80px] gap-2 items-center"
                >
                  <div>
                    <p className="font-semibold text-sm text-[#2C2420]">{city.name}</p>
                    <p className="text-xs text-[#8C7B70]">{city.region}</p>
                  </div>

                  <span className="text-xs font-semibold px-2 py-1 rounded bg-[#F2EBE6] text-[#8C7B70] text-center">
                    {TIER_LABEL[city.city_class] ?? city.city_class}
                  </span>

                  {(['min_rate', 'base_rate', 'max_rate'] as const).map(field => (
                    <input
                      key={field}
                      type="number"
                      min={100}
                      max={9999}
                      step={50}
                      value={rate[field]}
                      onChange={e => updateRate(city.id, service, field, parseInt(e.target.value) || 0)}
                      onBlur={() => saveRate(city.id, service)}
                      className="border border-[#EDE5DF] rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-[#C4714A] w-full"
                    />
                  ))}

                  <span className="text-xs text-center">
                    {saving === key
                      ? <span className="text-[#C4714A]">Saving…</span>
                      : <span className="text-[#6B8C6E]">✓</span>
                    }
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
