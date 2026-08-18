# Release Checklist

This checklist is the production bridge between a green repository and a usable HlídačJídla deployment.

A release is not complete merely because `main` is green. The deployed revision, hosted Supabase configuration, domain, email delivery and real-device behavior must also be verified.

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
- PWA manifest/icons/install metadata.

The blocking CI baseline includes:

- lockfile install with `npm ci`,
- ESLint,
- TypeScript typecheck,
- pure-domain unit tests,
- Next.js 16 Turbopack production build,
- `npm audit --audit-level=high`,
- clean local Supabase rebuild from repository migrations,
- SQL regression/RLS tests,
- the complete production Playwright suite against disposable local Supabase.

Do not infer from this that a hosted production environment is already configured.

## 1. Choose the hosted Supabase environment

Current observed external state: the connected Supabase organization has the `fridgecheck-dev` project. A separate production project has not yet been proven/configured.

For a private personal pilot, using the existing free project can be an explicit temporary decision to keep cost at zero. Before a public release, prefer a dedicated production project so development/testing cannot affect real household data.

Before pointing the app at a hosted project:

- [ ] record the intended project ref and region,
- [ ] confirm the project is healthy,
- [ ] confirm repository migrations are the authoritative schema source,
- [ ] apply/verify every repository migration in order,
- [ ] regenerate/review Supabase TypeScript types if the hosted schema changed,
- [ ] run the Supabase Security Advisor and resolve any security findings,
- [ ] verify no test users or disposable fixtures remain in the hosted database,
- [ ] confirm only public/publishable keys are exposed to the web application,
- [ ] never expose service-role/secret keys to Vercel browser variables.

For public scale, also clear the known non-blocking performance-advisor work: missing FK indexes and RLS init-plan optimizations should be handled by a dedicated tested migration rather than dashboard-only DDL.

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

Current observed external state: the connected Vercel team does not expose an active FridgeCheck/HlídačJídla project through the project API. Historical GitHub commit statuses reference `fridge-check` and `fridge-check-ctzu`, but both project slugs currently resolve as missing through the connected Vercel API. Treat those statuses as stale integration state, not proof of a live deployment.

Production setup:

- [ ] import/connect GitHub repository `KadlecekTomas/FridgeCheck`,
- [ ] use `web` as the Vercel Root Directory,
- [ ] detect/use the Next.js framework preset,
- [ ] deploy only a revision from green `main`,
- [ ] keep preview deployment suppression for `agent/*`, `codex/*` and `claude/*` branches unless intentionally changed,
- [ ] configure `NEXT_PUBLIC_SUPABASE_URL`,
- [ ] configure `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
- [ ] do not add service-role/database secrets to public variables,
- [ ] verify the Vercel production build is the same commit that passed CI.

The expected public environment variable shape is documented in [`../web/.env.example`](../web/.env.example).

## 4. Attach the production domain

- [ ] add `hlidacjidla.eu` to the production Vercel project,
- [ ] configure the required DNS records at the domain provider,
- [ ] wait until Vercel reports the domain verified,
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

- [ ] GitHub Web CI is green on the released SHA,
- [ ] Supabase CI is green on the released SHA when schema/config paths changed,
- [ ] complete Core E2E is green on the released SHA,
- [ ] dependency audit has no HIGH-or-higher findings,
- [ ] Supabase Security Advisor has no unresolved findings,
- [ ] public-client hostile household-isolation test is green,
- [ ] repository contains no `.env`/service-role/SMTP secrets,
- [ ] hosted browser network requests do not expose privileged credentials.

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

A broader public launch should additionally separate production infrastructure from development and clear the tracked database performance hardening before meaningful scale.
