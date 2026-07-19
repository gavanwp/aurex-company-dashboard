-- 0025 — Profile fields for the personal profile surface (/settings/profile)
-- Docs: 06_Module_Breakdown.md (Settings/Profile).
--
-- The profiles table (0002) held only identity essentials (name, email, avatar).
-- The profile page lets a member describe themselves — job title, timezone, and
-- location — so add those as nullable text columns. RLS is unchanged: profiles
-- already allows self-select/self-update (profiles_update_self, 0002), which is
-- exactly the authorization the updateProfile action needs.

alter table public.profiles
  add column if not exists title text check (title is null or char_length(title) <= 120),
  add column if not exists timezone text check (timezone is null or char_length(timezone) <= 64),
  add column if not exists location text check (location is null or char_length(location) <= 120);
