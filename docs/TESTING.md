# Testing Contract

## Goal

Tests exist to provide confidence that FridgeCheck behaves correctly in realistic use, not to maximize a vanity percentage.

A change is not considered safe because it compiles or because a single happy-path test passes.

## Current executable baseline

The web package uses the Node.js 24 built-in `node:test` runner and native TypeScript execution for pure domain tests.

Run it with:

```bash
cd web
npm test
```

Web CI runs the unit suite, critical-domain coverage, lint, typecheck, production build and dependency audit as blocking pull-request steps. Database/RLS behavior and production-browser flows are covered by their dedicated blocking workflows.

The zero-dependency runner is intentional for small pure domain modules. Introduce a third-party test framework only when it provides concrete value that the built-in runner cannot provide cleanly.

## Test pyramid

### 1. Unit tests

Use for pure domain behavior and deterministic utilities.

Mandatory examples:

- quantity normalization/conversion
- package-count ↔ canonical-quantity conversion
- retail-package replenishment rounding
- expiry classification
- FEFO ordering
- usable-stock calculation
- replenishment calculation
- consumption allocation across batches
- date boundaries and timezone-sensitive logic
- validation rules

Critical calculation modules should target exhaustive branch coverage. For small pure domain modules, 100% branch coverage is an appropriate target.

### 2. Integration tests

Use for boundaries where multiple components collaborate.

Examples:

- application use case + persistence adapter
- Supabase query/mutation behavior
- RLS authorization
- database constraints
- migration/backfill validation
- Open Food Facts adapter mapping/failure handling
- repeated household EAN resolution and duplicate prevention
- package metadata constraints

Integration tests must cover both successful and rejected operations.

### 3. End-to-end tests

Use a real browser for critical user journeys.

Core E2E flows must include at minimum:

1. sign in / authenticated entry
2. create or access household
3. create/access storage unit
4. add product manually
5. add product via barcode metadata with a controlled external response
6. scan the same household-known barcode again and add stock without metadata re-entry or another external lookup
7. save a valid barcode unknown to the external provider manually and recognize it locally on the next scan
8. remain usable when the external barcode provider is unavailable
9. remain usable through manual barcode entry when camera access is denied/unavailable
10. add packaged stock such as `24 × 100 g` without requiring manual multiplication and preserve package-aware interaction through consumption
11. add multiple batches of the same product with different expiry dates
12. view urgent expiry state
13. consume stock and verify FEFO behavior
14. correct inventory quantity
15. discard/waste stock
16. set stock target, including package-count input for packaged goods
17. see derived replenishment need, including whole-retail-package rounding
18. convert/confirm and override a recommendation in the shopping list
19. verify an unauthorized household cannot be accessed

As features evolve, update this list rather than allowing critical behavior to exist without E2E coverage.

## Regression rule

Every confirmed bug should first be represented by a failing automated test whenever technically practical.

Then fix the implementation and prove the test passes.

A bug fix without a regression test requires an explicit explanation in the PR.

## Coverage gates

Coverage is a floor, not a goal.

Target policy:

- changed/new domain modules: >= 90% branch coverage
- critical inventory, expiry and replenishment pure logic: 100% branch coverage where practical
- repository-wide coverage threshold should only be raised over time; do not lower it to make CI pass

Do not write meaningless tests solely to satisfy coverage.

## What must be tested

For each behavior, consider:

- happy path
- empty input
- missing data
- invalid input
- boundary values
- duplicate/repeated action
- permission denied
- external dependency unavailable
- concurrency where relevant
- timezone/date boundary
- rollback/partial failure for multi-step mutations

## Date testing

Never make expiry tests depend on the actual current date.

Use a controllable clock/fixed date.

Test at least:

- before expiry
- exactly on expiry date
- one day after
- month/year boundary
- DST/timezone boundary when timestamps are involved

## External API testing

Do not make normal CI depend on the live Open Food Facts service.

Use fixtures or request interception for deterministic tests.

Test:

- known product
- known product with package metadata
- unknown EAN
- repeated locally known EAN without an unnecessary external request
- incomplete product metadata
- timeout/network failure
- malformed response

Live smoke checks, if used, must be separate and non-blocking unless reliability requirements justify otherwise.

## Database/RLS testing

Authorization is part of correctness.

Test at least:

- household owner/member can access authorized data
- unrelated user cannot read it
- unrelated user cannot mutate it
- forged household/storage IDs do not bypass policy
- service/admin pathways are isolated from client credentials
- repeated EAN writes cannot create duplicate Product definitions inside one household
- package metadata cannot encode incompatible units or invalid quantities

## Migration testing

A migration affecting existing data must have validation.

For data migrations, verify:

- expected source row count
- expected target row count
- no orphaned relationships
- no unexpected nulls
- no duplicate entities created by backfill logic
- representative data fidelity

Prefer a dry-run/validation query for risky migrations.

## E2E reliability

E2E tests must be deterministic enough to block merges.

Avoid arbitrary sleeps. Wait on meaningful UI/network conditions.

Capture diagnostics on failure:

- screenshot
- trace where available
- browser console errors
- relevant logs

Flaky tests are defects. Do not normalize rerunning them until green.

## Test data

Test fixtures must be isolated and predictable.

Do not rely on developer personal accounts or production data.

Do not put secrets or real private household data into fixtures.

## Manual verification

Manual testing complements automation; it does not replace it.

For user-facing changes, perform a brief manual smoke test when practical and state exactly what was checked.

## Required PR evidence

A PR should state:

- tests added/changed
- commands executed
- E2E flows exercised
- any validation not executed and why

Never write “all tests pass” unless the relevant suite was actually run.
