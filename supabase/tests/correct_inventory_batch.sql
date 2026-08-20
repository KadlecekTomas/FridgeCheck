begin;

insert into auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'correction-a@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'correction-b@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now());

set local role authenticated;

do $$
declare
  household_a uuid;
  storage_a uuid;
  product_a uuid;
  batch_a uuid;
  unchanged_batch uuid;
  event_count integer;
begin
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);

  household_a := public.create_household('Correction Household A');
  select id into strict storage_a
  from public.storage_units
  where household_id = household_a and name = 'Lednice';

  batch_a := public.create_product_with_batch(
    p_household_id => household_a,
    p_storage_unit_id => storage_a,
    p_name => 'Rýže',
    p_quantity => 5,
    p_unit => 'kg',
    p_expiry_type => 'unknown'
  );

  select product_id into strict product_a
  from public.inventory_batches
  where id = batch_a;

  if public.correct_inventory_batch(batch_a, 3, '  přepočítáno doma  ') <> -2 then
    raise exception 'Downward correction returned an unexpected delta';
  end if;

  if not exists (
    select 1 from public.inventory_batches
    where id = batch_a and quantity = 3 and status = 'active'
  ) then
    raise exception 'Downward correction did not update the batch';
  end if;

  if not exists (
    select 1 from public.inventory_events
    where inventory_batch_id = batch_a
      and product_id = product_a
      and type = 'correction'
      and quantity_delta = -2
      and unit = 'kg'
      and reason = 'přepočítáno doma'
      and created_by = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ) then
    raise exception 'Downward correction event was not written correctly';
  end if;

  if public.correct_inventory_batch(batch_a, 7) <> 4 then
    raise exception 'Correction without a reason returned an unexpected delta';
  end if;

  if not exists (
    select 1 from public.inventory_batches
    where id = batch_a and quantity = 7 and status = 'active'
  ) then
    raise exception 'Correction without a reason did not update the batch';
  end if;

  if not exists (
    select 1 from public.inventory_events
    where inventory_batch_id = batch_a
      and type = 'correction'
      and quantity_delta = 4
      and reason is null
  ) then
    raise exception 'Correction without a reason did not write a null-reason audit event';
  end if;

  if public.correct_inventory_batch(batch_a, 6, '   ') <> -1 then
    raise exception 'Correction with a blank reason returned an unexpected delta';
  end if;

  if not exists (
    select 1 from public.inventory_events
    where inventory_batch_id = batch_a
      and type = 'correction'
      and quantity_delta = -1
      and reason is null
  ) then
    raise exception 'Blank correction reason was not normalized to null';
  end if;

  if public.correct_inventory_batch(batch_a, 0, 've skutečnosti prázdné') <> -6 then
    raise exception 'Zero correction returned an unexpected delta';
  end if;

  if not exists (
    select 1 from public.inventory_batches
    where id = batch_a and quantity = 0 and status = 'depleted'
  ) then
    raise exception 'Zero correction did not deplete the batch';
  end if;

  begin
    perform public.correct_inventory_batch(batch_a, 1, 'restore');
    raise exception 'Correcting a depleted batch was unexpectedly allowed';
  exception
    when invalid_parameter_value then null;
  end;

  unchanged_batch := public.add_batch_to_product(
    p_product_id => product_a,
    p_storage_unit_id => storage_a,
    p_quantity => 4,
    p_unit => 'kg',
    p_expiry_type => 'unknown'
  );

  select count(*) into event_count
  from public.inventory_events
  where inventory_batch_id = unchanged_batch and type = 'correction';

  begin
    perform public.correct_inventory_batch(unchanged_batch, 4, 'no change');
    raise exception 'No-op correction was unexpectedly allowed';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.correct_inventory_batch(unchanged_batch, -1, 'negative');
    raise exception 'Negative correction was unexpectedly allowed';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.correct_inventory_batch(unchanged_batch, 1.0001, 'too precise');
    raise exception 'Over-precise correction was unexpectedly allowed';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.correct_inventory_batch(unchanged_batch, 3, repeat('x', 501));
    raise exception 'Overlong correction reason was unexpectedly allowed';
  exception
    when invalid_parameter_value then null;
  end;

  if not exists (
    select 1 from public.inventory_batches
    where id = unchanged_batch and quantity = 4 and status = 'active'
  ) then
    raise exception 'Rejected correction mutated the batch';
  end if;

  if (
    select count(*) from public.inventory_events
    where inventory_batch_id = unchanged_batch and type = 'correction'
  ) <> event_count then
    raise exception 'Rejected correction unexpectedly wrote an event';
  end if;

  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);

  begin
    perform public.correct_inventory_batch(unchanged_batch, 3, 'forged');
    raise exception 'Cross-household correction was unexpectedly allowed';
  exception
    when no_data_found then null;
  end;
end;
$$;

rollback;
