// Applies a SINGLE migration file to a remote database, in its own transaction.
// Companion to apply-migrations.mjs (which applies the whole set for a fresh DB);
// use this to apply one new migration to an already-migrated hosted project.
// Usage: SUPABASE_DB_URL="postgresql://..." node scripts/apply-migration.mjs 0016_team_and_hr.sql
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'

const dbUrl = process.env.SUPABASE_DB_URL
if (!dbUrl) {
  console.error('SUPABASE_DB_URL is required')
  process.exit(1)
}

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/apply-migration.mjs <migration-file.sql>')
  process.exit(1)
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(join(root, 'supabase', 'migrations', file), 'utf8')

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  await client.query('begin')
  await client.query(sql)
  await client.query('commit')
  console.log('applied', file)
} catch (error) {
  await client.query('rollback')
  console.error('FAILED', file, '::', error.message.split('\n')[0])
  process.exitCode = 1
} finally {
  await client.end()
}
