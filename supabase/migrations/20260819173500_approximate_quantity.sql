create type public.inventory_quantity_precision as enum ('exact', 'estimated');
create type public.inventory_estimate_level as enum ('full', 'half', 'low');

alter table public.inventory_batches
  add column initial_quantity numeric(14,3),
  add column quantity_precision public.inventory_quantity_precision not null default 'exact';

update public.inventory_batches b
set initial_quantity = coalesce(
  (
    select e.quantity_delta
    from public.inventory_events e
    where e.inventory_batch_id = b.id
      and e.type = 'purchase'
      and e.quantity_delta > 0
    order by e.created_at asc, e.id asc
    limit 1
  ),
  nullif(b.quantity, 0),
  0.001
);

alter table public.inventory_batches
  alter column initial_quantity set not null,
  add constraint inventory_batches_initial_quantity_positive check (initial_quantity > 0);

create function public.set_inventory_batch_initial_quantity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.initial_quantity is null then
    new.initial_quantity := new.quantity;
  end if;

  if new.initial_quantity is null or new.initial_quantity <= 0 then
    raise exception 'Initial quantity must be greater than zero' using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger inventory_batches_set_initial_quantity
before insert on public.inventory_batches
for each row execute function public.set_inventory_batch_initial_quantity();

create or replace function public.correct_inventory_batch(
  p_batch_id uuid,
  p_new_quantity numeric,
  p_reason text
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
  target_precision public.inventory_quantity_precision;
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
  if normalized_reason is null then
    raise exception 'Correction reason is required' using errcode = '22023';
  end if;
  if length(normalized_reason) > 500 then
    raise exception 'Reason must be 500 characters or fewer' using errcode = '22023';
  end if;

  select household_id, product_id, quantity, unit, status, quantity_precision
  into target_household_id, target_product_id, target_quantity, target_unit, target_status, target_precision
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
  if quantity_delta = 0 and target_precision = 'exact' then
    raise exception 'Correction must change quantity or replace an estimate with an exact count' using errcode = '22023';
  end if;

  update public.inventory_batches
  set
    quantity = p_new_quantity,
    quantity_precision = 'exact',
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

create function public.estimate_inventory_batch(
  p_batch_id uuid,
  p_level public.inventory_estimate_level
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
  target_initial_quantity numeric(14,3);
  target_unit public.inventory_unit;
  target_status public.batch_status;
  estimated_quantity numeric(14,3);
  quantity_delta numeric(14,3);
  estimate_label text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_level is null then
    raise exception 'Estimate level is required' using errcode = '22023';
  end if;

  select household_id, product_id, quantity, initial_quantity, unit, status
  into target_household_id, target_product_id, target_quantity, target_initial_quantity, target_unit, target_status
  from public.inventory_batches
  where id = p_batch_id
  for update;

  if not found then
    raise exception 'Batch not found or inaccessible' using errcode = 'P0002';
  end if;

  if target_status <> 'active' or target_quantity <= 0 then
    raise exception 'Only active stock can be estimated' using errcode = '22023';
  end if;

  estimated_quantity := greatest(
    0.001::numeric,
    round(
      target_initial_quantity * case p_level
        when 'full' then 1::numeric
        when 'half' then 0.5::numeric
        when 'low' then 0.2::numeric
      end,
      3
    )
  );

  estimate_label := case p_level
    when 'full' then 'plné'
    when 'half' then 'přibližně polovina'
    when 'low' then 'dochází'
  end;

  quantity_delta := estimated_quantity - target_quantity;

  update public.inventory_batches
  set
    quantity = estimated_quantity,
    quantity_precision = 'estimated',
    status = 'active'
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
    'Rychlý odhad: ' || estimate_label,
    auth.uid()
  );

  return estimated_quantity;
end;
$$;

revoke all on function public.estimate_inventory_batch(uuid, public.inventory_estimate_level) from public, anon, authenticated;
grant execute on function public.estimate_inventory_batch(uuid, public.inventory_estimate_level) to authenticated;
