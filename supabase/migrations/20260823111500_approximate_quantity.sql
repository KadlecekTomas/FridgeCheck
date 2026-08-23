alter table public.inventory_batches
  add column quantity_is_estimate boolean not null default false;

alter table public.inventory_events
  add column quantity_is_estimate boolean not null default false;

-- Amount-based entry may explicitly record an estimate. Package-aware entry stays
-- exact at the trusted database boundary because a package count is knowable.
-- The required boolean sits before optional arguments so this overload never
-- shadows the legacy seven-argument function used by mixed-expiry package entry.
create function public.add_batch_to_product(
  p_product_id uuid,
  p_storage_unit_id uuid,
  p_quantity numeric,
  p_unit public.inventory_unit,
  p_quantity_is_estimate boolean,
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
  target_package_quantity numeric(14,3);
  target_package_unit public.inventory_unit;
  new_batch_id uuid;
  quantity_is_estimate boolean := coalesce(p_quantity_is_estimate, false);
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero' using errcode = '22023';
  end if;

  if p_quantity <> round(p_quantity, 3) then
    raise exception 'Quantity supports at most three decimal places' using errcode = '22023';
  end if;

  select household_id, default_unit, package_quantity, package_unit
  into target_household_id, target_default_unit, target_package_quantity, target_package_unit
  from public.products
  where id = p_product_id;

  if target_household_id is null then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;

  if p_unit <> target_default_unit then
    raise exception 'Batch unit must match product default unit' using errcode = '22023';
  end if;

  if quantity_is_estimate and target_package_quantity is not null and target_package_unit = target_default_unit then
    raise exception 'Packaged entries cannot be approximate' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.storage_units
    where id = p_storage_unit_id
      and household_id = target_household_id
  ) then
    raise exception 'Storage unit does not belong to household' using errcode = '42501';
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
    quantity_is_estimate,
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
    quantity_is_estimate,
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
    quantity_is_estimate,
    created_by
  )
  values (
    target_household_id,
    p_product_id,
    new_batch_id,
    'purchase',
    p_quantity,
    p_unit,
    quantity_is_estimate,
    auth.uid()
  );

  return new_batch_id;
end;
$$;

revoke all on function public.add_batch_to_product(
  uuid, uuid, numeric, public.inventory_unit, boolean, date, public.expiry_type, date
) from public, anon, authenticated;
grant execute on function public.add_batch_to_product(
  uuid, uuid, numeric, public.inventory_unit, boolean, date, public.expiry_type, date
) to authenticated;

-- Same compatibility rule for create-or-reuse: calls without the required boolean
-- resolve to the legacy exact-quantity function, while estimate-aware callers use
-- this signature explicitly.
create function public.create_or_add_product_batch(
  p_household_id uuid,
  p_storage_unit_id uuid,
  p_name text,
  p_quantity numeric,
  p_unit public.inventory_unit,
  p_quantity_is_estimate boolean,
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
  product_package_quantity numeric(14,3);
  product_package_unit public.inventory_unit;
  new_batch_id uuid;
  quantity_is_estimate boolean := coalesce(p_quantity_is_estimate, false);
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

  if p_quantity <> round(p_quantity, 3) then
    raise exception 'Quantity supports at most three decimal places' using errcode = '22023';
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

  if quantity_is_estimate and p_package_quantity is not null then
    raise exception 'Packaged entries cannot be approximate' using errcode = '22023';
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
    select id, default_unit, package_quantity, package_unit
    into product_id, product_unit, product_package_quantity, product_package_unit
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
      returning id, default_unit, package_quantity, package_unit
      into product_id, product_unit, product_package_quantity, product_package_unit;
    exception
      when unique_violation then
        if normalized_ean is null then
          raise;
        end if;

        select id, default_unit, package_quantity, package_unit
        into strict product_id, product_unit, product_package_quantity, product_package_unit
        from public.products
        where household_id = p_household_id
          and ean_code = normalized_ean;
    end;
  end if;

  if product_unit <> p_unit then
    raise exception 'Batch unit must match product default unit' using errcode = '22023';
  end if;

  if quantity_is_estimate and product_package_quantity is not null and product_package_unit = product_unit then
    raise exception 'Packaged entries cannot be approximate' using errcode = '22023';
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
    quantity_is_estimate,
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
    quantity_is_estimate,
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
    quantity_is_estimate,
    created_by
  )
  values (
    p_household_id,
    product_id,
    new_batch_id,
    'purchase',
    p_quantity,
    p_unit,
    quantity_is_estimate,
    auth.uid()
  );

  return new_batch_id;
