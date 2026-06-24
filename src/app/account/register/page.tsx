'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'

function RegisterPage() {
  const router     = useRouter()
  const params     = useSearchParams()
  const redirectTo = params.get('next') ?? '/account'

  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [phone,    setPhone]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [errors,   setErrors]   = useState<Record<string, string>>({})
  const [error,    setError]    = useState<string | null>(null)
  const [sent,     setSent]     = useState(false)

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim())  e.name  = 'Name is required.'
    if (!email.trim()) e.email = 'Email is required.'
    if (!phone.trim()) e.phone = 'Mobile number is required.'
    else if (!/^(09|\+639)\d{9}$/.test(phone.replace(/\s/g, '')))
      e.phone = 'Enter a valid PH mobile number (e.g. 09171234567).'
    if (password.length < 8) e.password = 'Password must be at least 8 characters.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setError(null)

    const supabase = createClient()

    // Create auth user. The customer profile is created automatically by a DB
    // trigger from this metadata (works even when there's no session yet because
    // email confirmation is required).
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name:        name.trim(),
          phone:       phone.replace(/\s/g, '').replace(/^0/, '+63'),
          is_customer: true,
        },
      },
    })
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.session) {
      // Email confirmation disabled — user is signed in immediately.
      router.push(redirectTo)
      router.refresh()
    } else {
      // Email confirmation required — they must confirm before signing in.
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FBF6F0] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col leading-none items-center">
            <span className="text-2xl font-bold text-[#2C2420] tracking-tight">Alaga</span>
            <span className="text-[10px] font-medium text-[#C4714A] tracking-widest uppercase">Wellness</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-[#EDE5DF] p-8">
          {sent ? (
            <div className="text-center">
              <p className="text-3xl mb-3">📧</p>
              <h1 className="text-xl font-bold text-[#2C2420] mb-2">Check your email</h1>
              <p className="text-sm text-[#8C7B70] mb-6">
                We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in.
              </p>
              <Link
                href={`/account/login${redirectTo !== '/account' ? `?next=${encodeURIComponent(redirectTo)}` : ''}`}
                className="text-[#C4714A] font-semibold hover:underline text-sm"
              >
                Go to sign in →
              </Link>
            </div>
          ) : (
          <>
          <h1 className="text-xl font-bold text-[#2C2420] mb-1">Create account</h1>
          <p className="text-sm text-[#8C7B70] mb-6">Save your details and track your bookings.</p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#2C2420] mb-2">Full name</label>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
                placeholder="e.g. Maria Santos"
                className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#2C2420] mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })) }}
                placeholder="you@example.com"
                className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#2C2420] mb-2">Mobile number</label>
              <input
                type="tel"
                value={phone}
                onChange={e => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: '' })) }}
                placeholder="e.g. 09171234567"
                className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors"
              />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#2C2420] mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })) }}
                  placeholder="At least 8 characters"
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
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
            )}

            <Button size="lg" className="w-full mt-2" loading={loading}>
              Create account
            </Button>
          </form>

          <p className="text-center text-sm text-[#8C7B70] mt-6">
            Already have an account?{' '}
            <Link
              href={`/account/login${redirectTo !== '/account' ? `?next=${encodeURIComponent(redirectTo)}` : ''}`}
              className="text-[#C4714A] font-semibold hover:underline"
            >
              Sign in
            </Link>
          </p>
          </>
          )}
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

export default function RegisterPageWrapper() { return <Suspense><RegisterPage /></Suspense> }
