create unique index products_household_ean_unique_idx
on public.products(household_id, ean_code)
where ean_code is not null;

drop index public.products_household_ean_idx;

create or replace function public.create_product_with_batch(
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
  existing_default_unit public.inventory_unit;
  normalized_name text;
  normalized_ean text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  normalized_name := nullif(trim(p_name), '');
  normalized_ean := nullif(trim(p_ean_code), '');

  if normalized_name is null then
    raise exception 'Product name is required' using errcode = '22023';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero' using errcode = '22023';
  end if;

  if p_quantity <> round(p_quantity, 3) then
    raise exception 'Quantity supports at most three decimal places' using errcode = '22023';
  end if;

  if normalized_ean is not null and normalized_ean !~ '^[0-9]{8,14}$' then
    raise exception 'EAN must contain 8 to 14 digits' using errcode = '22023';
  end if;

  if normalized_ean is null then
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
      normalized_name,
      nullif(trim(p_brand), ''),
      null,
      nullif(trim(p_category), ''),
      nullif(trim(p_image_url), ''),
      p_unit
    )
    returning id into new_product_id;
  else
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
      normalized_name,
      nullif(trim(p_brand), ''),
      normalized_ean,
      nullif(trim(p_category), ''),
      nullif(trim(p_image_url), ''),
      p_unit
    )
    on conflict (household_id, ean_code) where ean_code is not null
    do nothing
    returning id into new_product_id;

    if new_product_id is null then
      select id, default_unit
      into new_product_id, existing_default_unit
      from public.products
      where household_id = p_household_id
        and ean_code = normalized_ean;

      if not found then
        raise exception 'Existing EAN product is not accessible' using errcode = '42501';
      end if;

      if existing_default_unit <> p_unit then
        raise exception 'Existing EAN product uses a different unit' using errcode = '22023';
      end if;
    end if;
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
