'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function AdminResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [ready,    setReady]    = useState(false)   // recovery session established?
  const [linkError, setLinkError] = useState<string | null>(null)

  // Establish the recovery session. With the implicit (hash) flow the session
  // is parsed from the URL hash asynchronously, so we wait for it before
  // declaring the link invalid. Also handles a legacy PKCE ?code=… fallback.
  useEffect(() => {
    const supabase = createClient()
    let settled = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        settled = true
        setReady(true)
      }
    })

    async function establish() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { settled = true; setReady(true); return }

      // Legacy PKCE fallback
      const code = new URL(window.location.href).searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) { settled = true; setReady(true); return }
        console.error('Code exchange failed:', error)
      }

      // Implicit flow: give detectSessionInUrl time to parse the hash + fire the
      // auth event before deciding the link is bad.
      setTimeout(async () => {
        if (settled) return
        const { data: { session: s2 } } = await supabase.auth.getSession()
        if (s2) setReady(true)
        else setLinkError('This reset link is invalid or has expired, or it was opened in a different browser than the one you requested it from. Please request a new link and open it in the same browser.')
      }, 2500)
    }

    establish()
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit() {
    setError(null)
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
    setTimeout(() => router.push('/admin/login'), 3000)
  }

  return (
    <div className="min-h-screen bg-[#FBF6F0] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <a href="/">
            <img src="/logo-vertical.png" alt="Alaga Wellness" style={{ height: '80px', width: 'auto', margin: '0 auto' }} />
          </a>
          <p className="text-sm text-[#8C7B70] mt-3">Admin portal</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#EDE5DF] p-7">
          {linkError ? (
            <div className="text-center">
              <p className="text-2xl mb-3">⚠️</p>
              <h2 className="text-lg font-bold text-[#2C2420] mb-2">Link problem</h2>
              <p className="text-sm text-[#8C7B70] mb-5">{linkError}</p>
              <Button size="lg" className="w-full" onClick={() => router.push('/admin/forgot-password')}>
                Request a new link
              </Button>
            </div>
          ) : !ready ? (
            <div className="text-center py-6">
              <Loader2 className="animate-spin text-[#C4714A] mx-auto mb-3" size={28} />
              <p className="text-sm text-[#8C7B70]">Verifying your reset link…</p>
            </div>
          ) : done ? (
            <div className="text-center">
              <p className="text-2xl mb-3">✅</p>
              <h2 className="text-lg font-bold text-[#2C2420] mb-2">Password updated</h2>
              <p className="text-sm text-[#8C7B70]">Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-[#2C2420] mb-1">Set new password</h2>
              <p className="text-sm text-[#8C7B70] mb-6">Choose a strong password for your admin account.</p>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#2C2420] mb-2">New password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
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

                <div>
                  <label className="block text-sm font-semibold text-[#2C2420] mb-2">Confirm password</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder="••••••••"
                    className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

              <Button size="lg" className="w-full mt-5" onClick={handleSubmit}>
                {loading ? 'Saving…' : 'Update password'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
