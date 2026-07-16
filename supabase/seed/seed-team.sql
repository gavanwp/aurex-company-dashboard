-- Team & HR demo seed (0016). Populates the demo workspace with a small,
-- realistic agency team so the Team module renders fully. Idempotent: it clears
-- the seeded HR rows for these users first, then re-inserts.
--   Workspace: AurexDesigns  (00000000-0000-0000-0000-00000000aa01)
--   Owner:     Demo Founder  (00000000-0000-0000-0000-000000000001)
-- Every seeded teammate shares the demo password (aurexos-demo); token columns
-- are '' (not NULL) for the same GoTrue reason documented in seed.sql.

do $$
declare
  ws constant uuid := '00000000-0000-0000-0000-00000000aa01';
  owner_id constant uuid := '00000000-0000-0000-0000-000000000001';
  -- (id, name, email, role, specialization)
  people constant jsonb := '[
    ["00000000-0000-0000-0000-000000000002","Priya Nair","priya@aurexdesigns.com","admin","designer"],
    ["00000000-0000-0000-0000-000000000003","Arjun Menon","arjun@aurexdesigns.com","project_manager",null],
    ["00000000-0000-0000-0000-000000000004","Sara Khan","sara@aurexdesigns.com","member","developer"],
    ["00000000-0000-0000-0000-000000000005","Diego Alvarez","diego@aurexdesigns.com","member","developer"],
    ["00000000-0000-0000-0000-000000000006","Mei Lin","mei@aurexdesigns.com","member","content"],
    ["00000000-0000-0000-0000-000000000007","Tom Becker","tom@aurexdesigns.com","sales","marketing"],
    ["00000000-0000-0000-0000-000000000008","Aisha Bello","aisha@aurexdesigns.com","member","seo"]
  ]';
  p jsonb;
  uid uuid;
