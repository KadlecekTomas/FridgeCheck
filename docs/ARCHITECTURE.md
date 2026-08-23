# Architecture Contract

## Current stack

The repository contains:

- `web/`: Next.js + React + TypeScript + Supabase
- `mobile/`: Expo / React Native foundation for the native iOS/Android client
- `.github/workflows/`: blocking CI/security workflows

FridgeCheck is one platform with multiple clients. The mobile-first web/PWA is the immediate delivery path; the native iOS/Android application is a planned first-class client, not a disposable prototype or a separate product.

The sequencing is deliberate: prove the core workflow quickly on web/PWA, while keeping native architecture compatible with the same backend and domain semantics so native can grow without a rewrite.

## Architectural goals

The system should be:

- easy to test
- difficult to misuse
- explicit about data ownership and authorization
- resilient to incomplete external product data
- safe to evolve through migrations
- consistent across web and native clients
- simple enough for a small team to operate

## Multi-client invariant

Web/PWA and native mobile must not develop independent definitions of core product behavior.

The canonical semantics for at least the following must remain shared or mechanically consistent:

- quantities, units and retail packages
- expiry classification
- FEFO selection
- usable stock
- consumption, correction and waste
- replenishment calculations
- shopping recommendation identity/overrides
- household authorization and isolation

Prefer shared pure TypeScript domain modules/contracts where they can be consumed safely by both clients. Where implementation cannot literally be shared, share typed contracts and test vectors so behavior cannot drift silently.

Do not introduce a big-bang monorepo rewrite merely to achieve sharing. Extract stable domain behavior incrementally as relevant code is touched.

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

Do not embed critical calculations inside Next.js or React Native components.

### 2. Application / use cases

Coordinates domain logic and persistence.

Examples:

- add inventory batch
- consume product
- correct quantity
- discard food
- calculate shopping needs
- import barcode metadata

This layer defines transactional boundaries and expected failure behavior. Client-specific presentation should call compatible use cases rather than reimplement their semantics.

### 3. Infrastructure

External systems and persistence:

- Supabase database/auth
- Open Food Facts
- browser/native camera and barcode scanning
- future push notification infrastructure
- future offline synchronization support
- future analytics/monitoring

External services must be wrapped so domain logic does not depend on raw API responses.

### 4. Presentation

Presentation currently includes:

- Next.js routes and React components under `web/`
- Expo / React Native screens and native interaction under `mobile/`

Presentation code should render state and invoke use cases. It must not become the canonical location for inventory, expiry or replenishment rules.

## Server/client boundary

Treat every client as untrusted, including the native application.

Client-side checks improve UX but never replace database/backend authorization.

Sensitive mutations must be protected by server/database policy. Supabase RLS is part of the security boundary and must be tested.

Never expose a Supabase service-role key or equivalent privileged credential to web or native client bundles.

## Repository direction

Evolve toward explicit client and shared-domain boundaries, for example:

```text
web/
  src/
    app/
    components/
    features/
    lib/

mobile/
  src/
    screens/
    features/
    lib/

packages/                 # introduce incrementally when extraction is justified
  domain/
  contracts/

supabase/
```

A shared package is justified when stable logic or contracts are genuinely consumed by more than one client. Do not create empty architecture scaffolding merely to match this diagram.

Existing `web/src/domain/**` logic is a strong extraction candidate as native vertical slices begin consuming the same behavior. Preserve its tests when moving code and add cross-client contract tests where valuable.

## Native capability strategy

Native work should concentrate first on capabilities with real platform advantage rather than duplicating every web screen:

- fast camera/barcode capture
- push expiry/replenishment notifications
- reliable offline/mobile interaction
- background/device integrations where justified
- later widgets or other high-frequency entry points

A native feature must still preserve the same inventory and authorization semantics as web/PWA.

## State management

Do not introduce a global state library by default.

Use server/database state as the source of truth. Keep local UI state local. Add a state abstraction only when repeated synchronization problems justify it.

If offline native behavior is introduced, explicitly define reconciliation/conflict semantics before making local state authoritative.

## External data

Open Food Facts and similar APIs are advisory metadata sources.

Normalize external data into an internal shape before using it elsewhere. Never spread third-party response schemas throughout either client.

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
- Web and native must use the same expiry semantics.

## Quantities and units

Do not perform unsafe arithmetic across incompatible units.

Represent amount and unit explicitly. Conversion must be defined and tested.

Examples of compatible conversions:

- kg <-> g
- l <-> ml

Do not automatically convert `pieces` to grams without product-specific knowledge.

Approximate stock states may coexist with precise quantities, but their semantics must be explicit and consistent across clients.

## Error handling

Errors shown to users should be actionable and not leak sensitive implementation details.

Infrastructure errors should be logged with enough context for debugging, while avoiding secrets and private food data where unnecessary.

Do not silently swallow failures that can make inventory incorrect.

## Transactions and consistency

Multi-step inventory mutations that must remain consistent should execute atomically where possible.

For example, a consumption operation that reduces one or more batches and writes a consumption event should not leave partial state if one step fails.

Clients must not implement alternate mutation sequences that bypass trusted transactional/authorization guarantees.

## Migrations

Database changes require versioned migrations.

A migration must specify:

- forward change
- data backfill when needed
- compatibility impact for all active clients
- rollback or recovery strategy for risky changes
- tests/validation queries

Do not manually change production schema as an undocumented shortcut.

## Observability

Critical failures should eventually be observable without reproducing them on a user's device.

At minimum, architecture should leave room for:

- structured error reporting
- request/mutation correlation
- CI artifacts for failed E2E tests
- platform/version context for native failures

Do not add invasive analytics before defining privacy boundaries.

## Performance

Correctness and interaction speed matter more than premature optimization.

Avoid N+1 database access, excessive client waterfalls and downloading unnecessary inventory history to render simple current-state views.

Measure before adding complex caching or offline synchronization machinery.

## Architecture decision rule

Prefer the design that:

1. keeps domain behavior pure and testable
2. minimizes hidden coupling and cross-client drift
3. preserves data integrity and authorization
4. needs the fewest new dependencies
5. can evolve across web and native without a rewrite
