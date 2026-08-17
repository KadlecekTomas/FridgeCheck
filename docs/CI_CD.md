# CI/CD Contract

## Purpose

CI is a merge gate, not a decorative status badge.

Every pull request that can affect production behavior must be validated automatically before merge.

## Current implementation state

The web workflow currently runs on pull requests targeting `main` and pushes to `main`, and enforces:

- lockfile dependency installation with `npm ci`
- ESLint
- explicit TypeScript type checking
- the initial pure-domain unit-test suite
- production build

This is a real baseline, not the complete target. Integration tests, database/RLS verification, coverage gates, browser E2E and explicit dependency/security policy are still pending hardening stages.

Do not claim the full target contract below is implemented until the workflows actually enforce it.

## Required triggers

CI must run on:

- pull requests targeting `main`
- pushes to `main`
- relevant workflow/config changes

Path filtering may be used for efficiency only if it cannot skip checks required by a change.

## Web quality pipeline

The web pipeline should eventually include these blocking stages:

1. checkout
2. install dependencies with lockfile enforcement (`npm ci`)
3. dependency/cache setup
4. formatting verification if formatting is standardized
5. ESLint
6. TypeScript type check
7. unit tests
8. integration tests
9. coverage gate
10. production build
11. E2E tests
12. security/dependency checks appropriate to the stack

Independent jobs should run in parallel where useful, but merge protection should require all blocking checks.

## Node and action versions

Use a supported Node LTS version and keep it consistent across local tooling and CI.

Pin or deliberately version GitHub Actions. Do not leave the repository indefinitely on obsolete major versions.

Dependency upgrades must be intentional and validated.

## Pull request gate

A PR must not merge when any required check is failing or missing.

Never solve a red pipeline by:

- commenting out a test
- marking a meaningful test as skipped
- removing a lint/typecheck rule without technical justification
- changing a required job to non-blocking solely to unblock merge
- adding unconditional retries to hide flakiness
- catching and ignoring test failures

Fix the underlying problem.

## E2E in CI

Critical browser tests should run against a deterministic test environment.

The E2E job should provide failure artifacts, preferably:

- Playwright trace
- screenshots
- video when useful
- test report

External services such as Open Food Facts should normally be mocked/intercepted for deterministic blocking E2E.

## Database CI

Schema/migration changes must be validated in an isolated environment.

Target checks include:

- migrations apply cleanly from the expected baseline
- generated types are current where generated types are used
- integration tests pass against the migrated schema
- RLS/access tests pass
- destructive or irreversible changes are identified explicitly

Production must never be the first environment in which a migration is exercised.

## Security checks

The pipeline should include pragmatic security gates such as:

- dependency audit with an explicit severity policy
- secret scanning
- static checks supplied by the ecosystem where useful

Do not blindly fail the build on noisy scanners without a triage policy, but do not silently ignore high-confidence critical findings.

## Branch protection target

`main` should be protected so that normal changes require a PR and required checks.

Recommended policy:

- no routine direct pushes
- required status checks
- branch must be up to date before merge when necessary
- unresolved review conversations block merge when review is used
- force-push disabled on `main`

## Deployment principle

Deployment should consume a revision that passed the required checks.

Do not deploy an untested working tree or an unrelated commit.

For future production deployment, prefer:

`PR -> required CI -> merge main -> production build/deploy -> smoke check`

## Environments and secrets

Use environment-specific configuration.

Never commit secrets. Never expose server-only credentials through `NEXT_PUBLIC_*` variables.

CI secrets should be granted the minimum permissions needed for the job.

Test credentials must not have access to production household data.

## Caching

Caching may improve CI speed but must never alter correctness.

The lockfile remains authoritative. A cache hit must not allow stale code generation or tests to be skipped.

## Concurrency

For redundant runs on the same PR branch, CI may cancel superseded runs to save time/cost.

Do not cancel production/deployment work in a way that can leave deployment state ambiguous.

## Flaky tests

A flaky blocking test is a production-quality problem.

When a test is flaky:

1. capture evidence
2. identify the nondeterminism
3. fix it

Do not institutionalize “rerun until green”.

## CI ownership

Any contributor changing build tools, tests, Node versions, Supabase setup or deployment behavior must evaluate whether CI requires a corresponding update.

Workflow changes must be reviewed as production code.

## Required completion evidence

When reporting a change as ready, include the exact checks that passed.

Example target statement:

- lint: passed
- typecheck: passed
- unit: passed
- integration: passed
- build: passed
- E2E: passed

If a check does not exist yet or could not run, say so explicitly. Never imply future target CI is already enforced.
