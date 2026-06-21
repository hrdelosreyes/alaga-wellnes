'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    if (!email) { setError('Please enter your email address.'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/account/reset-password`,
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#FBF6F0] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/">
            <img src="/logo-vertical.png" alt="Alaga Wellness" style={{ height: '80px', width: 'auto', margin: '0 auto' }} />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-[#EDE5DF] p-7">
          {sent ? (
            <div className="text-center">
              <p className="text-2xl mb-3">📧</p>
              <h2 className="text-lg font-bold text-[#2C2420] mb-2">Check your inbox</h2>
              <p className="text-sm text-[#8C7B70]">
                We sent a password reset link to <strong>{email}</strong>. It expires in 1 hour.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-[#2C2420] mb-1">Forgot password?</h2>
              <p className="text-sm text-[#8C7B70] mb-6">Enter your email and we'll send you a reset link.</p>

              <label className="block text-sm font-semibold text-[#2C2420] mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="you@example.com"
                className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors"
              />

              {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

              <Button size="lg" className="w-full mt-5" onClick={handleSubmit}>
                {loading ? 'Sending…' : 'Send reset link'}
              </Button>
            </>
          )}
        </div>

        <p className="text-center text-sm text-[#8C7B70] mt-6">
          <Link href="/account/login" className="hover:text-[#C4714A] transition-colors">← Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
