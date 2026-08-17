# FridgeCheck Web

The `web/` application is the primary implementation target for the current FridgeCheck / HlídačJídla product.

Before changing this directory, read the repository root [`AGENTS.md`](../AGENTS.md) and the relevant documents under [`docs/`](../docs/README.md).

## Stack

Current application stack:

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Supabase Auth / database
- Open Food Facts integration
- browser barcode/camera tooling

The existing dependency set is historical evidence, not a requirement to keep every package. Remove redundant libraries when safe and justified.

## Local development

```bash
npm ci
npm run dev
```

Production build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

The project is being hardened. Additional required scripts for type checking, unit/integration tests, coverage and E2E will be added as part of the quality baseline.

## Architecture direction

Keep critical food/inventory behavior out of page components.

Move toward explicit modules for:

```text
src/domain/inventory/
src/domain/expiry/
src/domain/replenishment/
```

Presentation should invoke tested domain/application behavior rather than reimplement rules inline.

See [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Supabase

Client-side authorization checks are UX only. Household isolation must be enforced by trusted backend/database policies, including RLS where applicable.

Never expose service-role/admin credentials in browser code.

See [`../docs/SECURITY.md`](../docs/SECURITY.md).

## Inventory model

Do not expand the legacy `foods` concept without considering the target model:

- Product
- InventoryBatch
- StockTarget
- InventoryEvent
- ShoppingListItem / derived replenishment need

Expiry is a batch property.

See [`../docs/DATA_MODEL.md`](../docs/DATA_MODEL.md).

## Tests

Behavioral changes require automated coverage appropriate to the layer.

Critical flows must eventually be covered in a real browser. Domain calculations should be pure and exhaustively tested where practical.

See [`../docs/TESTING.md`](../docs/TESTING.md).

## External product data

Open Food Facts is a convenience source, not the source of truth.

The app must remain usable when lookup fails or returns incomplete/incorrect metadata. Normalize responses behind an adapter rather than coupling UI/domain code to the raw external schema.

## Completion rule

Do not report web work as done until the affected behavior satisfies [`../docs/DEFINITION_OF_DONE.md`](../docs/DEFINITION_OF_DONE.md).
