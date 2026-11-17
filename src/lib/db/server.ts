// ============================================================
//  Server-side data clients (Neon + app auth + Vercel Blob)
// ============================================================
// Drop-in replacements for the old Supabase server clients:
//
//   createClient()        — acts as the signed-in user (RLS applies)
//   createServiceClient() — bypasses RLS; for trusted server code only

import { put, del } from '@vercel/blob'
import { fromFactory, makeError } from './query-builder'
import { executeQuery, type DbContext } from './execute'
import {
  getCurrentUser, clearSessionCookie, createUser, deleteUser, listUsers, setPassword,
  findUserById, toAuthUser, AuthError, type AuthUser,
} from '@/lib/auth/server'
import { blobPathname, createSignedUrl, isBucket, isSafePath } from '@/lib/storage/server'

function contextFor(user: AuthUser | null): DbContext {
  return user ? { role: 'authenticated', userId: user.id, email: user.email } : { role: 'anon' }
}

const authErr = (e: unknown) => {
  const err = e instanceof AuthError ? e : new AuthError(e instanceof Error ? e.message : String(e), 500)
  return { message: err.message, status: err.status, code: err.code, name: 'AuthApiError' }
}

function storage() {
  return {
    from(bucket: string) {
      return {
        async createSignedUrl(path: string, expiresIn: number) {
          if (!isBucket(bucket) || !isSafePath(path)) return { data: null, error: makeError('Invalid object path') }
          return { data: { signedUrl: createSignedUrl(bucket, path, expiresIn) }, error: null }
        },
        async upload(path: string, body: Blob | ArrayBuffer | Buffer | string, opts: { contentType?: string; upsert?: boolean } = {}) {
          if (!isBucket(bucket) || !isSafePath(path)) return { data: null, error: makeError('Invalid object path') }
          try {
            await put(blobPathname(bucket, path), body, {
              access: 'private',
              contentType: opts.contentType,
              addRandomSuffix: false,
              allowOverwrite: !!opts.upsert,
            })
            return { data: { path, fullPath: `${bucket}/${path}` }, error: null }
          } catch (e) {
            return { data: null, error: makeError(e instanceof Error ? e.message : String(e)) }
          }
        },
        async remove(paths: string[]) {
          if (!isBucket(bucket)) return { data: null, error: makeError('Invalid bucket') }
          try {
            await del(paths.filter(isSafePath).map(p => blobPathname(bucket, p)))
            return { data: paths.map(name => ({ name })), error: null }
          } catch (e) {
            return { data: null, error: makeError(e instanceof Error ? e.message : String(e)) }
          }
        },
      }
    },
  }
}

/** Request-scoped client acting as the signed-in user (or anon). */
export async function createClient() {
  const user = await getCurrentUser()
  const ctx = contextFor(user)
  return {
    from: fromFactory(q => executeQuery(q, ctx)),
    auth: {
      async getUser() {
        return user
          ? { data: { user }, error: null }
          : { data: { user: null }, error: { message: 'Auth session missing!', status: 401, code: 'session_missing', name: 'AuthSessionMissingError' } }
      },
      async getSession() {
        return { data: { session: user ? { user } : null }, error: null }
      },
      async signOut() {
        await clearSessionCookie()
        return { error: null }
      },
    },
  }
}

/** Trusted server client — bypasses RLS. Never expose to the browser. */
export async function createServiceClient() {
  const ctx: DbContext = { role: 'service' }
  return {
    from: fromFactory(q => executeQuery(q, ctx)),
    storage: storage(),
    auth: {
      admin: {
        async listUsers() {
          try { return { data: { users: await listUsers() }, error: null } }
          catch (e) { return { data: { users: [] as AuthUser[] }, error: authErr(e) } }
        },
        async getUserById(id: string) {
          const row = await findUserById(id)
          return row ? { data: { user: toAuthUser(row) }, error: null } : { data: { user: null }, error: authErr(new AuthError('User not found', 404)) }
        },
        async createUser(opts: { email: string; password?: string; email_confirm?: boolean; user_metadata?: Record<string, unknown> }) {
          try {
            const row = await createUser({ email: opts.email, password: opts.password ?? null, confirmed: !!opts.email_confirm, metadata: opts.user_metadata })
            return { data: { user: toAuthUser(row) }, error: null }
          } catch (e) { return { data: { user: null }, error: authErr(e) } }
        },
        async updateUserById(id: string, attrs: { password?: string }) {
          try {
            if (attrs.password) await setPassword(id, attrs.password)
            const row = await findUserById(id)
            return { data: { user: row ? toAuthUser(row) : null }, error: null }
          } catch (e) { return { data: { user: null }, error: authErr(e) } }
        },
        async deleteUser(id: string) {
          try { await deleteUser(id); return { data: {}, error: null } }
          catch (e) { return { data: null, error: authErr(e) } }
        },
      },
    },
  }
}

export type ServerDbClient = Awaited<ReturnType<typeof createClient>>
export type ServiceDbClient = Awaited<ReturnType<typeof createServiceClient>>
/** Anything with `.from()` — use in helpers that accept either client. */
export type DbClient = Pick<ServerDbClient, 'from'>
