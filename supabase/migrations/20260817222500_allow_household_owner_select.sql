drop policy if exists households_select_member on public.households;

create policy households_select_authorized
on public.households
for select
to authenticated
using (
  owner_id = auth.uid()
  or private.is_household_member(id)
);
