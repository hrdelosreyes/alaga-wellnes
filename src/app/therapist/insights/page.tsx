'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatPrice, formatDate } from '@/lib/utils'
import { SERVICES } from '@/lib/constants'
import { TherapistNav } from '@/components/therapist/therapist-nav'
import { Loader2, TrendingUp, TrendingDown, Star, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

type Insights = {
  earnings: { thisWeek: number; thisMonth: number; lastMonth: number; allTime: number; avgPerSession: number }
  volume:   { sessionsThisWeek: number; sessionsThisMonth: number; completed: number; cancelled: number; completionRate: number | null; accepted: number; declined: number; acceptanceRate: number | null }
  perService: Record<string, { count: number; earned: number }>
  customers: { unique: number; repeat: number }
  reviews:  {
    count: number; avg: number | null
    starCounts: Record<number, number>
    topTags: { tag: string; count: number }[]
    recent: { stars: number; tags: string[]; review_text: string; created_at: string }[]
  }
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: React.ReactNode; accent?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EDE5DF] p-4">
      <p className="text-[10px] text-[#8C7B70] uppercase tracking-wider font-semibold">{label}</p>
      <p className={cn('text-2xl font-bold mt-1', accent ?? 'text-[#2C2420]')}>{value}</p>
      {sub && <div className="text-[11px] text-[#8C7B70] mt-0.5">{sub}</div>}
    </div>
  )
}

