begin;

insert into auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('88888888-8888-4888-8888-888888888888', 'authenticated', 'authenticated', 'discard-a@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('99999999-9999-4999-8999-999999999999', 'authenticated', 'authenticated', 'discard-b@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now());

set local role authenticated;

do $$
declare
  household_a uuid;
  storage_a uuid;
  product_a uuid;
  batch_a uuid;
  rollback_batch uuid;
  events_before integer;
begin
  perform set_config('request.jwt.claim.sub', '88888888-8888-4888-8888-888888888888', true);

  household_a := public.create_household('Discard Household A');
  select id into strict storage_a
  from public.storage_units
  where household_id = household_a and name = 'Lednice';

  batch_a := public.create_product_with_batch(
    p_household_id => household_a,
    p_storage_unit_id => storage_a,
    p_name => 'Skyr',
    p_quantity => 5,
    p_unit => 'pcs',
    p_expiry_date => current_date - 1,
    p_expiry_type => 'use_by'
  );

  select product_id into strict product_a
  from public.inventory_batches
  where id = batch_a;

  if public.discard_inventory_batch(batch_a, 2, '  po expiraci  ') <> 2 then
    raise exception 'Discard RPC did not report the requested quantity';
  end if;

  if not exists (
    select 1 from public.inventory_batches
    where id = batch_a and quantity = 3 and status = 'active'
  ) then
    raise exception 'Partial discard did not leave the remaining batch active';
  end if;

  if not exists (
    select 1 from public.inventory_events
    where inventory_batch_id = batch_a
      and product_id = product_a
      and type = 'discard'
      and quantity_delta = -2
      and unit = 'pcs'
      and reason = 'po expiraci'
      and created_by = '88888888-8888-4888-8888-888888888888'
  ) then
    raise exception 'Partial discard event was not written correctly';
  end if;

  perform public.discard_inventory_batch(batch_a, 3, null);

  if not exists (
    select 1 from public.inventory_batches
    where id = batch_a and quantity = 0 and status = 'discarded'
  ) then
    raise exception 'Full discard did not mark the batch discarded';
  end if;

  if (
    select count(*) from public.inventory_events
    where inventory_batch_id = batch_a and type = 'discard'
  ) <> 2 then
    raise exception 'Expected exactly two discard events for the batch';
  end if;

  begin
    perform public.discard_inventory_batch(batch_a, 1, null);
    raise exception 'Discarding an already discarded batch was unexpectedly allowed';
  exception
    when invalid_parameter_value then null;
  end;

  rollback_batch := public.add_batch_to_product(
    p_product_id => product_a,
    p_storage_unit_id => storage_a,
    p_quantity => 4,
    p_unit => 'pcs',
    p_expiry_date => current_date + 2,
    p_expiry_type => 'use_by'
  );

  select count(*) into events_before
  from public.inventory_events
  where inventory_batch_id = rollback_batch and type = 'discard';

  begin
    perform public.discard_inventory_batch(rollback_batch, 5, 'too much');
    raise exception 'Over-discard was unexpectedly allowed';
  exception
    when invalid_parameter_value then null;
  end;

  if not exists (
    select 1 from public.inventory_batches
    where id = rollback_batch and quantity = 4 and status = 'active'
  ) then
    raise exception 'Over-discard did not preserve the batch';
  end if;

  if (
    select count(*) from public.inventory_events
    where inventory_batch_id = rollback_batch and type = 'discard'
  ) <> events_before then
    raise exception 'Over-discard unexpectedly wrote an event';
  end if;

  begin
    perform public.discard_inventory_batch(rollback_batch, 0, null);
    raise exception 'Zero discard was unexpectedly allowed';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.discard_inventory_batch(rollback_batch, 1.0001, null);
    raise exception 'Over-precise discard was unexpectedly allowed';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.discard_inventory_batch(rollback_batch, 1, repeat('x', 501));
    raise exception 'Overlong discard reason was unexpectedly allowed';
  exception
    when invalid_parameter_value then null;
  end;

  perform set_config('request.jwt.claim.sub', '99999999-9999-4999-8999-999999999999', true);

  begin
    perform public.discard_inventory_batch(rollback_batch, 1, null);
    raise exception 'Cross-household discard was unexpectedly allowed';
  exception
    when no_data_found then null;
  end;
end;
$$;

rollback;
