begin;

insert into auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('66666666-6666-4666-8666-666666666666', 'authenticated', 'authenticated', 'fefo-a@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('77777777-7777-4777-8777-777777777777', 'authenticated', 'authenticated', 'fefo-b@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now());

set local role authenticated;

do $$
declare
  household_a uuid;
  storage_a uuid;
  product_a uuid;
  early_batch uuid;
  later_batch uuid;
  undated_batch uuid;
  product_b uuid;
  expired_use_by_batch uuid;
  past_best_before_batch uuid;
  fresh_batch uuid;
  consume_event_count integer;
begin
  perform set_config('request.jwt.claim.sub', '66666666-6666-4666-8666-666666666666', true);

  household_a := public.create_household('FEFO Household A');
  select id into strict storage_a
  from public.storage_units
  where household_id = household_a
    and name = 'Lednice';

  early_batch := public.create_product_with_batch(
    p_household_id => household_a,
    p_storage_unit_id => storage_a,
    p_name => 'Vejce',
    p_quantity => 4,
    p_unit => 'pcs',
    p_expiry_date => current_date + 1,
    p_expiry_type => 'use_by'
  );

  select product_id into strict product_a
  from public.inventory_batches
  where id = early_batch;

  later_batch := public.add_batch_to_product(
    p_product_id => product_a,
    p_storage_unit_id => storage_a,
    p_quantity => 6,
    p_unit => 'pcs',
    p_expiry_date => current_date + 3,
    p_expiry_type => 'use_by'
  );

  undated_batch := public.add_batch_to_product(
    p_product_id => product_a,
    p_storage_unit_id => storage_a,
    p_quantity => 5,
    p_unit => 'pcs',
    p_expiry_type => 'unknown'
  );

  if public.consume_product_fefo(product_a, 7) <> 7 then
    raise exception 'FEFO RPC did not report the requested consumed quantity';
  end if;

  if not exists (
    select 1 from public.inventory_batches
    where id = early_batch and quantity = 0 and status = 'depleted'
  ) then
    raise exception 'Earliest batch was not depleted first';
  end if;

  if not exists (
    select 1 from public.inventory_batches
    where id = later_batch and quantity = 3 and status = 'active'
  ) then
    raise exception 'Later dated batch did not receive the remaining FEFO allocation';
  end if;

  if not exists (
    select 1 from public.inventory_batches
    where id = undated_batch and quantity = 5 and status = 'active'
  ) then
    raise exception 'Undated batch was consumed before dated stock';
  end if;

  if not exists (
    select 1 from public.inventory_events
    where inventory_batch_id = early_batch
      and product_id = product_a
      and type = 'consume'
      and quantity_delta = -4
      and unit = 'pcs'
      and created_by = '66666666-6666-4666-8666-666666666666'
  ) then
    raise exception 'Consume event missing for the depleted FEFO batch';
  end if;

  if not exists (
    select 1 from public.inventory_events
    where inventory_batch_id = later_batch
      and product_id = product_a
      and type = 'consume'
      and quantity_delta = -3
      and unit = 'pcs'
  ) then
    raise exception 'Consume event missing for the partially consumed FEFO batch';
  end if;

  select count(*) into consume_event_count
  from public.inventory_events
  where product_id = product_a and type = 'consume';

  begin
    perform public.consume_product_fefo(product_a, 9);
    raise exception 'Insufficient FEFO consumption was unexpectedly allowed';
  exception
    when invalid_parameter_value then null;
  end;

  if not exists (
    select 1 from public.inventory_batches
    where id = later_batch and quantity = 3 and status = 'active'
  ) or not exists (
    select 1 from public.inventory_batches
    where id = undated_batch and quantity = 5 and status = 'active'
  ) then
    raise exception 'Insufficient consumption did not roll back batch mutations';
  end if;

  if (
    select count(*) from public.inventory_events
    where product_id = product_a and type = 'consume'
  ) <> consume_event_count then
    raise exception 'Insufficient consumption did not roll back inventory events';
  end if;

  expired_use_by_batch := public.create_product_with_batch(
    p_household_id => household_a,
    p_storage_unit_id => storage_a,
    p_name => 'Skyr',
    p_quantity => 5,
    p_unit => 'pcs',
    p_expiry_date => current_date - 1,
    p_expiry_type => 'use_by'
  );

  select product_id into strict product_b
  from public.inventory_batches
  where id = expired_use_by_batch;

  past_best_before_batch := public.add_batch_to_product(
    p_product_id => product_b,
    p_storage_unit_id => storage_a,
    p_quantity => 2,
    p_unit => 'pcs',
    p_expiry_date => current_date - 1,
    p_expiry_type => 'best_before'
  );

  fresh_batch := public.add_batch_to_product(
    p_product_id => product_b,
    p_storage_unit_id => storage_a,
    p_quantity => 3,
    p_unit => 'pcs',
    p_expiry_date => current_date + 2,
    p_expiry_type => 'use_by'
  );

  perform public.consume_product_fefo(product_b, 3);

  if not exists (
    select 1 from public.inventory_batches
    where id = expired_use_by_batch and quantity = 5 and status = 'active'
  ) then
    raise exception 'Expired use-by stock was implicitly consumed';
  end if;

  if not exists (
    select 1 from public.inventory_batches
    where id = past_best_before_batch and quantity = 0 and status = 'depleted'
  ) then
    raise exception 'Past best-before stock was not treated as usable FEFO stock';
  end if;

  if not exists (
    select 1 from public.inventory_batches
    where id = fresh_batch and quantity = 2 and status = 'active'
  ) then
    raise exception 'Fresh stock did not receive the remainder after best-before stock';
  end if;

  begin
    perform public.consume_product_fefo(product_a, 0);
    raise exception 'Zero consumption was unexpectedly allowed';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.consume_product_fefo(product_a, 1.0001);
    raise exception 'Over-precise consumption was unexpectedly allowed';
  exception
    when invalid_parameter_value then null;
  end;

  perform set_config('request.jwt.claim.sub', '77777777-7777-4777-8777-777777777777', true);

  begin
    perform public.consume_product_fefo(product_a, 1);
    raise exception 'Cross-household FEFO consumption was unexpectedly allowed';
  exception
    when no_data_found then null;
  end;
end;
$$;

rollback;
