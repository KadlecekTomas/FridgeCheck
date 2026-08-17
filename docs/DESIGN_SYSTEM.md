# HlídačJídla Design System

This document defines the product UI direction for the mobile-first web/PWA. It is subordinate to `AGENTS.md`, `docs/PRODUCT.md`, and `docs/DEFINITION_OF_DONE.md`.

The goal is not to make a generic grocery app. The interface must make the next useful household action obvious within seconds.

## Design thesis

HlídačJídla should feel like a calm, trustworthy personal food operating system:

- fresh, not childish
- premium, not luxurious
- visual, but not image-heavy
- action-oriented, not analytical
- friendly, but not gamified
- compact enough for daily use

The product promise remains:

1. what should I eat first?
2. what am I running out of?
3. what should I buy?

If a visual choice makes these answers slower to find, it is the wrong choice.

## Visual direction

Use a warm neutral canvas, white elevated surfaces, dark food-oriented green as the main brand color, and semantic urgency colors only where they communicate status.

Avoid the common bright-green supermarket-template look. HlídačJídla is not an e-commerce storefront.

### Color tokens v0

These values are the implementation starting point. They may evolve after real-device review, but contributors should not invent new competing palettes per screen.

```text
canvas:        #F6F7F2
surface:       #FFFFFF
surface-muted: #EEF2EC
text:          #17231D
text-muted:    #66736C
border:        #DDE3DD
primary:       #174D3A
primary-hover: #103D2E
primary-soft:  #E3EFE8
success:       #2E7D32
warning:       #A96207
danger:        #B42318
info:          #356A7A
```

Semantic colors are not decoration. Red means immediate risk/expired/use now; amber means approaching attention; green means healthy/complete/safe.

## Typography

Prioritize legibility and speed over brand novelty.

- Use one sans-serif UI family across the application.
- Prefer the existing platform/system stack until a custom font provides a measurable benefit.
- Do not add a font dependency solely for visual fashion.
- Numbers, quantities, dates, and status labels must be highly scannable.

Recommended scale:

```text
Display / page greeting: 28–32 px / 700
Section heading:          18–20 px / 700
Card title:               15–17 px / 600
Body:                     14–16 px / 400–500
Meta / helper:            12–14 px / 400–500
```

## Shape, spacing, elevation

- Base spacing unit: 4 px.
- Main mobile horizontal padding: 16 px.
- Section gap: 24–32 px.
- Card internal padding: 14–16 px.
- Primary card radius: 16 px.
- Pills/badges: fully rounded only when they represent compact status/filter metadata.
- Use borders and subtle surface contrast before heavy shadows.
- Avoid nested cards inside cards unless hierarchy genuinely requires it.

## Iconography and imagery

Use a single coherent icon family in production. Emoji can be useful in prototypes, but should not become the permanent icon system.

Product imagery should help recognition, not dominate the dashboard. A food photo is useful on product/batch rows when reliably available; absence of an image must not make the UI feel broken.

Storage areas should be recognizable through a simple icon + name + meaningful status, for example:

```text
Lednice   · 14 položek · 2 brzy expirují
Mrazák    · 8 položek
Spíž      · 23 položek · 1 dochází
```

## Component principles

### Attention card

Used for food that requires near-term action.

Must show:

- product name
- relevant quantity when useful
- clear expiry language (`dnes`, `zítra`, `za 2 dny`)
- one obvious primary action

Do not force the user to parse a raw date when relative urgency is more useful.

### Low-stock row

Must explain the gap, not merely show a warning:

```text
Vejce
3 ks doma / cíl 10 ks
Dokoupit 7 ks
```

### Storage card

Represents a physical storage unit and gives useful status before navigation. Do not reduce it to an ornamental tile.

### Shopping summary

The dashboard shows only enough shopping information to answer whether action is needed. Detailed editing belongs in the shopping view.

## Interaction rules

- Primary actions must be thumb-friendly on mobile.
- Target at least 44×44 CSS px for primary tap targets where practical.
- Destructive actions require clear labeling and appropriate confirmation/undo behavior.
- Repeated actions such as consume, add batch, or mark bought must minimize taps.
- Do not put household administration into the primary dashboard flow.
- Avoid modal chains for normal inventory work.

## Accessibility baseline

- Do not communicate expiry severity by color alone.
- Preserve semantic headings and buttons.
- Inputs require visible labels or an equivalent accessible name.
- Focus states must remain visible.
- Text/background combinations must meet WCAG contrast expectations for their role.
- Respect reduced-motion preferences if motion is introduced.

## Responsive strategy

Design mobile first around approximately 360–430 px wide viewports.

Tablet/desktop should increase information density without changing the product hierarchy. The desktop dashboard may use two columns, but `Sněz nejdřív` remains higher priority than storage counts or statistics.

## Anti-patterns

Do not introduce:

- a hero banner on the authenticated dashboard
- supermarket-style promotional carousels
- discount/sale visual language
- large vanity counters as the dominant content
- separate color palettes per storage unit
- excessive gradients or glassmorphism
- decorative charts without a decision they help the user make
- AI chat as the primary navigation model

## Implementation rule

Before building or changing a reusable UI component, check whether the design can be expressed through the shared tokens and patterns above. If not, document why a new pattern is needed instead of silently inventing one.