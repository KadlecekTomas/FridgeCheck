-- Performance-only hardening. Keep authorization predicates semantically identical
-- while allowing PostgreSQL to evaluate auth.uid() once per statement where possible.

create index if not exists households_owner_id_idx
  on public.households (owner_id);

create index if not exists inventory_batches_created_by_idx
  on public.inventory_batches (created_by);

create index if not exists inventory_batches_storage_unit_id_idx
  on public.inventory_batches (storage_unit_id);

create index if not exists inventory_events_created_by_idx
  on public.inventory_events (created_by);

create index if not exists inventory_events_inventory_batch_id_idx
  on public.inventory_events (inventory_batch_id);

create index if not exists inventory_events_product_id_idx
  on public.inventory_events (product_id);

create index if not exists shopping_list_items_created_by_idx
  on public.shopping_list_items (created_by);

create index if not exists shopping_list_items_product_id_idx
  on public.shopping_list_items (product_id);

create index if not exists stock_targets_product_id_idx
  on public.stock_targets (product_id);

-- profiles

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- households

drop policy if exists households_update_owner on public.households;
create policy households_update_owner
on public.households
for update
to authenticated
using (private.is_household_owner(id))
with check (owner_id = (select auth.uid()));

drop policy if exists households_insert_self_owner on public.households;
create policy households_insert_self_owner
on public.households
for insert
to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists households_select_authorized on public.households;
create policy households_select_authorized
on public.households
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or private.is_household_member(id)
);

-- household members

drop policy if exists household_members_delete_owner_or_self on public.household_members;
create policy household_members_delete_owner_or_self
on public.household_members
for delete
to authenticated
using (
  private.is_household_owner(household_id)
  or user_id = (select auth.uid())
);

-- inventory batches

drop policy if exists inventory_batches_insert_member on public.inventory_batches;
create policy inventory_batches_insert_member
on public.inventory_batches
for insert
to authenticated
with check (
  private.is_household_member(household_id)
  and created_by = (select auth.uid())
  and exists (
    select 1
    from public.products p
    where p.id = product_id
      and p.household_id = household_id
  )
  and exists (
    select 1
    from public.storage_units s
    where s.id = storage_unit_id
      and s.household_id = household_id
  )
);

-- inventory events

drop policy if exists inventory_events_insert_member on public.inventory_events;
create policy inventory_events_insert_member
on public.inventory_events
for insert
to authenticated
with check (
  private.is_household_member(household_id)
  and created_by = (select auth.uid())
  and exists (
    select 1
    from public.products p
    where p.id = product_id
      and p.household_id = household_id
  )
  and (
    inventory_batch_id is null
    or exists (
      select 1
      from public.inventory_batches b
      where b.id = inventory_batch_id
        and b.household_id = household_id
        and b.product_id = product_id
    )
  )
);

-- shopping list

drop policy if exists shopping_list_items_insert_member on public.shopping_list_items;
create policy shopping_list_items_insert_member
on public.shopping_list_items
for insert
to authenticated
with check (
  private.is_household_member(household_id)
  and created_by = (select auth.uid())
  and (
    product_id is null
    or exists (
      select 1
      from public.products p
      where p.id = product_id
        and p.household_id = household_id
    )
  )
);
