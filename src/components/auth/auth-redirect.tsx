'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function AuthRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Check hash directly — fires before onAuthStateChange in some cases
    const hash = window.location.hash
    if (hash.includes('type=recovery') || hash.includes('type=invite')) {
      router.push('/therapist/set-password')
      return
    }

    // Also listen via auth state change as fallback
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/therapist/set-password')
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  return null
}
