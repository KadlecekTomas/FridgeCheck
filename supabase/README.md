# FridgeCheck Supabase

This directory is the source of truth for the FridgeCheck / HlídačJídla database contract.

The current development project is a disposable Supabase Free-tier project in `eu-central-1` (Frankfurt), project ref `wizxtgaadruopkenihfj`. Recreating the schema from this repository must be possible without relying on dashboard-only changes.

## Source of truth

- `migrations/` — ordered schema and security migrations
- `tests/` — database/RLS regression tests
- `config.toml` — local Supabase runtime configuration

Do not make persistent schema or RLS changes only through the Supabase dashboard. Create a migration, validate it locally/CI, then apply it to the development project.

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

## Local validation

Requires Docker and Supabase CLI 2.111.0.

```bash
supabase start
supabase db reset
docker exec -i supabase_db_fridgecheck-dev \
  psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/tests/rls_household_isolation.sql
supabase stop --no-backup
```

`supabase db reset` is the reproducibility check: a clean database must be rebuildable solely from migrations.

## Security

All household-scoped application tables use Row Level Security. The initial regression suite proves an unrelated authenticated user cannot:

- read another household or its storage units
- update/delete another household's storage unit
- insert a product into another household

The Supabase Security Advisor must be reviewed after DDL/security changes. Security-definer helper functions used by RLS live outside the exposed `public` API schema.

## Secrets

Never commit service-role keys, database passwords, access tokens or production credentials. The project ref and publishable/anon browser credentials are not authorization boundaries; RLS is.

## Web application migration

The existing web prototype still contains legacy generated types and legacy `foods` queries. Do not point production-like traffic at this new schema until the web application is migrated to the v2 model and its generated types are updated in a dedicated PR.
