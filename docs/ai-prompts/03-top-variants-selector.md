# 03 — Top Variants Selector

## Goal

Make the top 3 variant selector feel premium, clear, accessible, and user-facing while hiding raw scores from normal users.

## Current repo findings

Relevant files:

- `src/components/floorplan/result/VariantSelector.tsx`
- `src/components/floorplan/result/VariantCard.tsx`
- `src/lib/floorplan-result/selection.ts`
- `src/lib/floorplan-result/utils.ts`
- `src/lib/floorplan-result/selection.test.ts`
- `src/components/floorplan/result/FloorPlanResultView.test.tsx`

Current behavior:

- `VariantSelector` slices variants to top 3.
- `VariantCard` shows quality tag and optional score.
- `showScores` is passed from `showDebug`, so normal users should not see raw score.
- `variantQualityTag` returns public labels like `Recomendada`, `Muy buena alternativa`, `Más patio`, etc.

## Files to inspect

- `src/components/floorplan/result/VariantSelector.tsx`
- `src/components/floorplan/result/VariantCard.tsx`
- `src/lib/floorplan-result/selection.ts`
- `src/lib/floorplan-result/utils.ts`
- `src/lib/floorplan-result/selection.test.ts`
- `src/components/floorplan/result/FloorPlanResultView.test.tsx`

## Files likely to modify

- `src/components/floorplan/result/VariantSelector.tsx`
- `src/components/floorplan/result/VariantCard.tsx`
- `src/lib/floorplan-result/utils.ts`
- tests listed above

## Detailed requirements

- Show exactly up to top 3 public variants.
- Ensure recommended variant is included and appears first.
- Cards should be selectable with clear selected state.
- Cards should work on mobile horizontally and desktop as a clean grid.
- Public labels should be human:
  - `Recomendada`
  - `Muy buena alternativa`
  - `Más patio`
  - `Más cocina integrada`
  - `Más social`
  - `Más servicio`
- Do not show raw numeric score to normal users.
- Numeric score can appear only when `showScores === true`, i.e. dev/admin mode.
- Use accessible button/tab semantics carefully. Current `aria-pressed` is acceptable; if changed to tabs, implement proper roles.
- The selected card should be visually premium but not visually louder than the plan.

## Do not do

- Do not fetch or recompute variants.
- Do not mutate `publicResult.topVariants`.
- Do not display `score.total`, `penalties`, or score breakdown to normal users.
- Do not add JSON/debug data to cards.
- Do not run a production build.

## Acceptance criteria

- Selector shows up to 3 cards.
- Recommended variant appears first.
- Selected state is obvious.
- Normal users see only public quality tags, not numeric scores.
- Dev/admin can still see score when `showScores` is true.
- Tests cover selection and absence of score/internals for normal users.

## Final Cursor prompt

```md
Implement prompt 03.

Inspect `VariantSelector.tsx`, `VariantCard.tsx`, `selection.ts`, `utils.ts`, and related tests. Polish the top 3 variant selector so it is premium, accessible, recommended-first, and uses user-facing quality tags. Keep numeric scores hidden unless `showScores` is true. Do not expose score internals, penalties, validation, or JSON in normal UI. Add/update tests for top-3 selection, recommended-first order, selected state, and score visibility. Do not run a production build.
```
