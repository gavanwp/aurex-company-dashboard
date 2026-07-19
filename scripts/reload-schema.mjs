// Ground-truth check + PostgREST schema-cache reload. Connects DIRECTLY to
// Postgres (bypassing the REST layer that caches the schema), confirms the 0024/
// 0025 objects actually exist on THIS database, then tells PostgREST to reload so
// the app + anon key can see them. Read-only except the NOTIFY.
// Usage: SUPABASE_DB_URL="postgresql://..." node scripts/reload-schema.mjs
import pg from 'pg'

const dbUrl = process.env.SUPABASE_DB_URL
if (!dbUrl) { console.error('SUPABASE_DB_URL is required'); process.exit(1) }

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  // Which database am I actually connected to? Print workspace IDs so we can
  // cross-check against the ID the app's anon key sees (00000000-…-aa01).
  const who = await client.query(`select count(*)::int as n from public.workspaces`)
  const ws = await client.query(`select id, name from public.workspaces order by created_at limit 5`)
  console.log('workspaces on THIS db:', who.rows[0].n)
  for (const r of ws.rows) console.log('   -', r.id, '·', r.name)

  // 0024 tables present?
  const tables = await client.query(
    `select to_regclass('public.document_folders') as document_folders,
            to_regclass('public.document_files') as document_files,
            to_regclass('public.document_file_versions') as document_file_versions,
            to_regclass('public.document_tags') as document_tags,
            to_regclass('public.document_tag_assignments') as document_tag_assignments`,
  )
  console.log('0024 tables:', tables.rows[0])

  // 0025 columns present?
  const cols = await client.query(
    `select column_name from information_schema.columns
      where table_schema='public' and table_name='profiles'
        and column_name in ('title','timezone','location') order by column_name`,
  )
  console.log('0025 profiles columns:', cols.rows.map((r) => r.column_name))

  // New permission keys present?
  const perms = await client.query(
    `select count(*)::int as n from public.permissions where key like 'documents.folder.%' or key like 'documents.document.version.%'`,
  )
  console.log('0024 permission keys (folder + version):', perms.rows[0].n)

  // Reload the PostgREST schema cache so the REST API sees all of the above.
  await client.query(`notify pgrst, 'reload schema'`)
  console.log('\n→ sent NOTIFY pgrst reload schema. Give it a few seconds, then re-test.')
} catch (err) {
  console.error('error:', err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
