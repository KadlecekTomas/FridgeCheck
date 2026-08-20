begin;

insert into auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('66666666-6666-4666-8666-666666666666', 'authenticated', 'authenticated', 'mixed-expiry-a@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('77777777-7777-4777-8777-777777777777', 'authenticated', 'authenticated', 'mixed-expiry-b@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now());

set local role authenticated;

do $$
declare
  household_a uuid;
  household_b uuid;
  storage_a uuid;
  storage_b uuid;
  target_product_id uuid;
  repeated_product_id uuid;
  before_batch_count integer;
  before_event_count integer;
begin
  perform set_config('request.jwt.claim.sub', '66666666-6666-4666-8666-666666666666', true);

  household_a := public.create_household('Mixed expiry A');
  select id into strict storage_a
  from public.storage_units
  where household_id = household_a
    and name = 'Lednice';

  target_product_id := public.save_product_expiry_batches(
    p_household_id => household_a,
    p_storage_unit_id => storage_a,
    p_unit => 'g',
    p_batches => jsonb_build_array(
      jsonb_build_object('quantity', 1000, 'expiry_type', 'use_by', 'expiry_date', (current_date + 5)::text),
      jsonb_build_object('quantity', 800, 'expiry_type', 'use_by', 'expiry_date', (current_date + 12)::text),
      jsonb_build_object('quantity', 600, 'expiry_type', 'use_by', 'expiry_date', (current_date + 20)::text)
    ),
    p_name => 'Eidam mixed expiry',
    p_ean_code => '8599876543210',
    p_package_quantity => 100,
    p_package_unit => 'g'
  );

  if target_product_id is null then
    raise exception 'Expected product id from mixed expiry save';
  end if;

  if (select count(*) from public.products where household_id = household_a and ean_code = '8599876543210') <> 1 then
    raise exception 'Mixed expiry save did not create exactly one product';
  end if;

  if not exists (
    select 1
    from public.products
    where id = target_product_id
      and package_quantity = 100
      and package_unit = 'g'
      and default_unit = 'g'
  ) then
    raise exception 'Package metadata was not preserved';
  end if;

  if (select count(*) from public.inventory_batches where product_id = target_product_id) <> 3 then
    raise exception 'Expected three expiry-specific batches';
  end if;

  if not exists (
    select 1 from public.inventory_batches
    where product_id = target_product_id and quantity = 1000 and expiry_date = current_date + 5 and expiry_type = 'use_by'
  ) or not exists (
    select 1 from public.inventory_batches
    where product_id = target_product_id and quantity = 800 and expiry_date = current_date + 12 and expiry_type = 'use_by'
  ) or not exists (
    select 1 from public.inventory_batches
    where product_id = target_product_id and quantity = 600 and expiry_date = current_date + 20 and expiry_type = 'use_by'
  ) then
    raise exception 'Mixed expiry quantities or dates were not stored correctly';
  end if;

  if (select count(*) from public.inventory_events where product_id = target_product_id and type = 'purchase') <> 3 then
    raise exception 'Expected one purchase event for every mixed-expiry batch';
  end if;

  repeated_product_id := public.save_product_expiry_batches(
    p_household_id => household_a,
    p_storage_unit_id => storage_a,
    p_unit => 'g',
    p_batches => jsonb_build_array(
      jsonb_build_object('quantity', 200, 'expiry_type', 'best_before', 'expiry_date', (current_date + 30)::text),
      jsonb_build_object('quantity', 100, 'expiry_type', 'best_before', 'expiry_date', (current_date + 45)::text)
    ),
    p_name => 'Duplicate name must not replace local product',
    p_ean_code => '8599876543210',
    p_package_quantity => 100,
    p_package_unit => 'g'
  );

  if repeated_product_id <> target_product_id then
    raise exception 'Repeated EAN did not reuse the household product';
  end if;

  if (select count(*) from public.products where household_id = household_a and ean_code = '8599876543210') <> 1 then
    raise exception 'Repeated mixed-expiry EAN duplicated the product';
  end if;

  if (select count(*) from public.inventory_batches where product_id = target_product_id) <> 5 then
    raise exception 'Repeated mixed-expiry save did not add both physical batches';
  end if;

  perform public.save_product_expiry_batches(
    p_household_id => household_a,
    p_storage_unit_id => storage_a,
    p_unit => 'g',
    p_batches => jsonb_build_array(
      jsonb_build_object('quantity', 300, 'expiry_type', 'use_by', 'expiry_date', (current_date + 60)::text),
      jsonb_build_object('quantity', 400, 'expiry_type', 'use_by', 'expiry_date', (current_date + 70)::text)
    ),
    p_product_id => target_product_id
  );

  if (select count(*) from public.inventory_batches where product_id = target_product_id) <> 7 then
    raise exception 'Existing-product mixed-expiry save did not add both batches';
  end if;

  select count(*) into before_batch_count from public.inventory_batches where product_id = target_product_id;
  select count(*) into before_event_count from public.inventory_events where product_id = target_product_id and type = 'purchase';

  begin
    perform public.save_product_expiry_batches(
      p_household_id => household_a,
      p_storage_unit_id => storage_a,
      p_unit => 'g',
      p_batches => jsonb_build_array(
        jsonb_build_object('quantity', 100, 'expiry_type', 'use_by', 'expiry_date', (current_date + 80)::text),
        jsonb_build_object('quantity', -100, 'expiry_type', 'use_by', 'expiry_date', (current_date + 90)::text)
      ),
      p_product_id => target_product_id
    );
    raise exception 'Invalid mixed-expiry group was unexpectedly accepted';
  exception
    when invalid_parameter_value then null;
  end;

  if (select count(*) from public.inventory_batches where product_id = target_product_id) <> before_batch_count then
    raise exception 'Invalid mixed-expiry request partially wrote a batch';
  end if;
  if (select count(*) from public.inventory_events where product_id = target_product_id and type = 'purchase') <> before_event_count then
    raise exception 'Invalid mixed-expiry request partially wrote a purchase event';
  end if;

  begin
    perform public.save_product_expiry_batches(
      p_household_id => household_a,
      p_storage_unit_id => storage_a,
      p_unit => 'g',
      p_batches => jsonb_build_array(
        jsonb_build_object('quantity', 100, 'expiry_type', 'use_by', 'expiry_date', (current_date + 1)::text)
      ),
      p_product_id => target_product_id
    );
    raise exception 'A single group was unexpectedly accepted by the mixed-expiry RPC';
  exception
    when invalid_parameter_value then null;
  end;

  perform set_config('request.jwt.claim.sub', '77777777-7777-4777-8777-777777777777', true);
  household_b := public.create_household('Mixed expiry B');
  select id into strict storage_b
  from public.storage_units
  where household_id = household_b
    and name = 'Lednice';

  perform set_config('request.jwt.claim.sub', '66666666-6666-4666-8666-666666666666', true);

  begin
    perform public.save_product_expiry_batches(
      p_household_id => household_a,
      p_storage_unit_id => storage_b,
      p_unit => 'g',
      p_batches => jsonb_build_array(
        jsonb_build_object('quantity', 100, 'expiry_type', 'use_by', 'expiry_date', (current_date + 1)::text),
        jsonb_build_object('quantity', 100, 'expiry_type', 'use_by', 'expiry_date', (current_date + 2)::text)
      ),
      p_product_id => target_product_id
    );
    raise exception 'Cross-household storage was unexpectedly accepted';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

rollback;
