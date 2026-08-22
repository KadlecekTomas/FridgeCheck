# Dependency Security

## Purpose

FridgeCheck uses GitHub-native dependency review as a pull-request security gate. It complements the existing `npm audit --audit-level=high` check and repository-wide Gitleaks secret scanning.

No Mend license or third-party Mend GitHub App is required.

## Pull-request gate

Workflow: `.github/workflows/dependency-review.yml`

The workflow runs for every pull request targeting `main` and uses GitHub's official `actions/dependency-review-action`.

Policy:

- fail when a pull request introduces a dependency with a HIGH or CRITICAL known vulnerability,
- evaluate runtime, development and unknown dependency scopes,
- keep workflow permissions read-only (`contents: read`),
- do not write automated PR comments,
- show the first patched version when GitHub advisory data provides one,
- cancel superseded runs for the same pull request.

A red Dependency Review check must be fixed by updating, replacing or removing the vulnerable dependency. Do not disable or weaken the gate only to merge a pull request.

## Relationship to other checks

Dependency Review answers a different question from the existing controls:

- Dependency Review: does this PR introduce a newly vulnerable dependency?
- `npm audit --audit-level=high`: does the installed npm dependency graph contain HIGH-or-higher advisories?
- Gitleaks: does repository history contain secrets or credentials?
- Supabase/RLS regression tests: can authenticated users cross household/data boundaries?
- browser E2E: do critical product and authorization flows still behave correctly?

These checks are complementary. Adding Dependency Review is not a reason to remove or weaken the existing checks.

## Required-merge status

The workflow creates the `Dependency Review` job/check. After one successful real run, GitHub branch protection/rulesets for `main` should require this status before merge.

Until branch protection/ruleset enforcement is proven, the workflow is implemented and running but must not be described as an unavoidable merge gate.

## Dependabot and CodeQL

For the complete free GitHub security baseline, repository settings should also enable:

- Dependabot alerts,
- Dependabot security updates,
- CodeQL code scanning.

Those repository settings are separate from this workflow and must be verified independently before being reported as active.
