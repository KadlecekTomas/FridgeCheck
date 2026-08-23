# Release Checklist

This checklist is the production bridge between a green repository and a usable HlídačJídla deployment.

A release is not complete merely because `main` is green. The deployed revision, hosted Supabase configuration, domain, email delivery and real-device behavior must also be verified.

## Verified readiness snapshot — 2026-08-23

The latest implemented planning slice was merged through PR #56.

- `main`: `afdf8df5084cfd5d7779568aac0b91ca0837dc94`
- exact tested PR head: `d4d1c5bc6cdcbfafbb8df4e98bac1efbd04b9ebe`
- both commits point to the identical Git tree: `e383ac08441b05e8bd7ede31f61680a8c2fd714b`
- exact tested tree passed Web CI, Supabase CI, Core E2E, Dependency Review and Secret Scan
- hosted Supabase project `fridgecheck-dev` is `ACTIVE_HEALTHY` in `eu-central-1`
- hosted migration history is aligned with repository migrations through `20260823211000_expected_daily_consumption`
- hosted schema exposes the expected metadata-edit, approximate-quantity and planning contracts
- all eight household-data tables still have RLS enabled
- hosted database is empty of users, households, inventory and shopping fixtures at this checkpoint
- Supabase Security Advisor reports zero findings after the hosted migrations
- connected Vercel team is on Hobby and currently exposes no active FridgeCheck/HlídačJídla project through the project API
- historical Vercel project slugs `fridge-check` and `fridge-check-ctzu` both return 404 through the connected Vercel API
- GitHub still receives failed historical Vercel statuses whose target is the Vercel `build-rate-limit` upgrade page; treat these as stale/blocked integration state, not as a successful or current deployment
- `hlidacjidla.eu` is registered/unavailable for purchase, but a working public DNS/HTTPS deployment has not yet been verified
- `main` branch protection is currently disabled; required status checks are therefore followed by process, not enforced by GitHub configuration
- Supabase Auth Site URL, redirect allowlist and production SMTP are not yet verified through an available management interface

The remaining blockers are infrastructure/configuration work, not an unresolved repository test failure.

## Current repository baseline

The current mobile-first web/PWA baseline already has automated coverage for:

- registration and login,
- password recovery through a real captured Supabase recovery email and PKCE callback,
- household bootstrap,
- hostile public-client cross-household isolation,
- storage-unit lifecycle,
- product/batch creation,
- expiry urgency,
- FEFO consumption,
- discard/waste,
- stock correction,
- inventory history,
- stock targets and replenishment,
- shopping flow,
- authenticated EAN/Open Food Facts lookup,
- camera-scanner permission fallback,
- PWA manifest/icons/install metadata,
- explainable 3/7/14-day purchase planning with strict backward-compatible zero-rate behavior.

The blocking CI baseline includes:

- lockfile install with `npm ci`,
- ESLint,
- TypeScript typecheck,
- pure-domain unit tests,
- Next.js 16 Turbopack production build,
- `npm audit --audit-level=high`,
- clean local Supabase rebuild from repository migrations,
- SQL regression/RLS tests,
- the complete production Playwright suite against disposable local Supabase,
- Dependency Review,
- full-history secret scanning.

Do not infer from this that a hosted production environment is already configured.

## 1. Choose the hosted Supabase environment

Current observed external state: the connected Supabase organization has the `fridgecheck-dev` project. A separate production project has not yet been proven/configured.

For a private personal pilot, using the existing free project can be an explicit temporary decision to keep cost at zero. Before a public release, prefer a dedicated production project so development/testing cannot affect real household data.

Before pointing the app at a hosted project:

- [x] record the intended private-pilot project ref and region,
- [x] confirm the project is healthy,
- [x] confirm repository migrations are the authoritative schema source,
- [x] apply/verify every repository migration in order,
- [x] regenerate/review Supabase TypeScript types after the hosted schema change,
- [x] run the Supabase Security Advisor and resolve any security findings,
- [x] verify no test users or disposable fixtures remain in the hosted database,
- [ ] confirm the deployed web application exposes only public/publishable Supabase credentials,
- [ ] verify no service-role/database secret is present in Vercel browser variables.

