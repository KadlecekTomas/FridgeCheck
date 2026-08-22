# FridgeCheck Mobile Prototype

The `mobile/` directory contains an Expo / React Native prototype.

It is **not the primary product implementation target right now**.

Before touching this directory, read the repository root [`AGENTS.md`](../AGENTS.md) and [`docs/PRODUCT.md`](../docs/PRODUCT.md).

## Current product decision

The immediate priority is to prove and harden the core FridgeCheck workflow in the mobile-first web/PWA application:

`inventory -> expiry awareness -> consumption -> replenishment -> shopping`

Do not duplicate web features in native mobile merely because this directory exists.

Native mobile work becomes justified when it delivers a concrete capability that materially improves the proven core experience, or when the web/PWA product has reached sufficient maturity to support a native client without splitting product focus.

## Shared behavior

When native work resumes, critical inventory/expiry/replenishment semantics must not diverge from the web implementation.

Prefer reusable domain contracts and shared API/data semantics over independently reimplementing business rules in React Native screens.

## Security

The same household isolation and authorization rules apply to native clients.

A native app is still an untrusted client. Never ship privileged Supabase/service credentials in the application bundle.

## Testing and CI

Do not expand this client without establishing an appropriate automated test and CI strategy for the behavior being added.

For dependency or source changes under `mobile/`, the PR quality gate installs the lockfile exactly, runs ESLint, runs strict TypeScript checking, and verifies that the installed Expo package versions are aligned with the current SDK. The workflow also runs after merge on relevant pushes to `main`.

Local baseline:

```bash
cd mobile
npm ci
npm run lint
npm run typecheck
npx --no-install expo install --check
```

The mobile workflow intentionally validates the existing prototype rather than treating it as a production-ready native application. Native build/device/E2E coverage remains a future requirement if the native client becomes an active product target.
