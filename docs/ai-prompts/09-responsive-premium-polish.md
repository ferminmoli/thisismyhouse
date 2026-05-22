# 09 — Responsive Premium Polish

## Goal

Polish the entire public result page layout for desktop and mobile so it feels like a finished premium architecture assistant result.

## Current repo findings

Relevant files:

- `src/components/floorplan/result/FloorPlanResultView.tsx`
- `src/components/floorplan/result/ConceptualPlanHero.tsx`
- `src/components/floorplan/result/PlanSvgViewer.tsx`
- `src/components/floorplan/result/VariantSelector.tsx`
- `src/components/floorplan/result/VariantCard.tsx`
- `src/components/floorplan/result/WhyRecommended.tsx`
- `src/components/floorplan/result/PlanHighlights.tsx`
- `src/components/floorplan/result/ConfidenceReviewCard.tsx`
- `src/components/floorplan/result/ArchitectBriefAccordion.tsx`
- `src/components/floorplan/result/VisualInspirationCard.tsx`
- `src/app/globals.css`

Current layout:

- Article with vertical spacing.
- Hero header.
- Desktop two-column grid: plan + variants left, explanation/review right.
- Mobile stacks content.
- Variant selector supports horizontal scroll on mobile.

## Files to inspect

- all result components listed above
- `src/app/globals.css`
- `src/components/floorplan/FloorplanApp.tsx` only to understand parent container width.

## Files likely to modify

- result components listed above
- `src/app/globals.css` only if global utility tweaks are needed.

## Detailed requirements

Public result page should feel:

- calm,
- premium,
- spacious,
- architecture/real-estate oriented,
- not developer-tool oriented.

Responsive priorities:

### Desktop

- Plan should be large and visually dominant.
- Sidebar explanation should be readable and sticky if helpful.
- Cards should align cleanly.
- Avoid cramped internal frames.

### Mobile

- Plan full width.
- Variant cards easy to swipe/select.
- Hero not too tall.
- Explanation readable below/near the plan.
- No horizontal page overflow.
- Debug panel, if visible in dev/admin, must not break layout.

### Visual polish

- Use consistent rounded corners.
- Use subtle borders/shadows.
- Use stone/slate/amber palette consistently.
- Avoid saturated colors.
- Avoid too many competing cards.
- Keep professional warning visible but not visually dominant.

## Do not do

- Do not alter pipeline/data contracts.
- Do not change renderer SVG internals except small container sizing if required.
- Do not add new dependencies.
- Do not expose debug data.
- Do not run a production build.

## Acceptance criteria

- Desktop layout feels premium and plan-led.
- Mobile has no horizontal overflow.
- Variant selector remains usable on mobile.
- Cards have consistent spacing and visual hierarchy.
- Debug/admin panel does not affect normal user layout.
- Existing behavior/tests remain valid; add tests only where practical.

## Final Cursor prompt

```md
Implement prompt 09.

Inspect the public result components and `globals.css`. Polish responsive layout and visual hierarchy without changing data contracts or renderer internals. The plan should be large and dominant; top variants, explanation, confidence warning, architect brief, and visual inspiration should feel like a coherent premium architecture assistant result. Ensure mobile has no horizontal overflow and the selector remains usable. Do not expose debug data or add dependencies. Do not run a production build.
```
