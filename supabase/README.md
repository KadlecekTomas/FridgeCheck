# FridgeCheck Supabase

This directory is the source of truth for the FridgeCheck / HlídačJídla database contract.

The current development project is a disposable Supabase Free-tier project in `eu-central-1` (Frankfurt), project ref `wizxtgaadruopkenihfj`. Recreating the schema from this repository must be possible without relying on dashboard-only changes.

## Source of truth

- `migrations/` — ordered schema and security migrations
- `tests/` — database/RLS regression tests
- `config.toml` — local Supabase runtime configuration

Do not make persistent schema or RLS changes only through the Supabase dashboard. Create a migration, validate it locally/CI, then apply it to the development project.

Migration filenames use the version recorded by the remote Supabase migration history so a future linked CLI does not see artificial version drift.

## Current domain baseline

The database follows the project data-model contract:

- `households`
- `household_members`
- `storage_units`
- `products`
- `inventory_batches`
- `stock_targets`
- `inventory_events`
- `shopping_list_items`

The core rule is `Product != InventoryBatch`: product metadata is reusable while quantity, storage and expiry belong to a physical batch.

`create_household()` creates the owner membership and a default `Lednice` storage unit in the same transaction. Inventory writes use authenticated, `SECURITY INVOKER` RPCs so product + batch + purchase event are atomic without bypassing RLS:

- `create_product_with_batch(...)`
- `add_batch_to_product(...)`

The second RPC deliberately requires the batch unit to match the product default unit. Unit conversion must be introduced as explicit tested domain behavior, never silently inside a write.

## Local validation

Requires Docker and Supabase CLI 2.111.0.

```bash
supabase start
supabase db reset
for test_file in supabase/tests/*.sql; do
  docker exec -i supabase_db_fridgecheck-dev \
    psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
    < "$test_file"
done
supabase stop --no-backup
```

`supabase db reset` is the reproducibility check: a clean database must be rebuildable solely from migrations.

## Security

All household-scoped application tables use Row Level Security. Regression coverage includes:

- unrelated users cannot read/mutate another household
- authenticated household creation creates owner membership and default storage
- product + batch + purchase-event writes are atomic
- adding a later batch reuses the existing product
- incompatible units are rejected
- inventory RPCs cannot be used to write into another household

The Supabase Security Advisor must be reviewed after DDL/security changes. Security-definer helper functions used by RLS live outside the exposed `public` API schema.

## Secrets

Never commit service-role keys, database passwords, access tokens or production credentials. The project ref and publishable/anon browser credentials are not authorization boundaries; RLS is.

## Web application migration

The v2 application uses a dedicated current schema type while legacy prototype routes are removed incrementally. New code must use the v2 model and must not add new dependencies on the legacy `foods` table or old summary views.
