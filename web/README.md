# FridgeCheck Web

The `web/` application is the primary implementation target for the current FridgeCheck / HlídačJídla product.

Before changing this directory, read the repository root [`AGENTS.md`](../AGENTS.md) and the relevant documents under [`docs/`](../docs/README.md).

## Stack

Current application stack:

- Next.js 15.5 Maintenance LTS
- React 19
- TypeScript
- Tailwind CSS
- Supabase Auth / PostgreSQL with RLS
- Node.js 24 LTS

The dependency set still contains legacy prototype packages and source that are being removed incrementally. New product code must not create new dependencies on the legacy `foods` table or old summary views.

## Runtime

The supported web runtime is Node.js 24 LTS. The version is declared in [`.nvmrc`](./.nvmrc) and `package.json` so local development and CI use the same major version.

With `nvm`:

```bash
nvm use
```

## Local development

Install dependencies and start the app:

```bash
npm ci
npm run dev
```

Production build:

```bash
npm run build
```

Quality checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=critical
```

The unit suite uses Node.js 24's built-in test runner for pure expiry and inventory/replenishment rules.

## Browser E2E

The core browser test lives in [`e2e/core-flow.spec.ts`](./e2e/core-flow.spec.ts). CI runs it at a mobile viewport against a disposable local Supabase stack rebuilt solely from repository migrations.

The covered daily-use path is:

```text
register
  -> create household + default Lednice
  -> add product + first inventory batch
  -> set stock minimum/target
  -> see replenishment recommendation
  -> add recommendation to shopping list
  -> return to urgency dashboard
```

This test uses local Supabase browser credentials exported by the CLI. It does not require service-role credentials or production data.

## Architecture direction

Keep critical food/inventory behavior out of page components.

Current domain modules include:

```text
src/domain/inventory/
src/domain/expiry/
```

Future replenishment/consumption logic should follow the same pure, tested approach rather than being reimplemented in page components.

See [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Supabase

Client-side authorization checks are UX only. Household isolation is enforced by database RLS and regression-tested SQL.

Never expose service-role/admin credentials in browser code.

See [`../docs/SECURITY.md`](../docs/SECURITY.md) and [`../supabase/README.md`](../supabase/README.md).

## Inventory model

New code uses the v2 model:

- Product
- InventoryBatch
- StockTarget
- InventoryEvent
- ShoppingListItem / derived replenishment need

Expiry is a batch property. Multiple batches of the same Product are expected and supported.

See [`../docs/DATA_MODEL.md`](../docs/DATA_MODEL.md).

## Design system

Active product surfaces follow the documented calm food-operating-system direction in [`../docs/DESIGN_SYSTEM.md`](../docs/DESIGN_SYSTEM.md), [`../docs/DESIGN_REFERENCES.md`](../docs/DESIGN_REFERENCES.md), and [`../docs/DASHBOARD_UX.md`](../docs/DASHBOARD_UX.md).

Do not reintroduce gradients, decorative dashboards, emoji iconography, ecommerce navigation, fake pricing/social proof, or unimplemented AI claims.

## Completion rule

Do not report web work as done until the affected behavior satisfies [`../docs/DEFINITION_OF_DONE.md`](../docs/DEFINITION_OF_DONE.md).
