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

  select household_id, product_id, quantity, unit, status
  into target_household_id, target_product_id, target_quantity, target_unit, target_status
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
    normalized_reason,
    auth.uid()
  );

  return quantity_delta;
end;
$$;

revoke all on function public.correct_inventory_batch(uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.correct_inventory_batch(uuid, numeric, text) to authenticated;
