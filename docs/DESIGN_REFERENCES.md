# Design References

This file records external visual/interaction references for HlídačJídla and defines how they may be used.

References are inspiration, not implementation contracts. `docs/PRODUCT.md`, `docs/DESIGN_SYSTEM.md`, and `docs/DASHBOARD_UX.md` take precedence.

## Primary references

### World Peas Grocery App / Figma Gallery

Official Figma Gallery:

https://www.figma.com/gallery/

Why it is useful:

- confident editorial spacing
- food-forward imagery without making the product feel like a supermarket catalogue
- strong component hierarchy
- restrained visual system
- useful reference for premium-but-simple food UI

What to borrow conceptually:

- whitespace discipline
- strong type hierarchy
- clean product presentation
- consistent reusable components

What not to copy:

- storefront/e-commerce information architecture
- basket/checkout metaphors as the core HlídačJídla model

### Figma Design Systems 101 / World Peas examples

https://www.figma.com/blog/design-systems-101-what-is-a-design-system/

Why it is useful:

- shows how a food-related visual identity can be expressed through reusable tokens/components
- reinforces that component consistency matters more than isolated pretty screens

Use this as a design-system reference, not as a source of assets to vendor into the repository.

### Figma pantry-app prompting/design example

https://www.figma.com/blog/designer-framework-for-better-ai-prompts/

Why it is useful:

- includes pantry/fridge-oriented mobile UI examples
- demonstrates the difference between a generic one-shot pantry app and a more deliberately constrained mobile experience
- supports our approach of specifying task, context, elements, behavior, and constraints before implementation

The example includes functionality outside the current MVP (such as recipe suggestions). Those features are not implied requirements for HlídačJídla.

### Public grocery case-study Figma file

Public file referenced through the Figma community forum:

https://www.figma.com/design/XU9468PyRoGgYvobTsBKBr/Case-study-1?node-id=0-1

Forum context:

https://forum.figma.com/ask-the-community-7/looking-for-an-expert-feedback-on-a-case-study-grocery-app-heuristic-review-needed-4551

Why it is useful:

- inspectable mobile grocery flow
- interaction and hierarchy reference
- useful for reviewing common grocery-app conventions

This is a third-party case study. Treat it as visual research only unless its license explicitly allows a particular reuse.

## Reference synthesis for HlídačJídla

The target product direction is not a clone of any one reference.

Use:

- World Peas for visual restraint, spacing, food presentation, and polish
- pantry/grocery references for mobile interaction patterns
- HlídačJídla's own product contract for hierarchy and behavior

The resulting product should be recognizable as HlídačJídla even if every reference link disappears.

## Asset and licensing rule

Do not commit screenshots, icons, illustrations, fonts, Figma exports, or source assets from external references merely because they are publicly viewable.

Before vendoring a third-party asset into the repository, verify that its license explicitly permits our intended use and preserve attribution/license text when required.

If licensing is uncertain, link to the reference and recreate the underlying idea with original assets/components instead.

## What contributors should do

Before a major UI implementation:

1. read `docs/PRODUCT.md`
2. read `docs/DESIGN_SYSTEM.md`
3. read `docs/DASHBOARD_UX.md`
4. inspect the references above only for visual/interaction inspiration
5. implement original HlídačJídla components against the actual product/domain behavior

Do not let an attractive external template override the core product loop.