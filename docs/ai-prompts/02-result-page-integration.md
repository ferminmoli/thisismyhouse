# 02 — Result Page Integration

## Goal

Ensure the public result page uses the premium renderer correctly, with `selectedVariant` as the single source of truth and no stale variant UI.

## Current repo findings

The main integration point is:

- `src/components/floorplan/result/FloorPlanResultView.tsx`

It currently:

- resolves recommended variant with `resolveRecommendedVariant(publicResult)`
- gets selectable top variants with `getSelectableVariants(publicResult)`
- initializes `selectedVariantId` from `resolveInitialVariantId(publicResult)`
- resolves `selectedVariant` with `resolveSelectedVariant(publicResult, selectedVariantId)`
- passes `selectedVariant.plan` to `PremiumFloorPlanSvg`
- passes `selectedVariant.label` and `selectedVariant.id` to the renderer
- passes `showScores={showDebug}` to `VariantSelector`
- renders debug panel only when `showDebug && debug`

This is close. This prompt should tighten integration and protect against stale or mixed variant data.

## Files to inspect

- `src/components/floorplan/result/FloorPlanResultView.tsx`
- `src/components/floorplan/result/FloorPlanResultPage.tsx`
- `src/components/floorplan/result/PremiumFloorPlanSvg.tsx`
- `src/lib/floorplan-result/selection.ts`
- `src/lib/floorplan-result/utils.ts`
- `src/components/floorplan/result/FloorPlanResultView.test.tsx`
- `src/components/floorplan/result/FloorPlanResultPage.test.tsx`

## Files likely to modify

- `src/components/floorplan/result/FloorPlanResultView.tsx`
- `src/lib/floorplan-result/selection.ts` only if a selection bug is found.
- `src/components/floorplan/result/FloorPlanResultView.test.tsx`
- `src/components/floorplan/result/FloorPlanResultPage.test.tsx`

## Detailed requirements

- `selectedVariant` must be the only source of truth for:
  - renderer plan
  - variant label
  - variant id
  - why/explanation content
  - highlight cards
  - architect brief displayed label
- The recommended variant must render first by default.
- Selecting a variant must immediately update:
  - SVG plan
  - hero variant label
  - mobile summary
  - why section title/content
  - highlight cards
  - architect brief `recommendedLabel` / selected label if applicable
- Do not let `recommendedVariant` data leak into selected variant display after user selection, except where intentionally comparing against the recommended state.
- Keep `onVariantChange` behavior.
- Keep debug panel gated by `showDebug`.
- Keep `VariantSelector` below/near the plan unless a minimal layout change improves clarity.

## Do not do

- Do not redesign all cards in this prompt.
- Do not modify the renderer internals here; that belongs to prompt 01.
- Do not expose scores to normal users.
- Do not introduce a second selected variant state.
- Do not run a production build.

## Acceptance criteria

- Recommended variant renders first.
- Selecting another variant updates the renderer props and user-facing text.
- No stale recommended label remains visible as the selected variant label after selection.
- Normal user output does not include debug/scorer internals.
- Tests cover default recommended selection and variant switching.

## Final Cursor prompt

```md
Implement prompt 02.

Inspect `FloorPlanResultView`, `FloorPlanResultPage`, `PremiumFloorPlanSvg`, `selection.ts`, and the existing result view tests. Tighten the result page so `selectedVariant` is the single source of truth for the public SVG, hero variant label, why copy, highlights, and selected-label references. Preserve recommended-first default behavior and `onVariantChange`.

Do not change renderer internals in this prompt. Do not expose debug/scorer internals to normal users. Add/update tests for recommended-first rendering and variant switching. Do not run a production build.
```
