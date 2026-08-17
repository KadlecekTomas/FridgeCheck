create extension if not exists pgcrypto;

create type public.household_role as enum ('owner', 'member');
create type public.storage_type as enum ('fridge', 'freezer', 'pantry', 'cabinet', 'other');
create type public.inventory_unit as enum ('g', 'kg', 'ml', 'l', 'pcs');
create type public.expiry_type as enum ('use_by', 'best_before', 'unknown');
create type public.batch_status as enum ('active', 'depleted', 'discarded');
create type public.inventory_event_type as enum ('purchase', 'consume', 'discard', 'correction', 'move', 'open');
create type public.shopping_item_source as enum ('derived', 'manual');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.household_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.storage_units (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  type public.storage_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  brand text,
  ean_code text,
  category text,
  image_url text,
  default_unit public.inventory_unit not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_batches (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  storage_unit_id uuid not null references public.storage_units(id) on delete restrict,
  quantity numeric(14,3) not null check (quantity >= 0),
  unit public.inventory_unit not null,
  expiry_date date,
  expiry_type public.expiry_type not null default 'unknown',
  purchased_at date,
  opened_at timestamptz,
  status public.batch_status not null default 'active',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_batches_expiry_consistency check (
    (expiry_type = 'unknown' and expiry_date is null)
    or (expiry_type <> 'unknown' and expiry_date is not null)
  )
);

create table public.stock_targets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  minimum_quantity numeric(14,3) not null check (minimum_quantity >= 0),
  target_quantity numeric(14,3) not null check (target_quantity >= minimum_quantity),
  unit public.inventory_unit not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, product_id)
);

create table public.inventory_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  inventory_batch_id uuid references public.inventory_batches(id) on delete restrict,
  type public.inventory_event_type not null,
  quantity_delta numeric(14,3),
  unit public.inventory_unit,
  reason text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint inventory_events_quantity_pair check (
    (quantity_delta is null and unit is null) or (quantity_delta is not null and unit is not null)
  )
);

create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null check (length(trim(name)) between 1 and 200),
  quantity numeric(14,3) check (quantity is null or quantity >= 0),
  unit public.inventory_unit,
  source public.shopping_item_source not null default 'manual',
  checked boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_quantity_pair check (
    (quantity is null and unit is null) or (quantity is not null and unit is not null)
  )
);

create index household_members_user_id_idx on public.household_members(user_id);
create index storage_units_household_id_idx on public.storage_units(household_id);
create index products_household_id_idx on public.products(household_id);
create index products_household_ean_idx on public.products(household_id, ean_code) where ean_code is not null;
create index inventory_batches_household_status_expiry_idx on public.inventory_batches(household_id, status, expiry_date);
create index inventory_batches_product_status_expiry_idx on public.inventory_batches(product_id, status, expiry_date);
create index inventory_events_household_created_idx on public.inventory_events(household_id, created_at desc);
create index shopping_list_items_household_checked_idx on public.shopping_list_items(household_id, checked, created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger households_set_updated_at before update on public.households for each row execute function public.set_updated_at();
create trigger storage_units_set_updated_at before update on public.storage_units for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger inventory_batches_set_updated_at before update on public.inventory_batches for each row execute function public.set_updated_at();
create trigger stock_targets_set_updated_at before update on public.stock_targets for each row execute function public.set_updated_at();
create trigger shopping_list_items_set_updated_at before update on public.shopping_list_items for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
  );
$$;

create function public.is_household_owner(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.households h
    where h.id = target_household_id
      and h.owner_id = auth.uid()
  );
$$;

