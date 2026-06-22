'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function SetPasswordPage() {
  const router = useRouter()
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [ready,     setReady]     = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // The recovery session may already be set (event fired before this mounted).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    // Also listen in case the event fires after mount.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit() {
    setError(null)
    if (!password) { setError('Please enter a password.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
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
          <p className="text-sm text-[#8C7B70] mt-3">Therapist portal</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#EDE5DF] p-7">
          <h2 className="text-lg font-bold text-[#2C2420] mb-1">Set your password</h2>
          <p className="text-sm text-[#8C7B70] mb-6">
            Choose a password to access your therapist portal.
          </p>

          {!ready ? (
            <p className="text-sm text-[#8C7B70] text-center py-4">Verifying your invite link…</p>
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
