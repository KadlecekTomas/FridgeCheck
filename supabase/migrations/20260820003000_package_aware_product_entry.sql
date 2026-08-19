alter table public.products
  add column package_quantity numeric(14,3),
  add column package_unit public.inventory_unit;

alter table public.products
  add constraint products_package_quantity_pair check (
    (package_quantity is null and package_unit is null)
    or (package_quantity is not null and package_quantity > 0 and package_unit is not null and package_unit = default_unit)
  ),
  add constraint products_ean_format check (
    ean_code is null or ean_code ~ '^[0-9]{8,14}$'
  );

drop index if exists public.products_household_ean_idx;
create unique index products_household_ean_unique
  on public.products(household_id, ean_code)
  where ean_code is not null;

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
  p_purchased_at date default current_date
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
  date
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
  date
) to authenticated;
