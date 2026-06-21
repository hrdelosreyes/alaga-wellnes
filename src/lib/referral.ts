import { SupabaseClient } from '@supabase/supabase-js'

const COMMISSION_RATE  = 0.05  // 5%
const BOOKING_LIMIT    = 100   // commissions stop after source therapist's 100th booking

/** Generate a short unique referral code from a therapist's name + random suffix */
export function generateReferralCode(name: string): string {
  const prefix = name.trim().replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase()
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}${suffix}`
}

/**
 * Called when a booking is marked 'completed'.
 * Walks up to 2 levels of the referral chain and creates commission rows.
 */
export async function createReferralCommissions(
  supabase: SupabaseClient,
  bookingId: string,
  therapistId: string,
  subtotal: number,
) {
  // Count how many completed bookings this therapist has (including this one)
  const { count: therapistBookingCount } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('therapist_id', therapistId)
    .eq('status', 'completed')

  const count = therapistBookingCount ?? 0
  if (count > BOOKING_LIMIT) return  // referral window has closed

  // Fetch level-1 referrer (the person who directly referred this therapist)
  const { data: therapist } = await supabase
    .from('therapists')
    .select('referred_by_id')
    .eq('id', therapistId)
    .single()

  if (!therapist?.referred_by_id) return  // not referred by anyone

  const level1Id = therapist.referred_by_id
  const amount   = Math.round(subtotal * COMMISSION_RATE)

  // Level-1 commission
  await supabase.from('referral_commissions').upsert({
    booking_id:          bookingId,
    source_therapist_id: therapistId,
    beneficiary_id:      level1Id,
    level:               1,
    amount,
  }, { onConflict: 'booking_id,beneficiary_id', ignoreDuplicates: true })

  // Level-2: the referrer's referrer
  const { data: level1Therapist } = await supabase
    .from('therapists')
    .select('referred_by_id')
    .eq('id', level1Id)
    .single()

  if (!level1Therapist?.referred_by_id) return

  const level2Id = level1Therapist.referred_by_id
  await supabase.from('referral_commissions').upsert({
    booking_id:          bookingId,
    source_therapist_id: therapistId,
    beneficiary_id:      level2Id,
    level:               2,
    amount,
  }, { onConflict: 'booking_id,beneficiary_id', ignoreDuplicates: true })
}
