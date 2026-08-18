create function public.discard_inventory_batch(
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

  select household_id, product_id, quantity, unit, status
  into target_household_id, target_product_id, target_quantity, target_unit, target_status
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
    status = case
      when quantity - p_quantity = 0 then 'discarded'::public.batch_status
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
    'discard',
    -p_quantity,
    target_unit,
    normalized_reason,
    auth.uid()
  );

  return p_quantity;
end;
$$;

revoke all on function public.discard_inventory_batch(uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.discard_inventory_batch(uuid, numeric, text) to authenticated;
