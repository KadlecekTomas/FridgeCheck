# Mend Security Gate

## Purpose

Mend adds an independent software-composition-analysis (SCA) gate to FridgeCheck. It complements rather than replaces the existing `npm audit` and Gitleaks checks.

The goal is to block newly introduced high-confidence dependency risk without turning the repository into an alert-noise machine.

## Repository configuration

The repository-level Mend configuration lives in `/.whitesource`.

Configured policy:

- SCA enabled in automatic repository-integration mode,
- `main` is the explicit base branch,
- pull-request reporting uses differential (`diff`) results,
- Dependabot pull requests are scanned,
- exploitability information is requested when available,
- Mend Security Check fails on HIGH-or-CRITICAL vulnerability findings,
- a partial scan with an actual scanner error fails the check,
- MEDIUM-or-higher findings are tracked as dependency issues,
- automatic vulnerability-remediation pull requests are allowed for CVSS 7.0-10.0,
- broad Renovate-style outdated-dependency PR generation is intentionally disabled here because dependency freshness and vulnerability remediation are different concerns.

## Why HIGH is the merge threshold

The existing Web CI already blocks `npm audit --audit-level=high`. Mend therefore uses the same production merge threshold instead of creating conflicting severity policy.

MEDIUM findings remain visible and actionable through Mend issues, but do not automatically stop unrelated development. LOW findings do not justify blocking the delivery pipeline by default.

This is deliberately stricter than a report-only integration and deliberately less noisy than failing every pull request on LOW/MEDIUM findings.

## Strict-mode policy

`strictMode` is set to `failure`.

A Mend scan that cannot resolve part of the dependency graph because of an actual scanner error must not silently pass. Warnings are surfaced but do not independently block the repository.

Do not change this to a permanently non-blocking mode merely to clear a red check. Fix the scan problem or document a narrow exception.

## Activation sequence

Repository configuration alone does not activate Mend. Mend for GitHub.com is a GitHub App and must be explicitly authorized for `KadlecekTomas/FridgeCheck`.

Activation is complete only after all of the following are true:

1. Mend for GitHub.com (or the applicable Mend GitHub offering) is authorized for the repository.
2. The configured `.whitesource` file exists on the default branch (`main`).
3. A real repository scan completes and GitHub shows `Mend Security Check` on a commit/pull request.
4. A verification pull request proves that a clean dependency change can pass the Mend check.
5. GitHub branch protection/ruleset requires `Mend Security Check` before merge.

Until step 5 is proven, Mend is an integrated check but not a guaranteed merge gate.

## Required status policy

Target required security checks for `main` are complementary:

- `Mend Security Check` — third-party dependency/SCA risk,
- existing dependency audit in Web CI — npm advisory gate,
- existing Secret Scan — credential/secret leakage,
- relevant Supabase RLS/database regressions — authorization/data isolation.

Mend must not be used as justification to weaken or remove the existing checks.

## Validation evidence

When this integration is reported as complete, record:

- exact `.whitesource` revision,
- Mend Security Check result from a real scan,
- whether the scan was full/base or PR differential,
- any findings and their disposition,
- proof that branch protection/ruleset requires the check.

Do not claim the integration is enforced merely because the configuration file exists.
