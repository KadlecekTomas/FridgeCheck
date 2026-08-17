create or replace function public.create_household(household_name text)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  new_household_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if household_name is null or length(trim(household_name)) = 0 then
    raise exception 'Household name is required' using errcode = '22023';
  end if;

  insert into public.households(name, owner_id)
  values (trim(household_name), auth.uid())
  returning id into new_household_id;

  insert into public.household_members(household_id, user_id, role)
  values (new_household_id, auth.uid(), 'owner');

  insert into public.storage_units(household_id, name, type)
  values (new_household_id, 'Lednice', 'fridge');

  return new_household_id;
end;
$$;

create function public.create_product_with_batch(
  p_household_id uuid,
  p_storage_unit_id uuid,
  p_name text,
  p_quantity numeric,
  p_unit public.inventory_unit,
  p_expiry_date date default null,
  p_expiry_type public.expiry_type default 'unknown',
  p_brand text default null,
  p_ean_code text default null,
  p_category text default null,
  p_image_url text default null,
  p_purchased_at date default current_date
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  new_product_id uuid;
  new_batch_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Product name is required' using errcode = '22023';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero' using errcode = '22023';
  end if;

  insert into public.products(
    household_id,
    name,
    brand,
    ean_code,
    category,
    image_url,
    default_unit
  )
  values (
    p_household_id,
    trim(p_name),
    nullif(trim(p_brand), ''),
    nullif(trim(p_ean_code), ''),
    nullif(trim(p_category), ''),
    nullif(trim(p_image_url), ''),
    p_unit
  )
  returning id into new_product_id;

  insert into public.inventory_batches(
    household_id,
    product_id,
    storage_unit_id,
    quantity,
    unit,
    expiry_date,
    expiry_type,
    purchased_at,
    created_by
  )
  values (
    p_household_id,
    new_product_id,
    p_storage_unit_id,
    p_quantity,
    p_unit,
    p_expiry_date,
    p_expiry_type,
    p_purchased_at,
    auth.uid()
  )
  returning id into new_batch_id;

  insert into public.inventory_events(
    household_id,
    product_id,
    inventory_batch_id,
    type,
    quantity_delta,
    unit,
    created_by
  )
  values (
    p_household_id,
    new_product_id,
    new_batch_id,
    'purchase',
    p_quantity,
    p_unit,
    auth.uid()
  );

  return new_batch_id;
end;
$$;

create function public.add_batch_to_product(
  p_product_id uuid,
  p_storage_unit_id uuid,
  p_quantity numeric,
  p_unit public.inventory_unit,
  p_expiry_date date default null,
  p_expiry_type public.expiry_type default 'unknown',
  p_purchased_at date default current_date
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  target_household_id uuid;
  target_default_unit public.inventory_unit;
  new_batch_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero' using errcode = '22023';
  end if;

  select household_id, default_unit
  into target_household_id, target_default_unit
  from public.products
  where id = p_product_id;

  if target_household_id is null then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;

  if p_unit <> target_default_unit then
    raise exception 'Batch unit must match product default unit' using errcode = '22023';
  end if;

  insert into public.inventory_batches(
    household_id,
    product_id,
    storage_unit_id,
    quantity,
    unit,
    expiry_date,
    expiry_type,
    purchased_at,
    created_by
  )
  values (
    target_household_id,
    p_product_id,
    p_storage_unit_id,
    p_quantity,
    p_unit,
    p_expiry_date,
    p_expiry_type,
    p_purchased_at,
    auth.uid()
  )
  returning id into new_batch_id;

  insert into public.inventory_events(
    household_id,
    product_id,
    inventory_batch_id,
    type,
    quantity_delta,
    unit,
    created_by
  )
  values (
    target_household_id,
    p_product_id,
    new_batch_id,
    'purchase',
    p_quantity,
    p_unit,
    auth.uid()
  );

  return new_batch_id;
end;
$$;

revoke all on function public.create_product_with_batch(uuid, uuid, text, numeric, public.inventory_unit, date, public.expiry_type, text, text, text, text, date) from public, anon, authenticated;
revoke all on function public.add_batch_to_product(uuid, uuid, numeric, public.inventory_unit, date, public.expiry_type, date) from public, anon, authenticated;
grant execute on function public.create_product_with_batch(uuid, uuid, text, numeric, public.inventory_unit, date, public.expiry_type, text, text, text, text, date) to authenticated;
grant execute on function public.add_batch_to_product(uuid, uuid, numeric, public.inventory_unit, date, public.expiry_type, date) to authenticated;
