# Testing Contract

## Goal

Tests exist to provide confidence that FridgeCheck behaves correctly in realistic use, not to maximize a vanity percentage.

A change is not considered safe because it compiles or because a single happy-path test passes.

## Test pyramid

### 1. Unit tests

Use for pure domain behavior and deterministic utilities.

Mandatory examples:

- quantity normalization/conversion
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

Integration tests must cover both successful and rejected operations.

### 3. End-to-end tests

Use a real browser for critical user journeys.

Core E2E flows must include at minimum:

1. sign in / authenticated entry
2. create or access household
3. create/access storage unit
4. add product manually
5. add product via barcode metadata with a controlled external response
6. add multiple batches of the same product with different expiry dates
7. view urgent expiry state
8. consume stock and verify FEFO behavior
9. correct inventory quantity
10. discard/waste stock
11. set stock target
12. see derived replenishment need
13. convert/confirm recommendation in shopping list
14. verify an unauthorized household cannot be accessed

As features evolve, update this list rather than allowing critical behavior to exist without E2E coverage.

## Regression rule

Every confirmed bug should first be represented by a failing automated test whenever technically practical.

Then fix the implementation and prove the test passes.

A bug fix without a regression test requires an explicit explanation in the PR.

## Coverage gates

Coverage is a floor, not a goal.

Target policy once the test suite is established:

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
- unknown EAN
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
