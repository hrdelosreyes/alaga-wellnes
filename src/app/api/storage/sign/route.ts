import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/db/server'
import { createSignedUrl, isBucket, isSafePath } from '@/lib/storage/server'

// Signed URLs for private documents, requested from the admin/staff portal.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = await createServiceClient()
  const { data: role } = await svc.from('user_roles').select('role').eq('user_id', user.id).maybeSingle()
  if (role?.role !== 'admin' && role?.role !== 'staff') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { bucket, path, expiresIn } = await req.json().catch(() => ({}))
  if (typeof bucket !== 'string' || !isBucket(bucket) || typeof path !== 'string' || !isSafePath(path)) {
    return NextResponse.json({ error: 'Invalid object path' }, { status: 400 })
  }
  const ttl = Math.min(Math.max(Number(expiresIn) || 300, 1), 60 * 60 * 24)
  return NextResponse.json({ signedUrl: createSignedUrl(bucket, path, ttl) })
}
