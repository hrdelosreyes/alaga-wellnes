'use client'

// ============================================================
//  Browser data client (replaces the Supabase browser client)
// ============================================================
// Same call shapes as before — createClient().from(...), .auth.*, .storage.* —
// but everything goes through this app's own API routes:
//   queries  → POST /api/db        (runs under the user's RLS role on Neon)
//   auth     → /api/auth/*         (httpOnly session cookie)
//   storage  → Vercel Blob client uploads + /api/storage/sign

import { upload as blobUpload } from '@vercel/blob/client'
import { fromFactory, makeError, type DbResponse, type QueryDescriptor } from './query-builder'

/* eslint-disable @typescript-eslint/no-explicit-any */

export type AuthUser = {
  id: string
  email: string | null
  phone: string | null
  user_metadata: Record<string, any>
  app_metadata: Record<string, any>
  created_at: string
  [k: string]: any
}
export type Session = { user: AuthUser; access_token: string }
export type AuthEvent = 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT' | 'USER_UPDATED' | 'PASSWORD_RECOVERY' | 'TOKEN_REFRESHED'
type AuthErr = { message: string; status?: number; code?: string; name: string }

async function runQuery(q: QueryDescriptor): Promise<DbResponse> {
  try {
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(q),
      credentials: 'same-origin',
    })
    return await res.json()
  } catch (e) {
    return { data: null, error: makeError(e instanceof Error ? e.message : 'Network error', 'FETCH_ERROR'), count: null, status: 0, statusText: 'Error' }
  }
}

async function authCall<T = any>(action: string, body?: unknown): Promise<{ data: T | null; error: AuthErr | null }> {
  try {
    const res = await fetch(`/api/auth/${action}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
      cache: 'no-store',
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return { data: null, error: { name: 'AuthApiError', message: json.error ?? 'Request failed', status: res.status, code: json.code } }
    return { data: json as T, error: null }
  } catch (e) {
    return { data: null, error: { name: 'AuthRetryableFetchError', message: e instanceof Error ? e.message : 'Network error' } }
  }
}

// ── Auth state events (per tab) ─────────────────────────────

type Listener = (event: AuthEvent, session: Session | null) => void
const listeners = new Set<Listener>()
const toSession = (user: AuthUser | null): Session | null => (user ? { user, access_token: '' } : null)
function emit(event: AuthEvent, user: AuthUser | null) {
  const s = toSession(user)
  listeners.forEach(l => { try { l(event, s) } catch (e) { console.error(e) } })
}

let inflightUser: Promise<AuthUser | null> | null = null
function fetchUser(): Promise<AuthUser | null> {
  // De-duplicate the burst of getUser() calls that happen on page load.
  if (!inflightUser) {
    inflightUser = authCall<{ user: AuthUser | null }>('user')
      .then(r => r.data?.user ?? null)
      .finally(() => setTimeout(() => { inflightUser = null }, 500))
  }
  return inflightUser
}

const auth = {
  async getUser() {
    const user = await fetchUser()
    return user
      ? { data: { user }, error: null }
      : { data: { user: null }, error: { name: 'AuthSessionMissingError', message: 'Auth session missing!', status: 401 } as AuthErr }
  },

  async getSession() {
    const user = await fetchUser()
    return { data: { session: toSession(user) }, error: null }
  },

  async signInWithPassword(creds: { email: string; password: string }): Promise<
    | { data: { user: AuthUser; session: Session }; error: null }
    | { data: { user: null; session: null }; error: AuthErr }
  > {
    const { data, error } = await authCall<{ user: AuthUser }>('signin', creds)
    if (error || !data) return { data: { user: null, session: null }, error: error ?? { name: 'AuthApiError', message: 'Sign-in failed' } }
    inflightUser = null
    emit('SIGNED_IN', data.user)
    return { data: { user: data.user, session: toSession(data.user)! }, error: null }
  },

  async signUp(params: { email: string; password: string; options?: { data?: Record<string, unknown>; emailRedirectTo?: string } }) {
    const { data, error } = await authCall<{ user: AuthUser; session: boolean }>('signup', {
      email: params.email,
      password: params.password,
      data: params.options?.data,
      redirectTo: params.options?.emailRedirectTo,
    })
    if (error || !data) return { data: { user: null, session: null }, error }
    if (data.session) { inflightUser = null; emit('SIGNED_IN', data.user) }
    return { data: { user: data.user, session: data.session ? toSession(data.user) : null }, error: null }
  },

  async signOut() {
    await authCall('signout', {})
    inflightUser = null
    emit('SIGNED_OUT', null)
    return { error: null }
  },

  async resetPasswordForEmail(email: string, opts: { redirectTo?: string } = {}) {
    const { error } = await authCall('recover', { email, redirectTo: opts.redirectTo })
    return { data: {}, error }
  },

  async updateUser(attrs: { password?: string; data?: Record<string, unknown> }) {
    const { data, error } = await authCall<{ user: AuthUser }>('update', attrs)
    if (error || !data) return { data: { user: null }, error }
    inflightUser = null
    emit('USER_UPDATED', data.user)
    return { data: { user: data.user }, error: null }
  },

  onAuthStateChange(cb: Listener) {
    listeners.add(cb)
    fetchUser().then(u => { if (listeners.has(cb)) cb('INITIAL_SESSION', toSession(u)) })
    return { data: { subscription: { unsubscribe: () => { listeners.delete(cb) } } } }
  },
}

// ── Storage ─────────────────────────────────────────────────

function storageBucket(bucket: string) {
  return {
    async upload(path: string, file: File | Blob, opts: { contentType?: string } = {}) {
      try {
        await blobUpload(`${bucket}/${path}`, file, {
          access: 'private',
          handleUploadUrl: '/api/storage/upload',
          contentType: opts.contentType ?? (file as File).type ?? undefined,
          multipart: file.size > 8 * 1024 * 1024,
        })
        return { data: { path, fullPath: `${bucket}/${path}` }, error: null }
      } catch (e) {
        return { data: null, error: makeError(e instanceof Error ? e.message : 'Upload failed', 'UPLOAD_FAILED') }
      }
    },
    async createSignedUrl(path: string, expiresIn: number) {
      try {
        const res = await fetch('/api/storage/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bucket, path, expiresIn }),
        })
        const json = await res.json()
        if (!res.ok) return { data: null, error: makeError(json.error ?? 'Could not sign URL') }
        return { data: { signedUrl: json.signedUrl as string }, error: null }
      } catch (e) {
        return { data: null, error: makeError(e instanceof Error ? e.message : 'Network error') }
      }
    },
  }
}

const client = {
  from: fromFactory(runQuery),
  auth,
  storage: { from: storageBucket },
}

export function createClient() {
  return client
}
