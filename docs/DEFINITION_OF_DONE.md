# Definition of Done

A task is not done because code was written. It is done when the intended behavior is proven, maintainable and safe to merge.

## Product correctness

- The implementation solves the stated user problem, not just the literal ticket wording.
- The behavior aligns with `docs/PRODUCT.md`.
- User-facing edge cases have been considered.
- The change does not increase inventory-maintenance friction without a clear product benefit.

## Architecture

- Business logic lives at an appropriate testable layer.
- The change does not create unnecessary coupling between UI, persistence and domain logic.
- New abstractions/dependencies are justified.
- Data model changes follow `docs/DATA_MODEL.md`.
- No avoidable duplicate business rules are introduced.

## Data integrity

For persistence changes:

- schema changes are migration-backed
- existing data impact is understood
- backfills are validated
- constraints/relationships are correct
- partial failures cannot leave invalid state where atomicity is required

## Security

- authorization is enforced at a trusted boundary
- household isolation remains intact
- no secrets are exposed
- untrusted input is validated appropriately
- relevant RLS/security tests exist

## Tests

- new domain behavior has automated coverage
- bug fixes include regression coverage when feasible
- changed critical flows have integration/E2E coverage as appropriate
- failure and boundary cases are tested
- tests are deterministic
- no meaningful tests were skipped/disabled to get green CI

See `docs/TESTING.md`.

## Validation

The relevant commands/checks have actually been executed.

Target evidence includes:

- lint
- typecheck
- unit tests
- integration tests
- production build
- E2E tests for affected critical flow

If a check does not yet exist, that gap must be stated explicitly rather than implied as passed.

## CI

- required CI is green
- no required gate was weakened to achieve green status
- workflow changes were reviewed like production code
- failure artifacts/logging remain useful

## Code quality

- no debug leftovers
- no accidental commented-out implementation
- no unexplained `any`
- no dead dependency added
- no generated dependency directories committed
- naming reflects domain meaning
- error handling is explicit

## UX

For user-facing work:

- loading state is handled
- empty state is handled
- recoverable error state is handled
- success feedback is clear where needed
- mobile viewport behavior is verified
- primary action remains obvious
- accessibility basics are preserved (labels, keyboard/focus behavior, semantic controls)

## Documentation

Documentation is updated when the change alters:

- architecture
- data semantics
- setup/run commands
- security assumptions
- CI/testing contract
- product behavior that future work must understand

Do not update docs for noise; do update them when future contributors would otherwise make the wrong decision.

## Diff review

Before completion, inspect the final diff and confirm:

- only intended files changed
- no secrets are present
- no large accidental generated files are included
- no unrelated refactor obscures the real change
- migrations/tests/docs correspond to the implementation

## Completion report

The final report must state:

1. what changed
2. why this is the correct solution
3. what automated tests were added/changed
4. which validation commands/checks passed
5. anything not validated
6. remaining risk or follow-up, if any

Do not use vague claims such as “should work” when the behavior can be verified.

## Merge rule

If any required condition above is materially unsatisfied, the task is not ready to merge.
