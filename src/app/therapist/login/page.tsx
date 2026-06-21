'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function TherapistLoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleLogin() {
    setError(null)
    if (!email || !password) { setError('Please enter your email and password.'); return }

    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    // Verify this account belongs to an approved therapist
    const { data: therapist } = await supabase
      .from('therapists')
      .select('id, application_status')
      .eq('email', data.user.email)
      .single()

    if (!therapist) {
      await supabase.auth.signOut()
      setError('No therapist account found for this email.')
      setLoading(false)
      return
    }

    if (therapist.application_status !== 'approved') {
      await supabase.auth.signOut()
      setError('Your application is still under review.')
      setLoading(false)
      return
    }

    router.push('/therapist/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#FBF6F0] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <a href="/">
            <img src="/logo-vertical.png" alt="Alaga Wellness" style={{ height: '80px', width: 'auto', margin: '0 auto' }} />
          </a>
          <p className="text-sm text-[#8C7B70] mt-3">Therapist portal</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#EDE5DF] p-7">
          <h2 className="text-lg font-bold text-[#2C2420] mb-1">Welcome back</h2>
          <p className="text-sm text-[#8C7B70] mb-6">Sign in to your therapist account.</p>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#2C2420] mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="you@example.com"
                className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#2C2420] mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

          <Button size="lg" className="w-full mt-5" onClick={handleLogin}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>

          <p className="text-center text-sm mt-4">
            <a href="/therapist/forgot-password" className="text-[#8C7B70] hover:text-[#C4714A] transition-colors">
              Forgot password?
            </a>
          </p>
        </div>

        <p className="text-center text-xs text-[#8C7B70] mt-6">
          Not yet a therapist?{' '}
          <a href="/therapist/register" className="text-[#C4714A] hover:underline">Apply here</a>
        </p>
      </div>
    </div>
  )
}