export default function TherapistInsightsPage() {
  const router = useRouter()
  const [data, setData]       = useState<Insights | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/therapist/insights')
      .then(async res => {
        if (res.status === 401 || res.status === 403) { router.replace('/therapist/login'); return null }
        return res.json()
      })
      .then(d => { if (d) setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [router])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FBF6F0]"><Loader2 className="animate-spin text-[#C4714A]" size={32} /></div>
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-[#F7F2EE]"><TherapistNav />
        <div className="max-w-3xl mx-auto px-4 py-10 text-center text-[#8C7B70]">Couldn&rsquo;t load insights.</div>
      </div>
    )
  }

  const { earnings, volume, perService, customers, reviews } = data
  const momChange = earnings.lastMonth > 0
    ? Math.round(((earnings.thisMonth - earnings.lastMonth) / earnings.lastMonth) * 100)
    : null
  const maxStar = Math.max(1, ...Object.values(reviews.starCounts))

  return (
    <div className="min-h-screen bg-[#F7F2EE]">
      <TherapistNav />

      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-[#2C2420]">Business insights</h1>

        {/* Earnings */}
        <section>
          <h2 className="text-sm font-bold text-[#2C2420] mb-3">Earnings (your 75% take-home)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="This week" value={formatPrice(earnings.thisWeek)} />
            <Stat
              label="This month" value={formatPrice(earnings.thisMonth)}
              accent="text-[#C4714A]"
              sub={momChange !== null && (
                <span className={cn('inline-flex items-center gap-0.5', momChange >= 0 ? 'text-[#6B8C6E]' : 'text-red-500')}>
                  {momChange >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {Math.abs(momChange)}% vs last month
                </span>
              )}
            />
            <Stat label="Avg / session" value={formatPrice(earnings.avgPerSession)} />
            <Stat label="All time" value={formatPrice(earnings.allTime)} />
          </div>
        </section>

        {/* Business health */}
        <section>
          <h2 className="text-sm font-bold text-[#2C2420] mb-3">Business health</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Sessions this month" value={String(volume.sessionsThisMonth)} />
            <Stat label="Completed (all)" value={String(volume.completed)} accent="text-[#6B8C6E]" />
            <Stat
              label="Acceptance rate"
              value={volume.acceptanceRate !== null ? `${volume.acceptanceRate}%` : '—'}
              accent="text-[#C4714A]"
              sub={volume.acceptanceRate !== null ? `${volume.accepted} accepted · ${volume.declined} declined` : 'No responses yet'}
            />
            <Stat
              label="Completion rate"
              value={volume.completionRate !== null ? `${volume.completionRate}%` : '—'}
              sub={`${volume.cancelled} cancelled`}
            />
          </div>
        </section>

        {/* Per service + customers */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-[#EDE5DF] p-5">
            <h2 className="text-sm font-bold text-[#2C2420] mb-3">By service</h2>
            <div className="flex flex-col gap-2">
              {SERVICES.map(s => {
                const ps = perService[s.id]
                return (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span className="text-[#2C2420]">{s.name}</span>
                    <span className="text-[#8C7B70]">
                      <strong className="text-[#2C2420]">{ps?.count ?? 0}</strong> · {formatPrice(ps?.earned ?? 0)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#EDE5DF] p-5">
            <h2 className="text-sm font-bold text-[#2C2420] mb-3 flex items-center gap-1.5"><Users size={15} /> Customers</h2>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-[#2C2420]">{customers.unique}</p>
                <p className="text-[10px] text-[#8C7B70] mt-0.5">Unique customers</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#C4714A]">{customers.repeat}</p>
                <p className="text-[10px] text-[#8C7B70] mt-0.5">Repeat customers</p>
              </div>
            </div>
            <p className="text-[10px] text-[#8C7B70] mt-3 text-center">Repeat customers are your most valuable — keep them happy!</p>
          </div>
        </section>

        {/* Reviews */}
        <section className="bg-white rounded-2xl border border-[#EDE5DF] p-5">
          <h2 className="text-sm font-bold text-[#2C2420] mb-3 flex items-center gap-1.5"><Star size={15} className="text-[#C9A84C]" /> Reviews &amp; ratings</h2>

          {reviews.count === 0 ? (
            <p className="text-sm text-[#8C7B70]">No reviews yet. Complete sessions and ask clients to rate you!</p>
          ) : (
            <>
              <div className="flex items-center gap-6 mb-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-[#2C2420]">{reviews.avg ?? '—'}</p>
                  <div className="flex items-center gap-0.5 justify-center mt-1">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} size={12} className={i <= Math.round(reviews.avg ?? 0) ? 'text-[#C9A84C]' : 'text-[#EDE5DF]'} fill={i <= Math.round(reviews.avg ?? 0) ? '#C9A84C' : 'none'} />
                    ))}
                  </div>
                  <p className="text-[10px] text-[#8C7B70] mt-1">{reviews.count} review{reviews.count === 1 ? '' : 's'}</p>
                </div>
                {/* Star bars */}
                <div className="flex-1 flex flex-col gap-1">
                  {[5,4,3,2,1].map(star => (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-[10px] text-[#8C7B70] w-3">{star}</span>
                      <div className="flex-1 h-2 bg-[#F2EBE6] rounded-full overflow-hidden">
                        <div className="h-full bg-[#C9A84C] rounded-full" style={{ width: `${((reviews.starCounts[star] ?? 0) / maxStar) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-[#8C7B70] w-4 text-right">{reviews.starCounts[star] ?? 0}</span>
                    </div>
                  ))}
                </div>
              </div>

              {reviews.topTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {reviews.topTags.map(t => (
                    <span key={t.tag} className="text-xs bg-[#F2EBE6] text-[#5C4B45] px-2.5 py-1 rounded-full">{t.tag} · {t.count}</span>
                  ))}
                </div>
              )}

              {reviews.recent.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-[#F2EBE6] pt-4">
                  {reviews.recent.map((r, i) => (
                    <div key={i} className="text-sm">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(s => <Star key={s} size={11} className={s <= r.stars ? 'text-[#C9A84C]' : 'text-[#EDE5DF]'} fill={s <= r.stars ? '#C9A84C' : 'none'} />)}
                        </span>
                        <span className="text-[10px] text-[#8C7B70]">{formatDate(r.created_at.slice(0,10))}</span>
                      </div>
                      <p className="text-[#5C4B45] leading-relaxed">&ldquo;{r.review_text}&rdquo;</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
