'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function WaitlistForm({ source = 'homepage' }: { source?: string }) {
  const [email,     setEmail]     = useState('')
  const [city,      setCity]      = useState('')
  const [loading,   setLoading]   = useState(false)
  const [state,     setState]     = useState<'idle' | 'success' | 'already' | 'error'>('idle')
  const [errorMsg,  setErrorMsg]  = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setErrorMsg('Please enter your email.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErrorMsg('Enter a valid email address.'); return }

    setLoading(true)
    setErrorMsg('')

    try {
      const res  = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), city: city.trim() || null, source }),
      })
      const data = await res.json()

      if (data.alreadyJoined) setState('already')
      else if (data.ok)       setState('success')
      else                    { setErrorMsg(data.error ?? 'Something went wrong.'); setLoading(false) }
    } catch {
      setErrorMsg('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (state === 'success') {
    return (
      <div className="flex items-center gap-3 bg-[#E8F0E9] border border-[#6B8C6E]/30 rounded-2xl px-5 py-4">
        <CheckCircle size={20} className="text-[#6B8C6E] flex-shrink-0" />
        <div>
          <p className="font-semibold text-[#2C2420] text-sm">You're on the list!</p>
          <p className="text-xs text-[#8C7B70] mt-0.5">We'll notify you as soon as Alaga launches in your area.</p>
        </div>
      </div>
    )
  }

  if (state === 'already') {
    return (
      <div className="flex items-center gap-3 bg-[#FBF6F0] border border-[#EDE5DF] rounded-2xl px-5 py-4">
        <CheckCircle size={20} className="text-[#C9A84C] flex-shrink-0" />
        <div>
          <p className="font-semibold text-[#2C2420] text-sm">You're already signed up!</p>
          <p className="text-xs text-[#8C7B70] mt-0.5">We'll be in touch when we launch in your area.</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setErrorMsg('') }}
          placeholder="your@email.com"
          className={cn(
            'flex-1 px-4 py-3 rounded-xl border text-sm focus:outline-none focus:border-[#C4714A] transition-colors bg-white',
            errorMsg ? 'border-red-400' : 'border-[#EDE5DF]',
          )}
        />
        <input
          type="text"
          value={city}
          onChange={e => setCity(e.target.value)}
          placeholder="Your city (optional)"
          className="flex-1 sm:max-w-[160px] px-4 py-3 rounded-xl border border-[#EDE5DF] text-sm focus:outline-none focus:border-[#C4714A] transition-colors bg-white"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-[#C4714A] hover:bg-[#b56340] text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? 'Joining…' : <><span>Notify me</span><ArrowRight size={15} /></>}
        </button>
      </div>
      {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
      <p className="text-xs text-[#8C7B70]">No spam — just a heads-up when we launch in your city.</p>
    </form>
  )
}
