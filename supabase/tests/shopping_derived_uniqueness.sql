begin;

insert into auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('88888888-8888-4888-8888-888888888888', 'authenticated', 'authenticated', 'shopping-unique@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now());

set local role authenticated;

do $$
declare
  target_household_id uuid;
  target_storage_id uuid;
  target_batch_id uuid;
  target_product_id uuid;
  first_item_id uuid;
  second_item_id uuid;
begin
  perform set_config('request.jwt.claim.sub', '88888888-8888-4888-8888-888888888888', true);

  target_household_id := public.create_household('Shopping uniqueness household');

  select id into strict target_storage_id
  from public.storage_units
  where household_id = target_household_id
  order by created_at
  limit 1;

  target_batch_id := public.create_or_add_product_batch(
    p_household_id => target_household_id,
    p_storage_unit_id => target_storage_id,
    p_name => 'Eidam shopping uniqueness',
    p_quantity => 100,
    p_unit => 'g',
    p_ean_code => '8591111111111',
    p_package_quantity => 100,
    p_package_unit => 'g'
  );

  select ib.product_id into strict target_product_id
  from public.inventory_batches ib
  where ib.id = target_batch_id;

  insert into public.shopping_list_items(
    household_id,
    product_id,
    name,
    quantity,
    unit,
    source,
    checked,
    created_by
  )
  values (
    target_household_id,
    target_product_id,
    'Eidam shopping uniqueness',
    500,
    'g',
    'derived',
    false,
    auth.uid()
  )
  returning id into first_item_id;

  begin
    insert into public.shopping_list_items(
      household_id,
      product_id,
      name,
      quantity,
      unit,
      source,
      checked,
      created_by
    )
    values (
      target_household_id,
      target_product_id,
      'Duplicate derived item',
      500,
      'g',
      'derived',
      false,
      auth.uid()
    );
    raise exception 'Second open derived item was unexpectedly accepted';
  exception
    when unique_violation then null;
  end;

  update public.shopping_list_items
  set checked = true
  where id = first_item_id;

  insert into public.shopping_list_items(
    household_id,
    product_id,
    name,
    quantity,
    unit,
    source,
    checked,
    created_by
  )
  values (
    target_household_id,
    target_product_id,
    'Eidam shopping uniqueness',
    600,
    'g',
    'derived',
    false,
    auth.uid()
  )
  returning id into second_item_id;

  if second_item_id = first_item_id then
    raise exception 'Expected a distinct new open item after completing the first one';
  end if;

  begin
    update public.shopping_list_items
    set checked = false
    where id = first_item_id;
    raise exception 'Reopening a completed duplicate was unexpectedly accepted';
  exception
    when unique_violation then null;
  end;

  if not exists (
    select 1
    from public.shopping_list_items sli
    where sli.id = first_item_id
      and sli.checked = true
  ) then
    raise exception 'Failed reopen unexpectedly changed the completed item';
  end if;

  if not exists (
    select 1
    from public.shopping_list_items sli
    where sli.id = second_item_id
      and sli.checked = false
  ) then
    raise exception 'Open derived item was lost after failed reopen';
  end if;

  insert into public.shopping_list_items(
    household_id,
    product_id,
    name,
    source,
    checked,
    created_by
  )
  values (
    target_household_id,
    target_product_id,
    'Manual note for same product',
    'manual',
    false,
    auth.uid()
  );

  if (
    select count(*)
    from public.shopping_list_items sli
    where sli.household_id = target_household_id
      and sli.product_id = target_product_id
      and sli.checked = false
  ) <> 2 then
    raise exception 'Partial unique index unexpectedly blocked a manual shopping decision';
  end if;
end;
$$;

rollback;
