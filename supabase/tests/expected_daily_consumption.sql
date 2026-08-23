begin;

insert into auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('91919191-9191-4919-9191-919191919191', 'authenticated', 'authenticated', 'planning-target@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now());

set local role authenticated;
do $$
declare
  target_household_id uuid;
  target_product_id uuid;
  target_id uuid;
  stored_consumption numeric(14,3);
begin
  perform set_config('request.jwt.claim.sub', '91919191-9191-4919-9191-919191919191', true);

  target_household_id := public.create_household('Planning target household');

  insert into public.products(household_id, name, default_unit)
  values (target_household_id, 'Planning eggs', 'pcs')
  returning id into target_product_id;

  insert into public.stock_targets(
    household_id,
    product_id,
    minimum_quantity,
    target_quantity,
    unit
  )
  values (
    target_household_id,
    target_product_id,
    4,
    10,
    'pcs'
  )
  returning id, expected_daily_consumption into target_id, stored_consumption;

  if stored_consumption <> 0 then
    raise exception 'Expected new stock target to default expected_daily_consumption to 0, got %', stored_consumption;
  end if;

  update public.stock_targets
  set expected_daily_consumption = 1.5
  where id = target_id;

  select expected_daily_consumption into strict stored_consumption
  from public.stock_targets
  where id = target_id;

  if stored_consumption <> 1.5 then
    raise exception 'Expected daily consumption update was not persisted: %', stored_consumption;
  end if;

  begin
    update public.stock_targets
    set expected_daily_consumption = -0.001
    where id = target_id;
    raise exception 'Negative expected daily consumption was unexpectedly accepted';
  exception
    when check_violation then null;
  end;

  select expected_daily_consumption into strict stored_consumption
  from public.stock_targets
  where id = target_id;

  if stored_consumption <> 1.5 then
    raise exception 'Failed negative update unexpectedly changed the stored planning value: %', stored_consumption;
  end if;
end;
$$;

rollback;
