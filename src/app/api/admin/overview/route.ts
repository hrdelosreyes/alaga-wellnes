import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { PLATFORM_COMMISSION, THERAPIST_PAYOUT_RATE } from '@/lib/bonus'

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
  const { data: role } = await svc.from('user_roles').select('role').eq('user_id', user.id).maybeSingle()
  if (role?.role !== 'admin' && role?.role !== 'staff') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [
    { data: bookings },
    { data: refs },
    { data: pool },
    { data: payouts },
    { data: therapists },
    { data: customers },
    { data: ratings },
    { data: responses },
    { data: waitlist },
  ] = await Promise.all([
    svc.from('bookings').select('subtotal, total, status, payment_status, booking_date, therapist_id, customer_phone'),
    svc.from('referral_commissions').select('amount'),
    svc.from('alaga_bonus_pool').select('amount'),
    svc.from('payout_records').select('amount, status'),
    svc.from('therapists').select('id, is_active, application_status, city, created_at'),
    svc.from('customers').select('created_at'),
    svc.from('ratings').select('stars'),
    svc.from('therapist_responses').select('response'),
    svc.from('waitlist').select('city'),
  ])

  const bk   = bookings ?? []
  const ther = therapists ?? []

  // ---- Date boundaries (PH-local) ----
  const today          = phDate(0)
  const weekAgo        = phDate(-7)
  const thisMonthStart = today.slice(0, 7) + '-01'
  const [y, m]         = today.split('-').map(Number)
  const lastMonthStart = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10)
  const lastMonthEnd   = new Date(Date.UTC(y, m - 1, 0)).toISOString().slice(0, 10)

  const paid      = bk.filter(b => b.payment_status === 'paid')
  const completed = bk.filter(b => b.status === 'completed')
  const cancelled = bk.filter(b => b.status === 'cancelled')

  const sumSub = (rows: typeof bk) => rows.reduce((s, b) => s + (b.subtotal ?? 0), 0)

  // ---- Money ----
  const gmv            = sumSub(paid)                                  // gross service value (paid)
  const platformRev    = Math.round(gmv * PLATFORM_COMMISSION)         // your 25% take
  const therapistShare = Math.round(gmv * THERAPIST_PAYOUT_RATE)       // 75% therapists' money

  const referralPool = (refs ?? []).reduce((s, r) => s + (r.amount ?? 0), 0)
  const bonusPool    = (pool ?? []).reduce((s, r) => s + (r.amount ?? 0), 0)

  // Realized: commissions/bonus accrue on completion
  const completedSub  = sumSub(completed)
  const grossOnDone   = Math.round(completedSub * PLATFORM_COMMISSION)
  const netProfit     = grossOnDone - referralPool - bonusPool

  // Outstanding therapist payouts (liability)
  const earnedTotal = Math.round(completedSub * THERAPIST_PAYOUT_RATE)
  const paidOut     = (payouts ?? []).filter(p => p.status === 'sent').reduce((s, p) => s + (p.amount ?? 0), 0)
  const outstandingPayouts = Math.max(0, earnedTotal - paidOut)

  // Revenue trend (your 25%, by booking_date among paid)
  const gmvThisMonth = sumSub(paid.filter(b => b.booking_date >= thisMonthStart))
  const gmvLastMonth = sumSub(paid.filter(b => b.booking_date >= lastMonthStart && b.booking_date <= lastMonthEnd))
  const revThisMonth = Math.round(gmvThisMonth * PLATFORM_COMMISSION)
  const revLastMonth = Math.round(gmvLastMonth * PLATFORM_COMMISSION)
  const revMoM = revLastMonth > 0 ? Math.round(((revThisMonth - revLastMonth) / revLastMonth) * 100) : null

  const money = {
    gmv, platformRev, therapistShare,
    netProfit, referralPool, bonusPool,
    outstandingPayouts,
    revThisMonth, revLastMonth, revMoM,
  }

  // ---- Growth ----
  const growth = {
    bookingsThisWeek:  paid.filter(b => b.booking_date >= weekAgo).length,
    bookingsThisMonth: paid.filter(b => b.booking_date >= thisMonthStart).length,
    newCustomers:      (customers ?? []).filter(c => (c.created_at ?? '') >= thisMonthStart).length,
    newTherapists:     ther.filter(t => (t.created_at ?? '') >= thisMonthStart).length,
    totalCustomers:    (customers ?? []).length,
  }

  // ---- Marketplace health ----
  const approved = ther.filter(t => t.application_status === 'approved')
  const active   = approved.filter(t => t.is_active !== false)
  const accepted = (responses ?? []).filter(r => r.response === 'accepted').length
  const declined = (responses ?? []).filter(r => r.response === 'declined').length
  const rs = ratings ?? []
  const avgRating = rs.length ? Math.round((rs.reduce((s, r) => s + r.stars, 0) / rs.length) * 10) / 10 : null

  const health = {
    activeTherapists: active.length,
    approvedTherapists: approved.length,
    utilization: active.length ? Math.round((completed.length / active.length) * 10) / 10 : 0,
    completionRate: completed.length + cancelled.length > 0
      ? Math.round((completed.length / (completed.length + cancelled.length)) * 100) : null,
    cancellationRate: completed.length + cancelled.length > 0
      ? Math.round((cancelled.length / (completed.length + cancelled.length)) * 100) : null,
    acceptanceRate: accepted + declined > 0
      ? Math.round((accepted / (accepted + declined)) * 100) : null,
    accepted, declined,
    avgRating, reviewCount: rs.length,
  }

  // ---- Expansion: waitlist demand by city ----
  const cityCounts: Record<string, number> = {}
  for (const w of waitlist ?? []) {
    const c = (w.city ?? '').trim() || 'Unspecified'
    cityCounts[c] = (cityCounts[c] ?? 0) + 1
  }
  const waitlistByCity = Object.entries(cityCounts)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // ---- Alerts ----
  const alerts = {
    unassignedConfirmed: bk.filter(b => b.status === 'confirmed' && !b.therapist_id).length,
    pendingApplicants:   ther.filter(t => t.application_status === 'pending').length,
    outstandingPayouts,
  }

  return NextResponse.json({ money, growth, health, waitlistByCity, alerts })
}