end;
$$;

revoke all on function public.create_or_add_product_batch(
  uuid, uuid, text, numeric, public.inventory_unit, boolean, date, public.expiry_type,
  text, text, text, text, numeric, public.inventory_unit, date
) from public, anon, authenticated;
grant execute on function public.create_or_add_product_batch(
  uuid, uuid, text, numeric, public.inventory_unit, boolean, date, public.expiry_type,
  text, text, text, text, numeric, public.inventory_unit, date
) to authenticated;

-- Existing three-argument corrections stay compatible. They preserve the current
-- estimate state and propagate it into the audit event.
create or replace function public.correct_inventory_batch(
  p_batch_id uuid,
  p_new_quantity numeric,
  p_reason text default null
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
  target_unit public.inventory_unit;
  target_status public.batch_status;
  target_quantity_is_estimate boolean;
  normalized_reason text;
  quantity_delta numeric(14,3);
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

  select household_id, product_id, quantity, unit, status, quantity_is_estimate
  into target_household_id, target_product_id, target_quantity, target_unit, target_status, target_quantity_is_estimate
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
  if quantity_delta = 0 then
    raise exception 'Correction must change the quantity' using errcode = '22023';
  end if;

  update public.inventory_batches
  set
    quantity = p_new_quantity,
    status = case when p_new_quantity = 0 then 'depleted'::public.batch_status else 'active'::public.batch_status end
  where id = p_batch_id;

  insert into public.inventory_events(
    household_id, product_id, inventory_batch_id, type, quantity_delta, unit,
    reason, quantity_is_estimate, created_by
  )
  values (
    target_household_id, target_product_id, p_batch_id, 'correction', quantity_delta, target_unit,
    normalized_reason, target_quantity_is_estimate, auth.uid()
  );

  return quantity_delta;
end;
$$;

-- Estimate-aware corrections use a required third argument, so the legacy call
-- remains unambiguous. A precision-only correction is a valid audited change.
create function public.correct_inventory_batch(
  p_batch_id uuid,
  p_new_quantity numeric,
  p_quantity_is_estimate boolean,
  p_reason text default null
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
  target_unit public.inventory_unit;
  target_status public.batch_status;
  target_quantity_is_estimate boolean;
  next_quantity_is_estimate boolean;
  normalized_reason text;
  audit_reason text;
  precision_reason text;
  quantity_delta numeric(14,3);
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

  select household_id, product_id, quantity, unit, status, quantity_is_estimate
  into target_household_id, target_product_id, target_quantity, target_unit, target_status, target_quantity_is_estimate
  from public.inventory_batches
  where id = p_batch_id
  for update;

  if not found then
    raise exception 'Batch not found or inaccessible' using errcode = 'P0002';
  end if;
  if target_status <> 'active' or target_quantity <= 0 then
    raise exception 'Only active stock can be corrected' using errcode = '22023';
  end if;

  next_quantity_is_estimate := coalesce(p_quantity_is_estimate, target_quantity_is_estimate);
  if p_new_quantity = 0 then
    next_quantity_is_estimate := false;
  end if;

  quantity_delta := p_new_quantity - target_quantity;
  if quantity_delta = 0 and next_quantity_is_estimate = target_quantity_is_estimate then
    raise exception 'Correction must change quantity or precision' using errcode = '22023';
  end if;

  if next_quantity_is_estimate <> target_quantity_is_estimate then
    precision_reason := case
      when next_quantity_is_estimate then 'přesnost: přesně → odhad'
      else 'přesnost: odhad → přesně'
    end;
  end if;

  audit_reason := concat_ws(' · ', precision_reason, normalized_reason);
  if audit_reason = '' then audit_reason := null; end if;

  update public.inventory_batches
  set
    quantity = p_new_quantity,
    quantity_is_estimate = next_quantity_is_estimate,
    status = case when p_new_quantity = 0 then 'depleted'::public.batch_status else 'active'::public.batch_status end
  where id = p_batch_id;

  insert into public.inventory_events(
    household_id, product_id, inventory_batch_id, type, quantity_delta, unit,
    reason, quantity_is_estimate, created_by
  )
  values (
    target_household_id, target_product_id, p_batch_id, 'correction', quantity_delta, target_unit,
    audit_reason, (target_quantity_is_estimate or next_quantity_is_estimate), auth.uid()
  );

  return quantity_delta;
end;
$$;

revoke all on function public.correct_inventory_batch(uuid, numeric, boolean, text) from public, anon, authenticated;
grant execute on function public.correct_inventory_batch(uuid, numeric, boolean, text) to authenticated;

create or replace function public.consume_product_fefo(
  p_product_id uuid,
  p_quantity numeric
)
returns numeric
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  target_household_id uuid;
  target_unit public.inventory_unit;
  remaining_quantity numeric(14,3);
  consumed_from_batch numeric(14,3);
  target_batch record;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero' using errcode = '22023';
  end if;
  if p_quantity <> round(p_quantity, 3) then
    raise exception 'Quantity supports at most three decimal places' using errcode = '22023';
  end if;

  select household_id, default_unit
  into target_household_id, target_unit
  from public.products
  where id = p_product_id;

  if target_household_id is null then
    raise exception 'Product not found or inaccessible' using errcode = 'P0002';
  end if;

  remaining_quantity := p_quantity;

  for target_batch in
    select id, quantity, expiry_date, expiry_type, created_at, quantity_is_estimate
    from public.inventory_batches
    where product_id = p_product_id
      and household_id = target_household_id
      and unit = target_unit
      and status = 'active'
      and quantity > 0
      and not (expiry_type = 'use_by' and expiry_date is not null and expiry_date < current_date)
    order by
      (expiry_date is null) asc,
      expiry_date asc nulls last,
      case expiry_type when 'use_by' then 0 when 'best_before' then 1 else 2 end asc,
      created_at asc,
      id asc
    for update
  loop
    exit when remaining_quantity <= 0;
    consumed_from_batch := least(target_batch.quantity, remaining_quantity);

    update public.inventory_batches
    set
      quantity = quantity - consumed_from_batch,
      status = case when quantity - consumed_from_batch = 0 then 'depleted'::public.batch_status else status end
    where id = target_batch.id;

    insert into public.inventory_events(
      household_id, product_id, inventory_batch_id, type, quantity_delta, unit,
      quantity_is_estimate, created_by
    )
    values (
      target_household_id, p_product_id, target_batch.id, 'consume', -consumed_from_batch, target_unit,
      target_batch.quantity_is_estimate, auth.uid()
    );

    remaining_quantity := remaining_quantity - consumed_from_batch;
  end loop;

  if remaining_quantity > 0 then
    raise exception 'Insufficient usable stock' using errcode = '22023';
  end if;

  return p_quantity;
end;
$$;

create or replace function public.discard_inventory_batch(
  p_batch_id uuid,
  p_quantity numeric,
  p_reason text default null
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
  target_unit public.inventory_unit;
  target_status public.batch_status;
  target_quantity_is_estimate boolean;
  normalized_reason text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero' using errcode = '22023';
  end if;
  if p_quantity <> round(p_quantity, 3) then
    raise exception 'Quantity supports at most three decimal places' using errcode = '22023';
  end if;

  normalized_reason := nullif(trim(p_reason), '');
  if normalized_reason is not null and length(normalized_reason) > 500 then
    raise exception 'Reason must be 500 characters or fewer' using errcode = '22023';
  end if;

  select household_id, product_id, quantity, unit, status, quantity_is_estimate
  into target_household_id, target_product_id, target_quantity, target_unit, target_status, target_quantity_is_estimate
  from public.inventory_batches
  where id = p_batch_id
  for update;

  if not found then
    raise exception 'Batch not found or inaccessible' using errcode = 'P0002';
  end if;
  if target_status <> 'active' or target_quantity <= 0 then
    raise exception 'Only active stock can be discarded' using errcode = '22023';
  end if;
  if p_quantity > target_quantity then
    raise exception 'Discard quantity exceeds batch quantity' using errcode = '22023';
  end if;

  update public.inventory_batches
  set
    quantity = quantity - p_quantity,
    status = case when quantity - p_quantity = 0 then 'discarded'::public.batch_status else 'active'::public.batch_status end
  where id = p_batch_id;

  insert into public.inventory_events(
    household_id, product_id, inventory_batch_id, type, quantity_delta, unit,
    reason, quantity_is_estimate, created_by
  )
  values (
    target_household_id, target_product_id, p_batch_id, 'discard', -p_quantity, target_unit,
    normalized_reason, target_quantity_is_estimate, auth.uid()
  );

  return p_quantity;
end;
$$;