# FridgeCheck Documentation

Start with `../AGENTS.md`.

This directory contains the project contracts that define how FridgeCheck should be designed, tested and operated.

## Documents

### `PRODUCT.md`

Defines what problem FridgeCheck solves, the core user loop, product priorities and explicit MVP boundaries.

Read before changing user-facing behavior or proposing a new feature.

### `ARCHITECTURE.md`

Defines architectural layers, server/client boundaries, external integrations, date/unit rules, migrations and observability principles.

Read before structural/refactoring work.

### `DATA_MODEL.md`

Defines the target inventory domain: Product, InventoryBatch, StockTarget, InventoryEvent and shopping concepts, including expiry and FEFO semantics.

Read before changing persistence or inventory calculations.

### `TESTING.md`

Defines required unit, integration and E2E testing strategy, regression rules, coverage expectations and deterministic CI behavior.

Read for every behavior change.

### `CI_CD.md`

Defines the target merge-gating CI/CD contract.

Read before changing workflows, scripts, test infrastructure, Node versions or deployment behavior.

### `SECURITY.md`

Defines household privacy, authorization, Supabase RLS, credentials, external input and security-testing rules.

Read for auth, database, API, upload, analytics and privacy work.

### `DEFINITION_OF_DONE.md`

Defines the final standard a change must satisfy before it can be called complete/merge-ready.

Read before reporting any task as done.

## Important distinction

These documents describe the intended engineering contract. Some parts are target state and are not yet enforced by the current repository.

Do not confuse documentation with implementation. If CI, tests, migrations or security policies do not yet enforce a rule, report that gap and implement it deliberately.

## Updating these contracts

Change these documents only when the product/engineering policy itself changes.

Do not weaken a rule merely because current code fails to satisfy it. Existing technical debt should be fixed or explicitly tracked; it should not redefine the standard downward.
