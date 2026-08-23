# CI/CD Contract

## Purpose

CI is a merge gate, not a decorative status badge.

Every pull request that can affect production behavior must be validated automatically before merge.

## Current implementation state

The repository now enforces six complementary automated pipelines according to the paths changed.

### Web CI

On relevant pull requests targeting `main` and pushes to `main`, Web CI enforces:

- lockfile dependency installation with `npm ci`,
- ESLint,
- explicit TypeScript type checking,
- the pure-domain Node.js unit-test suite,
- native Node.js coverage over production files under `web/src/domain/**`,
- blocking critical-domain thresholds of **100% lines, 100% functions and 98% branches**,
- Next.js 16 Turbopack production build,
- dependency audit failing on HIGH-or-higher advisories.

The coverage thresholds were not invented before measurement. The first aggregate production-domain baseline was 96.30% lines / 93.71% branches / 97.37% functions. Meaningful uncovered edge cases were then tested and one unreachable branch was removed. The resulting measured baseline is 100% lines / 98.73% branches / 100% functions, which supports the committed blocking thresholds above.

### Mobile CI

The native Expo client is still early in implementation but is a planned first-class iOS/Android client. Changes under `mobile/**` must be validated before merge. On relevant pull requests targeting `main` and pushes to `main`, Mobile CI enforces:

- lockfile dependency installation with `npm ci`,
- a supported Node.js 22 runtime compatible with the current Expo SDK,
- a blocking `npm audit --audit-level=high` dependency gate,
- ESLint,
- explicit strict TypeScript type checking,
- `expo install --check` so dependency updates cannot silently leave Expo/React Native package versions out of alignment,
- production JavaScript bundle exports for both Android and iOS.

This gate validates dependency security, static quality, SDK alignment and production bundling for the current native foundation. The bundle exports are not signed native binaries and do not prove device behavior or App Store / Google Play release readiness. Native binary build, device/E2E and release validation must be added deliberately before native becomes release-bearing.

### Supabase CI

On Supabase schema/test changes, database CI starts a disposable local Supabase stack and enforces:

- clean database rebuild from repository migrations,
- SQL regression tests,
- RLS/household-isolation tests,
- deterministic teardown.

Production is not the first environment where repository migrations are exercised.

### Core E2E

The browser workflow runs the complete Playwright suite rather than a hard-coded single spec. It:

- installs the pinned Playwright runner and Chromium,
- starts a clean local Supabase environment,
- rebuilds that environment from repository migrations,
- exports only local public browser credentials,
- builds and starts the production Next.js app,
- runs the complete mobile-viewport browser suite,
- uploads traces/screenshots/logs on failure,
- tears down services afterward.

Current browser coverage includes auth, password recovery through a real locally captured email/PKCE flow, hostile public-client household isolation, household/storage bootstrap, inventory batches, expiry, FEFO consumption, correction, discard, history, replenishment/shopping, EAN/Open Food Facts integration, camera fallback and PWA metadata.

Browser E2E proves the web/PWA client. It must not be treated as a substitute for native device validation once equivalent native flows become release-bearing.

### Dependency Review

GitHub's Dependency Review workflow runs on every pull request targeting `main` and reviews the dependency diff introduced by the PR.

It:

- uses the official `actions/dependency-review-action`,
- fails when a PR introduces a HIGH or CRITICAL known vulnerability,
- evaluates runtime, development and unknown dependency scopes,
- runs with read-only repository contents permission,
- avoids write-dependent PR comments.

This complements package-manager audits: Dependency Review reasons about what the PR introduces, while `npm audit` reasons about the installed dependency graph where that audit is part of the package pipeline.

### Secret Scan

A repository-wide Gitleaks Action v3 workflow runs on pull requests targeting `main`, pushes to `main` and manual dispatch.

It:

- checks out full Git history so removed secrets are not hidden by shallow checkout,
- uses the Node-24-compatible Gitleaks Action v3 line,
- runs with read-only repository/pull-request permissions,
- disables PR comments and SARIF artifact upload so scanning does not require write permissions,
- does not require a Gitleaks license for this personal-account repository.

A secret finding must be investigated. A real leaked secret must be rotated; deleting it in a later commit is not sufficient. False-positive allowlisting, if ever necessary, must be narrow and documented rather than global.

### Remaining target gaps

