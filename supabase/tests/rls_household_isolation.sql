begin;

insert into auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'rls-a@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'rls-b@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.households (id, name, owner_id)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'RLS Household A', '11111111-1111-4111-8111-111111111111'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'RLS Household B', '22222222-2222-4222-8222-222222222222');

insert into public.household_members (household_id, user_id, role)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'owner');

insert into public.storage_units (id, household_id, name, type)
values
  ('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'A fridge', 'fridge'),
  ('bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'B fridge', 'fridge');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

do $$
declare
  affected integer;
begin
  if (select count(*) from public.households) <> 1 then
    raise exception 'RLS read isolation failed for households';
  end if;

  if exists (select 1 from public.households where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') then
    raise exception 'Foreign household became visible';
  end if;

  if (select count(*) from public.storage_units) <> 1 then
    raise exception 'RLS read isolation failed for storage units';
  end if;

  update public.storage_units
  set name = 'HACKED'
  where id = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'Foreign storage update was allowed';
  end if;

  delete from public.storage_units
  where id = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'Foreign storage delete was allowed';
  end if;

  begin
    insert into public.products (household_id, name, default_unit)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Forbidden product', 'pcs');
    raise exception 'Foreign product insert was unexpectedly allowed';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

rollback;
