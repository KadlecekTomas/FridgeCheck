create function public.consume_product_fefo(
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
    select
      id,
      quantity,
      expiry_date,
      expiry_type,
      created_at
    from public.inventory_batches
    where product_id = p_product_id
      and household_id = target_household_id
      and unit = target_unit
      and status = 'active'
      and quantity > 0
      and not (
        expiry_type = 'use_by'
        and expiry_date is not null
        and expiry_date < current_date
      )
    order by
      (expiry_date is null) asc,
      expiry_date asc nulls last,
      case expiry_type
        when 'use_by' then 0
        when 'best_before' then 1
        else 2
      end asc,
      created_at asc,
      id asc
    for update
  loop
    exit when remaining_quantity <= 0;

    consumed_from_batch := least(target_batch.quantity, remaining_quantity);

    update public.inventory_batches
    set
      quantity = quantity - consumed_from_batch,
      status = case
        when quantity - consumed_from_batch = 0 then 'depleted'::public.batch_status
        else status
      end
    where id = target_batch.id;

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
      target_batch.id,
      'consume',
      -consumed_from_batch,
      target_unit,
      auth.uid()
    );

    remaining_quantity := remaining_quantity - consumed_from_batch;
  end loop;

  if remaining_quantity > 0 then
    raise exception 'Insufficient usable stock' using errcode = '22023';
  end if;

  return p_quantity;
end;
$$;

revoke all on function public.consume_product_fefo(uuid, numeric) from public, anon, authenticated;
grant execute on function public.consume_product_fefo(uuid, numeric) to authenticated;
