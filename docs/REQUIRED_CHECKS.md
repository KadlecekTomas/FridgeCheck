# Required pull-request checks

This document records the stable pull-request status contexts that are intended to become required on `main`.

It complements [`CI_CD.md`](./CI_CD.md). Repository ruleset / branch-protection configuration is still an external GitHub setting and must not be described as enforced until that setting is visibly verified.

## Why this exists

GitHub required status checks work reliably only when the required context is reported for every pull request that the rule applies to.

Historically, Web CI, Supabase CI and Core E2E used `pull_request.paths` filters. A pull request that did not touch the matching path could therefore have no check run at all. Making such a context required risks leaving unrelated pull requests stuck in an `Expected` / pending state.

PR #72 changed the workflow shape deliberately:

- the three blocking workflows now trigger on every pull request targeting `main`,
- each workflow performs a first-party base/head path-diff step,
- expensive validation runs only when the affected surface is relevant,
- an unrelated pull request still produces the same stable successful job context after path detection,
- push-to-`main` path filtering remains in place to avoid unnecessary post-merge work.

This keeps the merge-policy context stable without pretending that a docs-only change needs to rebuild the whole product.

## Stable contexts

Use the **job/check context**, not merely the workflow display name, when configuring required status checks.

| Surface | Workflow | Stable job/check context | Heavy validation when relevant |
| --- | --- | --- | --- |
| Web | `Web CI` | `quality` | install, lint, typecheck, unit tests, critical-domain coverage, production build, HIGH audit |
| Database | `Supabase CI` | `database` | local Supabase start, migration rebuild, SQL/RLS regressions, teardown |
| Browser critical loop | `Core E2E` | `household-inventory-loop` | production Next.js build, disposable Supabase, complete Playwright suite, artifacts |
| Dependency diff | `Dependency Review` | `Dependency Review` | HIGH/CRITICAL introduced dependency vulnerability review |
| Secrets | `Secret Scan` | `gitleaks` | full-history secret scan |

GitHub-managed CodeQL Default Setup is active separately at repository level. Do not add an invented CodeQL required-check name here until the exact current context and repository policy are observed from GitHub settings/check runs.

## Relevance rules

### Web CI

Heavy Web CI runs when a pull request changes:

- `web/**`, or
- `.github/workflows/web.yml`.

Otherwise the `quality` job must still exist and succeed after relevance detection while its expensive web steps remain skipped.

### Supabase CI

Heavy database validation runs when a pull request changes:

- `supabase/**`, or
- `.github/workflows/supabase.yml`.

Otherwise the `database` job must still exist and succeed after relevance detection while Supabase startup/migration/test work remains skipped.

### Core E2E

Heavy browser E2E runs when a pull request changes:

- `web/**`,
- `supabase/**`, or
- `.github/workflows/e2e.yml`.

Otherwise `household-inventory-loop` must still exist and succeed after relevance detection while Node/Playwright/Supabase/application steps remain skipped.

Dependency Review and Secret Scan remain repository-wide pull-request checks.

## Security of path detection

The relevance detector intentionally avoids an additional third-party changed-files Action.

It uses the pull request base/head SHAs supplied through environment variables and constant repository path patterns. Relevant product/schema/workflow changes must never be classified as irrelevant merely to save CI time.

A failure in relevance detection is a CI defect and must be fixed at the workflow layer; it must not be worked around by weakening the required-check policy.

## Validation requirement

The always-report design is considered proven only after both directions have evidence:

1. **Relevant canary:** a workflow-changing PR runs the full expensive validation and every intended gate succeeds.
2. **Irrelevant canary:** a docs-only PR still reports `quality`, `database` and `household-inventory-loop` as successful while their expensive product/database/E2E steps are skipped.

PR #72 provides the relevant-canary evidence: its exact head `e566b4edae3e1a10270f1eccfb4674f0a181a721` passed Web CI, Supabase CI, Core E2E, Dependency Review and Secret Scan while changing all three blocking workflow files.

The docs-only PR that introduces this document is intentionally the irrelevant canary. Its result must be inspected before this document is used as evidence that the technical `Expected`-check blocker is resolved.

## Target `main` ruleset

Once the irrelevant canary is proven, the repository settings should require normal changes to go through a pull request and require the verified stable contexts appropriate to the repository policy.

At minimum the policy should preserve:

- no routine direct pushes to `main`,
- required status checks,
- no force pushes,
- unresolved review conversations blocking merge when review is used,
- a deliberate decision about requiring the branch to be up to date based on real CI rebuild cost.

Branch protection is not complete merely because these workflow contexts exist. The repository Settings UI/API must visibly confirm the rule, and a protected-branch test PR must prove that GitHub actually blocks a merge when a required check is failing or missing.

## Non-bypass rule

Never make a product-relevant change look docs-only to bypass heavy CI. Never change the detector, job names or workflow triggers solely to get around branch protection.

If a required check is red, fix the underlying failure. If a required context is missing, fix the reporting design or repository rule rather than merging around it.
