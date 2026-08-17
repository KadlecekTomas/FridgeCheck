# Architecture Contract

## Current stack

The existing repository contains:

- `web/`: Next.js + React + TypeScript + Supabase
- `mobile/`: Expo / React Native prototype
- `.github/workflows/`: basic CI workflows

The near-term product target is a high-quality mobile-first web/PWA. Native mobile is not the default implementation target until the core web workflow is proven.

## Architectural goals

The system should be:

- easy to test
- difficult to misuse
- explicit about data ownership and authorization
- resilient to incomplete external product data
- safe to evolve through migrations
- simple enough for a small team to operate

## Layering

Prefer four conceptual layers.

### 1. Domain

Pure business rules with minimal framework coupling.

Examples:

- quantity normalization
- unit compatibility
- expiry urgency
- FEFO batch selection
- usable-stock calculation
- replenishment calculation
- consumption allocation

Domain functions should be deterministic and heavily unit tested.

Do not embed critical calculations inside React components.

### 2. Application / use cases

Coordinates domain logic and persistence.

Examples:

- add inventory batch
- consume product
- correct quantity
- discard food
- calculate shopping needs
- import barcode metadata

This layer defines transactional boundaries and expected failure behavior.

### 3. Infrastructure

External systems and persistence:

- Supabase database/auth
- Open Food Facts
- browser camera / barcode scanning
- future analytics/monitoring

External services must be wrapped so domain logic does not depend on raw API responses.

### 4. Presentation

Next.js routes, React components and client interaction.

Components should render state and invoke use cases. They should not become the canonical location for inventory rules.

## Server/client boundary

Treat the browser as untrusted.

Client-side checks improve UX but never replace database/backend authorization.

Sensitive mutations must be protected by server/database policy. Supabase RLS is part of the security boundary and must be tested.

Never expose a Supabase service-role key or equivalent privileged credential to client-side bundles.

## Repository direction

Prefer a structure that moves toward clear domain modules, for example:

```text
web/src/
  app/
  components/
  features/
    inventory/
    expiry/
    shopping/
  domain/
    inventory/
    expiry/
    replenishment/
  lib/
    supabase/
    open-food-facts/
  test/
```

This is a direction, not permission for a big-bang rewrite. Refactor incrementally when touching relevant areas.

## State management

Do not introduce a global state library by default.

Use server/database state as the source of truth. Keep local UI state local. Add a state abstraction only when repeated synchronization problems justify it.

## External data

Open Food Facts and similar APIs are advisory metadata sources.

Normalize external data into an internal shape before using it elsewhere. Never spread third-party response schemas throughout the application.

Failures must degrade gracefully:

- product not found
- timeout/network failure
- malformed fields
- missing image
- incorrect category

A barcode must still be manually usable when metadata lookup fails.

## Dates and time

Expiry semantics are date-sensitive and must be deterministic.

- Store timestamps in UTC where timestamps are needed.
- Store a food expiry date as a date concept when time-of-day is irrelevant.
- Do not compare formatted localized strings.
- Centralize expiry classification logic.
- Tests must cover timezone and date-boundary behavior.

## Quantities and units

Do not perform unsafe arithmetic across incompatible units.

Represent amount and unit explicitly. Conversion must be defined and tested.

Examples of compatible conversions:

- kg <-> g
- l <-> ml

Do not automatically convert `pieces` to grams without product-specific knowledge.

Approximate stock states may coexist with precise quantities, but their semantics must be explicit.

## Error handling

Errors shown to users should be actionable and not leak sensitive implementation details.

Infrastructure errors should be logged with enough context for debugging, while avoiding secrets and private food data where unnecessary.

Do not silently swallow failures that can make inventory incorrect.

## Transactions and consistency

Multi-step inventory mutations that must remain consistent should execute atomically where possible.

For example, a consumption operation that reduces one or more batches and writes a consumption event should not leave partial state if one step fails.

## Migrations

Database changes require versioned migrations.

A migration must specify:

- forward change
- data backfill when needed
- compatibility impact
- rollback or recovery strategy for risky changes
- tests/validation queries

Do not manually change production schema as an undocumented shortcut.

## Observability

Critical failures should eventually be observable without reproducing them on a user's device.

At minimum, architecture should leave room for:

- structured error reporting
- request/mutation correlation
- CI artifacts for failed E2E tests

Do not add invasive analytics before defining privacy boundaries.

## Performance

Correctness and interaction speed matter more than premature optimization.

Avoid N+1 database access, excessive client waterfalls and downloading unnecessary inventory history to render simple current-state views.

Measure before adding complex caching.

## Architecture decision rule

Prefer the design that:

1. keeps domain behavior pure and testable
2. minimizes hidden coupling
3. preserves data integrity
4. needs the fewest new dependencies
5. can evolve without a rewrite
