import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { THERAPIST_PAYOUT_RATE } from '@/lib/bonus'

// PH-local date (UTC+8) offset by `days`, as YYYY-MM-DD.
function phDate(days = 0): string {
  const d = new Date(Date.now() + 8 * 3600 * 1000)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export async function GET() {
  const authed = await createClient()
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = await createServiceClient()
  const { data: t } = await svc.from('therapists').select('id').eq('email', user.email).maybeSingle()
  if (!t) return NextResponse.json({ error: 'Therapist not found' }, { status: 403 })

  const [{ data: completed }, { count: cancelledCount }, { data: ratings }, { data: responses }] = await Promise.all([
    svc.from('bookings')
      .select('subtotal, service_id, booking_date, customer_phone')
      .eq('therapist_id', t.id).eq('status', 'completed'),
    svc.from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('therapist_id', t.id).eq('status', 'cancelled'),
    svc.from('ratings')
      .select('stars, tags, review_text, created_at')
      .eq('therapist_id', t.id).order('created_at', { ascending: false }),
    svc.from('therapist_responses')
      .select('response')
      .eq('therapist_id', t.id),
  ])

  const comp = completed ?? []
  const takeHome = (b: { subtotal: number | null }) => Math.round((b.subtotal ?? 0) * THERAPIST_PAYOUT_RATE)

  // Date boundaries
  const today          = phDate(0)
  const weekAgo        = phDate(-7)
  const thisMonthStart = today.slice(0, 7) + '-01'
  const [y, m]         = today.split('-').map(Number)
  const lastMonthStart = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10)
  const lastMonthEnd   = new Date(Date.UTC(y, m - 1, 0)).toISOString().slice(0, 10)

  const sum = (rows: typeof comp) => rows.reduce((s, b) => s + takeHome(b), 0)

  const earnings = {
    thisWeek:  sum(comp.filter(b => b.booking_date >= weekAgo)),
    thisMonth: sum(comp.filter(b => b.booking_date >= thisMonthStart)),
    lastMonth: sum(comp.filter(b => b.booking_date >= lastMonthStart && b.booking_date <= lastMonthEnd)),
    allTime:   sum(comp),
    avgPerSession: comp.length ? Math.round(sum(comp) / comp.length) : 0,
  }

  const totalCancelled = cancelledCount ?? 0

  const accepted = (responses ?? []).filter(r => r.response === 'accepted').length
  const declined = (responses ?? []).filter(r => r.response === 'declined').length

  const volume = {
    sessionsThisWeek:  comp.filter(b => b.booking_date >= weekAgo).length,
    sessionsThisMonth: comp.filter(b => b.booking_date >= thisMonthStart).length,
    completed:         comp.length,
    cancelled:         totalCancelled,
    completionRate:    comp.length + totalCancelled > 0
      ? Math.round((comp.length / (comp.length + totalCancelled)) * 100)
      : null,
    accepted,
    declined,
    acceptanceRate:    accepted + declined > 0
      ? Math.round((accepted / (accepted + declined)) * 100)
      : null,
  }

  // Per-service breakdown
  const perService: Record<string, { count: number; earned: number }> = {}
  for (const b of comp) {
    const k = b.service_id
    if (!perService[k]) perService[k] = { count: 0, earned: 0 }
    perService[k].count  += 1
    perService[k].earned += takeHome(b)
  }

  // Customers (by phone, covers guests + logged-in)
  const phoneCounts: Record<string, number> = {}
  for (const b of comp) {
    if (!b.customer_phone) continue
    phoneCounts[b.customer_phone] = (phoneCounts[b.customer_phone] ?? 0) + 1
  }
  const uniqueCustomers = Object.keys(phoneCounts).length
  const repeatCustomers = Object.values(phoneCounts).filter(c => c > 1).length

  // Reviews
  const rs = ratings ?? []
  const starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  const tagCounts: Record<string, number> = {}
  for (const r of rs) {
    starCounts[r.stars] = (starCounts[r.stars] ?? 0) + 1
    for (const tag of (r.tags ?? [])) tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
  }
  const avgRating = rs.length ? Math.round((rs.reduce((s, r) => s + r.stars, 0) / rs.length) * 10) / 10 : null
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([tag, count]) => ({ tag, count }))
  const recentReviews = rs.filter(r => r.review_text).slice(0, 8)

  return NextResponse.json({
    earnings, volume, perService,
    customers: { unique: uniqueCustomers, repeat: repeatCustomers },
    reviews: { count: rs.length, avg: avgRating, starCounts, topTags, recent: recentReviews },
  })
}
