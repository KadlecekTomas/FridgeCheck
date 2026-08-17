begin;

insert into auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values (
  '33333333-3333-4333-8333-333333333333',
  'authenticated',
  'authenticated',
  'household-create@example.invalid',
  '',
  '{}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);

do $$
declare
  created_household_id uuid;
begin
  created_household_id := public.create_household('  Test Household  ');

  if not exists (
    select 1
    from public.households
    where id = created_household_id
      and name = 'Test Household'
      and owner_id = auth.uid()
  ) then
    raise exception 'create_household did not create the expected household';
  end if;

  if not exists (
    select 1
    from public.household_members
    where household_id = created_household_id
      and user_id = auth.uid()
      and role = 'owner'
  ) then
    raise exception 'create_household did not create owner membership';
  end if;

  if not exists (
    select 1
    from public.storage_units
    where household_id = created_household_id
      and name = 'Lednice'
      and type = 'fridge'
  ) then
    raise exception 'create_household did not create the default fridge';
  end if;
end;
$$;

rollback;
