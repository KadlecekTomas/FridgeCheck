# Contributing to FridgeCheck

## Before you start

Read `AGENTS.md` first. It is the authoritative project contract.

Then read the relevant documents under `docs/` for the area you are changing.

## Branching

Do not develop routine changes directly on `main`.

Use focused branches, preferably:

- `agent/<description>` for agent-created work
- `feat/<description>` for features
- `fix/<description>` for bug fixes
- `chore/<description>` for maintenance

Keep each PR focused on one coherent outcome.

## Before coding

Inspect:

- current implementation
- related tests
- data model/schema
- existing CI behavior
- relevant call sites

For bugs, reproduce the failure first when practical.

## Implementation rules

- Prefer small, complete changes over broad rewrites.
- Keep domain logic out of React components where practical.
- Reuse existing abstractions when they are sound; replace them when they materially obstruct correctness/testing.
- Do not introduce a dependency when a small local implementation is clearer and safer.
- Do not mix unrelated cleanup into a feature/fix PR unless necessary.

## Tests

Follow `docs/TESTING.md`.

Every PR that changes behavior should add/update the appropriate tests.

A bug fix without regression coverage must explain why automation was not technically practical.

## Data changes

Follow `docs/DATA_MODEL.md`.

Schema changes require migrations. Risky migrations require validation and a recovery strategy.

Never make undocumented production-only schema edits.

## Security

Follow `docs/SECURITY.md`.

Any change to auth, household membership, Supabase queries/policies, API endpoints, uploads or privileged credentials requires an explicit authorization review.

## Pull requests

A good PR explains:

- problem
- solution
- user/developer impact
- tests
- validation performed
- migration/security implications
- remaining risk

Do not describe target behavior as implemented unless it is present in the diff.

## Review discipline

Review for correctness before style.

Priority order:

1. data loss/corruption
2. authorization/security
3. incorrect domain behavior
4. missing regression coverage
5. reliability/observability
6. maintainability
7. style

Do not approve a PR solely because CI is green.

## CI failures

Treat a red required check as a defect to investigate.

Do not bypass the gate to merge faster.

If CI itself is wrong, fix the CI with the same review/testing discipline as application code.

## Dependency changes

When changing dependencies:

- explain why
- commit the lockfile change
- assess relevant breaking/security impact
- run the full affected validation

Do not perform unrelated bulk upgrades inside a product PR.

## Generated files

Do not commit `node_modules` or equivalent dependency directories.

Generated source/types may be committed only when the repository intentionally tracks them and the generation process is reproducible.

## Commit/PR hygiene

Keep commits understandable. Avoid accidental binaries, local environment files, screenshots and secrets unless intentionally required.

Before publishing, inspect `git status` and the final diff.

## Definition of Done

Use `docs/DEFINITION_OF_DONE.md` as the final merge-readiness checklist.
