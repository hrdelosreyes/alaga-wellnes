'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Star, Loader2, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { RATING_TAGS } from '@/lib/constants'
import { cn } from '@/lib/utils'

type BookingRow = {
  id: string
  service_id: string
  status: string
  therapist_id: string | null
  therapists: { name: string } | null
}

export default function RatePage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()

  const [booking,  setBooking]  = useState<BookingRow | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [stars,    setStars]    = useState(0)
  const [hovered,  setHovered]  = useState(0)
  const [tags,     setTags]     = useState<string[]>([])
  const [review,   setReview]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('bookings')
        .select('id, service_id, status, therapist_id, therapists(name)')
        .eq('id', id)
        .single()

      if (!data) { router.replace('/'); return }
      if (data.status !== 'completed') { router.replace(`/booking/${id}`); return }
      setBooking(data as BookingRow)
      setLoading(false)
    }
    load()
  }, [id, router])

  function toggleTag(tag: string) {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  async function submit() {
    if (stars === 0) { setError('Please select a star rating.'); return }
    setSubmitting(true)
    setError(null)

    const res = await fetch('/api/ratings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId:   id,
        therapistId: booking?.therapist_id,
        stars,
        tags,
        reviewText:  review.trim() || null,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong.')
      setSubmitting(false)
      return
    }

    setDone(true)
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#C4714A]" size={32} />
      </div>
    )
  }

  if (done) {
    return (
      <div className="container-alaga py-20 max-w-md text-center">
        <CheckCircle size={56} className="text-[#6B8C6E] mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-[#2C2420] mb-2">Thank you!</h1>
        <p className="text-[#8C7B70] mb-8">
          Your feedback helps us maintain the quality of every session.
        </p>
        <Button size="lg" className="w-full" onClick={() => router.push('/book')}>
          Book another session
        </Button>
      </div>
    )
  }

  const therapistName = booking?.therapists?.name ?? 'your therapist'

  return (
    <div className="container-alaga py-12 max-w-md">
      <h1 className="text-2xl font-bold text-[#2C2420] mb-1">How was your session?</h1>
      <p className="text-[#8C7B70] mb-8">
        Rate your experience with {therapistName}.
      </p>

      {/* Star picker */}
      <div className="bg-white rounded-2xl border border-[#EDE5DF] p-6 mb-5 text-center">
        <p className="text-sm font-semibold text-[#2C2420] mb-4">Overall rating</p>
        <div
          className="flex justify-center gap-3 mb-2"
          onMouseLeave={() => setHovered(0)}
        >
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setStars(n)}
              onMouseEnter={() => setHovered(n)}
              className="transition-transform hover:scale-110 active:scale-95"
            >
              <Star
                size={36}
                className={cn(
                  'transition-colors',
                  (hovered || stars) >= n
                    ? 'fill-[#C9A84C] text-[#C9A84C]'
                    : 'fill-[#EDE5DF] text-[#EDE5DF]',
                )}
              />
            </button>
          ))}
        </div>
        {stars > 0 && (
          <p className="text-sm font-semibold text-[#C4714A]">
            {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][stars]}
          </p>
        )}
      </div>

      {/* Tags */}
      {stars > 0 && (
        <div className="bg-white rounded-2xl border border-[#EDE5DF] p-6 mb-5">
          <p className="text-sm font-semibold text-[#2C2420] mb-3">
            What stood out? <span className="text-[#8C7B70] font-normal">(optional)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {RATING_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm border font-medium transition-all',
                  tags.includes(tag)
                    ? 'bg-[#C4714A] text-white border-[#C4714A]'
                    : 'border-[#EDE5DF] text-[#8C7B70] hover:border-[#C4714A]',
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Written review */}
      {stars > 0 && (
        <div className="bg-white rounded-2xl border border-[#EDE5DF] p-6 mb-6">
          <label className="block text-sm font-semibold text-[#2C2420] mb-2">
            Anything else to share? <span className="text-[#8C7B70] font-normal">(optional)</span>
          </label>
          <textarea
            value={review}
            onChange={e => setReview(e.target.value)}
            placeholder="Tell us about your experience…"
            rows={3}
            className="w-full border border-[#EDE5DF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C4714A] transition-colors resize-none"
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 mb-4">{error}</p>
      )}

      <Button
        size="lg"
        className="w-full"
        disabled={stars === 0}
        loading={submitting}
        onClick={submit}
      >
        Submit rating
      </Button>
    </div>
  )
}
