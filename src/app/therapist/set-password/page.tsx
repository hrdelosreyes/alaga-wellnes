'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/db/client'
import { Button } from '@/components/ui/button'

export default function SetPasswordPage() {
  const router = useRouter()
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [ready,     setReady]     = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    // The invite email links to /auth/callback, which verifies the one-time
    // token, signs the therapist in and redirects here. If the link was bad,
    // the callback appends ?error_description=… instead.
    const linkErr = new URLSearchParams(window.location.search).get('error_description')

    async function check() {
      if (linkErr) {
        setLinkError(`${linkErr}. Please ask the admin to resend your invite.`)
        return
      }
      const { data: { user } } = await createClient().auth.getUser()
      if (cancelled) return
      if (user) setReady(true)
      else setLinkError('This link is invalid or has expired. Please ask the admin to resend your invite.')
    }
    check()

    return () => { cancelled = true }
  }, [])

  async function handleSubmit() {
    setError(null)
    if (!password) { setError('Please enter a password.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    const db = createClient()
    const { error } = await db.auth.updateUser({ password })
    if (error) {
      setError(error.message)
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
          <p className="text-sm text-[#6E5F55] mt-3">Therapist portal</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#EDE5DF] p-7">
          <h2 className="text-lg font-bold text-[#2C2420] mb-1">Set your password</h2>
          <p className="text-sm text-[#6E5F55] mb-6">
            Choose a password to access your therapist portal.
          </p>

          {linkError ? (
            <p className="text-sm text-red-600 text-center py-4">{linkError}</p>
          ) : !ready ? (
            <p className="text-sm text-[#6E5F55] text-center py-4">Verifying your invite link…</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#2C2420] mb-2">New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#2C2420] mb-2">Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="Repeat your password"
                  className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button size="lg" className="w-full mt-1" loading={loading} onClick={handleSubmit}>
                Set password & continue
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
