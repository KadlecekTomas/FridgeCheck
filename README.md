# FridgeCheck / HlídačJídla

FridgeCheck is a household food inventory application focused on three practical questions:

1. What food do I have at home?
2. What should I consume soon because it is expiring?
3. What should I buy so I have enough food for the next days?

The product is designed to reduce food waste, shopping uncertainty and the mental overhead of keeping a household stocked.

## Current status

The mobile-first web/PWA has moved beyond the original prototype hardening phase and now has a tested v2 inventory core suitable for a **private hosted pilot once the external production environment is configured and smoke-tested**.

Current product behavior includes:

- Supabase auth, registration/login and PKCE password recovery,
- household isolation enforced by RLS and hostile public-client tests,
- storage locations,
- Product + InventoryBatch inventory,
- expiry/use-by/best-before behavior,
- transactional FEFO consumption,
- discard/waste and auditable stock corrections,
- InventoryEvent history,
- stock targets, replenishment and shopping,
- EAN/Open Food Facts assisted entry,
- cross-browser camera barcode scanner with manual fallback,
- installable mobile-first PWA metadata/icons.

The Expo/React Native prototype remains non-priority. Product validation should happen through the mobile-first web/PWA before native mobile expansion.

A green repository is not the same as a live production release. Hosted Supabase Auth/SMTP, Vercel, the domain and real-device behavior still require the production procedure in [`docs/RELEASE_CHECKLIST.md`](./docs/RELEASE_CHECKLIST.md).

## Mandatory project rules

**Before changing code, read [`AGENTS.md`](./AGENTS.md).**

It is the authoritative operating contract for contributors and AI agents.

Then read the relevant documents in [`docs/`](./docs/README.md):

- [Product contract](./docs/PRODUCT.md)
- [Architecture contract](./docs/ARCHITECTURE.md)
- [Data model contract](./docs/DATA_MODEL.md)
- [Testing contract](./docs/TESTING.md)
- [CI/CD contract](./docs/CI_CD.md)
- [Security contract](./docs/SECURITY.md)
- [Definition of Done](./docs/DEFINITION_OF_DONE.md)
- [Release checklist](./docs/RELEASE_CHECKLIST.md)
- [Contributing](./CONTRIBUTING.md)

## Core product loop

```text
inventory
   ↓
expiry awareness
   ↓
consume / discard / correct
   ↓
usable stock
   ↓
replenishment need
   ↓
shopping list
```

The product should make this loop fast enough to use every day.

## Domain model

A fundamental domain rule is:

**Product != InventoryBatch**

A product describes what an item is. A batch describes a physical amount in a household with its own quantity, storage location and expiry.

Stock targets and inventory history support deterministic shopping recommendations and future consumption learning without collapsing product metadata into physical stock.

See [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md).

## Repository

```text
.
├── AGENTS.md
├── CONTRIBUTING.md
├── docs/
├── supabase/             # versioned PostgreSQL migrations + SQL regression/RLS tests
├── web/                  # Next.js 16 / React 19 / TypeScript / Supabase / PWA
├── mobile/               # Expo / React Native prototype (non-priority)
└── .github/workflows/    # blocking Web, Supabase and production-browser CI
```

## Web development

```bash
cd web
npm ci
npm run dev
```

Expected public environment variables are documented in [`web/.env.example`](./web/.env.example).

The current automated quality baseline includes:

- lockfile install,
- ESLint,
- TypeScript typecheck,
- pure-domain unit tests,
- Next.js 16 Turbopack production build,
- HIGH-level dependency audit,
- clean Supabase rebuild from repository migrations,
- SQL regression/RLS tests,
- complete mobile-viewport production Playwright suite.

Coverage thresholds, explicit secret-scanning and automated proof/configuration of branch protection remain tracked engineering gaps. See [`docs/CI_CD.md`](./docs/CI_CD.md).

Never interpret a successful local build as sufficient release validation.

## Current engineering priority

The immediate priority is **hosted release readiness and real daily-use validation**, not more feature breadth:

1. configure the intended hosted Supabase/Auth/SMTP environment,
2. create/reconnect the production Vercel project,
3. attach `hlidacjidla.eu` over HTTPS,
4. run the real production + iPhone/PWA/camera smoke checklist,
5. start daily private-pilot use,
6. fix friction found by real use before adding lower-priority features.

Before broader public scale, also address the known database performance-advisor work with tested migrations.

## Quality standard

A feature is not done merely because it renders or builds.

Completion requires the appropriate automated tests, security/data-integrity review, passing relevant CI checks and satisfaction of the project Definition of Done.

See [`docs/DEFINITION_OF_DONE.md`](./docs/DEFINITION_OF_DONE.md).
