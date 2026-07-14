'use client'

import { useEffect, useRef, useState } from 'react'
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
  const [linkError, setLinkError] = useState<string | null>(null)
  const readyRef = useRef(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    function markReady() {
      readyRef.current = true
      if (!cancelled) setReady(true)
    }

    async function establishSession() {
      // Invite/recovery links sent via the admin API (service-role, triggered
      // server-side) come back as an implicit-flow hash (#access_token=...),
      // not a PKCE ?code= — there's no client that generated a PKCE verifier.
      // Our browser client defaults to PKCE and won't auto-process that hash,
      // so parse it and establish the session manually.
      const rawHash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
      const params = new URLSearchParams(rawHash)
      const accessToken  = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const hashError     = params.get('error_description') || params.get('error')

      if (hashError) {
        if (!cancelled) setLinkError(decodeURIComponent(hashError.replace(/\+/g, ' ')))
        return
      }

      if (accessToken && refreshToken) {
        const { error: setErr } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        // setSession only validates the token's local shape, not that it's a
        // genuine, unexpired session — confirm with a server round-trip.
        if (!setErr) {
          const { data: { user }, error: getErr } = await supabase.auth.getUser()
          if (user && !getErr) { markReady(); return }
        }
      }

      // Fall back to a session that may already exist (e.g. a PKCE ?code= was
      // already exchanged elsewhere on this page load).
      const { data: { user } } = await supabase.auth.getUser()
      if (user) markReady()
    }

    establishSession()

    // Also listen in case the event fires after mount.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        markReady()
      }
    })

    // Don't spin forever if the link is invalid/expired and nothing above fires.
    const timeout = setTimeout(() => {
      if (!cancelled && !readyRef.current) {
        setLinkError(prev => prev ?? 'This link is invalid or has expired. Please ask the admin to resend your invite.')
      }
    }, 8000)

    return () => { cancelled = true; subscription.unsubscribe(); clearTimeout(timeout) }
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

          {linkError ? (
            <p className="text-sm text-red-600 text-center py-4">{linkError}</p>
          ) : !ready ? (
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
