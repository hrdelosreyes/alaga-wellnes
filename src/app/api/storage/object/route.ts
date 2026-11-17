import { NextRequest, NextResponse } from 'next/server'
import { get } from '@vercel/blob'
import { blobPathname, isBucket, isSafePath, verifySignature } from '@/lib/storage/server'

// Serves a private Blob object to anyone holding a valid, unexpired signed
// URL (see createSignedUrl). Used for document previews and for Claude vision.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const bucket = sp.get('bucket') ?? ''
  const path   = sp.get('path') ?? ''
  const exp    = Number(sp.get('exp'))
  const sig    = sp.get('sig') ?? ''

  if (!isBucket(bucket) || !isSafePath(path) || !verifySignature(bucket, path, exp, sig)) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 403 })
  }

  const result = await get(blobPathname(bucket, path), { access: 'private' }).catch(() => null)
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: 'Object not found' }, { status: 404 })
  }

  return new NextResponse(result.stream, {
    headers: {
      'Content-Type': result.blob.contentType || 'application/octet-stream',
      'Content-Length': String(result.blob.size),
      'Cache-Control': 'private, max-age=60',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
