'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { CheckCircle2, MapPin, DollarSign, Wallet, Users, Gift, ChevronRight } from 'lucide-react'

type Screen = 'loading' | 'earnings' | 'referral' | 'bonus' | 'setup'

export default function TherapistOnboardingPage() {
  const router  = useRouter()
  const [screen, setScreen] = useState<Screen>('loading')
  const [name,   setName]   = useState('')

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/therapist/login'); return }

      const { data: t } = await supabase
        .from('therapists')
        .select('id, name, application_status')
        .eq('phone', user.phone)
        .single()

      if (!t || t.application_status !== 'approved') {
        router.replace('/therapist/login')
        return
      }

      const { count } = await supabase
        .from('therapist_barangays')
        .select('therapist_id', { count: 'exact', head: true })
        .eq('therapist_id', t.id)

      if ((count ?? 0) > 0) {
        router.replace('/therapist/dashboard')
        return
      }

      setName(t.name.split(' ')[0])
      setScreen('earnings')
    }
    init()
  }, [router])

  if (screen === 'loading') {
    return (
      <div className="min-h-screen bg-[#FBF6F0] flex items-center justify-center">
        <p className="text-[#8C7B70] text-sm">Loading…</p>
      </div>
    )
  }

  // ── Commission breakdown screens ──────────────────────────────────
  if (screen === 'earnings') {
    return (
      <OnboardingShell step={1} total={3}>
        <div className="w-12 h-12 rounded-2xl bg-[#F2D9CC] flex items-center justify-center mx-auto mb-5">
          <Wallet size={22} className="text-[#C4714A]" />
        </div>
        <h1 className="text-xl font-bold text-[#2C2420] text-center mb-1">
          Welcome, {name}! Here's how you get paid.
        </h1>
        <p className="text-sm text-[#8C7B70] text-center mb-6">
          You're approved. Before you go live, let's make sure you understand your earnings.
        </p>

        {/* Breakdown */}
        <div className="bg-[#FBF6F0] rounded-2xl p-5 mb-4">
          <p className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-3">Every time a client pays</p>
          <div className="flex flex-col gap-3">
            <EarningsRow color="bg-[#C4714A]" width="75%" label="You" sublabel="take-home" value="75%" highlight />
            <EarningsRow color="bg-[#C9A84C]" width="5%"  label="Alaga Bonus Pool" sublabel="quarterly bonus" value="5%" />
            <EarningsRow color="bg-[#6B8C6E]" width="10%" label="Referral Pool" sublabel="for referrers" value="10%" />
            <EarningsRow color="bg-[#C8BDB8]" width="10%" label="Platform" sublabel="operations" value="10%" />
          </div>
        </div>

        <div className="bg-white border border-[#EDE5DF] rounded-2xl p-5 mb-6">
          <p className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-3">Example booking at ₱1,000</p>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-[#8C7B70]">Client pays</span>
              <span className="font-bold text-[#2C2420]">₱1,000</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#8C7B70]">Platform share (25%)</span>
              <span className="text-[#8C7B70]">− ₱250</span>
            </div>
            <div className="h-px bg-[#EDE5DF] my-1" />
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#2C2420]">Your take-home</span>
              <span className="font-bold text-[#C4714A] text-lg">₱750</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-[#8C7B70] text-center mb-6">
          You set your own rate per service. The city admin sets a fair price range — you choose any amount within it.
        </p>

        <Button size="lg" className="w-full" onClick={() => setScreen('referral')}>
          Next <ChevronRight size={16} />
        </Button>
      </OnboardingShell>
    )
  }

  if (screen === 'referral') {
    return (
      <OnboardingShell step={2} total={3} onBack={() => setScreen('earnings')}>
        <div className="w-12 h-12 rounded-2xl bg-[#E8F0E9] flex items-center justify-center mx-auto mb-5">
          <Users size={22} className="text-[#6B8C6E]" />
        </div>
        <h1 className="text-xl font-bold text-[#2C2420] text-center mb-1">Earn when your friends earn</h1>
        <p className="text-sm text-[#8C7B70] text-center mb-6">
          Once you're live, you'll get a personal referral code. Share it with other therapists.
        </p>

        <div className="bg-[#FBF6F0] rounded-2xl p-5 mb-4">
          <p className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-4">Your 2-level network</p>
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#6B8C6E] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">1</div>
              <div>
                <p className="text-sm font-semibold text-[#2C2420]">You invite Therapist B</p>
                <p className="text-xs text-[#8C7B70] mt-0.5">You earn <strong className="text-[#6B8C6E]">5% commission</strong> for every booking B completes — for their first 100 bookings.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#6B8C6E]/50 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">2</div>
              <div>
                <p className="text-sm font-semibold text-[#2C2420]">B invites Therapist C</p>
                <p className="text-xs text-[#8C7B70] mt-0.5">You <em>and</em> B each earn <strong className="text-[#6B8C6E]">5% commission</strong> for every booking C completes — for C's first 100 bookings.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#EDE5DF] rounded-2xl p-5 mb-6">
          <p className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-3">Example — B completes a ₱1,000 booking</p>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#8C7B70]">B's booking value</span>
              <span className="font-bold text-[#2C2420]">₱1,000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8C7B70]">Your referral (5%)</span>
              <span className="font-bold text-[#6B8C6E]">+ ₱50</span>
            </div>
          </div>
          <p className="text-xs text-[#8C7B70] mt-3">Commissions accumulate and are paid out by Alaga separately from your session earnings.</p>
        </div>

        <Button size="lg" className="w-full" onClick={() => setScreen('bonus')}>
          Next <ChevronRight size={16} />
        </Button>
      </OnboardingShell>
    )
  }

  if (screen === 'bonus') {
    return (
      <OnboardingShell step={3} total={3} onBack={() => setScreen('referral')}>
        <div className="w-12 h-12 rounded-2xl bg-[#FDF3D8] flex items-center justify-center mx-auto mb-5">
          <Gift size={22} className="text-[#C9A84C]" />
        </div>
        <h1 className="text-xl font-bold text-[#2C2420] text-center mb-1">The Alaga Bonus</h1>
        <p className="text-sm text-[#8C7B70] text-center mb-6">
          A quarterly reward for therapists who show up consistently.
        </p>

        <div className="bg-[#FBF6F0] rounded-2xl p-5 mb-4">
          <p className="text-xs font-semibold text-[#8C7B70] uppercase tracking-wider mb-3">How it works</p>
          <div className="flex flex-col gap-4">
            {[
              { n: '1', title: 'Pool builds every booking', body: '5% of every booking across all therapists on Alaga goes into a shared pool each quarter.' },
              { n: '2', title: 'Complete 15 bookings to qualify', body: 'At the end of the quarter, therapists who completed at least 15 bookings are eligible to receive a share.' },
              { n: '3', title: 'Bigger share for more bookings', body: 'The pool is split proportionally — the more you completed, the more you receive.' },
            ].map(({ n, title, body }) => (
              <div key={n} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-[#C9A84C] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">{n}</div>
                <div>
                  <p className="text-sm font-semibold text-[#2C2420]">{title}</p>
                  <p className="text-xs text-[#8C7B70] mt-0.5">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#FDF3D8] border border-[#C9A84C]/30 rounded-2xl p-4 mb-6 text-center">
          <p className="text-sm font-semibold text-[#2C2420]">Stay consistent, earn more</p>
          <p className="text-xs text-[#8C7B70] mt-1">The Alaga Bonus is paid on top of your session earnings and referral commissions — it's our way of rewarding therapists who commit to the platform.</p>
        </div>

        <Button size="lg" className="w-full" onClick={() => setScreen('setup')}>
          Got it — let's set up my profile <ChevronRight size={16} />
        </Button>
      </OnboardingShell>
    )
  }

  // ── Setup screen ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FBF6F0] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo-vertical.png" alt="Alaga Wellness" className="h-20 w-auto mx-auto" />
        </div>

        <div className="bg-white rounded-2xl border border-[#EDE5DF] p-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#E8F0E9] mx-auto mb-6">
            <CheckCircle2 size={28} className="text-[#6B8C6E]" />
          </div>

          <h1 className="text-xl font-bold text-[#2C2420] text-center mb-2">Almost there!</h1>
          <p className="text-sm text-[#8C7B70] text-center mb-8">
            Two quick steps and clients will start finding you.
          </p>

          <div className="flex flex-col gap-4 mb-8">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-[#FBF6F0] border border-[#EDE5DF]">
              <div className="w-10 h-10 rounded-xl bg-[#F2D9CC] flex items-center justify-center flex-shrink-0">
                <DollarSign size={18} className="text-[#C4714A]" />
              </div>
              <div>
                <p className="font-semibold text-[#2C2420] text-sm">Set your rates</p>
                <p className="text-xs text-[#8C7B70] mt-0.5">Choose your price for each service within your city's allowed range.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-[#FBF6F0] border border-[#EDE5DF]">
              <div className="w-10 h-10 rounded-xl bg-[#E8F0E9] flex items-center justify-center flex-shrink-0">
                <MapPin size={18} className="text-[#6B8C6E]" />
              </div>
              <div>
                <p className="font-semibold text-[#2C2420] text-sm">Set your service area</p>
                <p className="text-xs text-[#8C7B70] mt-0.5">Choose the barangays you're willing to travel to.</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-[#8C7B70] text-center mb-6">Takes about 2 minutes. You can update both anytime from your dashboard.</p>

          <Button
            size="lg"
            className="w-full"
            onClick={() => router.push('/therapist/rates?next=/therapist/service-area?next=/therapist/dashboard')}
          >
            Get started
          </Button>
        </div>
      </div>
    </div>
  )
}

function OnboardingShell({
  children, step, total, onBack,
}: {
  children: React.ReactNode
  step: number
  total: number
  onBack?: () => void
}) {
  return (
    <div className="min-h-screen bg-[#FBF6F0] px-4 py-10">
      <div className="max-w-md mx-auto">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i + 1 === step ? 'w-8 bg-[#C4714A]' : i + 1 < step ? 'w-4 bg-[#C4714A]/40' : 'w-4 bg-[#EDE5DF]'}`} />
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-[#EDE5DF] p-7">
          {children}
        </div>

        {onBack && (
          <button onClick={onBack} className="mt-4 w-full text-center text-sm text-[#8C7B70] hover:text-[#2C2420] transition-colors">
            ← Back
          </button>
        )}
      </div>
    </div>
  )
}

function EarningsRow({ color, width, label, sublabel, value, highlight }: {
  color: string; width: string; label: string; sublabel: string; value: string; highlight?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className={`text-xs font-semibold ${highlight ? 'text-[#2C2420]' : 'text-[#8C7B70]'}`}>{label}</span>
          <span className={`text-xs font-bold ${highlight ? 'text-[#C4714A]' : 'text-[#8C7B70]'}`}>{value}</span>
        </div>
        <div className="h-2 bg-[#EDE5DF] rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width }} />
        </div>
        <p className="text-[10px] text-[#C8BDB8] mt-0.5">{sublabel}</p>
      </div>
    </div>
  )
}
