# GitHub-Native Security Automation

This document records the GitHub-native security automation that complements the application security model in [`SECURITY.md`](./SECURITY.md) and the merge-gating contract in [`CI_CD.md`](./CI_CD.md).

The goal is layered, zero-license-cost security for this public repository. No single scanner is treated as proof that the application is secure.

## Layers

### Dependency Review

Pull requests targeting `main` run GitHub Dependency Review. A PR fails when it introduces a known HIGH or CRITICAL dependency vulnerability.

This answers a PR-specific question: **did this change introduce a vulnerable dependency?**

### Package-manager audits

Web and mobile CI retain `npm audit --audit-level=high` where defined by their pipeline.

This answers an installed-graph question: **does the resolved npm dependency graph contain a HIGH-or-higher advisory?**

Dependency Review does not replace npm audit, and npm audit does not replace Dependency Review.

### Gitleaks

The repository-wide Secret Scan checks full Git history with Gitleaks. A real credential finding is an incident: rotate/revoke the credential and establish scope. Removing a secret only from the latest tree is not sufficient.

### CodeQL

GitHub CodeQL **Default Setup is active at repository level**.

This was directly verified on 23 Aug 2026 while validating an attempted advanced CodeQL workflow. Both JavaScript/TypeScript and GitHub Actions CodeQL jobs successfully initialized, extracted source, ran their queries and uploaded SARIF, but GitHub rejected processing with the explicit configuration error:

> CodeQL analyses from advanced configurations cannot be processed when the default setup is enabled

The attempted advanced workflow was therefore removed rather than disabling an already-active repository security control merely to replace it with YAML.

Important consequences:

- do not add a repository `codeql.yml` advanced setup while Default Setup remains enabled,
- do not describe an advanced query suite such as `security-extended` as enforced unless the repository is deliberately migrated away from Default Setup and the replacement is proven green,
- treat CodeQL findings as security work: investigate reachability/impact and fix real vulnerabilities rather than suppressing findings to obtain a green badge,
- the exact Default Setup language/query configuration and any branch-protection requirement remain repository settings and must not be inferred from the absence or presence of a workflow file.

Default Setup complements dependency and secret scanning by analyzing source for vulnerability patterns. It does not replace application authorization tests or release validation.

### Dependabot

`.github/dependabot.yml` enables weekly **version update** checks for:

- npm dependencies under `/web`,
- npm dependencies under `/mobile`,
- GitHub Actions under `/.github/workflows` via the `github-actions` ecosystem.

Minor and patch version updates are grouped per ecosystem to reduce PR noise. Major updates remain separate so framework/runtime upgrades receive deliberate regression review instead of being bundled into routine maintenance.

Security-update grouping rules are also defined. Those rules take effect when Dependabot security updates are enabled in repository security settings; the configuration file itself must not be mistaken for proof that the account-level toggle is enabled.

Dependabot PRs are never auto-approved merely because Dependabot opened them. They must satisfy the same relevant CI and compatibility expectations as human-authored dependency changes.

## Merge enforcement

Repository workflows and account-managed scanning create security evidence, but branch/ruleset configuration is a separate GitHub setting.

Until `main` branch protection or a ruleset is verified to require the intended status checks, the repository must continue to report that enforcement gap explicitly. Do not describe checks as impossible to bypass merely because workflows or scanners exist.

The target branch policy remains documented in [`CI_CD.md`](./CI_CD.md).

## What this stack does not prove

These checks do not replace:

- Supabase RLS and hostile-client authorization tests,
- hosted Supabase Security Advisor review,
- production Auth/SMTP configuration validation,
- deployed-browser credential inspection,
- real production smoke testing,
- real-device iPhone/PWA/camera testing,
- manual review of security-sensitive architecture changes.

Security release readiness is therefore still governed by [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md).
