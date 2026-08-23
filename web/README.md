# FridgeCheck Web

The `web/` application is the primary implementation target for the current FridgeCheck / HlídačJídla product.

Before changing this directory, read the repository root [`AGENTS.md`](../AGENTS.md) and the relevant documents under [`docs/`](../docs/README.md).

## Stack

Current application stack:

- Next.js 16.3 Active LTS with Turbopack production builds
- React 19
- TypeScript
- Tailwind CSS
- Supabase Auth / PostgreSQL with RLS
- Node.js 24 LTS
- Playwright production-browser E2E

The active product code uses the v2 inventory model and Supabase SSR auth. Do not reintroduce dependencies on the legacy `foods` table, old summary views, or deprecated Supabase auth helpers.

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
npm audit --audit-level=high
```

The unit suite uses Node.js 24's built-in test runner for pure expiry, FEFO, inventory, history, storage, replenishment and external-product mapping rules.

## Vercel deployment contract

When this application is imported into Vercel, the project **Root Directory must be `web`**. Root Directory is a Vercel project setting and is intentionally not pretended to be controlled by repository JSON.

[`vercel.json`](./vercel.json) is the repository-owned part of the deployment policy. It disables automatic Vercel deployments for AI/worktree-style branches that should be validated by repository CI instead of consuming hosted build quota:

- `agent/*`
- `codex/*`
- `claude/*`
- `claude-*`

Do not recreate that rule only as an undocumented dashboard setting. Keep the versioned file authoritative for branch deployment suppression.

The canonical Vercel project must still be configured with public browser-safe environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Never expose service-role, database, SMTP or other privileged credentials as `NEXT_PUBLIC_*` variables.

A green repository build is not proof of a live Vercel release. Before private-pilot sign-off, verify the canonical Vercel project, deployed Git tree, domain/HTTPS and hosted Auth flow through [`../docs/RELEASE_CHECKLIST.md`](../docs/RELEASE_CHECKLIST.md).

## Browser E2E

CI runs the complete [`e2e/`](./e2e) Playwright suite at a mobile viewport against a disposable local Supabase stack rebuilt solely from repository migrations. The browser runs against a production Next.js build, not `next dev`.

The covered behavior includes registration/auth, password recovery, hostile public-client household isolation, household bootstrap, storage management, multiple batches, expiry urgency, FEFO consumption, stock correction, discard/waste, replenishment, shopping, inventory history and EAN/Open Food Facts entry with controlled external fixtures.

The suite uses local Supabase browser credentials exported by the CLI. It does not require service-role credentials or production data, and normal CI does not depend on live Open Food Facts availability.

Local password-recovery E2E enables the Supabase CLI mail-capture service and follows the actual recovery email through the PKCE callback before changing the password. No real email is sent from CI.

## Auth recovery production requirements

Password recovery uses Supabase's PKCE-compatible `resetPasswordForEmail` flow. The browser requests a recovery email, `/auth/callback` exchanges the one-time auth code server-side, and `/update-password` is available only with the resulting authenticated recovery session.

Before production release:

- configure the hosted Supabase **Site URL** for the production origin,
- allow the exact recovery callback URL `https://hlidacjidla.eu/auth/callback?next=/update-password`,
- configure a production SMTP provider rather than depending on Supabase's restricted development mail sender,
- verify one real recovery email on the production domain.

Recovery request UI intentionally does not reveal whether an email address is registered.

## PWA / home-screen installation

The mobile-first web app exposes a Next.js web app manifest and dedicated 192px, 512px and Apple touch icons. It is intended to be installable from HTTPS as a standalone home-screen application.

The current PWA baseline intentionally does **not** add an offline data cache or cache household API responses in a service worker. Household inventory is private and fast-moving; offline caching requires its own security, invalidation and stale-data design before it is introduced.

Install guidance is exposed from `Více`. On iOS the user follows Safari's **Sdílet → Přidat na plochu** flow; other supporting browsers expose their normal install/add-to-home-screen action.

## Architecture direction

Keep critical food/inventory behavior out of page components.

Current domain modules include:

```text
src/domain/inventory/
src/domain/expiry/
src/domain/products/
```

Future replenishment/consumption logic should follow the same pure, tested approach rather than being reimplemented in page components.

See [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Supabase

Client-side authorization checks are UX only. Household isolation is enforced by database RLS and regression-tested SQL plus a hostile public-client release test.

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
