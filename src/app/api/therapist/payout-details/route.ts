import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const METHODS = ['gcash', 'maya', 'bank']

// GET — the therapist's saved payout destination.
export async function GET() {
  const authed = await createClient()
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = await createServiceClient()
  const { data: t } = await svc
    .from('therapists')
    .select('payout_method, payout_account_name, payout_account_number, payout_bank_name')
    .eq('email', user.email)
    .maybeSingle()
  if (!t) return NextResponse.json({ error: 'Therapist not found' }, { status: 403 })

  return NextResponse.json({ details: t })
}

// POST — save/update payout destination.
export async function POST(req: NextRequest) {
  const authed = await createClient()
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { method, accountName, accountNumber, bankName } = await req.json()

  if (!METHODS.includes(method)) {
    return NextResponse.json({ error: 'Choose a payout method.' }, { status: 400 })
  }
  if (!accountName?.trim()) {
    return NextResponse.json({ error: 'Enter the account name.' }, { status: 400 })
  }
  if (!accountNumber?.trim()) {
    return NextResponse.json({ error: 'Enter the account number.' }, { status: 400 })
  }
  if (method === 'bank' && !bankName?.trim()) {
    return NextResponse.json({ error: 'Enter the bank name.' }, { status: 400 })
  }

  const svc = await createServiceClient()
  const { error } = await svc
    .from('therapists')
    .update({
      payout_method:         method,
      payout_account_name:   accountName.trim(),
      payout_account_number: accountNumber.trim(),
      payout_bank_name:      method === 'bank' ? bankName.trim() : null,
    })
    .eq('email', user.email)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
