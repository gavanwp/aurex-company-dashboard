// Applies supabase/seed/seed-team.sql to a remote database — the Team & HR demo
// team for the demo workspace. Idempotent (see the SQL header).
// Usage: SUPABASE_DB_URL="postgresql://..." node scripts/seed-team.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'

const dbUrl = process.env.SUPABASE_DB_URL
if (!dbUrl) {
  console.error('SUPABASE_DB_URL is required')
  process.exit(1)
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(join(root, 'supabase', 'seed', 'seed-team.sql'), 'utf8')

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  await client.query('begin')
  await client.query(sql)
  await client.query('commit')
  console.log('Team seed applied successfully.')
} catch (error) {
  await client.query('rollback')
  console.error('Team seed failed, rolled back:', error.message)
  process.exitCode = 1
} finally {
  await client.end()
}
