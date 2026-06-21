'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Search, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

type Barangay = { psgc_code: string; name: string }

export default function ServiceAreaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextUrl = searchParams.get('next')

  const [therapistId,  setTherapistId]  = useState<string | null>(null)
  const [cityName,     setCityName]     = useState('')
  const [barangays,    setBarangays]    = useState<Barangay[]>([])
  const [selected,     setSelected]     = useState<Set<string>>(new Set())
  const [search,       setSearch]       = useState('')
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/therapist/login'); return }

    const { data: t } = await supabase
      .from('therapists')
      .select('id, city_id, cities(name)')
      .eq('phone', user.phone)
      .single()

    if (!t) { router.replace('/therapist/login'); return }

    setTherapistId(t.id)
    const city = (t as any).cities as { name: string } | null
    const name = city?.name ?? ''
    setCityName(name)

    // Load barangays for this city + therapist's current selections in parallel
    const [{ data: bgyData }, { data: selData }] = await Promise.all([
      supabase.from('barangays').select('psgc_code, name').eq('city_name', name).order('name'),
      supabase.from('therapist_barangays').select('barangay_psgc').eq('therapist_id', t.id),
    ])

    setBarangays((bgyData ?? []) as Barangay[])
    setSelected(new Set((selData ?? []).map(r => r.barangay_psgc)))
    setLoading(false)
  }

  async function save() {
    if (!therapistId) return
    setSaving(true)
    const supabase = createClient()

    // Replace all existing rows for this therapist
    await supabase.from('therapist_barangays').delete().eq('therapist_id', therapistId)

    if (selected.size > 0) {
      const rows = Array.from(selected).map(psgc => ({
        therapist_id:  therapistId,
        barangay_psgc: psgc,
      }))
      await supabase.from('therapist_barangays').insert(rows)
    }

    setSaving(false)
    if (nextUrl) {
      router.push(nextUrl)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  const visible = barangays.filter(b =>
    !search || b.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF6F0]">
        <Loader2 className="animate-spin text-[#C4714A]" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F2EE]">
      <div className="bg-[#2C2420] text-white px-5 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/therapist/dashboard')} className="p-1 hover:opacity-70">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-bold text-base">My service area</h1>
          <p className="text-xs text-[#C8A88A]">{cityName}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <p className="text-sm text-[#8C7B70] mb-4">
          Tick every barangay you're willing to travel to. Only customers in your selected barangays will see you when booking.
        </p>

        {barangays.length === 0 ? (
          <p className="text-sm text-[#8C7B70] text-center py-12">No barangay data available for {cityName}.</p>
        ) : (
          <>
            {/* Search */}
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-3 text-[#8C7B70]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search barangay…"
                className="w-full border border-[#EDE5DF] rounded-xl pl-8 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:border-[#C4714A] transition-colors"
              />
            </div>

            {/* Select all / clear */}
            <div className="flex items-center gap-4 mb-3">
              <button
                type="button"
                onClick={() => setSelected(new Set(barangays.map(b => b.psgc_code)))}
                className="text-xs text-[#C4714A] hover:underline"
              >
                Select all ({barangays.length})
              </button>
              {selected.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="text-xs text-[#8C7B70] hover:underline"
                >
                  Clear
                </button>
              )}
              <span className="ml-auto text-xs font-semibold text-[#6B8C6E]">
                {selected.size} / {barangays.length} selected
              </span>
            </div>

            {/* Checkbox list */}
            <div className="bg-white border border-[#EDE5DF] rounded-2xl overflow-y-auto max-h-[60vh] divide-y divide-[#F2EBE6]">
              {visible.map(b => (
                <label key={b.psgc_code} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#FBF6F0] transition-colors">
                  <input
                    type="checkbox"
                    checked={selected.has(b.psgc_code)}
                    onChange={e => {
                      setSelected(prev => {
                        const next = new Set(prev)
                        e.target.checked ? next.add(b.psgc_code) : next.delete(b.psgc_code)
                        return next
                      })
                    }}
                    className="accent-[#C4714A] w-4 h-4 flex-shrink-0"
                  />
                  <span className="text-sm text-[#2C2420]">{b.name}</span>
                </label>
              ))}
              {visible.length === 0 && (
                <p className="text-sm text-[#8C7B70] text-center py-8">No barangays match "{search}"</p>
              )}
            </div>

            <Button
              size="lg"
              className="w-full mt-5"
              loading={saving}
              onClick={save}
            >
              {saved ? '✓ Saved!' : 'Save service area'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
