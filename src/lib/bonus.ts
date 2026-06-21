import { SupabaseClient } from '@supabase/supabase-js'

export const BONUS_RATE              = 0.05   // 5% of subtotal into the pool
export const BONUS_MIN_BOOKINGS      = 15     // minimum bookings per quarter to qualify
export const PLATFORM_COMMISSION     = 0.25   // 25% total platform cut
export const THERAPIST_PAYOUT_RATE   = 0.75   // 75% to therapist
export const REFERRAL_RATE           = 0.05   // 5% per referral level (max 2 levels = 10%)

/** Returns the current quarter string, e.g. '2026-Q2' */
export function currentQuarter(date = new Date()): string {
  const q = Math.ceil((date.getMonth() + 1) / 3)
  return `${date.getFullYear()}-Q${q}`
}

/** Returns start and end dates for a quarter string like '2026-Q2' */
export function quarterDateRange(quarter: string): { start: string; end: string } {
  const [year, q] = quarter.split('-Q').map(Number)
  const startMonth = (q - 1) * 3        // 0-indexed month
  const endMonth   = startMonth + 2
  const start = new Date(year, startMonth, 1)
  const end   = new Date(year, endMonth + 1, 0) // last day of end month
  return {
    start: start.toISOString().slice(0, 10),
    end:   end.toISOString().slice(0, 10),
  }
}

/**
 * Records a 5% bonus pool contribution for a completed booking.
 * Called alongside createReferralCommissions when a booking is marked completed.
 */
export async function recordBonusContribution(
  supabase: SupabaseClient,
  bookingId: string,
  therapistId: string,
  subtotal: number,
) {
  const amount  = Math.round(subtotal * BONUS_RATE)
  const quarter = currentQuarter()

  await supabase.from('alaga_bonus_pool').upsert({
    booking_id:   bookingId,
    therapist_id: therapistId,
    amount,
    quarter,
  }, { onConflict: 'booking_id', ignoreDuplicates: true })
}

/**
 * Calculates and creates payout rows for a given quarter.
 * Run this at the end of each quarter before paying out.
 * Only therapists with >= BONUS_MIN_BOOKINGS that quarter qualify.
 */
export async function calculateQuarterlyPayouts(
  supabase: SupabaseClient,
  quarter: string,
): Promise<{ therapistId: string; name: string; bookingCount: number; share: number }[]> {
  // Total pool for the quarter
  const { data: pool } = await supabase
    .from('alaga_bonus_pool')
    .select('amount, therapist_id')
    .eq('quarter', quarter)

  if (!pool || pool.length === 0) return []

  const totalPool = pool.reduce((s, r) => s + r.amount, 0)

  // Count bookings per therapist this quarter
  const countMap: Record<string, number> = {}
  for (const r of pool) {
    countMap[r.therapist_id] = (countMap[r.therapist_id] ?? 0) + 1
  }

  // Filter to qualified therapists
  const qualified = Object.entries(countMap)
    .filter(([, count]) => count >= BONUS_MIN_BOOKINGS)
    .map(([id, count]) => ({ therapistId: id, count }))

  if (qualified.length === 0) return []

  // Proportional share based only on qualified therapists' bookings.
  // Contributions from non-qualifying therapists remain in the pool unpaid → platform profit.
  const totalQualifiedBookings = qualified.reduce((s, q) => s + q.count, 0)

  // Fetch therapist names
  const { data: therapists } = await supabase
    .from('therapists')
    .select('id, name')
    .in('id', qualified.map(q => q.therapistId))

  const nameMap: Record<string, string> = {}
  for (const t of therapists ?? []) nameMap[t.id] = t.name

  const results = []
  for (const q of qualified) {
    const share = Math.floor(totalPool * (q.count / totalQualifiedBookings))

    await supabase.from('alaga_bonus_payouts').upsert({
      therapist_id:  q.therapistId,
      quarter,
      booking_count: q.count,
      pool_share:    share,
      status:        'pending',
    }, { onConflict: 'therapist_id,quarter', ignoreDuplicates: true })

    results.push({
      therapistId:   q.therapistId,
      name:          nameMap[q.therapistId] ?? 'Unknown',
      bookingCount:  q.count,
      share,
    })
  }

  return results
}
