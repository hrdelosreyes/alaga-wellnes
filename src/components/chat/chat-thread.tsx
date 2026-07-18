'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Loader2, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Message = {
  id: string
  booking_id: string
  sender: 'customer' | 'therapist'
  body: string
  created_at: string
}

type Props = {
  bookingId: string
  senderRole: 'customer' | 'therapist'
  readonly?: boolean
  aiSuggest?: boolean  // show AI-suggested replies (therapist side)
}

function formatMsgTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-PH', {
    hour:   'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function ChatThread({ bookingId, senderRole, readonly = false, aiSuggest = false }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [sending,  setSending]  = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [suggestions, setSuggestions] = useState<string[] | null>(null)
  const [suggesting,  setSuggesting]  = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const supabase = createClient()

    // Merge authoritative server messages with any still-pending optimistic
    // ones (matched by sender+body so we don't drop or duplicate them).
    function mergeServer(prev: Message[], server: Message[]): Message[] {
      const serverKeys = new Set(server.map(m => `${m.sender}|${m.body}`))
      const pending = prev.filter(m => m.id.startsWith('opt-') && !serverKeys.has(`${m.sender}|${m.body}`))
      return [...server, ...pending].sort((a, b) => a.created_at.localeCompare(b.created_at))
    }

    async function refetch(first = false) {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })
      const server = (data ?? []) as Message[]
      setMessages(prev => (first ? server : mergeServer(prev, server)))
      if (first) setLoading(false)
    }

    refetch(true)

    // Realtime (instant when the table is in the realtime publication).
    const channel = supabase
      .channel(`chat-${bookingId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${bookingId}` },
        (payload) => {
          const incoming = payload.new as Message
          setMessages(prev => {
            if (prev.find(m => m.id === incoming.id)) return prev
            // Replace a matching optimistic copy (our own just-sent message)
            const withoutOpt = prev.filter(m => !(m.id.startsWith('opt-') && m.sender === incoming.sender && m.body === incoming.body))
            return [...withoutOpt, incoming]
          })
        }
      )
      .subscribe()

    // Polling fallback — guarantees updates even if realtime isn't enabled.
    const interval = setInterval(() => refetch(false), 4000)

    return () => { supabase.removeChannel(channel); clearInterval(interval) }
  }, [bookingId])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const body = input.trim()
    if (!body || sending) return

    setSending(true)
    setInput('')

    // Optimistic update
    const optimistic: Message = {
      id:         `opt-${Date.now()}`,
      booking_id: bookingId,
      sender:     senderRole,
      body,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    const supabase = createClient()
    const { error } = await supabase
      .from('messages')
      .insert({ booking_id: bookingId, sender: senderRole, body })

    if (error) {
      // Roll back optimistic message
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setInput(body)
      console.error('Message send error:', error)
    } else {
      setSuggestions(null)
      // Fire-and-forget safety screening — never blocks the chat
      fetch('/api/moderate/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, sender: senderRole, body }),
      }).catch(() => {})
    }

    setSending(false)
    inputRef.current?.focus()
  }

  async function fetchSuggestions() {
    if (suggesting) return
    setSuggesting(true)
    try {
      const res = await fetch('/api/therapist/suggest-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      const data = await res.json()
      if (res.ok && Array.isArray(data.suggestions) && data.suggestions.length) {
        setSuggestions(data.suggestions)
      }
    } catch {
      // ignore — suggestions are best-effort
    } finally {
      setSuggesting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const otherLabel = senderRole === 'customer' ? 'Therapist' : 'Client'

  return (
    <div className="flex flex-col h-full">

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-[#6E5F55]" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-[#6E5F55] py-8">
            No messages yet. Say hi!
          </p>
        ) : (
          messages.map(msg => {
            const isMine = msg.sender === senderRole
            return (
              <div
                key={msg.id}
                className={cn('flex flex-col max-w-[80%]', isMine ? 'self-end items-end' : 'self-start items-start')}
              >
                {!isMine && (
                  <span className="text-[10px] text-[#6E5F55] mb-1 px-1">{otherLabel}</span>
                )}
                <div className={cn(
                  'px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                  isMine
                    ? 'bg-[#C4714A] text-white rounded-br-sm'
                    : 'bg-white border border-[#EDE5DF] text-[#2C2420] rounded-bl-sm',
                )}>
                  {msg.body}
                </div>
                <span className="text-[10px] text-[#C8BDB8] mt-1 px-1">
                  {formatMsgTime(msg.created_at)}
                </span>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {readonly ? (
        <div className="px-4 py-3 border-t border-[#EDE5DF] bg-[#FAFAFA]">
          <p className="text-xs text-center text-[#6E5F55]">Chat is closed — session completed.</p>
        </div>
      ) : (
        <>
          {aiSuggest && suggestions && (
            <div className="px-4 pt-2.5 pb-1 border-t border-[#EDE5DF] bg-white flex flex-wrap items-center gap-1.5">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(s); setSuggestions(null); inputRef.current?.focus() }}
                  className="text-xs text-left text-[#5C4B45] bg-[#FBF6F0] border border-[#EDE5DF] rounded-full px-3 py-1.5 hover:border-[#C4714A] hover:text-[#C4714A] transition-colors"
                >
                  {s}
                </button>
              ))}
              <button
                onClick={() => setSuggestions(null)}
                aria-label="Dismiss suggestions"
                className="p-1 text-[#C8BDB8] hover:text-[#6E5F55] transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          )}
        <div className={cn('px-4 py-3 bg-white flex items-end gap-2', (!aiSuggest || !suggestions) && 'border-t border-[#EDE5DF]')}>
          {aiSuggest && (
            <button
              onClick={fetchSuggestions}
              disabled={suggesting}
              title="Suggest replies"
              aria-label="Suggest replies"
              className="w-9 h-9 rounded-xl border border-[#EDE5DF] text-[#C4714A] flex items-center justify-center flex-shrink-0 hover:border-[#C4714A] disabled:opacity-40 transition-colors"
            >
              {suggesting
                ? <Loader2 size={15} className="animate-spin" />
                : <Sparkles size={15} />
              }
            </button>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 border border-[#EDE5DF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C4714A] transition-colors resize-none max-h-28 leading-relaxed"
            style={{ overflowY: input.split('\n').length > 3 ? 'auto' : 'hidden' }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="w-9 h-9 rounded-xl bg-[#C4714A] text-white flex items-center justify-center flex-shrink-0 hover:bg-[#A05938] disabled:opacity-40 transition-colors"
          >
            {sending
              ? <Loader2 size={15} className="animate-spin" />
              : <Send size={15} />
            }
          </button>
        </div>
        </>
      )}
    </div>
  )
}
