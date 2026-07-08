-- 0001 — Extensions and shared helpers
-- Conventions (08_Tech_Stack.md, 12_Project_Rules.md): snake_case, plural tables,
-- UUIDv7 primary keys, created_at/updated_at everywhere, deleted_at soft deletes,
-- workspace_id + RLS on every tenant table.

create extension if not exists pgcrypto;

-- UUIDv7: time-ordered UUIDs for index locality. Native in PG18; polyfill until then.
create or replace function public.uuid_v7()
returns uuid
language plpgsql
volatile
as $$
declare
  unix_ts_ms bytea;
  uuid_bytes bytea;
begin
  unix_ts_ms := substring(int8send((extract(epoch from clock_timestamp()) * 1000)::bigint) from 3);
  uuid_bytes := unix_ts_ms || gen_random_bytes(10);
  uuid_bytes := set_byte(uuid_bytes, 6, (b'0111' || get_byte(uuid_bytes, 6)::bit(4))::bit(8)::int);
  uuid_bytes := set_byte(uuid_bytes, 8, (b'10' || get_byte(uuid_bytes, 8)::bit(6))::bit(8)::int);
  return encode(uuid_bytes, 'hex')::uuid;
end;
$$;

-- Keep updated_at honest on every table via trigger; never set from the app.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
