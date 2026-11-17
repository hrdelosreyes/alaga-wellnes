import { NextRequest, NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { UPLOAD_RULES, isBucket, isSafePath } from '@/lib/storage/server'

// Issues short-lived Vercel Blob client-upload tokens. Files go straight from
// the browser to Blob (no 4.5 MB function body limit). Mirrors the old
// Supabase policy: anyone — including applicants who don't have an account
// yet — may upload into the allowed folders, but can't overwrite or read.

export async function POST(req: NextRequest) {
  const body = (await req.json()) as HandleUploadBody
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const [bucket, folder, ...rest] = pathname.split('/')
        const objectPath = [folder, ...rest].join('/')
        if (!isBucket(bucket) || !isSafePath(objectPath) || !rest.length) throw new Error('Invalid upload path')
        const rules = UPLOAD_RULES[bucket]
        if (!rules.folders.includes(folder)) throw new Error('Invalid upload folder')
        return {
          allowedContentTypes: rules.allowedContentTypes,
          maximumSizeInBytes: rules.maximumSizeInBytes,
          addRandomSuffix: false,
          allowOverwrite: false,
        }
      },
    })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Upload failed' }, { status: 400 })
  }
}