begin
  -- ── Auth users + identities + memberships ──────────────────────────────────
  for p in select * from jsonb_array_elements(people) loop
    uid := (p ->> 0)::uuid;

    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      p ->> 2, crypt('aurexos-demo', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', p ->> 1),
      now(), now(), '', '', '', '', '', '', '', ''
    ) on conflict (id) do nothing;

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, created_at, updated_at
    ) values (
      uid, uid, uid::text,
      jsonb_build_object('sub', uid::text, 'email', p ->> 2, 'email_verified', true),
      'email', now(), now()
    ) on conflict (provider_id, provider) do nothing;

    insert into public.workspace_members (workspace_id, user_id, role, specialization)
    values (ws, uid, (p ->> 3)::public.workspace_role, (p ->> 4)::public.member_specialization)
    on conflict (workspace_id, user_id) do update
      set role = excluded.role, specialization = excluded.specialization;
  end loop;

  -- ── Reset seeded HR rows so this script is re-runnable ─────────────────────
  delete from public.hr_leave_requests where workspace_id = ws;
  delete from public.hr_profiles where workspace_id = ws;

  -- ── HR profiles ────────────────────────────────────────────────────────────
  insert into public.hr_profiles
    (workspace_id, user_id, title, employment_type, manager_id, start_date, location,
     timezone, phone, bio, skills, weekly_capacity_hours, comp_amount_minor, comp_currency, comp_period)
  values
    (ws, owner_id, 'Founder & CEO', 'full_time', null, '2021-02-01', 'Bengaluru, IN',
     'Asia/Kolkata', '+91 98860 10001',
     'Founded AurexDesigns and now leads product and vision across the agency.',
     '[{"name":"Product strategy","level":"expert"},{"name":"Leadership","level":"expert"},{"name":"Fundraising","level":"advanced"}]',
     40, null, 'INR', null),

    (ws, '00000000-0000-0000-0000-000000000002', 'Design Lead', 'full_time', owner_id, '2021-05-10', 'Bengaluru, IN',
     'Asia/Kolkata', '+91 98860 10002',
     'Leads brand and product design; obsesses over craft and design systems.',
     '[{"name":"Figma","level":"expert"},{"name":"Design systems","level":"expert"},{"name":"Webflow","level":"advanced"},{"name":"Illustration","level":"intermediate"}]',
     40, 360000000, 'INR', 'annual'),

    (ws, '00000000-0000-0000-0000-000000000003', 'Delivery Lead', 'full_time', owner_id, '2021-09-01', 'Pune, IN',
     'Asia/Kolkata', '+91 98860 10003',
     'Keeps every engagement on track — scope, timeline, and a happy client.',
     '[{"name":"Project management","level":"expert"},{"name":"Client relations","level":"advanced"},{"name":"Notion","level":"advanced"}]',
     40, 320000000, 'INR', 'annual'),

    (ws, '00000000-0000-0000-0000-000000000004', 'Senior Engineer', 'full_time', '00000000-0000-0000-0000-000000000003', '2022-01-15', 'Remote, IN',
     'Asia/Kolkata', '+91 98860 10004',
     'Full-stack engineer; owns the trickiest builds and mentors the team.',
     '[{"name":"TypeScript","level":"expert"},{"name":"Next.js","level":"expert"},{"name":"Postgres","level":"advanced"},{"name":"Supabase","level":"advanced"}]',
     40, 280000000, 'INR', 'annual'),

    (ws, '00000000-0000-0000-0000-000000000005', 'Frontend Engineer', 'full_time', '00000000-0000-0000-0000-000000000003', '2023-03-06', 'Kochi, IN',
     'Asia/Kolkata', '+91 98860 10005',
     'Turns designs into fast, accessible interfaces.',
     '[{"name":"React","level":"advanced"},{"name":"Tailwind CSS","level":"advanced"},{"name":"Accessibility","level":"intermediate"}]',
     40, 190000000, 'INR', 'annual'),

    (ws, '00000000-0000-0000-0000-000000000006', 'Content Strategist', 'part_time', '00000000-0000-0000-0000-000000000002', '2023-08-21', 'Remote, IN',
     'Asia/Kolkata', '+91 98860 10006',
     'Shapes voice and story for client brands and campaigns.',
     '[{"name":"Copywriting","level":"expert"},{"name":"Content strategy","level":"advanced"},{"name":"SEO writing","level":"intermediate"}]',
     24, 120000000, 'INR', 'annual'),

    (ws, '00000000-0000-0000-0000-000000000007', 'Growth Marketer', 'full_time', owner_id, '2022-11-02', 'Mumbai, IN',
     'Asia/Kolkata', '+91 98860 10007',
     'Runs demand-gen and owns the top of the pipeline.',
     '[{"name":"Paid ads","level":"advanced"},{"name":"HubSpot","level":"advanced"},{"name":"Analytics","level":"intermediate"}]',
     40, 210000000, 'INR', 'annual'),

    (ws, '00000000-0000-0000-0000-000000000008', 'SEO Specialist', 'contractor', '00000000-0000-0000-0000-000000000002', '2024-02-12', 'Remote, IN',
     'Asia/Kolkata', '+91 98860 10008',
     'Technical + on-page SEO; lifts organic for every client site.',
     '[{"name":"Technical SEO","level":"advanced"},{"name":"Ahrefs","level":"advanced"},{"name":"Schema markup","level":"intermediate"}]',
     30, 90000, 'INR', 'hourly');

  -- ── Leave (dated relative to today so the tiles stay meaningful) ────────────
  insert into public.hr_leave_requests
    (workspace_id, user_id, type, start_date, end_date, status, reason, decided_by, decided_at)
  values
    -- Out today: approved vacation spanning now
    (ws, '00000000-0000-0000-0000-000000000004', 'vacation',
     current_date - 1, current_date + 2, 'approved', 'Family trip', owner_id, now() - interval '5 days'),
    -- Pending: next week
    (ws, '00000000-0000-0000-0000-000000000005', 'vacation',
     current_date + 7, current_date + 9, 'pending', 'Long weekend', null, null),
    -- Pending: personal day
    (ws, '00000000-0000-0000-0000-000000000008', 'personal',
     current_date + 3, current_date + 3, 'pending', 'Appointment', null, null),
    -- Past approved sick day
    (ws, '00000000-0000-0000-0000-000000000006', 'sick',
     current_date - 14, current_date - 13, 'approved', null, '00000000-0000-0000-0000-000000000002', now() - interval '15 days');
end $$;
