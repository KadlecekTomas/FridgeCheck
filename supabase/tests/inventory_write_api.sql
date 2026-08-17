begin;

insert into auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'inventory-a@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('55555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'inventory-b@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now());

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
begin
  perform set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);

  household_a := public.create_household('Inventory Household A');
  select id into strict storage_a
  from public.storage_units
  where household_id = household_a
    and name = 'Lednice'
    and type = 'fridge';

  first_batch := public.create_product_with_batch(
    p_household_id => household_a,
    p_storage_unit_id => storage_a,
    p_name => 'Vejce',
    p_quantity => 10,
    p_unit => 'pcs',
    p_expiry_date => current_date + 7,
    p_expiry_type => 'use_by',
    p_brand => 'Test brand'
  );

  select product_id into strict product_a
  from public.inventory_batches
  where id = first_batch;

  if (select count(*) from public.products where household_id = household_a) <> 1 then
    raise exception 'Expected exactly one product after first batch creation';
  end if;

  if not exists (
    select 1
    from public.inventory_events
    where inventory_batch_id = first_batch
      and product_id = product_a
      and household_id = household_a
      and type = 'purchase'
      and quantity_delta = 10
      and unit = 'pcs'
  ) then
    raise exception 'Purchase event missing for first batch';
  end if;

  second_batch := public.add_batch_to_product(
    p_product_id => product_a,
    p_storage_unit_id => storage_a,
    p_quantity => 6,
    p_unit => 'pcs',
    p_expiry_date => current_date + 14,
    p_expiry_type => 'use_by'
  );

  if second_batch = first_batch then
    raise exception 'Expected a distinct second batch';
  end if;

  if (select count(*) from public.products where household_id = household_a) <> 1 then
    raise exception 'Adding another batch duplicated the product';
  end if;

  if (select count(*) from public.inventory_batches where product_id = product_a) <> 2 then
    raise exception 'Expected two inventory batches for the same product';
  end if;

  if (select count(*) from public.inventory_events where product_id = product_a and type = 'purchase') <> 2 then
    raise exception 'Expected one purchase event per created batch';
  end if;

  begin
    perform public.add_batch_to_product(
      p_product_id => product_a,
      p_storage_unit_id => storage_a,
      p_quantity => 1,
      p_unit => 'kg'
    );
    raise exception 'Incompatible batch unit was unexpectedly allowed';
  exception
    when invalid_parameter_value then null;
  end;

  perform set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', true);
  household_b := public.create_household('Inventory Household B');
  select id into strict storage_b
  from public.storage_units
  where household_id = household_b
    and name = 'Lednice';

  perform set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);

  begin
    perform public.create_product_with_batch(
      p_household_id => household_b,
      p_storage_unit_id => storage_b,
      p_name => 'Forbidden product',
      p_quantity => 1,
      p_unit => 'pcs'
    );
    raise exception 'Cross-household inventory RPC was unexpectedly allowed';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

rollback;