Do not overstate the current implementation. The following items are still not proven as permanent repository/release guarantees:

- branch-protection settings requiring the checks above; previous automation access was insufficient to prove or configure repository branch protection,
- hosted production deployment + real-domain/device smoke verification,
- native build/device/E2E and store-release validation for the planned first-class iOS/Android client.

Those gaps must be tracked/fixed deliberately rather than represented as already enforced.

## Required triggers

CI must run on:

- pull requests targeting `main`,
- pushes to `main`,
- relevant workflow/config changes.

Path filtering may be used for efficiency only if it cannot skip checks required by a change. Repository-wide security scanning intentionally does not use web-only path filtering, and dependency review intentionally evaluates pull requests regardless of which package lockfile changed.

## Multi-client quality principle

Shared backend/domain semantics should be validated at the lowest reusable layer possible. Do not create separate web and native implementations of FEFO, quantity/package conversion, expiry or replenishment rules merely to test both clients independently.

Client-specific CI should then validate the things that are genuinely client-specific:

- web build/browser behavior for `web/`
- Expo/React Native compatibility, native builds and device behavior for `mobile/`
- shared domain/contracts once extracted into reusable modules

A green client pipeline does not authorize semantic drift from the shared product contract.

## Web quality pipeline

The enforced/target web quality pipeline includes:

1. checkout,
2. install dependencies with lockfile enforcement (`npm ci`),
3. dependency/cache setup,
4. formatting verification if formatting is standardized,
5. ESLint,
6. TypeScript type check,
7. unit tests,
8. integration/database tests when relevant,
9. blocking coverage gate for critical domain code,
10. production build,
11. E2E tests,
12. security/dependency checks appropriate to the stack.

Independent jobs should run in parallel where useful, but merge protection should require all blocking checks relevant to the change.

## Native quality roadmap

The current mobile gate is a foundation, not the final native pipeline. It already enforces deterministic dependency installation, HIGH-or-higher dependency auditing, lint, strict typecheck, Expo dependency alignment and Android/iOS production JavaScript bundle exports.

Before native release readiness is claimed, add the remaining validation appropriate to the product surface, including:

1. unit/contract tests for native-specific code,
2. reproducible signed Android/iOS native binary build validation,
3. device or simulator E2E for critical native journeys,
4. barcode/camera permission and fallback coverage,
5. push/deep-link coverage when those capabilities are introduced,
6. offline/reconciliation tests if offline state becomes authoritative,
7. signed release/store pipeline validation.

Do not add these merely as ceremony before there is corresponding native behavior to validate; add them before that behavior becomes release-critical.

## Node and action versions

Use a supported Node LTS version and keep it compatible with the package/framework being validated.

The current web runtime is Node.js 24 LTS. The current Expo SDK 57 / React Native 0.86 native foundation is validated on Node.js 22.13.0. The coordinated SDK migration is protected by Expo dependency-alignment checks, HIGH-or-higher dependency auditing and Android/iOS production bundle exports.

Pin or deliberately version GitHub Actions. Do not leave the repository indefinitely on obsolete major versions.

Dependency upgrades must be intentional and validated.

## Pull request gate

A PR must not merge when any required check is failing or missing.

Never solve a red pipeline by:

- commenting out a test,
- marking a meaningful test as skipped,
- removing a lint/typecheck/coverage/security rule without technical justification,
- changing a required job to non-blocking solely to unblock merge,
- adding unconditional retries to hide flakiness,
- catching and ignoring test failures.

Fix the underlying problem.

## Coverage in CI

Coverage applies to production TypeScript under `web/src/domain/**`; test files themselves are excluded from the measured set.

The current blocking aggregate thresholds are:

- lines: 100%,
- functions: 100%,
- branches: 98%.

Coverage is a regression guard for critical business logic, not a license to write assertion-free tests or chase meaningless generated branches. A legitimate new domain branch should receive a meaningful test. If instrumentation creates a truly unreachable branch, remove/simplify dead code where appropriate rather than lowering the threshold by default.

The project does not require 100% coverage for UI/framework glue code.

As domain code is extracted for use by both clients, preserve or strengthen these semantics-focused gates rather than duplicating weaker versions in each client.

## E2E in CI

Critical browser tests run against a deterministic test environment.

The E2E job should retain useful failure artifacts such as:

- Playwright trace,
- screenshots,
- application logs,
- video/reporting when materially useful.