Hosted private-pilot evidence on 2026-08-23:

- migration history exactly reaches `20260823211000_expected_daily_consumption`,
- `quantity_is_estimate` exists on inventory batches/events,
- estimate-aware inventory function overloads are present,
- metadata-edit functions are present,
- `stock_targets.expected_daily_consumption` is `NOT NULL`, defaults to `0` and rejects negative values,
- generated hosted TypeScript types expose the new columns and function overloads,
- Security Advisor: zero findings,
- Performance Advisor: only informational `unused_index` notices on the fresh empty development database; do not delete those indexes merely because this environment has not generated realistic usage statistics yet.

For public scale, re-evaluate the performance advisor from real workload evidence and handle any justified database hardening through a dedicated tested migration rather than dashboard-only DDL.

## 2. Configure hosted Supabase Auth

Production Auth must use the same canonical origin as the deployed app.

For the intended production domain:

- [ ] set Supabase Auth Site URL to `https://hlidacjidla.eu`,
- [ ] allow the exact recovery callback `https://hlidacjidla.eu/auth/callback?next=/update-password`,
- [ ] verify registration/sign-in redirect behavior on that origin,
- [ ] configure a real production SMTP provider,
- [ ] do not rely on Supabase's restricted development mail sender for user-facing recovery,
- [ ] send one real recovery email and complete the password reset on production before release.

Password-recovery UI intentionally does not reveal whether an email address is registered.

## 3. Create or reconnect the Vercel project

Current observed external state: the connected Vercel team `kadlecektomas-projects` is on Hobby and does not expose an active FridgeCheck/HlídačJídla project through the project API. Historical GitHub commit statuses reference `fridge-check` and `fridge-check-ctzu`, but both project slugs currently resolve as missing through the connected Vercel API. GitHub's latest failed Vercel status targets the Vercel `upgradeToPro=build-rate-limit` page.

Treat those historical status contexts as stale/blocked integration state, not proof of a live deployment. Reconnect one canonical project rather than keeping duplicate project contexts.

Production setup:

