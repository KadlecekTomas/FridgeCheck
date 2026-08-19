begin;

insert into auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'approx-a@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'approx-b@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now());

set local role authenticated;

do $$
declare
  household_a uuid;
  household_b uuid;
  storage_a uuid;
  batch_a uuid;
  product_a uuid;
  returned_quantity numeric;
  event_count integer;
begin
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);

  household_a := public.create_household('Approx Household A');
  select id into strict storage_a
  from public.storage_units
  where household_id = household_a and name = 'Lednice';

  batch_a := public.create_product_with_batch(
    p_household_id => household_a,
    p_storage_unit_id => storage_a,
    p_name => 'Ovesné vločky',
    p_quantity => 500,
    p_unit => 'g',
    p_expiry_type => 'unknown'
  );

  select product_id into strict product_a
  from public.inventory_batches
  where id = batch_a;

  if not exists (
    select 1
    from public.inventory_batches
    where id = batch_a
      and quantity = 500
      and initial_quantity = 500
      and quantity_precision = 'exact'
  ) then
    raise exception 'New batch did not preserve its initial exact quantity';
  end if;

  returned_quantity := public.estimate_inventory_batch(batch_a, 'half');
  if returned_quantity <> 250 then
    raise exception 'Half estimate returned %, expected 250', returned_quantity;
  end if;

  if not exists (
    select 1
    from public.inventory_batches
    where id = batch_a
      and quantity = 250
      and initial_quantity = 500
      and quantity_precision = 'estimated'
      and status = 'active'
  ) then
    raise exception 'Half estimate did not persist explicit estimated state';
  end if;

  if not exists (
    select 1
    from public.inventory_events
    where inventory_batch_id = batch_a
      and type = 'correction'
      and quantity_delta = -250
      and unit = 'g'
      and reason = 'Rychlý odhad: přibližně polovina'
  ) then
    raise exception 'Half estimate audit event is missing or incorrect';
  end if;

  returned_quantity := public.estimate_inventory_batch(batch_a, 'low');
  if returned_quantity <> 100 then
    raise exception 'Low estimate returned %, expected 100', returned_quantity;
  end if;

  if not exists (
    select 1
    from public.inventory_batches
    where id = batch_a
      and quantity = 100
      and initial_quantity = 500
      and quantity_precision = 'estimated'
  ) then
    raise exception 'Low estimate did not derive from immutable initial quantity';
  end if;

  returned_quantity := public.estimate_inventory_batch(batch_a, 'full');
  if returned_quantity <> 500 then
    raise exception 'Full estimate returned %, expected 500', returned_quantity;
  end if;

  if not exists (
    select 1
    from public.inventory_batches
    where id = batch_a
      and quantity = 500
      and initial_quantity = 500
      and quantity_precision = 'estimated'
  ) then
    raise exception 'Full estimate must remain explicitly estimated';
  end if;

  select count(*) into event_count
  from public.inventory_events
  where inventory_batch_id = batch_a and type = 'correction';

  if public.correct_inventory_batch(batch_a, 500, 'převáženo přesně') <> 0 then
    raise exception 'Exactifying the same numeric quantity should return zero delta';
  end if;

  if not exists (
    select 1
    from public.inventory_batches
    where id = batch_a
      and quantity = 500
      and initial_quantity = 500
      and quantity_precision = 'exact'
  ) then
    raise exception 'Manual correction did not replace estimate with exact state';
  end if;

  if (
    select count(*)
    from public.inventory_events
    where inventory_batch_id = batch_a and type = 'correction'
  ) <> event_count + 1 then
    raise exception 'Exactifying an estimate should write one audit event';
  end if;

  begin
    perform public.correct_inventory_batch(batch_a, 500, 'beze změny');
    raise exception 'Exact no-op correction was unexpectedly allowed';
  exception
    when invalid_parameter_value then null;
  end;

  perform public.estimate_inventory_batch(batch_a, 'half');
  perform public.consume_product_fefo(product_a, 50);

  if not exists (
    select 1
    from public.inventory_batches
    where id = batch_a
      and quantity = 200
      and quantity_precision = 'estimated'
  ) then
    raise exception 'Partial consumption must preserve estimated precision of the remainder';
  end if;

  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);
  household_b := public.create_household('Approx Household B');

  begin
    perform public.estimate_inventory_batch(batch_a, 'low');
    raise exception 'Cross-household estimate was unexpectedly allowed';
  exception
    when no_data_found then null;
  end;

  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);

  if not exists (
    select 1
    from public.inventory_batches
    where id = batch_a
      and quantity = 200
      and initial_quantity = 500
      and quantity_precision = 'estimated'
  ) then
    raise exception 'Rejected cross-household estimate mutated the batch';
  end if;
end;
$$;

rollback;
