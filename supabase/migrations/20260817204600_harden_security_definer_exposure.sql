create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

alter function public.is_household_member(uuid) set schema private;
alter function public.is_household_owner(uuid) set schema private;

grant execute on function private.is_household_member(uuid) to authenticated;
grant execute on function private.is_household_owner(uuid) to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;

revoke all on function public.create_household(text) from public, anon, authenticated;
alter function public.create_household(text) security invoker;
grant execute on function public.create_household(text) to authenticated;

create policy households_insert_self_owner
on public.households
for insert
to authenticated
with check (owner_id = auth.uid());