- [ ] create/import one canonical Vercel project from GitHub repository `KadlecekTomas/FridgeCheck`,
- [ ] remove/disconnect obsolete duplicate FridgeCheck Git integration contexts if they still exist in the Vercel/GitHub UI,
- [ ] use `web` as the Vercel Root Directory,
- [ ] detect/use the Next.js framework preset,
- [ ] deploy only the tested tree from green `main`,
- [ ] keep preview deployment suppression for `agent/*`, `codex/*` and `claude/*` branches unless intentionally changed,
- [ ] configure `NEXT_PUBLIC_SUPABASE_URL`,
- [ ] configure `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
- [ ] do not add service-role/database secrets to public variables,
- [ ] verify the Vercel production deployment resolves to the same Git tree that passed CI.

The expected public environment variable shape is documented in [`../web/.env.example`](../web/.env.example).

## 4. Attach the production domain

Current external evidence only proves that `hlidacjidla.eu` is not available for purchase. A working DNS/HTTPS origin is not yet verified.

- [ ] add `hlidacjidla.eu` to the canonical Vercel project,
- [ ] configure the required DNS records at the domain provider,
- [ ] wait until Vercel reports the domain verified,
- [ ] verify public DNS resolution from an independent network,
- [ ] verify HTTPS without certificate warnings,
- [ ] choose one canonical hostname and redirect any alternate hostname consistently,
- [ ] re-check the Supabase Auth Site URL and recovery allowlist against the final canonical hostname.

Auth PKCE cookies are host-bound. Do not mix `www`, apex or another hostname inside one recovery flow.

## 5. Production smoke test

Run these checks against the actual production origin with a new disposable user and delete/retire the smoke account afterward where appropriate.

### Auth

- [ ] landing page loads over HTTPS,
- [ ] registration succeeds,
- [ ] login succeeds,
- [ ] logout succeeds,
- [ ] forgot-password request gives enumeration-safe success copy,
- [ ] real recovery email arrives,
- [ ] recovery link sets a new password,
- [ ] old password fails,
- [ ] new password succeeds.

### Inventory core loop

- [ ] create/select household,
- [ ] default storage exists,
- [ ] create/rename another storage location,
- [ ] add a product manually,
- [ ] add two batches with different expiry dates,
- [ ] dashboard urgency is correct,
- [ ] FEFO consumption removes the earliest usable batch first,
- [ ] discard an expired `use_by` batch,
- [ ] correct a physical quantity with a reason,
- [ ] history shows purchase/consume/discard/correction events,
- [ ] set minimum/target stock,
- [ ] set daily consumption and verify 3/7/14-day purchase planning,
- [ ] verify a zero-rate target retains legacy minimum-based replenishment,
- [ ] replenishment amount is correct,
- [ ] add/complete a shopping item.

### EAN and camera

- [ ] scan a real supermarket EAN on an iPhone,
- [ ] browser asks for camera permission only after the scan action,
- [ ] denying camera permission leaves manual EAN entry usable,
- [ ] accepted EAN uses the authenticated internal lookup endpoint,
- [ ] Open Food Facts result can still be edited before save,
- [ ] a product unknown to Open Food Facts can still be entered manually.

### PWA

- [ ] Safari `Sdílet → Přidat na plochu` installs HlídačJídla,
- [ ] home-screen icon is correct,
- [ ] standalone app opens at the dashboard/login flow,
- [ ] camera scanner works from the installed PWA over HTTPS,
- [ ] no private inventory is expected to work offline yet; the current product intentionally has no household-data service-worker cache.

## 6. Security release check

Repository evidence for the current `main` tree:

- [x] Web CI is green for the exact Git tree now on `main`,
- [x] Supabase CI is green for the exact Git tree now on `main`,
- [x] complete Core E2E is green for the exact Git tree now on `main`,
- [x] Dependency Review and `npm audit --audit-level=high` report no blocking finding on that tree,
- [x] Secret Scan is green and repository search found no service-role/SMTP secret marker,
- [x] Supabase Security Advisor has no unresolved findings after hosted migrations,
- [x] public-client household-isolation regressions remain part of the green database/security suite,
- [ ] GitHub `main` branch protection/ruleset requires the blocking status checks,
- [ ] hosted browser network requests are verified not to expose privileged credentials.

The green PR head and the squash-merged `main` commit have the same Git tree, so the tested code content is identical. GitHub branch protection is nevertheless still a separate configuration requirement and is currently disabled.

## 7. Rollback readiness

Before any future destructive database migration:

- [ ] create and review an explicit data migration plan,
- [ ] have a backup/recovery strategy,
- [ ] exercise the migration outside production first,
- [ ] define how to validate row counts/invariants after migration.

For web-only regressions, preserve the last known-good production deployment so Vercel can be rolled back while the defect is fixed forward in Git.

Never roll database state backward by casually applying ad-hoc dashboard SQL.

## 8. Release decision

The app can be called **ready for the private daily-use pilot** when:

1. all repository merge gates are green,
2. a real hosted deployment exists,
3. the hosted Supabase/Auth/SMTP configuration is correct,
4. `hlidacjidla.eu` is HTTPS and canonical,
5. the real-device production smoke above passes.

Current verdict on 2026-08-23: **repository + hosted database are ready; private pilot is still blocked by Vercel project/domain setup, hosted Auth/SMTP verification, enforced branch protection and real-device production smoke.**

A broader public launch should additionally separate production infrastructure from development and clear any performance hardening justified by real workload evidence before meaningful scale.
