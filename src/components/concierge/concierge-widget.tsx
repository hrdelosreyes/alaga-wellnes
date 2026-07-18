'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react'
import { useGeoCity } from '@/components/geo/city-context'
import { cn } from '@/lib/utils'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const STORAGE_KEY = 'alaga-concierge-chat'
const HIDDEN_PREFIXES = ['/admin', '/therapist', '/staff']

const STARTERS = [
  'How much is a home massage in my city?',
  'Are your therapists vetted?',
  'How does booking work?',
]

const GREETING =
  'Hi! I’m the Alaga assistant. Ask me anything about our services, prices in your city, or how home-service booking works. \u{1F33F}'

export function ConciergeWidget() {
  const pathname = usePathname()
  const { city } = useGeoCity()

  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [input,    setInput]    = useState('')
  const [sending,  setSending]  = useState(false)
  const [failed,   setFailed]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      if (messages.length) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch { /* storage full/unavailable */ }
  }, [messages])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending, open])

  if (HIDDEN_PREFIXES.some(p => pathname.startsWith(p))) return null

  async function send(text: string) {
    const content = text.trim()
    if (!content || sending) return

    setFailed(false)
    setInput('')
    const next: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(next)
    setSending(true)

    try {
      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, cityName: city?.name ?? null }),
      })
      const data = await res.json()
      if (!res.ok || !data.reply) throw new Error(data.error ?? 'No reply')
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setFailed(true)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
        className="fixed bottom-4 right-4 z-40 w-14 h-14 rounded-full bg-[#C4714A] text-white shadow-lg flex items-center justify-center hover:bg-[#A05938] transition-colors"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm h-[min(30rem,calc(100dvh-7rem))] bg-white rounded-2xl border border-[#EDE5DF] shadow-2xl flex flex-col overflow-hidden">

          {/* Header */}
          <div className="bg-[#2C2420] text-white px-4 py-3 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#C4714A] flex items-center justify-center flex-shrink-0">
              <Sparkles size={15} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight">Alaga Assistant</p>
              <p className="text-[11px] text-[#C8A88A] leading-tight">Services · prices · booking help</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5 bg-[#FBF6F0]">
            <Bubble role="assistant">{GREETING}</Bubble>

            {messages.length === 0 && (
              <div className="flex flex-col items-start gap-1.5 mt-1">
                {STARTERS.map(q => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="text-xs text-left text-[#C4714A] bg-white border border-[#EDE5DF] rounded-full px-3 py-1.5 hover:border-[#C4714A] transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <Bubble key={i} role={m.role}>{m.content}</Bubble>
            ))}

            {sending && (
              <div className="self-start bg-white border border-[#EDE5DF] rounded-2xl rounded-bl-sm px-4 py-2.5">
                <Loader2 size={14} className="animate-spin text-[#C4714A]" />
              </div>
            )}
            {failed && (
              <p className="text-[11px] text-red-500 self-start px-1">
                Couldn&rsquo;t reach the assistant — please try again.
              </p>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Book CTA */}
          <div className="px-3 pt-2 bg-white border-t border-[#EDE5DF]">
            <Link
              href="/book"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-semibold text-[#C4714A] hover:text-[#A05938] transition-colors"
            >
              Ready? Book a session →
            </Link>
          </div>

          {/* Input */}
          <div className="px-3 py-2.5 bg-white flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send(input) }}
              placeholder="Ask a question…"
              maxLength={1000}
              className="flex-1 border border-[#EDE5DF] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C4714A] transition-colors"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || sending}
              aria-label="Send"
              className="w-9 h-9 rounded-xl bg-[#C4714A] text-white flex items-center justify-center flex-shrink-0 hover:bg-[#A05938] disabled:opacity-40 transition-colors"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function Bubble({ role, children }: { role: 'user' | 'assistant'; children: React.ReactNode }) {
  const mine = role === 'user'
  return (
    <div
      className={cn(
        'max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
        mine
          ? 'self-end bg-[#C4714A] text-white rounded-br-sm'
          : 'self-start bg-white border border-[#EDE5DF] text-[#2C2420] rounded-bl-sm',
      )}
    >
      {children}
    </div>
  )
}
