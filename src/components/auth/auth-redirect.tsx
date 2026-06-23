'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Pages that establish the recovery session themselves — AuthRedirect must not
// race them for the single-use PKCE code.
const SELF_HANDLED = ['/admin/reset-password', '/therapist/set-password', '/therapist/reset-password', '/account/reset-password']

export function AuthRedirect() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (SELF_HANDLED.some(p => pathname?.startsWith(p))) return

    const supabase = createClient()

    // Route a recovery/invite session to the correct set-password page based
    // on role. Admins/staff have a row in user_roles; everyone else is a therapist.
    async function routeByRole() {
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

    const code = new URL(window.location.href).searchParams.get('code')
    const hash = window.location.hash
    const isRecoveryHash = hash.includes('type=recovery') || hash.includes('type=invite')

    // Hash (implicit) flow: fires once the hash is processed into a session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') routeByRole()
    })

    async function init() {
      if (code) {
        // PKCE flow: Supabase appends ?code=… to the redirect (the homepage).
        // Exchange it for a session, then route by role.
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          try {
            await supabase.auth.exchangeCodeForSession(code)
          } catch (err) {
            console.error('Code exchange failed:', err)
          }
        }
        await routeByRole()
      } else if (isRecoveryHash) {
        await routeByRole()
      }
    }
    init()

    return () => subscription.unsubscribe()
  }, [router, pathname])

  return null
}
