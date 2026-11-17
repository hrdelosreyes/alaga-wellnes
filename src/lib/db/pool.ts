import { Pool, types } from 'pg'
import { attachDatabasePool } from '@vercel/functions'

// ── Type parsing: match what PostgREST/Supabase used to return ──────────
// numeric/bigint come back as JS numbers, dates as 'YYYY-MM-DD' strings and
// timestamps as ISO-8601 strings (not JS Date objects), so existing code that
// does string comparisons or arithmetic keeps working unchanged.
const toIso = (s: string) => s.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00')
types.setTypeParser(1700, (v) => parseFloat(v))   // numeric
types.setTypeParser(20,   (v) => parseInt(v, 10)) // int8 / count(*)
types.setTypeParser(1082, (v) => v)               // date
types.setTypeParser(1114, toIso)                  // timestamp
types.setTypeParser(1184, toIso)                  // timestamptz

const globalForPool = globalThis as unknown as { __alagaPool?: Pool }

/**
 * Shared connection pool for Neon. Use the *pooled* connection string
 * (host contains "-pooler") in DATABASE_URL so many serverless instances can
 * share connections through Neon's PgBouncer.
 */
export function getPool(): Pool {
  if (globalForPool.__alagaPool) return globalForPool.__alagaPool

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set')

  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
    // TLS comes from the URL: Neon strings include ?sslmode=require.
  })
  // On Vercel Fluid compute, release idle connections before the instance suspends.
  try { attachDatabasePool(pool) } catch { /* not on Vercel */ }

  globalForPool.__alagaPool = pool
  return pool
}
