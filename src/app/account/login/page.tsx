'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router      = useRouter()
  const params      = useSearchParams()
  const redirectTo  = params.get('next') ?? '/account'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Incorrect email or password.')
      setLoading(false)
      return
    }
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#FBF6F0] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <img src="/logo-vertical.png" alt="Alaga Wellness" style={{ height: '80px', width: 'auto', margin: '0 auto' }} />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-[#EDE5DF] p-8">
          <h1 className="text-xl font-bold text-[#2C2420] mb-1">Sign in</h1>
          <p className="text-sm text-[#8C7B70] mb-6">Welcome back — your bookings are waiting.</p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#2C2420] mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#2C2420] mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:border-[#C4714A] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7B70] hover:text-[#2C2420]"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
            )}

            <Button size="lg" className="w-full mt-2" loading={loading}>
              Sign in
            </Button>
          </form>

          <p className="text-center text-sm mt-4">
            <Link href="/account/forgot-password" className="text-[#8C7B70] hover:text-[#C4714A] transition-colors">
              Forgot password?
            </Link>
          </p>

          <p className="text-center text-sm text-[#8C7B70] mt-4">
            No account?{' '}
            <Link
              href={`/account/register${redirectTo !== '/account' ? `?next=${encodeURIComponent(redirectTo)}` : ''}`}
              className="text-[#C4714A] font-semibold hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>

        <p className="text-center text-sm text-[#8C7B70] mt-6">
          <Link href={redirectTo.startsWith('/book') ? redirectTo : '/book'} className="hover:underline">
            Continue as guest instead
          </Link>
        </p>
      </div>
    </div>
  )
}
