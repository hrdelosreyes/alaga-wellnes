// ============================================================
//  Alaga Wellness — authentication (replaces Supabase Auth)
// ============================================================
// Users live in auth.users on Neon (same table shape as Supabase, so the
// migrated rows — including bcrypt password hashes — keep working). Sessions
// are signed JWTs in an httpOnly cookie. One-time links (password reset,
// therapist invite, email confirmation) are random tokens whose SHA-256 hash
// is stored in auth.email_tokens.

import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'crypto'
import { withDbContext } from '@/lib/db/execute'

export const SESSION_COOKIE = 'alaga-session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

export type AuthUser = {
  id: string
  aud: 'authenticated'
  role: 'authenticated'
  email: string | null
  phone: string | null
  email_confirmed_at: string | null
  last_sign_in_at: string | null
  created_at: string
  updated_at: string | null
  user_metadata: Record<string, unknown>
  app_metadata: Record<string, unknown>
}

type UserRow = {
  id: string
  email: string | null
  phone: string | null
  encrypted_password: string | null
  email_confirmed_at: string | null
  last_sign_in_at: string | null
  created_at: string
  updated_at: string | null
  raw_user_meta_data: Record<string, unknown> | null
  raw_app_meta_data: Record<string, unknown> | null
  sessions_valid_after: string | null
}

const USER_COLS = `id, email, phone, encrypted_password, email_confirmed_at, last_sign_in_at,
  created_at, updated_at, raw_user_meta_data, raw_app_meta_data, sessions_valid_after`

export function toAuthUser(r: UserRow): AuthUser {
  return {
    id: r.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: r.email,
    phone: r.phone,
    email_confirmed_at: r.email_confirmed_at,
    last_sign_in_at: r.last_sign_in_at,
    created_at: r.created_at,
    updated_at: r.updated_at,
    user_metadata: r.raw_user_meta_data ?? {},
    app_metadata: r.raw_app_meta_data ?? { provider: 'email', providers: ['email'] },
  }
}

export class AuthError extends Error {
  constructor(message: string, public status = 400, public code = 'auth_error') { super(message) }
}

function secret() {
  const s = process.env.AUTH_SECRET
  if (!s || s.length < 32) throw new Error('AUTH_SECRET must be set to a random string of at least 32 characters')
  return new TextEncoder().encode(s)
}

const svc = { role: 'service' as const }
const normEmail = (e: string) => e.trim().toLowerCase()
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

// ── Users ────────────────────────────────────────────────────

export async function findUserById(id: string): Promise<UserRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  return withDbContext(svc, async c => (await c.query(`select ${USER_COLS} from auth.users where id = $1`, [id])).rows[0] ?? null)
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  return withDbContext(svc, async c =>
    (await c.query(`select ${USER_COLS} from auth.users where lower(email) = $1`, [normEmail(email)])).rows[0] ?? null)
}

export async function createUser(opts: {
  email: string
  password?: string | null
  metadata?: Record<string, unknown>
  confirmed?: boolean
}): Promise<UserRow> {
  const email = normEmail(opts.email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AuthError('Unable to validate email address: invalid format', 400, 'validation_failed')
  if (opts.password != null) validatePassword(opts.password)
  if (await findUserByEmail(email)) throw new AuthError('User already registered', 422, 'user_already_exists')
  const hash = opts.password ? await bcrypt.hash(opts.password, 10) : null
  return withDbContext(svc, async c => (await c.query(
    `insert into auth.users (email, encrypted_password, email_confirmed_at, raw_user_meta_data, raw_app_meta_data)
     values ($1, $2, $3, $4::jsonb, '{"provider":"email","providers":["email"]}'::jsonb)
     returning ${USER_COLS}`,
    [email, hash, opts.confirmed ? new Date().toISOString() : null, JSON.stringify(opts.metadata ?? {})],
  )).rows[0])
}

export function validatePassword(password: string) {
  if (typeof password !== 'string' || password.length < 6) {
    throw new AuthError('Password should be at least 6 characters.', 422, 'weak_password')
  }
}

export async function setPassword(userId: string, password: string, opts: { confirmEmail?: boolean } = {}) {
  validatePassword(password)
  const hash = await bcrypt.hash(password, 10)
  await withDbContext(svc, c => c.query(
    `update auth.users
        set encrypted_password = $2,
            updated_at = now(),
            sessions_valid_after = clock_timestamp(),
            email_confirmed_at = case when $3 then coalesce(email_confirmed_at, now()) else email_confirmed_at end
      where id = $1`,
    [userId, hash, !!opts.confirmEmail],
  ))
}

export async function deleteUser(userId: string) {
  await withDbContext(svc, c => c.query('delete from auth.users where id = $1', [userId]))
}

export async function listUsers(): Promise<AuthUser[]> {
  const rows = await withDbContext(svc, async c => (await c.query(`select ${USER_COLS} from auth.users order by created_at`)).rows)
  return rows.map(toAuthUser)
}

export async function verifyPassword(email: string, password: string): Promise<UserRow> {
  const user = await findUserByEmail(email)
  // Supabase stores bcrypt ($2a$/$2b$) hashes; bcryptjs verifies both.
  const valid = !!user?.encrypted_password && await bcrypt.compare(password, user.encrypted_password)
  if (!user || !valid) throw new AuthError('Invalid login credentials', 400, 'invalid_credentials')
  if (!user.email_confirmed_at) throw new AuthError('Email not confirmed', 400, 'email_not_confirmed')
  await withDbContext(svc, c => c.query('update auth.users set last_sign_in_at = now() where id = $1', [user.id]))
  return user
}

// ── Sessions ─────────────────────────────────────────────────

// `sv` (session version) pins the token to auth.users.sessions_valid_after;
// changing the password bumps that column, which invalidates older tokens.
const sessionVersion = (row: Pick<UserRow, 'sessions_valid_after'>) =>
  row.sessions_valid_after ? new Date(row.sessions_valid_after).getTime() : 0

export async function createSessionToken(row: UserRow) {
  return new SignJWT({ email: row.email, role: 'authenticated', sv: sessionVersion(row) })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(row.id)
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret())
}

