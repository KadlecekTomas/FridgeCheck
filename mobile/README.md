# FridgeCheck Mobile

The `mobile/` directory contains the current Expo / React Native foundation for the native FridgeCheck client.

The implementation is still early, but native mobile is a **planned first-class product client** for iOS and Android. The immediate delivery priority remains the mobile-first web/PWA because it is the fastest place to prove and harden the complete product loop.

Before touching this directory, read the repository root [`AGENTS.md`](../AGENTS.md), [`docs/PRODUCT.md`](../docs/PRODUCT.md) and [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Product direction

FridgeCheck is one product with multiple clients, not two independent applications.

The web/PWA and native mobile clients must share the same trusted backend/data model and the same critical domain semantics for:

- inventory quantities and package conversions,
- expiry classification and FEFO behavior,
- consumption, correction and waste events,
- usable-stock and replenishment calculations,
- shopping recommendations,
- household authorization and isolation.

Do not duplicate those rules independently in React Native screens. As the native client grows, move reusable domain contracts and pure business logic toward shared packages/modules so web and mobile cannot silently drift.

## Native value

Native work should prioritize capabilities where a real mobile client materially improves the product, especially:

- fast camera/barcode capture,
- push expiry/replenishment notifications,
- reliable mobile/offline interaction,
- background/native integrations where justified,
- later widgets or other high-frequency entry points.

Do not rebuild every web screen merely to claim feature parity. Each native slice should strengthen the core loop:

`inventory -> expiry awareness -> consumption -> replenishment -> shopping`

## Security

The same household isolation and authorization rules apply to every client.

A native application is still an untrusted client. Never ship Supabase service-role credentials, private API keys or other privileged secrets in the application bundle. Authorization must remain enforced at trusted backend/database boundaries.

## Testing and CI

Changes under `mobile/` are validated before merge. The current PR quality gate:

- installs the committed lockfile with `npm ci`,
- runs ESLint,
- runs strict TypeScript checking,
- verifies Expo/React Native dependency alignment for the current SDK.

Local baseline:

```bash
cd mobile
npm ci
npm run lint
npm run typecheck
npx --no-install expo install --check
```

This baseline is not yet native release readiness. Before the mobile client is shipped, add deliberate native build/device/E2E coverage and release pipelines rather than inferring production confidence from lint/typecheck alone.
