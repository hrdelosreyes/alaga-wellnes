'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { generateReferralCode } from '@/lib/referral'
import { cn } from '@/lib/utils'
import { ShieldCheck, FileText, ChevronDown, ChevronUp, ExternalLink, RefreshCw } from 'lucide-react'
import { AdminNav } from '@/components/layout/admin-nav'

type Extracted = {
  controlNumber?:    string | null
  fullName?:         string | null
  dateIssued?:       string | null
  expiryDate?:       string | null
  certificateNumber?: string | null
  qualification?:    string | null
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
  nbi_extracted:   Extracted | null
  tesda_extracted: Extracted | null
  application_status: string
  created_at: string
  cities: { name: string; region: string } | null
}

const STATUS_COLOR: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export default function AdminApplicantsPage() {
  const router = useRouter()
  const [applicants,  setApplicants]  = useState<Applicant[]>([])
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [expanded,    setExpanded]    = useState<string | null>(null)
  const [updating,    setUpdating]    = useState<string | null>(null)
  const [docUrls,     setDocUrls]     = useState<Record<string, { nbi?: string; tesda?: string; photo?: string }>>({})

  useEffect(() => { fetchApplicants() }, [filter])

  async function fetchApplicants() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('therapists')
      .select('*, cities(name, region), nbi_extracted, tesda_extracted')
      .eq('application_status', filter)
      .order('created_at', { ascending: false })
    setApplicants((data ?? []) as Applicant[])
    setLoading(false)
  }

  async function expand(applicant: Applicant) {
    const id = applicant.id
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)

    // Generate signed URLs for docs if not already loaded
    if (docUrls[id]) return
    const supabase = createClient()
    const urls: { nbi?: string; tesda?: string; photo?: string } = {}

    async function signed(path: string | null): Promise<string | undefined> {
      if (!path) return undefined
      const { data } = await supabase.storage
        .from('therapist-docs')
        .createSignedUrl(path, 300) // 5-minute expiry
      return data?.signedUrl
    }

    const [nbi, tesda, photo] = await Promise.all([
      signed(applicant.nbi_url),
      signed(applicant.tesda_url),
      signed(applicant.photo_url),
    ])
    if (nbi)   urls.nbi   = nbi
    if (tesda) urls.tesda = tesda
    if (photo) urls.photo = photo
    setDocUrls(prev => ({ ...prev, [id]: urls }))
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    setUpdating(id)
    const supabase = createClient()
    const applicant = applicants.find(a => a.id === id)

    // Generate a unique referral code on approval
    let referralCode: string | undefined
    if (status === 'approved' && applicant) {
      let code = generateReferralCode(applicant.name)
      // Ensure uniqueness (retry up to 5 times)
      for (let i = 0; i < 5; i++) {
        const { data } = await supabase
          .from('therapists').select('id').eq('referral_code', code).single()
        if (!data) break
        code = generateReferralCode(applicant.name)
      }
      referralCode = code
    }

    await supabase
      .from('therapists')
      .update({
        application_status: status,
        is_active:          status === 'approved',
        nbi_cleared:        status === 'approved',
        tesda_certified:    status === 'approved',
        ...(referralCode ? { referral_code: referralCode } : {}),
      })
      .eq('id', id)
    setApplicants(prev => prev.filter(a => a.id !== id))
    setExpanded(null)
    setUpdating(null)
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
      setApplicants(prev => prev.map(x => x.id === a.id
        ? { ...x, [`${docType}_extracted`]: extracted }
        : x
      ))
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F2EE]">
      <AdminNav onRefresh={fetchApplicants} refreshing={loading} />

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['pending', 'approved', 'rejected'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-semibold border capitalize transition-colors',
                filter === s
                  ? 'bg-[#2C2420] text-white border-[#2C2420]'
                  : 'border-[#EDE5DF] text-[#8C7B70] hover:border-[#2C2420] bg-white',
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-[#8C7B70]">Loading…</div>
        ) : applicants.length === 0 ? (
          <div className="text-center py-20 text-[#8C7B70]">
            No {filter} applications.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {applicants.map(a => {
              const isExpanded = expanded === a.id
              const docs = docUrls[a.id]

              return (
                <div key={a.id} className="bg-white rounded-2xl border border-[#EDE5DF] overflow-hidden">

                  {/* Summary row — always visible */}
                  <button
                    onClick={() => expand(a)}
                    className="w-full text-left p-5 flex items-center gap-4 hover:bg-[#FBF6F0] transition-colors"
                  >
                    {/* Avatar / photo */}
                    <div className="w-12 h-12 rounded-full bg-[#F2D9CC] flex items-center justify-center text-lg font-bold text-[#C4714A] flex-shrink-0 overflow-hidden">
                      {docs?.photo
                        ? <img src={docs.photo} alt={a.name} className="w-full h-full object-cover" />
                        : a.name.charAt(0)
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-bold text-[#2C2420]">{a.name}</span>
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full capitalize', STATUS_COLOR[a.application_status])}>
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

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-[#F2EBE6] p-5 flex flex-col gap-5">

                      {/* Specialties + bio */}
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
                          {a.referral_source && (
                            <p className="text-xs text-[#8C7B70] mt-1">Referred via: {a.referral_source}</p>
                          )}
                        </div>
                      </div>

                      {a.bio && (
                        <div>
                          <p className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-2">Bio</p>
                          <p className="text-sm text-[#2C2420] leading-relaxed">"{a.bio}"</p>
                        </div>
                      )}

                      {/* Documents + extracted data */}
                      <div className="flex flex-col gap-4">
                        <p className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider">Documents</p>

                        {/* NBI */}
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
                          verifyUrl={
                            a.nbi_extracted?.controlNumber
                              ? `https://clearance.nbi.gov.ph`
                              : undefined
                          }
                          verifyLabel="NBI Portal"
                          onReExtract={a.nbi_url ? () => reExtract(a, 'nbi') : undefined}
                        />

                        {/* TESDA */}
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
                          verifyUrl={
                            a.tesda_extracted?.fullName
                              ? `https://registry.tesda.gov.ph/Workers/search?name=${encodeURIComponent(a.tesda_extracted.fullName ?? '')}`
                              : 'https://registry.tesda.gov.ph'
                          }
                          verifyLabel="TESDA Registry"
                          onReExtract={a.tesda_url ? () => reExtract(a, 'tesda') : undefined}
                        />
                      </div>

                      {/* Approve / Reject — only shown on pending */}
                      {a.application_status === 'pending' && (
                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={() => updateStatus(a.id, 'approved')}
                            disabled={updating === a.id}
                            className="flex-1 py-3 rounded-xl bg-[#6B8C6E] text-white font-semibold text-sm hover:bg-[#5a7a5d] transition-colors disabled:opacity-50"
                          >
                            {updating === a.id ? 'Saving…' : '✓ Approve'}
                          </button>
                          <button
                            onClick={() => updateStatus(a.id, 'rejected')}
                            disabled={updating === a.id}
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
      {/* Header row */}
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
              title="Re-run AI extraction"
            >
              {reExtracting ? 'Extracting…' : '↺ Re-extract'}
            </button>
          )}
          {docsLoading ? (
            <span className="text-xs text-[#C8BDB8]">Loading…</span>
          ) : docUrl ? (
            <a
              href={docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-semibold text-[#6B8C6E] hover:underline"
            >
              View <ExternalLink size={11} />
            </a>
          ) : (
            <span className="text-xs text-[#C8BDB8]">Not uploaded</span>
          )}
        </div>
      </div>

      {/* Extracted fields */}
      <div className="px-4 py-3 bg-white">
        {!extracted ? (
          <p className="text-xs text-[#C8BDB8] italic">
            {docUrl ? 'AI extraction pending — check back shortly or click Re-extract.' : 'No document uploaded.'}
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

        {/* Verify button */}
        {extracted && verifyUrl && (
          <div className="mt-3 pt-3 border-t border-[#F2EBE6]">
            <a
              href={verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#2C2420] px-3 py-1.5 rounded-lg hover:bg-[#C4714A] transition-colors"
            >
              <ShieldCheck size={12} /> Verify on {verifyLabel}
              <ExternalLink size={11} />
            </a>
            <p className="text-[10px] text-[#C8BDB8] mt-1.5">
              Opens the official site — use the extracted details above to search.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
