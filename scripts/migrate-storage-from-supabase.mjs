#!/usr/bin/env node
// ============================================================
//  Copy Supabase Storage files → Vercel Blob (private)
// ============================================================
// Usage:
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   SUPABASE_DB_URL=postgresql://... \
//   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_... \
//   node scripts/migrate-storage-from-supabase.mjs [--dry-run]
//
// Every object in the listed buckets is downloaded with the service-role key
// and uploaded as a private blob at "<bucket>/<path>" — the same path the app
// already stores in the database (e.g. therapists.photo_url), so no rows need
// rewriting. Safe to re-run: objects that already exist in Blob are skipped.

import pg from 'pg'
import { put, head } from '@vercel/blob'

const BUCKETS = ['therapist-docs']
const DRY = process.argv.includes('--dry-run')

for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_DB_URL', 'BLOB_READ_WRITE_TOKEN']) {
  if (!process.env[k]) { console.error(`Missing ${k}`); process.exit(1) }
}
const base = process.env.SUPABASE_URL.replace(/\/$/, '')
const key  = process.env.SUPABASE_SERVICE_ROLE_KEY

const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } })
await db.connect()
const { rows } = await db.query(
  `select bucket_id, name, metadata->>'mimetype' as mimetype
     from storage.objects where bucket_id = any($1) and name not like '%.emptyFolderPlaceholder'
     order by bucket_id, name`,
  [BUCKETS],
)
await db.end()
console.log(`${rows.length} objects to copy${DRY ? ' (dry run)' : ''}`)

let copied = 0, skipped = 0, failed = 0
const queue = [...rows]

async function worker() {
  for (let obj = queue.shift(); obj; obj = queue.shift()) {
    const pathname = `${obj.bucket_id}/${obj.name}`
    try {
      const exists = await head(pathname).then(() => true).catch(() => false)
      if (exists) { skipped++; continue }
      if (DRY) { console.log('  would copy', pathname); continue }

      const encoded = obj.name.split('/').map(encodeURIComponent).join('/')
      const res = await fetch(`${base}/storage/v1/object/${obj.bucket_id}/${encoded}`, {
        headers: { Authorization: `Bearer ${key}`, apikey: key },
      })
      if (!res.ok) throw new Error(`download ${res.status} ${await res.text()}`)
      const body = Buffer.from(await res.arrayBuffer())

      await put(pathname, body, {
        access: 'private',
        contentType: obj.mimetype || res.headers.get('content-type') || undefined,
        addRandomSuffix: false,
        allowOverwrite: true,
      })
      copied++
      if (copied % 25 === 0) console.log(`  …${copied} copied`)
    } catch (e) {
      failed++
      console.error(`  ✗ ${pathname}: ${e.message}`)
    }
  }
}

await Promise.all(Array.from({ length: 6 }, worker))
console.log(`Done. copied=${copied} skipped(existing)=${skipped} failed=${failed}`)
process.exit(failed ? 1 : 0)
