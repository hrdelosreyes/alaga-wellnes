'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function AuthRedirect() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // Route a recovery/invite session to the correct set-password page based
    // on the user's role. Admins/staff have a row in user_roles; everyone else
    // is treated as a therapist.
    async function routeRecovery() {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()

      if (roleRow?.role === 'admin' || roleRow?.role === 'staff') {
        router.push('/admin/reset-password')
      } else {
        router.push('/therapist/set-password')
      }
    }

    const hash = window.location.hash
    const isRecovery = hash.includes('type=recovery') || hash.includes('type=invite')

    // Fires once the hash is processed into a session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') routeRecovery()
    })

    // Fallback: if a recovery hash is present, ensure the session is established
    // (this triggers hash processing) then route by role.
    if (isRecovery) routeRecovery()

    return () => subscription.unsubscribe()
  }, [router])

  return null
}
