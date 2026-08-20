create function public.save_product_expiry_batches(
  p_household_id uuid,
  p_storage_unit_id uuid,
  p_unit public.inventory_unit,
  p_batches jsonb,
  p_product_id uuid default null,
  p_name text default null,
  p_brand text default null,
  p_ean_code text default null,
  p_category text default null,
  p_image_url text default null,
  p_package_quantity numeric default null,
  p_package_unit public.inventory_unit default null,
  p_purchased_at date default current_date
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  batch_value jsonb;
  batch_quantity numeric;
  batch_expiry_type public.expiry_type;
  batch_expiry_date date;
  target_product_id uuid := p_product_id;
  target_household_id uuid;
  target_unit public.inventory_unit;
  first_batch_id uuid;
  created_batch_id uuid;
  batch_index integer := 0;
  batch_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_batches is null or jsonb_typeof(p_batches) <> 'array' then
    raise exception 'Batches must be a JSON array' using errcode = '22023';
  end if;

  batch_count := jsonb_array_length(p_batches);
  if batch_count < 2 then
    raise exception 'At least two expiry batches are required' using errcode = '22023';
  end if;
  if batch_count > 50 then
    raise exception 'At most 50 expiry batches are allowed' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.storage_units
    where id = p_storage_unit_id
      and household_id = p_household_id
  ) then
    raise exception 'Storage unit does not belong to household' using errcode = '42501';
  end if;

  if target_product_id is not null then
    select household_id, default_unit
    into target_household_id, target_unit
    from public.products
    where id = target_product_id;

    if target_household_id is null then
      raise exception 'Product not found' using errcode = 'P0002';
    end if;
    if target_household_id <> p_household_id then
      raise exception 'Product does not belong to household' using errcode = '42501';
    end if;
    if target_unit <> p_unit then
      raise exception 'Batch unit must match product default unit' using errcode = '22023';
    end if;
  elsif p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Product name is required' using errcode = '22023';
  end if;

  -- Validate every group before the first write. A later runtime failure still rolls
  -- the whole RPC back because the function executes in one database transaction.
  for batch_value in select value from jsonb_array_elements(p_batches)
  loop
    begin
      batch_quantity := (batch_value ->> 'quantity')::numeric;
    exception
      when invalid_text_representation then
        raise exception 'Batch quantity must be numeric' using errcode = '22023';
    end;

    if batch_quantity is null or batch_quantity <= 0 then
      raise exception 'Batch quantity must be greater than zero' using errcode = '22023';
    end if;

    begin
      batch_expiry_type := (batch_value ->> 'expiry_type')::public.expiry_type;
    exception
      when invalid_text_representation then
        raise exception 'Invalid expiry type' using errcode = '22023';
    end;

    if batch_expiry_type is null or batch_expiry_type = 'unknown' then
      raise exception 'Split expiry batches require a known expiry type' using errcode = '22023';
    end if;

    if nullif(batch_value ->> 'expiry_date', '') is null then
      raise exception 'Split expiry batches require a date' using errcode = '22023';
    end if;

    begin
      batch_expiry_date := (batch_value ->> 'expiry_date')::date;
    exception
      when invalid_datetime_format or datetime_field_overflow then
        raise exception 'Invalid expiry date' using errcode = '22023';
    end;
  end loop;

  if target_product_id is null then
    batch_value := p_batches -> 0;
    batch_quantity := (batch_value ->> 'quantity')::numeric;
    batch_expiry_type := (batch_value ->> 'expiry_type')::public.expiry_type;
    batch_expiry_date := (batch_value ->> 'expiry_date')::date;

    first_batch_id := public.create_or_add_product_batch(
      p_household_id => p_household_id,
      p_storage_unit_id => p_storage_unit_id,
      p_name => p_name,
      p_quantity => batch_quantity,
      p_unit => p_unit,
      p_expiry_date => batch_expiry_date,
      p_expiry_type => batch_expiry_type,
      p_brand => p_brand,
      p_ean_code => p_ean_code,
      p_category => p_category,
      p_image_url => p_image_url,
      p_package_quantity => p_package_quantity,
      p_package_unit => p_package_unit,
      p_purchased_at => p_purchased_at
    );

    select product_id
    into strict target_product_id
    from public.inventory_batches
    where id = first_batch_id;

    batch_index := 1;
  end if;

  while batch_index < batch_count loop
    batch_value := p_batches -> batch_index;
    batch_quantity := (batch_value ->> 'quantity')::numeric;
    batch_expiry_type := (batch_value ->> 'expiry_type')::public.expiry_type;
    batch_expiry_date := (batch_value ->> 'expiry_date')::date;

    created_batch_id := public.add_batch_to_product(
      p_product_id => target_product_id,
      p_storage_unit_id => p_storage_unit_id,
      p_quantity => batch_quantity,
      p_unit => p_unit,
      p_expiry_date => batch_expiry_date,
      p_expiry_type => batch_expiry_type,
      p_purchased_at => p_purchased_at
    );

    if created_batch_id is null then
      raise exception 'Batch creation failed';
    end if;

    batch_index := batch_index + 1;
  end loop;

  return target_product_id;
end;
$$;

revoke all on function public.save_product_expiry_batches(
  uuid,
  uuid,
  public.inventory_unit,
  jsonb,
  uuid,
  text,
  text,
  text,
  text,
  text,
  numeric,
  public.inventory_unit,
  date
) from public, anon, authenticated;

grant execute on function public.save_product_expiry_batches(
  uuid,
  uuid,
  public.inventory_unit,
  jsonb,
  uuid,
  text,
  text,
  text,
  text,
  text,
  numeric,
  public.inventory_unit,
  date
) to authenticated;
