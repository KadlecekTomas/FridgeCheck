begin;

insert into auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'authenticated', 'authenticated', 'estimate@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now());

set local role authenticated;

do $$
declare
  household_id uuid;
  fridge_id uuid;
  estimated_batch_id uuid;
  estimated_product_id uuid;
  packaged_batch_id uuid;
  packaged_product_id uuid;
  exact_batch_id uuid;
  delta numeric;
begin
  perform set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', true);

  household_id := public.create_household('Estimate Household');
  select id into strict fridge_id
  from public.storage_units
  where household_id = household_id
    and name = 'Lednice';

  estimated_batch_id := public.create_or_add_product_batch(
    p_household_id => household_id,
    p_storage_unit_id => fridge_id,
    p_name => 'Rýže v dóze',
    p_quantity => 750,
    p_unit => 'g',
    p_quantity_is_estimate => true
  );

  select product_id into strict estimated_product_id
  from public.inventory_batches
  where id = estimated_batch_id;

  if not exists (
    select 1
    from public.inventory_batches
    where id = estimated_batch_id
      and quantity = 750
      and quantity_is_estimate
  ) then
    raise exception 'Estimated batch did not persist estimate semantics';
  end if;

  if not exists (
    select 1
    from public.inventory_events
    where inventory_batch_id = estimated_batch_id
      and type = 'purchase'
      and quantity_delta = 750
      and quantity_is_estimate
  ) then
    raise exception 'Estimated purchase event did not preserve estimate semantics';
  end if;

  perform public.consume_product_fefo(estimated_product_id, 100);
  if not exists (
    select 1
    from public.inventory_events
    where inventory_batch_id = estimated_batch_id
      and type = 'consume'
      and quantity_delta = -100
      and quantity_is_estimate
  ) then
    raise exception 'FEFO consumption from an estimated batch lost estimate semantics';
  end if;

  if not exists (
    select 1
    from public.inventory_batches
    where id = estimated_batch_id
      and quantity = 650
      and quantity_is_estimate
  ) then
    raise exception 'Partial consumption unexpectedly changed batch precision';
  end if;

  delta := public.correct_inventory_batch(
    p_batch_id => estimated_batch_id,
    p_new_quantity => 650,
    p_quantity_is_estimate => false,
    p_reason => null
  );

  if delta <> 0 then
    raise exception 'Precision-only correction should return zero quantity delta';
  end if;

  if not exists (
    select 1
    from public.inventory_batches
    where id = estimated_batch_id
      and quantity = 650
      and not quantity_is_estimate
  ) then
    raise exception 'Precision-only correction did not make the batch exact';
  end if;

  if not exists (
    select 1
    from public.inventory_events
    where inventory_batch_id = estimated_batch_id
      and type = 'correction'
      and quantity_delta = 0
      and quantity_is_estimate
      and reason = 'přesnost: odhad → přesně'
  ) then
    raise exception 'Precision-only correction audit event is incomplete';
  end if;

  delta := public.correct_inventory_batch(
    p_batch_id => estimated_batch_id,
    p_new_quantity => 600,
    p_quantity_is_estimate => true,
    p_reason => 'jen od oka'
  );

  if delta <> -50 then
    raise exception 'Estimate correction returned an unexpected quantity delta';
  end if;

  if not exists (
    select 1
    from public.inventory_events
    where inventory_batch_id = estimated_batch_id
      and type = 'correction'
      and quantity_delta = -50
      and quantity_is_estimate
      and reason = 'přesnost: přesně → odhad · jen od oka'
  ) then
    raise exception 'Estimate correction audit did not preserve precision and note';
  end if;

  perform public.discard_inventory_batch(estimated_batch_id, 25, 'zbytky');
  if not exists (
    select 1
    from public.inventory_events
    where inventory_batch_id = estimated_batch_id
      and type = 'discard'
      and quantity_delta = -25
      and quantity_is_estimate
  ) then
    raise exception 'Discard from an estimated batch lost estimate semantics';
  end if;

  exact_batch_id := public.create_or_add_product_batch(
    p_household_id => household_id,
    p_storage_unit_id => fridge_id,
    p_name => 'Přesně zvážená mouka',
    p_quantity => 500,
    p_unit => 'g'
  );

  if exists (
    select 1 from public.inventory_batches where id = exact_batch_id and quantity_is_estimate
  ) then
    raise exception 'Legacy exact entry unexpectedly became approximate';
  end if;

  packaged_batch_id := public.create_or_add_product_batch(
    p_household_id => household_id,
    p_storage_unit_id => fridge_id,
    p_name => 'Jogurt balení',
    p_quantity => 600,
    p_unit => 'g',
    p_ean_code => '8591234567890',
    p_package_quantity => 150,
    p_package_unit => 'g'
  );

  select product_id into strict packaged_product_id
  from public.inventory_batches
  where id = packaged_batch_id;

  begin
    perform public.add_batch_to_product(
      p_product_id => packaged_product_id,
      p_storage_unit_id => fridge_id,
      p_quantity => 150,
      p_unit => 'g',
      p_quantity_is_estimate => true
    );
    raise exception 'Packaged product unexpectedly accepted approximate quantity';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform public.create_or_add_product_batch(
      p_household_id => household_id,
      p_storage_unit_id => fridge_id,
      p_name => 'Jiné jméno stejného EAN',
      p_quantity => 150,
      p_unit => 'g',
      p_quantity_is_estimate => true,
      p_ean_code => '8591234567890'
    );
    raise exception 'Known packaged EAN unexpectedly accepted approximate quantity';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

rollback;
