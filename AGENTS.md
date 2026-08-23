# FridgeCheck Agent Rules

This file is the authoritative operating contract for every AI agent and contributor working in this repository.

## Rule hierarchy

Read this file before making any change. Then read the documents relevant to the task under `docs/`.

If instructions conflict, use this precedence:

1. `AGENTS.md`
2. `docs/DEFINITION_OF_DONE.md`
3. task-specific documents in `docs/`
4. local README files
5. implementation details in existing code

Existing code is evidence of the current state, not proof of the intended architecture.

## Product objective

FridgeCheck / HlídačJídla must answer three questions with minimal user effort:

1. What food do I have at home?
2. What should I consume soon because it is expiring?
3. What should I buy so I have enough food for the selected period?

The application is inventory-first, expiry-aware and shopping-oriented. The product must reduce household cognitive load; it must not create a second job called “maintaining the inventory app”.

FridgeCheck is one product with a mobile-first web/PWA client and a planned first-class native iOS/Android client. The web/PWA remains the immediate delivery path for proving the complete core loop, but native mobile must be evolved as a durable client of the same backend/domain model rather than treated as throwaway code.

Read `docs/PRODUCT.md` before changing user-facing behavior.

## Non-negotiable engineering rules

- Never push directly to `main` for normal development. Use a focused branch and PR.
- Never weaken, delete, skip or bypass a failing test, lint rule, type check, security check or CI gate merely to make CI green.
- Never claim a change is complete without executing the relevant validation.
- “Build passes” is not equivalent to “feature works”.
- Every bug fix must include a regression test when technically feasible.
- Every new domain rule must have automated tests.
- Every critical user flow must have an end-to-end test.
- New code must be typed. Do not introduce `any` as an escape hatch without a documented reason.
- Do not silently change data semantics. Schema and domain changes require explicit migrations and tests.
- Do not expose secrets, service-role keys, tokens or privileged Supabase credentials to any client code, including native bundles.
- Do not trust client-side authorization. Access control must be enforced by the backend/database boundary, including Supabase RLS where applicable.
- Do not add dependencies without a concrete benefit. Prefer the platform and existing stack.
- Do not add speculative abstractions for hypothetical future requirements.
- Do not preserve bad architecture solely because it already exists.
- Do preserve user data and backward compatibility unless a migration plan explicitly says otherwise.
- Do not commit generated dependency directories such as `node_modules`.
- Do not independently reimplement critical inventory/expiry/replenishment semantics in web and native clients. Prefer shared pure domain logic/contracts or shared test vectors.

## Required workflow for every task

### 1. Understand before editing

Inspect the relevant implementation, tests, schema, CI and surrounding call sites first. Identify the actual behavior and failure mode before proposing a fix.

For a bug, establish a reproducible failing case before changing implementation whenever possible.

### 2. Define the smallest correct change

Prefer the smallest change that completely fixes the real problem. Avoid opportunistic refactors unless they remove a direct blocker or materially reduce risk in the touched area.

### 3. Implement at the correct layer

Keep business logic independent from UI wherever practical. Inventory calculations, expiry decisions and shopping calculations belong in testable domain modules, not embedded in Next.js or React Native components.

When both clients need the same mature rule, move toward reusable shared TypeScript modules/contracts incrementally rather than maintaining divergent copies or attempting a big-bang rewrite.

Read `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md` for structural changes.

### 4. Test the behavior

Use the test pyramid defined in `docs/TESTING.md`.

At minimum, changed behavior must have the appropriate automated test. Critical flows require E2E coverage.

For shared domain behavior, test the shared implementation/contracts rather than duplicating weaker per-client tests.

### 5. Validate the repository

Before marking work complete, run all checks relevant to the affected surface. The target CI contract is defined in `docs/CI_CD.md`.

Never report a check as passed if it was not actually executed.

### 6. Review the diff

Before commit/PR, inspect the final diff for:

- accidental files
- secrets
- debug code
- commented-out code
- duplicated logic
- unsafe migrations
- untested branches
- unrelated formatting churn

### 7. Report truthfully

A completion summary must distinguish:

- what changed
- what was tested
- what was not tested
- known limitations or follow-up work

## Definition of Done

No task is done until it satisfies `docs/DEFINITION_OF_DONE.md`.

A green CI run is necessary but not sufficient. The change must also be behaviorally correct, secure, maintainable and aligned with the product objective.

## Scope discipline

The immediate delivery priority is a high-quality mobile-first web/PWA experience because it lets us prove the core workflow fastest. Native iOS/Android is nevertheless a planned first-class client and should be advanced deliberately without duplicating the product or blocking core-loop validation.

Prioritize native work where native capabilities produce real product leverage: barcode/camera capture, push notifications, offline/mobile reliability, justified background/device integrations and later high-frequency entry points such as widgets.

Do not burn engineering time on superficial web/native screen parity before the underlying workflow is valuable and stable. Likewise, do not divert effort into low-ROI features such as broad AI functionality, retailer integrations or advanced recipe systems before the core loop is excellent:

`inventory -> expiry awareness -> consumption -> replenishment -> shopping`

## Core domain principles

- A product definition is not the same thing as a physical batch in inventory.
- Expiry belongs to a batch, not to the abstract product.
- Stock targets belong to the household/product relationship.
- Quantity changes should be traceable through inventory events/history.
- The shopping recommendation is derived from current usable stock, stock targets and planned/expected consumption.
- Expired or unusable stock must not falsely satisfy a replenishment target.
- When consuming equivalent stock, use the earliest suitable expiry first (FEFO: First Expired, First Out), unless the user explicitly selects another batch.
- These semantics must remain consistent across web/PWA and native clients.

Read `docs/DATA_MODEL.md` before modifying inventory persistence.

## Quality philosophy

Coverage percentage is a signal, not proof. We optimize for defect prevention and confidence in real behavior.

Critical inventory arithmetic and date/expiry logic should reach effectively exhaustive branch coverage. Important web workflows must be exercised in a real browser. As native becomes feature-bearing, critical native flows must gain appropriate native/device/E2E validation rather than inheriting confidence from web tests alone. External integrations must be tested against controlled fixtures/mocks and failure cases.

## Security philosophy

Household data is private by default. Users may only access households, storage units, batches and derived data they are authorized to access. Authorization rules must be tested regardless of which client makes the request.

Read `docs/SECURITY.md` for any auth, Supabase, API, file, analytics or privacy change.

## When unsure

Choose correctness, simplicity and user-data safety over speed. If two designs are viable, prefer the one that is easier to test, easier to migrate, harder to misuse and less likely to create web/native semantic drift.
