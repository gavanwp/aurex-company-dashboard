// Applies every supabase/migrations/*.sql file, in order, to a remote database.
// Usage: SUPABASE_DB_URL="postgresql://..." node scripts/apply-migrations.mjs
// A fallback for environments where the Supabase CLI binary can't spawn; the
// CLI (`supabase db push`) remains the normal path. Each file runs in its own
// transaction so a failure rolls back cleanly and stops the run.
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'

const dbUrl = process.env.SUPABASE_DB_URL
if (!dbUrl) {
  console.error('SUPABASE_DB_URL is required')
  process.exit(1)
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'supabase', 'migrations')
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
await client.connect()

let applied = 0
for (const file of files) {
  const sql = readFileSync(join(dir, file), 'utf8')
  try {
    await client.query('begin')
    await client.query(sql)
    await client.query('commit')
    applied += 1
    console.log('applied', file)
  } catch (error) {
    await client.query('rollback')
    console.error('FAILED', file, '::', error.message.split('\n')[0])
    process.exitCode = 1
    break
  }
}
console.log(`\n${applied}/${files.length} migrations applied.`)
await client.end()
