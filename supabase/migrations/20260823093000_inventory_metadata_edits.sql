create function public.update_product_metadata(
  p_product_id uuid,
  p_name text,
  p_brand text default null,
  p_ean_code text default null,
  p_category text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  target_household_id uuid;
  normalized_name text;
  normalized_brand text;
  normalized_ean text;
  normalized_category text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  normalized_name := nullif(trim(p_name), '');
  normalized_brand := nullif(trim(p_brand), '');
  normalized_ean := nullif(trim(p_ean_code), '');
  normalized_category := nullif(trim(p_category), '');

  if normalized_name is null then
    raise exception 'Product name is required' using errcode = '22023';
  end if;
  if length(normalized_name) > 200 then
    raise exception 'Product name must be 200 characters or fewer' using errcode = '22023';
  end if;
  if normalized_brand is not null and length(normalized_brand) > 200 then
    raise exception 'Brand must be 200 characters or fewer' using errcode = '22023';
  end if;
  if normalized_category is not null and length(normalized_category) > 200 then
    raise exception 'Category must be 200 characters or fewer' using errcode = '22023';
  end if;
  if normalized_ean is not null and normalized_ean !~ '^[0-9]{8,14}$' then
    raise exception 'EAN must contain 8 to 14 digits' using errcode = '22023';
  end if;

  select household_id
  into target_household_id
  from public.products
  where id = p_product_id;

  if not found then
    raise exception 'Product not found or inaccessible' using errcode = 'P0002';
  end if;

  update public.products
  set
    name = normalized_name,
    brand = normalized_brand,
    ean_code = normalized_ean,
    category = normalized_category
  where id = p_product_id;

  return p_product_id;
end;
$$;

create function public.update_inventory_batch_details(
  p_batch_id uuid,
  p_storage_unit_id uuid,
  p_expiry_type public.expiry_type,
  p_expiry_date date default null,
  p_reason text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  target_household_id uuid;
  target_product_id uuid;
  target_storage_unit_id uuid;
  target_expiry_type public.expiry_type;
  target_expiry_date date;
  target_status public.batch_status;
  old_storage_name text;
  new_storage_name text;
  old_expiry_label text;
  new_expiry_label text;
  normalized_reason text;
  storage_changed boolean;
  expiry_changed boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  normalized_reason := nullif(trim(p_reason), '');
  if normalized_reason is not null and length(normalized_reason) > 500 then
    raise exception 'Reason must be 500 characters or fewer' using errcode = '22023';
  end if;

  if p_expiry_type is null then
    raise exception 'Expiry type is required' using errcode = '22023';
  end if;
  if (p_expiry_type = 'unknown' and p_expiry_date is not null)
     or (p_expiry_type <> 'unknown' and p_expiry_date is null) then
    raise exception 'Expiry type and date are inconsistent' using errcode = '22023';
  end if;

  select
    household_id,
    product_id,
    storage_unit_id,
    expiry_type,
    expiry_date,
    status
  into
    target_household_id,
    target_product_id,
    target_storage_unit_id,
    target_expiry_type,
    target_expiry_date,
    target_status
  from public.inventory_batches
  where id = p_batch_id
  for update;

  if not found then
    raise exception 'Batch not found or inaccessible' using errcode = 'P0002';
  end if;

  if target_status <> 'active' then
    raise exception 'Only active batches can be edited' using errcode = '22023';
  end if;

  select name
  into new_storage_name
  from public.storage_units
  where id = p_storage_unit_id
    and household_id = target_household_id;

  if not found then
    raise exception 'Storage unit not found in this household' using errcode = '22023';
  end if;

  select name
  into old_storage_name
  from public.storage_units
  where id = target_storage_unit_id;

  storage_changed := target_storage_unit_id <> p_storage_unit_id;
  expiry_changed := target_expiry_type <> p_expiry_type
    or target_expiry_date is distinct from p_expiry_date;

  if not storage_changed and not expiry_changed then
    raise exception 'Edit must change storage or expiry' using errcode = '22023';
  end if;

  update public.inventory_batches
  set
    storage_unit_id = p_storage_unit_id,
    expiry_type = p_expiry_type,
    expiry_date = p_expiry_date
  where id = p_batch_id;

  if storage_changed then
    insert into public.inventory_events(
      household_id,
      product_id,
      inventory_batch_id,
      type,
      reason,
      created_by
    )
    values (
      target_household_id,
      target_product_id,
      p_batch_id,
      'move',
      format('%s → %s', old_storage_name, new_storage_name)
        || case when normalized_reason is null then '' else ' · ' || normalized_reason end,
      auth.uid()
    );
  end if;

  if expiry_changed then
    old_expiry_label := case target_expiry_type
      when 'use_by' then 'spotřebujte do ' || coalesce(target_expiry_date::text, 'bez data')
      when 'best_before' then 'min. trvanlivost ' || coalesce(target_expiry_date::text, 'bez data')
      else 'bez data'
    end;
    new_expiry_label := case p_expiry_type
      when 'use_by' then 'spotřebujte do ' || coalesce(p_expiry_date::text, 'bez data')
      when 'best_before' then 'min. trvanlivost ' || coalesce(p_expiry_date::text, 'bez data')
      else 'bez data'
    end;

    insert into public.inventory_events(
      household_id,
      product_id,
      inventory_batch_id,
      type,
      reason,
      created_by
    )
    values (
      target_household_id,
      target_product_id,
      p_batch_id,
      'correction',
      format('%s → %s', old_expiry_label, new_expiry_label)
        || case when normalized_reason is null then '' else ' · ' || normalized_reason end,
      auth.uid()
    );
  end if;

  return p_batch_id;
end;
$$;

revoke all on function public.update_product_metadata(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.update_inventory_batch_details(uuid, uuid, public.expiry_type, date, text) from public, anon, authenticated;
grant execute on function public.update_product_metadata(uuid, text, text, text, text) to authenticated;
grant execute on function public.update_inventory_batch_details(uuid, uuid, public.expiry_type, date, text) to authenticated;