External services such as Open Food Facts must not be a live blocking dependency in CI; browser E2E intercepts the internal EAN adapter with controlled fixtures while unit tests validate external payload mapping.

Auth recovery is intentionally different: the local Supabase mail-capture service is used so the suite follows a real local recovery email without contacting a third-party SMTP provider.

Native E2E should follow the same determinism principle when introduced: controlled backend state, controlled external metadata and diagnostics sufficient to reproduce device failures.

## Database CI

Schema/migration changes must be validated in an isolated environment.

Required checks include:

- migrations apply cleanly from the expected baseline,
- generated types are current where generated types are used,
- integration/regression tests pass against the migrated schema,
- RLS/access tests pass,
- destructive or irreversible changes are identified explicitly,
- compatibility impact on active web and native clients is evaluated.

Repository migrations are the schema source of truth. Dashboard-only DDL drift is not acceptable.

## Security checks

The current web and mobile pipelines block HIGH-or-higher npm advisories, Dependency Review blocks newly introduced HIGH/CRITICAL dependency vulnerabilities in pull requests, and Gitleaks scans repository history for secrets.

Database authorization is additionally protected by SQL RLS regression tests and a hostile public-client browser-suite test that proves a second authenticated user cannot read or mutate another household.

Native clients remain untrusted and must use the same trusted authorization boundary. A successful native build is not evidence that household isolation is correct.

Do not blindly suppress high-confidence findings. If secret scanning reports a credential:

1. determine whether it is real,
2. rotate/revoke it if real,
3. remove it from the active tree,
4. assess whether Git history must be rewritten,
5. only use a narrow documented allowlist for a proven false positive.

Dependency findings must likewise be investigated rather than bypassed. A major framework upgrade must not be merged merely because it removes an advisory; compatibility risk still requires appropriate validation.

## Branch protection target

`main` should be protected so that normal changes require a PR and required checks.

Recommended policy:

- no routine direct pushes,
- required status checks,
- branch must be up to date before merge when necessary,
- unresolved review conversations block merge when review is used,
- force-push disabled on `main`.

The repository workflow follows this policy operationally, but automated proof/configuration of branch protection is still a tracked gap and must not be claimed as complete.

## Deployment principle

Deployment must consume a revision that passed the required checks.

Do not deploy an untested working tree or an unrelated commit.

Production sequence:

`PR -> relevant blocking CI -> merge main -> production build/deploy -> production smoke check`

For native releases, the equivalent principle applies: store artifacts must be built from a revision that passed the required native/security checks, not from an arbitrary local working tree.

The detailed hosted release procedure is in [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md).

## Environments and secrets

Use environment-specific configuration.

Never commit secrets. Never expose server-only credentials through `NEXT_PUBLIC_*` values or native application configuration/bundles.

CI secrets should be granted the minimum permissions needed for the job.

Test credentials must not have access to production household data.

The expected public web environment shape is documented in [`../web/.env.example`](../web/.env.example).

## Caching

Caching may improve CI speed but must never alter correctness.

The lockfile remains authoritative. A cache hit must not allow stale code generation or tests to be skipped.

## Concurrency

For redundant runs on the same PR branch, CI may cancel superseded runs to save time/cost.

Do not cancel production/deployment work in a way that can leave deployment state ambiguous.

## Flaky tests

A flaky blocking test is a production-quality problem.

When a test is flaky:

1. capture evidence,
2. identify the nondeterminism,
3. fix it.

Do not institutionalize “rerun until green”.

## CI ownership

Any contributor changing build tools, tests, Node versions, Supabase setup, native SDK dependencies or deployment behavior must evaluate whether CI requires a corresponding update.

Workflow changes must be reviewed as production code.

## Required completion evidence

When reporting a change as ready, include the exact checks that passed and the exact revision they validated where practical.

Example:

- lint: passed,
- typecheck: passed,
- unit: passed,
- critical-domain coverage: passed,
- database/RLS: passed when relevant,
- build: passed,
- E2E: passed,
- dependency/security gates: passed,
- secret scan: passed.

For native changes, distinguish current static/SDK validation from actual native build/device validation. Never imply native release readiness when those checks do not exist or were not run.

If a check does not exist yet, was not relevant, or could not run, say so explicitly. Never imply a target gate is already enforced when it is not.
