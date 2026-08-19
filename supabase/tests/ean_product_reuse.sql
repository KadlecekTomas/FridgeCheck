begin;

insert into auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'ean-reuse-a@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'ean-reuse-b@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now());

set local role authenticated;

do $$
declare
  household_a uuid;
  household_b uuid;
  storage_a uuid;
  storage_b uuid;
  first_batch uuid;
  second_batch uuid;
  product_a uuid;
  product_b uuid;
  event_count integer;
begin
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);

  household_a := public.create_household('EAN Reuse Household A');
  select id into strict storage_a
  from public.storage_units
  where household_id = household_a and name = 'Lednice';

  first_batch := public.create_product_with_batch(
    p_household_id => household_a,
    p_storage_unit_id => storage_a,
    p_name => 'Skyr původní',
    p_quantity => 2,
    p_unit => 'pcs',
    p_ean_code => '8591234567890',
    p_brand => 'První značka',
    p_expiry_type => 'unknown'
  );

  select product_id into strict product_a
  from public.inventory_batches
  where id = first_batch;

  second_batch := public.create_product_with_batch(
    p_household_id => household_a,
    p_storage_unit_id => storage_a,
    p_name => 'Skyr z dalšího skenu',
    p_quantity => 3,
    p_unit => 'pcs',
    p_ean_code => '8591234567890',
    p_brand => 'Jiná metadata ze skenu',
    p_expiry_type => 'unknown'
  );

  if (select product_id from public.inventory_batches where id = second_batch) <> product_a then
    raise exception 'Repeated EAN did not reuse the existing product';
  end if;

  if (
    select count(*)
    from public.products
    where household_id = household_a and ean_code = '8591234567890'
  ) <> 1 then
    raise exception 'Repeated EAN created a duplicate product';
  end if;

  if not exists (
    select 1
    from public.products
    where id = product_a
      and name = 'Skyr původní'
      and brand = 'První značka'
      and default_unit = 'pcs'
  ) then
    raise exception 'Repeated EAN unexpectedly overwrote existing product metadata';
  end if;

  if (
    select count(*)
    from public.inventory_batches
    where product_id = product_a and status = 'active'
  ) <> 2 then
    raise exception 'Repeated EAN did not create a second inventory batch';
  end if;

  if (
    select sum(quantity)
    from public.inventory_batches
    where product_id = product_a and status = 'active'
  ) <> 5 then
    raise exception 'Repeated EAN batches do not preserve total quantity';
  end if;

  if (
    select count(*)
    from public.inventory_events
    where product_id = product_a and type = 'purchase'
  ) <> 2 then
    raise exception 'Repeated EAN did not write one purchase event per batch';
  end if;

  select count(*) into event_count
  from public.inventory_events
  where product_id = product_a;

  begin
    perform public.create_product_with_batch(
      p_household_id => household_a,
      p_storage_unit_id => storage_a,
      p_name => 'Skyr v gramech',
      p_quantity => 500,
      p_unit => 'g',
      p_ean_code => '8591234567890',
      p_expiry_type => 'unknown'
    );
    raise exception 'Repeated EAN with a conflicting unit was unexpectedly allowed';
  exception
    when invalid_parameter_value then null;
  end;

  if (
    select count(*)
    from public.inventory_batches
    where product_id = product_a
  ) <> 2 then
    raise exception 'Rejected conflicting-unit EAN call unexpectedly wrote a batch';
  end if;

  if (
    select count(*)
    from public.inventory_events
    where product_id = product_a
  ) <> event_count then
    raise exception 'Rejected conflicting-unit EAN call unexpectedly wrote an event';
  end if;

  begin
    perform public.create_product_with_batch(
      p_household_id => household_a,
      p_storage_unit_id => storage_a,
      p_name => 'Malformed EAN',
      p_quantity => 1,
      p_unit => 'pcs',
      p_ean_code => 'abc',
      p_expiry_type => 'unknown'
    );
    raise exception 'Malformed EAN was unexpectedly allowed';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.create_product_with_batch(
      p_household_id => household_a,
      p_storage_unit_id => storage_a,
      p_name => 'Too precise',
      p_quantity => 1.0001,
      p_unit => 'pcs',
      p_ean_code => '8591234567891',
      p_expiry_type => 'unknown'
    );
    raise exception 'Over-precise quantity was unexpectedly allowed';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    insert into public.products(household_id, name, default_unit, ean_code)
    values (household_a, 'Přímý duplikát', 'pcs', '8591234567890');
    raise exception 'Unique household EAN invariant did not reject a direct duplicate';
  exception
    when unique_violation then null;
  end;

  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);

  household_b := public.create_household('EAN Reuse Household B');
  select id into strict storage_b
  from public.storage_units
  where household_id = household_b and name = 'Lednice';

  first_batch := public.create_product_with_batch(
    p_household_id => household_b,
    p_storage_unit_id => storage_b,
    p_name => 'Stejný EAN v jiné domácnosti',
    p_quantity => 1,
    p_unit => 'pcs',
    p_ean_code => '8591234567890',
    p_expiry_type => 'unknown'
  );

  select product_id into strict product_b
  from public.inventory_batches
  where id = first_batch;

  if product_b = product_a then
    raise exception 'Same EAN across households unexpectedly reused a foreign product';
  end if;

  if not exists (
    select 1 from public.products
    where id = product_b
      and household_id = household_b
      and ean_code = '8591234567890'
  ) then
    raise exception 'Same EAN should remain valid in a separate household';
  end if;
end;
$$;

rollback;
