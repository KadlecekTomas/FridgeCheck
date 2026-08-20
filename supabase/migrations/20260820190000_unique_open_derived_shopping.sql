create unique index shopping_list_items_one_open_derived_product_idx
on public.shopping_list_items(household_id, product_id)
where source = 'derived'
  and checked = false
  and product_id is not null;
