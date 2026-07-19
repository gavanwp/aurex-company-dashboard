// Which Supabase PROJECT does SUPABASE_DB_URL actually point at, and is the DDL
// there? Prints the target project ref (password masked) + DDL presence, then a
// single VERDICT line. The app reads from project 'tcwkxxfbzupotzoneoht' (Mumbai);
// if the ref below differs, migrations are landing on the wrong project.
// Usage: SUPABASE_DB_URL="postgresql://..." node scripts/whoami-db.mjs
import pg from 'pg'

const APP_REF = 'tcwkxxfbzupotzoneoht' // from NEXT_PUBLIC_SUPABASE_URL (Mumbai)
const dbUrl = process.env.SUPABASE_DB_URL
if (!dbUrl) { console.error('SUPABASE_DB_URL is required'); process.exit(1) }

// Parse the connection target WITHOUT revealing the password.
const u = new URL(dbUrl)
const user = decodeURIComponent(u.username) // "postgres.<project_ref>" on the pooler
const ref = user.includes('.') ? user.split('.').slice(1).join('.') : '(not a pooler user)'
console.log('TARGET host :', u.hostname)
console.log('TARGET user :', user)
console.log('TARGET ref  :', ref, ref === APP_REF ? '  ✓ matches the app' : `  ✗ APP USES ${APP_REF}`)

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  const t = await client.query(`select to_regclass('public.document_folders') is not null as f`)
  const c = await client.query(
    `select count(*)::int n from information_schema.columns
      where table_schema='public' and table_name='profiles' and column_name in ('title','timezone','location')`,
  )
  const docs = t.rows[0].f
  const cols = c.rows[0].n
  console.log('0024 document_folders present:', docs)
  console.log('0025 profiles new columns   :', cols, '/ 3')
  if (docs && cols === 3) await client.query(`notify pgrst, 'reload schema'`)
  console.log(
    `\nVERDICT: ref=${ref} matchesApp=${ref === APP_REF} | 0024=${docs ? 'present' : 'MISSING'} | 0025=${cols}/3`,
  )
} catch (err) {
  console.error('error:', err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
