# Dashboard UX Contract

This document specifies the target information architecture for the authenticated home screen of HlídačJídla.

It translates `docs/PRODUCT.md` into an implementation-ready dashboard direction.

## Dashboard job

Within a few seconds, the home screen must answer:

1. What should I consume first?
2. What is running low?
3. What should I buy?

The dashboard is not a reporting page and not a full inventory browser.

## Current-state problem

The current dashboard centers storage selection, household administration, and summary counters such as `Potraviny OK`, `Brzy končí`, and `Prošlé`.

Those counters can remain useful as secondary context, but they must not dominate the home screen because they do not directly tell the user what to do next.

Household invite/join administration should move out of the primary daily workflow into household/settings management.

## Target mobile hierarchy

Recommended order:

```text
[Header]
Dobré ráno
Domácnost: Doma ▾

[Sněz nejdřív]
Kuřecí stehenní řízek
600 g · spotřebovat zítra
[Spotřebovat]

Skyr
2 ks · za 2 dny

[Dochází]
Vejce
3 / 10 ks                 Dokoupit 7

Vločky
~150 / 500 g              Dokoupit ~350 g

[Doma]
Lednice   14 položek   2 potřebují pozornost
Mrazák     8 položek
Spíž      23 položek   1 dochází

[Nákup]
4 položky · odhadovaná potřeba
[Otevřít nákupní seznam]

[Bottom navigation]
Domů · Zásoby · + · Nákup · Více
```

The exact copy can evolve. The hierarchy should not.

## Section behavior

### 1. Sněz nejdřív

Highest-priority section when there is expiry risk.

Ordering should follow business urgency and FEFO principles, not visual preference.

Show only a small actionable subset on the dashboard (for example the top 2–4 items). The user can open a complete expiry view when more items exist.

Each item should prefer human urgency language:

- `dnes`
- `zítra`
- `za 2 dny`
- `po expiraci`

Show the exact date as secondary metadata when useful.

Primary actions should support the real workflow, such as consume/adjust/open item. Do not add actions that cannot yet be made correct against the domain model.

### Empty state

Do not show a large empty card. Use a compact positive state such as:

`Nic akutního. Nejbližší expirace je za 5 dní.`

### 2. Dochází

Derived from stock targets and usable stock.

A row must explain why the recommendation exists. The preferred mental model is:

`current / target -> recommended purchase`

Do not display a generic `low stock` badge without quantities when the product has meaningful quantity data.

### Empty state

Use compact copy such as:

`Základní zásoby jsou doplněné.`

### 3. Doma

Storage is navigation plus situational awareness.

Each storage unit card/row should show:

- name
- item/batch count when useful
- one meaningful alert summary
- clear navigation affordance

Storage selection should not gate the entire dashboard. The dashboard should summarize the household across storage units; selecting a storage unit belongs in the inventory browsing flow.

### 4. Nákup

Show the number of recommended/manual items and a clear route to the shopping list.

If the system can explain a recommendation, the shopping view should expose that explanation.

Do not implement retailer promotions, checkout, or price-comparison UI as part of this dashboard direction.

## Header and household switching

The active household must remain visible but compact.

Recommended pattern:

```text
Dobré ráno, Tomáši
Doma ▾
```

Switching households is useful; invite codes, joining, ownership transfer, and member management are administrative tasks and should live in household/settings screens.

## Navigation

For a mobile-first PWA, prefer persistent bottom navigation for the highest-frequency destinations.

Recommended initial destinations:

- Domů
- Zásoby
- central Add action
- Nákup
- Více / Nastavení

Do not add a destination merely because a route exists in the repository. Navigation reflects user frequency, not code structure.

## Add action

Adding inventory is a core-loop action and should be globally accessible.

The central add action can open a lightweight choice such as:

- Scan barcode
- Add product manually
- Add existing/recent product

Do not force barcode scanning when manual/repeated entry is faster.

## Loading states

Avoid replacing the full dashboard with a single `Načítání...` paragraph.

Prefer a stable shell with skeletons/placeholders for the sections whose data is loading. Household identity and navigation should remain stable when possible.

## Error states

A section-level fetch failure should not necessarily blank the entire dashboard.

Where technically safe, isolate recoverable errors and provide retry. Authentication/authorization failures are different and must follow the security/auth contract.

## Desktop adaptation

Do not invent a separate desktop product.

Suggested desktop layout:

- main column: `Sněz nejdřív`, `Dochází`
- secondary column: `Doma`, `Nákup`

Keep action priority identical to mobile.

## Migration notes for current code

The current implementation in `web/src/app/(auth)/dashboard/page.tsx` and `web/src/components/dashboard/StatsOverview.tsx` should be treated as current-state evidence, not the target UX.

A future implementation PR should, at minimum:

1. stop making a selected storage unit a prerequisite for dashboard meaning
2. replace dominant aggregate status counters with actionable food/stock data
3. move invite/join administration out of the daily dashboard surface
4. introduce explicit loading/empty/error states per section
5. keep the redesign aligned with the actual domain/data available; do not fake stock-target or shopping behavior in presentation-only code
6. add E2E coverage for the revised critical home flow once the required domain behavior exists

## Success test

Give a real user the dashboard for five seconds and hide it.

They should be able to answer at least:

- which food needs attention first
- whether something important is running low
- whether they need to shop

If they remember only total counts or decorative cards, the dashboard has failed its job.