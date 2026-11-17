import { NextRequest, NextResponse } from 'next/server'
import {
  AuthError, clearSessionCookie, createOneTimeToken, createUser, findUserByEmail, getCurrentUser,
  safeNext, setPassword, setSessionCookie, toAuthUser, verifyLink, verifyPassword, findUserById,
} from '@/lib/auth/server'
import { withDbContext } from '@/lib/db/execute'
import { sendEmail, emailPasswordReset, emailConfirmSignup } from '@/lib/email'

// Auth endpoints used by the browser client (src/lib/db/client.ts):
//   GET  /api/auth/user      current user (or null)
//   POST /api/auth/signin    { email, password }
//   POST /api/auth/signup    { email, password, data?, redirectTo? }
//   POST /api/auth/signout
//   POST /api/auth/recover   { email, redirectTo? }  — emails a reset link
//   POST /api/auth/update    { password?, data? }    — signed-in user only

type Ctx = { params: Promise<{ action: string }> }

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

function fail(e: unknown) {
  if (e instanceof AuthError) return json({ error: e.message, code: e.code }, e.status)
  console.error('auth route error:', e)
  return json({ error: 'Internal server error', code: 'unexpected_failure' }, 500)
}

// Very small per-instance throttle for credential endpoints.
const attempts = new Map<string, { n: number; reset: number }>()
function throttle(key: string, limit = 10, windowMs = 60_000) {
  const now = Date.now()
  const a = attempts.get(key)
  if (!a || a.reset < now) { attempts.set(key, { n: 1, reset: now + windowMs }); return }
  if (++a.n > limit) throw new AuthError('Too many requests. Please wait a minute and try again.', 429, 'over_request_rate_limit')
}
const ipOf = (req: NextRequest) => req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { action } = await params
  if (action !== 'user') return json({ error: 'Not found' }, 404)
  return json({ user: await getCurrentUser() })
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { action } = await params
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  try {
    switch (action) {
      case 'signin': {
        const email = String(body.email ?? ''), password = String(body.password ?? '')
        throttle(`signin:${ipOf(req)}:${email.toLowerCase()}`)
        const user = await verifyPassword(email, password)
        await setSessionCookie(user)
        return json({ user: toAuthUser((await findUserById(user.id))!) })
      }

      case 'signup': {
        throttle(`signup:${ipOf(req)}`, 5)
        const email = String(body.email ?? ''), password = String(body.password ?? '')
        const metadata = (body.data && typeof body.data === 'object') ? body.data as Record<string, unknown> : {}
        // Email confirmation stays on (as it was on Supabase) unless disabled.
        const requireConfirm = process.env.AUTH_REQUIRE_EMAIL_CONFIRMATION !== 'false'
        const user = await createUser({ email, password, metadata, confirmed: !requireConfirm })
        if (!requireConfirm) {
          await setSessionCookie(user)
          return json({ user: toAuthUser(user), session: true })
        }
        const token = await createOneTimeToken(user.id, 'signup', 60 * 60 * 24)
        const next = safeNext(body.redirectTo as string | undefined, '/account')
        await sendEmail({ to: user.email!, ...emailConfirmSignup({ link: verifyLink(token, next) }) })
        return json({ user: toAuthUser(user), session: false })
      }

      case 'signout': {
        await clearSessionCookie()
        return json({ ok: true })
      }

      case 'recover': {
        const email = String(body.email ?? '')
        throttle(`recover:${ipOf(req)}`, 5)
        const user = email ? await findUserByEmail(email) : null
        // Always answer OK so the endpoint can't be used to probe for accounts.
        if (user?.email) {
          const token = await createOneTimeToken(user.id, 'recovery', 60 * 60)
          const next = safeNext(body.redirectTo as string | undefined, '/account/reset-password')
          await sendEmail({ to: user.email, ...emailPasswordReset({ link: verifyLink(token, next) }) })
        }
        return json({ ok: true })
      }

      case 'update': {
        const current = await getCurrentUser()
        if (!current) throw new AuthError('Auth session missing!', 401, 'session_missing')
        if (typeof body.password === 'string') {
          await setPassword(current.id, body.password)
          // Changing the password revokes other sessions; keep this one alive.
          await setSessionCookie(current)
        }
        if (body.data && typeof body.data === 'object') {
          await withDbContext({ role: 'service' }, c => c.query(
            `update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || $2::jsonb, updated_at = now() where id = $1`,
            [current.id, JSON.stringify(body.data)],
          ))
        }
        return json({ user: toAuthUser((await findUserById(current.id))!) })
      }

      default:
        return json({ error: 'Not found' }, 404)
    }
  } catch (e) {
    return fail(e)
  }
}
