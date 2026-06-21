'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ProgressBar } from '@/components/booking/progress-bar'
import { Button } from '@/components/ui/button'
import { UserCircle, LogIn } from 'lucide-react'

export default function BookSignInPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // If already signed in, skip this step
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace('/book')
      else setChecking(false)
    })
  }, [router])

  if (checking) return null

  return (
    <>
      <ProgressBar current={-1} />

      <div className="container-alaga py-12 max-w-md">
        <h1 className="text-2xl font-bold text-[#2C2420] mb-2">Before we start</h1>
        <p className="text-[#8C7B70] mb-8">Sign in to save your details and track your bookings — or continue as a guest.</p>

        <div className="flex flex-col gap-4">
          {/* Sign in */}
          <Link href="/account/login?next=/book">
            <div className="w-full text-left rounded-2xl border-2 border-[#EDE5DF] bg-white hover:border-[#C4714A] p-5 transition-all flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#F2D9CC] flex items-center justify-center flex-shrink-0">
                <LogIn size={18} className="text-[#C4714A]" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-[#2C2420]">Sign in</p>
                <p className="text-sm text-[#8C7B70] mt-0.5">Your details will be pre-filled automatically.</p>
              </div>
            </div>
          </Link>

          {/* Create account */}
          <Link href="/account/register?next=/book">
            <div className="w-full text-left rounded-2xl border-2 border-[#EDE5DF] bg-white hover:border-[#C4714A] p-5 transition-all flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#E8F0E9] flex items-center justify-center flex-shrink-0">
                <UserCircle size={18} className="text-[#6B8C6E]" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-[#2C2420]">Create account</p>
                <p className="text-sm text-[#8C7B70] mt-0.5">Save your details for next time. Takes 30 seconds.</p>
              </div>
            </div>
          </Link>

          {/* Guest */}
          <div className="relative flex items-center gap-3 my-1">
            <div className="flex-1 border-t border-[#EDE5DF]" />
            <span className="text-xs text-[#C8BDB8] font-medium">or</span>
            <div className="flex-1 border-t border-[#EDE5DF]" />
          </div>

          <Button
            size="lg"
            variant="ghost"
            className="w-full border border-[#EDE5DF]"
            onClick={() => router.push('/book')}
          >
            Continue as guest
          </Button>
        </div>
      </div>
    </>
  )
}
