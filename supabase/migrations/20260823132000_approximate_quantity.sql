alter table public.inventory_batches
  add column quantity_is_approximate boolean not null default false;

drop function if exists public.save_product_expiry_batches(
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
);

drop function if exists public.create_or_add_product_batch(
  uuid,
  uuid,
  text,
  numeric,
  public.inventory_unit,
  date,
  public.expiry_type,
  text,
  text,
  text,
  text,
  numeric,
  public.inventory_unit,
  date
);

drop function if exists public.add_batch_to_product(
  uuid,
  uuid,
  numeric,
  public.inventory_unit,
  date,
  public.expiry_type,
  date
);

drop function if exists public.correct_inventory_batch(uuid, numeric, text);

create function public.create_or_add_product_batch(
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
  p_package_quantity numeric default null,
  p_package_unit public.inventory_unit default null,
  p_purchased_at date default current_date,
  p_quantity_is_approximate boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  normalized_ean text := nullif(trim(p_ean_code), '');
  product_id uuid;
  product_unit public.inventory_unit;
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

  if normalized_ean is not null and normalized_ean !~ '^[0-9]{8,14}$' then
    raise exception 'EAN must contain 8 to 14 digits' using errcode = '22023';
  end if;

  if (p_package_quantity is null) <> (p_package_unit is null) then
    raise exception 'Package quantity and unit must be provided together' using errcode = '22023';
  end if;

  if p_package_quantity is not null and p_package_quantity <= 0 then
    raise exception 'Package quantity must be greater than zero' using errcode = '22023';
  end if;

  if p_package_unit is not null and p_package_unit <> p_unit then
    raise exception 'Package unit must match product unit' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.storage_units
    where id = p_storage_unit_id
      and household_id = p_household_id
  ) then
    raise exception 'Storage unit does not belong to household' using errcode = '42501';
  end if;

  if normalized_ean is not null then
    select id, default_unit
    into product_id, product_unit
    from public.products
    where household_id = p_household_id
      and ean_code = normalized_ean
    limit 1;
  end if;

  if product_id is null then
    begin
      insert into public.products(
        household_id,
        name,
        brand,
        ean_code,
        category,
        image_url,
        default_unit,
        package_quantity,
        package_unit
      )
      values (
        p_household_id,
        trim(p_name),
        nullif(trim(p_brand), ''),
        normalized_ean,
        nullif(trim(p_category), ''),
        nullif(trim(p_image_url), ''),
        p_unit,
        p_package_quantity,
        p_package_unit
      )
      returning id, default_unit into product_id, product_unit;
    exception
      when unique_violation then
        if normalized_ean is null then
          raise;
        end if;

        select id, default_unit
        into strict product_id, product_unit
        from public.products
        where household_id = p_household_id
          and ean_code = normalized_ean;
    end;
  end if;

  if product_unit <> p_unit then
    raise exception 'Batch unit must match product default unit' using errcode = '22023';
  end if;

  insert into public.inventory_batches(
    household_id,
    product_id,
    storage_unit_id,
    quantity,
    quantity_is_approximate,
    unit,
    expiry_date,
    expiry_type,
    purchased_at,
    created_by
  )
  values (
    p_household_id,
    product_id,
    p_storage_unit_id,
    p_quantity,
    coalesce(p_quantity_is_approximate, false),
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
    product_id,
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
  p_purchased_at date default current_date,
  p_quantity_is_approximate boolean default false
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

  if not exists (
    select 1
    from public.storage_units
    where id = p_storage_unit_id
      and household_id = target_household_id
  ) then
    raise exception 'Storage unit does not belong to product household' using errcode = '42501';
  end if;

  insert into public.inventory_batches(
    household_id,
    product_id,
    storage_unit_id,
    quantity,
    quantity_is_approximate,
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
    coalesce(p_quantity_is_approximate, false),
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
  p_purchased_at date default current_date,
  p_quantity_is_approximate boolean default false
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
      p_purchased_at => p_purchased_at,
      p_quantity_is_approximate => p_quantity_is_approximate
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
      p_purchased_at => p_purchased_at,
      p_quantity_is_approximate => p_quantity_is_approximate
    );

    if created_batch_id is null then
      raise exception 'Batch creation failed';
    end if;

    batch_index := batch_index + 1;
  end loop;

  return target_product_id;
end;
$$;

create function public.correct_inventory_batch(
  p_batch_id uuid,
  p_new_quantity numeric,
  p_reason text default null,
  p_quantity_is_approximate boolean default false
)
returns numeric
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  target_household_id uuid;
  target_product_id uuid;
  target_quantity numeric(14,3);
  target_quantity_is_approximate boolean;
  target_unit public.inventory_unit;
  target_status public.batch_status;
  normalized_reason text;
  audit_reason text;
  precision_note text;
  quantity_delta numeric(14,3);
  next_quantity_is_approximate boolean := coalesce(p_quantity_is_approximate, false);
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_new_quantity is null or p_new_quantity < 0 then
    raise exception 'New quantity must be zero or greater' using errcode = '22023';
  end if;

  if p_new_quantity <> round(p_new_quantity, 3) then
    raise exception 'Quantity supports at most three decimal places' using errcode = '22023';
  end if;

  normalized_reason := nullif(trim(p_reason), '');
  if normalized_reason is not null and length(normalized_reason) > 500 then
    raise exception 'Reason must be 500 characters or fewer' using errcode = '22023';
  end if;

  select household_id, product_id, quantity, quantity_is_approximate, unit, status
  into target_household_id, target_product_id, target_quantity, target_quantity_is_approximate, target_unit, target_status
  from public.inventory_batches
  where id = p_batch_id
  for update;

  if not found then
    raise exception 'Batch not found or inaccessible' using errcode = 'P0002';
  end if;

  if target_status <> 'active' or target_quantity <= 0 then
    raise exception 'Only active stock can be corrected' using errcode = '22023';
  end if;

  quantity_delta := p_new_quantity - target_quantity;
  if quantity_delta = 0 and target_quantity_is_approximate = next_quantity_is_approximate then
    raise exception 'Correction must change quantity or precision' using errcode = '22023';
  end if;

  if target_quantity_is_approximate <> next_quantity_is_approximate then
    precision_note := case
      when next_quantity_is_approximate then 'množství označeno jako přibližné'
      else 'množství označeno jako přesné'
    end;
  end if;

  audit_reason := case
    when precision_note is null then normalized_reason
    when normalized_reason is null then precision_note
    else normalized_reason || ' · ' || precision_note
  end;

  update public.inventory_batches
  set
    quantity = p_new_quantity,
    quantity_is_approximate = next_quantity_is_approximate,
    status = case
      when p_new_quantity = 0 then 'depleted'::public.batch_status
      else 'active'::public.batch_status
    end
  where id = p_batch_id;

  insert into public.inventory_events(
    household_id,
    product_id,
    inventory_batch_id,
    type,
    quantity_delta,
    unit,
    reason,
    created_by
  )
  values (
    target_household_id,
    target_product_id,
    p_batch_id,
    'correction',
    quantity_delta,
    target_unit,
    audit_reason,
    auth.uid()
  );

  return quantity_delta;
end;
$$;

revoke all on function public.create_or_add_product_batch(
  uuid,
  uuid,
  text,
  numeric,
  public.inventory_unit,
  date,
  public.expiry_type,
  text,
  text,
  text,
  text,
  numeric,
  public.inventory_unit,
  date,
  boolean
) from public, anon, authenticated;

grant execute on function public.create_or_add_product_batch(
  uuid,
  uuid,
  text,
  numeric,
  public.inventory_unit,
  date,
  public.expiry_type,
  text,
  text,
  text,
  text,
  numeric,
  public.inventory_unit,
  date,
  boolean
) to authenticated;

revoke all on function public.add_batch_to_product(
  uuid,
  uuid,
  numeric,
  public.inventory_unit,
  date,
  public.expiry_type,
  date,
  boolean
) from public, anon, authenticated;

grant execute on function public.add_batch_to_product(
  uuid,
  uuid,
  numeric,
  public.inventory_unit,
  date,
  public.expiry_type,
  date,
  boolean
) to authenticated;

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
  date,
  boolean
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
  date,
  boolean
) to authenticated;

revoke all on function public.correct_inventory_batch(uuid, numeric, text, boolean) from public, anon, authenticated;
grant execute on function public.correct_inventory_batch(uuid, numeric, text, boolean) to authenticated;
