'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Loader2 } from 'lucide-react'
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
}

function formatMsgTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-PH', {
    hour:   'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function ChatThread({ bookingId, senderRole, readonly = false }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [sending,  setSending]  = useState(false)
  const [loading,  setLoading]  = useState(true)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const supabase = createClient()

    // Initial load
    supabase
      .from('messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages((data ?? []) as Message[])
        setLoading(false)
      })

    // Real-time subscription
    const channel = supabase
      .channel(`chat-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'messages',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          setMessages(prev => {
            // Avoid duplicates from optimistic updates
            if (prev.find(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new as Message]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
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
    }

    setSending(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const otherRole = senderRole === 'customer' ? 'therapist' : 'customer'
  const otherLabel = senderRole === 'customer' ? 'Therapist' : 'Client'

  return (
    <div className="flex flex-col h-full">

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-[#8C7B70]" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-[#8C7B70] py-8">
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
                  <span className="text-[10px] text-[#8C7B70] mb-1 px-1">{otherLabel}</span>
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
          <p className="text-xs text-center text-[#8C7B70]">Chat is closed — session completed.</p>
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-[#EDE5DF] bg-white flex items-end gap-2">
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
      )}
    </div>
  )
}
