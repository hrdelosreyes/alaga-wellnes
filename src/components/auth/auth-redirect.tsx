'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function AuthRedirect() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const hash = window.location.hash
    const isRecovery = hash.includes('type=recovery') || hash.includes('type=invite')

    // Listen for the recovery event — fires once the hash is processed into a session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/therapist/set-password')
      }
    })

    // Fallback: if the hash is present, ensure the session is established
    // (this triggers hash processing) then navigate.
    if (isRecovery) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) router.push('/therapist/set-password')
      })
    }

    return () => subscription.unsubscribe()
  }, [router])

  return null
}