/** Signs `userId` in on this response (reads the latest session version). */
export async function setSessionCookie(user: { id: string }) {
  const row = await findUserById(user.id)
  if (!row) throw new AuthError('User not found', 404, 'user_not_found')
  const token = await createSessionToken(row)
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

/** Verifies a session token and returns the live user (null if invalid/revoked). */
export async function userFromToken(token: string | undefined | null): Promise<AuthUser | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret(), { audience: 'authenticated', algorithms: ['HS256'] })
    if (!payload.sub) return null
    const row = await findUserById(payload.sub)
    if (!row) return null
    if ((payload.sv ?? 0) !== sessionVersion(row)) return null
    return toAuthUser(row)
  } catch {
    return null
  }
}

/** The signed-in user for the current request (Server Components / Route Handlers). */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies()
  return userFromToken(store.get(SESSION_COOKIE)?.value)
}

// ── One-time tokens (reset / invite / confirm) ───────────────

export type TokenPurpose = 'recovery' | 'invite' | 'signup'

export async function createOneTimeToken(userId: string, purpose: TokenPurpose, ttlSeconds: number): Promise<string> {
  const raw = randomBytes(32).toString('base64url')
  await withDbContext(svc, c => c.query(
    `insert into auth.email_tokens (user_id, token_hash, purpose, expires_at)
     values ($1, $2, $3, now() + make_interval(secs => $4))`,
    [userId, sha256(raw), purpose, ttlSeconds],
  ))
  return raw
}

/** Marks a token used and returns its user. Throws if invalid, used or expired. */
export async function consumeOneTimeToken(raw: string): Promise<{ user: UserRow; purpose: TokenPurpose }> {
  const row = await withDbContext(svc, async c => (await c.query(
    `update auth.email_tokens set used_at = now()
      where token_hash = $1 and used_at is null and expires_at > now()
      returning user_id, purpose`,
    [sha256(raw)],
  )).rows[0])
  if (!row) throw new AuthError('Email link is invalid or has expired', 403, 'otp_expired')
  const user = await findUserById(row.user_id)
  if (!user) throw new AuthError('User not found', 404, 'user_not_found')
  if (row.purpose !== 'recovery' || !user.email_confirmed_at) {
    // Clicking any emailed link proves ownership of the address.
    await withDbContext(svc, c => c.query('update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = $1', [user.id]))
  }
  return { user, purpose: row.purpose }
}

/** Absolute URL of the link-verification endpoint for an emailed token. */
export function verifyLink(token: string, next: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://alagawellness.care').replace(/\/$/, '')
  return `${base}/auth/callback?token=${encodeURIComponent(token)}&next=${encodeURIComponent(safeNext(next))}`
}

/** Only allow same-site relative redirects. */
export function safeNext(next: string | null | undefined, fallback = '/') {
  if (!next) return fallback
  try {
    // Accept absolute URLs to our own site by stripping them to the path.
    if (/^https?:\/\//i.test(next)) {
      const u = new URL(next)
      next = u.pathname + u.search
    }
  } catch { return fallback }
  return next.startsWith('/') && !next.startsWith('//') ? next : fallback
}