create function public.create_household(household_name text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_household_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if household_name is null or length(trim(household_name)) = 0 then
    raise exception 'Household name is required';
  end if;

  insert into public.households(name, owner_id)
  values (trim(household_name), auth.uid())
  returning id into new_household_id;

  insert into public.household_members(household_id, user_id, role)
  values (new_household_id, auth.uid(), 'owner');

  return new_household_id;
end;
$$;

revoke all on function public.is_household_member(uuid) from public;
revoke all on function public.is_household_owner(uuid) from public;
revoke all on function public.create_household(text) from public;
grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.is_household_owner(uuid) to authenticated;
grant execute on function public.create_household(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.storage_units enable row level security;
alter table public.products enable row level security;
alter table public.inventory_batches enable row level security;
alter table public.stock_targets enable row level security;
alter table public.inventory_events enable row level security;
alter table public.shopping_list_items enable row level security;

create policy profiles_select_self on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy households_select_member on public.households for select to authenticated using (public.is_household_member(id));
create policy households_update_owner on public.households for update to authenticated using (public.is_household_owner(id)) with check (owner_id = auth.uid());
create policy households_delete_owner on public.households for delete to authenticated using (public.is_household_owner(id));

create policy household_members_select_member on public.household_members for select to authenticated using (public.is_household_member(household_id));
create policy household_members_insert_owner on public.household_members for insert to authenticated with check (public.is_household_owner(household_id));
create policy household_members_update_owner on public.household_members for update to authenticated using (public.is_household_owner(household_id)) with check (public.is_household_owner(household_id));
create policy household_members_delete_owner_or_self on public.household_members for delete to authenticated using (public.is_household_owner(household_id) or user_id = auth.uid());

create policy storage_units_select_member on public.storage_units for select to authenticated using (public.is_household_member(household_id));
create policy storage_units_insert_member on public.storage_units for insert to authenticated with check (public.is_household_member(household_id));
create policy storage_units_update_member on public.storage_units for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy storage_units_delete_member on public.storage_units for delete to authenticated using (public.is_household_member(household_id));

create policy products_select_member on public.products for select to authenticated using (public.is_household_member(household_id));
create policy products_insert_member on public.products for insert to authenticated with check (public.is_household_member(household_id));
create policy products_update_member on public.products for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy products_delete_member on public.products for delete to authenticated using (public.is_household_member(household_id));

create policy inventory_batches_select_member on public.inventory_batches for select to authenticated using (public.is_household_member(household_id));
create policy inventory_batches_insert_member on public.inventory_batches for insert to authenticated with check (
  public.is_household_member(household_id)
  and created_by = auth.uid()
  and exists (select 1 from public.products p where p.id = product_id and p.household_id = household_id)
  and exists (select 1 from public.storage_units s where s.id = storage_unit_id and s.household_id = household_id)
);
create policy inventory_batches_update_member on public.inventory_batches for update to authenticated using (public.is_household_member(household_id)) with check (
  public.is_household_member(household_id)
  and exists (select 1 from public.products p where p.id = product_id and p.household_id = household_id)
  and exists (select 1 from public.storage_units s where s.id = storage_unit_id and s.household_id = household_id)
);
create policy inventory_batches_delete_member on public.inventory_batches for delete to authenticated using (public.is_household_member(household_id));

create policy stock_targets_select_member on public.stock_targets for select to authenticated using (public.is_household_member(household_id));
create policy stock_targets_insert_member on public.stock_targets for insert to authenticated with check (
  public.is_household_member(household_id)
  and exists (select 1 from public.products p where p.id = product_id and p.household_id = household_id)
);
create policy stock_targets_update_member on public.stock_targets for update to authenticated using (public.is_household_member(household_id)) with check (
  public.is_household_member(household_id)
  and exists (select 1 from public.products p where p.id = product_id and p.household_id = household_id)
);
create policy stock_targets_delete_member on public.stock_targets for delete to authenticated using (public.is_household_member(household_id));

create policy inventory_events_select_member on public.inventory_events for select to authenticated using (public.is_household_member(household_id));
create policy inventory_events_insert_member on public.inventory_events for insert to authenticated with check (
  public.is_household_member(household_id)
  and created_by = auth.uid()
  and exists (select 1 from public.products p where p.id = product_id and p.household_id = household_id)
  and (inventory_batch_id is null or exists (select 1 from public.inventory_batches b where b.id = inventory_batch_id and b.household_id = household_id and b.product_id = product_id))
);

create policy shopping_list_items_select_member on public.shopping_list_items for select to authenticated using (public.is_household_member(household_id));
create policy shopping_list_items_insert_member on public.shopping_list_items for insert to authenticated with check (
  public.is_household_member(household_id)
  and created_by = auth.uid()
  and (product_id is null or exists (select 1 from public.products p where p.id = product_id and p.household_id = household_id))
);
create policy shopping_list_items_update_member on public.shopping_list_items for update to authenticated using (public.is_household_member(household_id)) with check (
  public.is_household_member(household_id)
  and (product_id is null or exists (select 1 from public.products p where p.id = product_id and p.household_id = household_id))
);
create policy shopping_list_items_delete_member on public.shopping_list_items for delete to authenticated using (public.is_household_member(household_id));

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, update, delete on public.households to authenticated;
grant select, insert, update, delete on public.household_members to authenticated;
grant select, insert, update, delete on public.storage_units to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.inventory_batches to authenticated;
grant select, insert, update, delete on public.stock_targets to authenticated;
grant select, insert on public.inventory_events to authenticated;
grant select, insert, update, delete on public.shopping_list_items to authenticated;

revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon;
