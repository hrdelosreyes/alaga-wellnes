'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'

export default function AdminResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    const supabase = createClient()

    // TEMP DEBUG: which user are we actually updating?
    const { data: before } = await supabase.auth.getUser()
    const { data: upd, error } = await supabase.auth.updateUser({ password })

    const diag = {
      sessionUser: before?.user?.email ?? null,
      sessionUserId: before?.user?.id ?? null,
      updatedUser: upd?.user?.email ?? null,
      updateError: error ? `${error.status ?? ''} ${error.message}` : null,
    }
    setError('DEBUG: ' + JSON.stringify(diag))
    setLoading(false)
    return
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
          {done ? (
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
