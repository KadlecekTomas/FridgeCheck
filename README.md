# FridgeCheck / HlídačJídla

FridgeCheck is a household food inventory application focused on three practical questions:

1. What food do I have at home?
2. What should I consume soon because it is expiring?
3. What should I buy so I have enough food for the next days?

The product is designed to reduce food waste, shopping uncertainty and the mental overhead of keeping a household stocked.

## Current status

This repository is an existing prototype being hardened into a production-quality product.

The current codebase already contains a Next.js/Supabase web application and an Expo/React Native mobile prototype. The immediate priority is to make the mobile-first web/PWA core loop reliable, well-tested and easy to use before expanding native mobile scope.

Do not assume the current implementation already satisfies the target engineering standard. The repository is undergoing deliberate quality hardening.

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

## Domain model direction

A fundamental domain rule is:

**Product != InventoryBatch**

A product describes what an item is. A batch describes a physical amount in a household with its own quantity, storage location and expiry.

The target domain also includes stock targets and inventory history so shopping recommendations and future consumption learning can be reliable.

See [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md).

## Repository

```text
.
├── AGENTS.md
├── CONTRIBUTING.md
├── docs/
├── web/                  # Next.js / React / TypeScript / Supabase
├── mobile/               # Expo / React Native prototype
└── .github/workflows/    # CI workflows (currently being hardened)
```

## Web development

```bash
cd web
npm ci
npm run dev
```

Existing scripts currently include development, linting and production build. The testing/typecheck/CI toolchain will be expanded to satisfy the contracts under `docs/`.

Never interpret a successful local build as sufficient release validation.

## Engineering priorities

Current order of work:

1. repository hygiene and reproducibility
2. enforceable CI on pull requests
3. typecheck + unit/integration test infrastructure
4. browser E2E coverage of critical flows
5. database/RLS verification
6. inventory domain refactor toward Product + InventoryBatch + StockTarget + InventoryEvent
7. core UX: what to consume, what is low, what to buy
8. production hardening/observability

Features with weaker near-term ROI should not distract from this sequence.

## Quality standard

A feature is not done merely because it renders or builds.

Completion requires the appropriate automated tests, security/data-integrity review, passing relevant CI checks and satisfaction of the project Definition of Done.

See [`docs/DEFINITION_OF_DONE.md`](./docs/DEFINITION_OF_DONE.md).
