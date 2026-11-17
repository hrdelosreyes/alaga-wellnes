// ============================================================
//  File storage on Vercel Blob (replaces Supabase Storage)
// ============================================================
// Objects are stored as *private* blobs at "<bucket>/<path>", so the paths
// already saved in the database (e.g. therapists.photo_url = "photos/…jpg")
// keep working. Private blobs can't be fetched directly, so "signed URLs"
// point at /api/storage/object with an HMAC signature and expiry.

import { createHmac, timingSafeEqual } from 'crypto'

export const BUCKETS = ['therapist-docs'] as const
export type Bucket = (typeof BUCKETS)[number]

export function isBucket(b: string): b is Bucket {
  return (BUCKETS as readonly string[]).includes(b)
}

/** Reject traversal and odd characters in object paths. */
export function isSafePath(p: string) {
  return /^[A-Za-z0-9_\-./]+$/.test(p) && !p.includes('..') && !p.startsWith('/') && p.length <= 300
}

export function blobPathname(bucket: Bucket, path: string) {
  return `${bucket}/${path}`
}

function key() {
  const s = process.env.AUTH_SECRET
  if (!s) throw new Error('AUTH_SECRET is not set')
  return s
}

function sign(bucket: string, path: string, exp: number) {
  return createHmac('sha256', key()).update(`storage:${bucket}:${path}:${exp}`).digest('base64url')
}

export function verifySignature(bucket: string, path: string, exp: number, sig: string) {
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false
  const expected = Buffer.from(sign(bucket, path, exp))
  const given = Buffer.from(sig)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

/** Absolute, time-limited URL for a private object. */
export function createSignedUrl(bucket: Bucket, path: string, expiresInSeconds: number) {
  const exp = Math.floor(Date.now() / 1000) + Math.max(1, Math.floor(expiresInSeconds))
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://alagawellness.care').replace(/\/$/, '')
  const qs = new URLSearchParams({ bucket, path, exp: String(exp), sig: sign(bucket, path, exp) })
  return `${base}/api/storage/object?${qs}`
}

export const UPLOAD_RULES: Record<Bucket, { allowedContentTypes: string[]; maximumSizeInBytes: number; folders: string[] }> = {
  'therapist-docs': {
    allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'],
    maximumSizeInBytes: 15 * 1024 * 1024,
    folders: ['nbi', 'tesda', 'photos'],
  },
}
