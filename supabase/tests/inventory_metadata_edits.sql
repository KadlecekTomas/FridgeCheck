begin;

insert into auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'metadata-a@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'metadata-b@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now());

set local role authenticated;

do $$
declare
  household_a uuid;
  household_b uuid;
  fridge_a uuid;
  freezer_a uuid;
  fridge_b uuid;
  batch_a uuid;
  depleted_batch uuid;
  product_a uuid;
  event_count integer;
begin
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);

  household_a := public.create_household('Metadata Household A');
  select id into strict fridge_a from public.storage_units where household_id = household_a and name = 'Lednice';
  insert into public.storage_units(household_id, name, type) values (household_a, 'Mrazák', 'freezer') returning id into freezer_a;

  batch_a := public.create_product_with_batch(
    p_household_id => household_a,
    p_storage_unit_id => fridge_a,
    p_name => 'Jogurt',
    p_quantity => 4,
    p_unit => 'pcs',
    p_expiry_date => '2026-08-22',
    p_expiry_type => 'use_by',
    p_brand => 'Původní značka',
    p_category => 'Mléčné'
  );

  select product_id into strict product_a from public.inventory_batches where id = batch_a;

  if public.update_product_metadata(product_a, '  Bílý jogurt  ', '  Nová značka  ', '8591234567890', '  Jogurty  ') <> product_a then
    raise exception 'Product metadata update returned an unexpected product id';
  end if;

  if not exists (
    select 1 from public.products
    where id = product_a and name = 'Bílý jogurt' and brand = 'Nová značka'
      and ean_code = '8591234567890' and category = 'Jogurty' and default_unit = 'pcs'
  ) then
    raise exception 'Product metadata was not normalized and updated correctly';
  end if;

  begin
    perform public.update_product_metadata(product_a, '   ', null, null, null);
    raise exception 'Blank product name was unexpectedly allowed';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform public.update_product_metadata(product_a, repeat('x', 201), null, null, null);
    raise exception 'Overlong product name was unexpectedly allowed';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform public.update_product_metadata(product_a, 'Bílý jogurt', null, 'abc', null);
    raise exception 'Malformed EAN was unexpectedly allowed';
  exception when invalid_parameter_value then null;
  end;

  if not exists (
    select 1 from public.products
    where id = product_a and name = 'Bílý jogurt' and brand = 'Nová značka' and ean_code = '8591234567890'
  ) then
    raise exception 'Rejected product edit unexpectedly mutated metadata';
  end if;

  select count(*) into event_count
  from public.inventory_events
  where inventory_batch_id = batch_a and type in ('move', 'correction');

  if public.update_inventory_batch_details(
    p_batch_id => batch_a,
    p_storage_unit_id => freezer_a,
    p_expiry_type => 'best_before',
    p_expiry_date => '2026-08-25',
    p_reason => '  opraven štítek a přesunuto  '
  ) <> batch_a then
    raise exception 'Batch metadata update returned an unexpected batch id';
  end if;

  if not exists (
    select 1 from public.inventory_batches
    where id = batch_a and storage_unit_id = freezer_a and expiry_type = 'best_before'
      and expiry_date = '2026-08-25' and quantity = 4 and status = 'active'
  ) then
    raise exception 'Batch storage/expiry update did not preserve quantity and status';
  end if;

  if not exists (
    select 1 from public.inventory_events
    where inventory_batch_id = batch_a and product_id = product_a and type = 'move'
      and quantity_delta is null and unit is null
      and reason = 'Lednice → Mrazák · opraven štítek a přesunuto'
      and created_by = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ) then
    raise exception 'Storage move event was not written correctly';
  end if;

  if not exists (
    select 1 from public.inventory_events
    where inventory_batch_id = batch_a and product_id = product_a and type = 'correction'
      and quantity_delta is null and unit is null
      and reason = 'spotřebujte do 2026-08-22 → min. trvanlivost 2026-08-25 · opraven štítek a přesunuto'
      and created_by = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ) then
    raise exception 'Expiry correction event was not written correctly';
  end if;

  if (select count(*) from public.inventory_events where inventory_batch_id = batch_a and type in ('move', 'correction')) <> event_count + 2 then
    raise exception 'Combined batch edit wrote an unexpected number of audit events';
  end if;

  select count(*) into event_count
  from public.inventory_events
  where inventory_batch_id = batch_a and type in ('move', 'correction');

  begin
    perform public.update_inventory_batch_details(batch_a, freezer_a, 'best_before', '2026-08-25', 'beze změny');
    raise exception 'No-op batch metadata edit was unexpectedly allowed';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform public.update_inventory_batch_details(batch_a, freezer_a, 'use_by', null, 'chybí datum');
    raise exception 'Inconsistent expiry edit was unexpectedly allowed';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform public.update_inventory_batch_details(batch_a, freezer_a, 'unknown', null, '   ');
    raise exception 'Blank edit reason was unexpectedly allowed';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform public.update_inventory_batch_details(batch_a, freezer_a, 'unknown', null, repeat('x', 501));
    raise exception 'Overlong edit reason was unexpectedly allowed';
  exception when invalid_parameter_value then null;
  end;

  if (select count(*) from public.inventory_events where inventory_batch_id = batch_a and type in ('move', 'correction')) <> event_count then
    raise exception 'Rejected batch edits unexpectedly wrote audit events';
  end if;

  depleted_batch := public.add_batch_to_product(
    p_product_id => product_a,
    p_storage_unit_id => freezer_a,
    p_quantity => 1,
    p_unit => 'pcs',
    p_expiry_type => 'unknown'
  );
  perform public.correct_inventory_batch(depleted_batch, 0, 'prázdné');

  begin
    perform public.update_inventory_batch_details(depleted_batch, freezer_a, 'best_before', '2026-09-01', 'historie se nemění');
    raise exception 'Editing a depleted batch was unexpectedly allowed';
  exception when invalid_parameter_value then null;
  end;

  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);
  household_b := public.create_household('Metadata Household B');
  select id into strict fridge_b from public.storage_units where household_id = household_b and name = 'Lednice';

  begin
    perform public.update_product_metadata(product_a, 'Cizí změna', null, null, null);
    raise exception 'Cross-household product edit was unexpectedly allowed';
  exception when no_data_found then null;
  end;

  begin
    perform public.update_inventory_batch_details(batch_a, fridge_b, 'unknown', null, 'cizí změna');
    raise exception 'Cross-household batch edit was unexpectedly allowed';
  exception when no_data_found then null;
  end;

  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);

  begin
    perform public.update_inventory_batch_details(batch_a, fridge_b, 'unknown', null, 'cizí úložiště');
    raise exception 'Foreign storage id was unexpectedly accepted';
  exception when invalid_parameter_value then null;
  end;

  if not exists (
    select 1 from public.inventory_batches
    where id = batch_a and storage_unit_id = freezer_a and expiry_type = 'best_before' and expiry_date = '2026-08-25'
  ) then
    raise exception 'Rejected cross-household edit mutated the batch';
  end if;
end;
$$;

rollback;
