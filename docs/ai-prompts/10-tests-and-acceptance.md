# 10 — Tests and Acceptance

## Goal

Add/strengthen tests that protect the public result experience, renderer quality boundaries, variant switching, and debug separation.

## Current repo findings

Existing relevant tests:

- `src/lib/architecture/tests/svgRenderer.test.ts`
- `src/components/floorplan/result/FloorPlanResultView.test.tsx`
- `src/components/floorplan/result/FloorPlanResultPage.test.tsx`
- `src/lib/architecture/tests/floorPlanResultPresenter.test.ts`
- `src/lib/floorplan-result/selection.test.ts`
- `src/lib/floorplan-result/utils.test.ts`
- `src/lib/architecture/tests/rankingInvariants.test.ts`
- `src/lib/architecture/tests/planScorerRanking.test.ts`

Package scripts:

- `npm run test`
- `npm run lint`

Do not run production build.

## Files to inspect

- all tests listed above
- `src/lib/floorplan-result/fixtures.ts`
- `src/lib/architecture/tests/testHelpers.ts`
- changed implementation files from prompts 01–09

## Files likely to modify

- `src/lib/architecture/tests/svgRenderer.test.ts`
- `src/components/floorplan/result/FloorPlanResultView.test.tsx`
- `src/components/floorplan/result/FloorPlanResultPage.test.tsx`
- `src/lib/architecture/tests/floorPlanResultPresenter.test.ts`
- `src/lib/floorplan-result/selection.test.ts`
- `src/lib/floorplan-result/utils.test.ts`
- `src/lib/floorplan-result/fixtures.ts` if fixture coverage needs updates

## Detailed requirements

Add tests for:

### Renderer

- renders premium/public SVG structure
- includes `Planta conceptual · no es plano de obra`
- uses `preserveAspectRatio`
- legend is outside plan drawing area or omitted intentionally
- no scorer/debug tokens in SVG
- humanized room labels
- m² shown only when available and room is large enough
- patio/semi-covered patterns/styles exist when present
- doors/windows/furniture render without debug labels

### Result page

- recommended variant renders first
- selecting a variant updates renderer props
- selected variant label updates hero and explanation
- top 3 selector visible
- normal users do not see debug panel
- dev/admin users can see collapsed debug panel
- no internal scorer leaks in `container.innerHTML`

### Public presenter / data boundary

- `publicResult` excludes scorer internals
- `debug` is optional and gated
- topVariants length is 3 where data exists
- recommendedVariant is top ranked/scored variant

### Copy/components

- architect brief collapsed by default
- confidence warning visible
- visual inspiration absent when no data
- visual inspiration present when data exists

## Do not do

- Do not add brittle snapshot tests of full SVG string unless existing style already does.
- Prefer semantic string/role assertions.
- Do not make tests depend on exact pixel values unless testing renderer layout constants intentionally.
- Do not run production build.

## Acceptance criteria

- Relevant tests pass with `npm run test`.
- Lint passes with `npm run lint` if changes affected lintable code.
- Public UI leak tests catch forbidden strings:
  - `penalties`
  - `mutationIntentScore`
  - `adjacencyScore`
  - `daylightScore`
  - `validation object`
  - `raw scorer`
- Tests document the public/debug boundary.

## Final Cursor prompt

```md
Implement prompt 10.

Inspect the existing renderer, result view, presenter, selection, and utility tests. Add or strengthen tests for the premium public SVG renderer, recommended-first result page behavior, variant switching, architect brief, confidence warning, visual inspiration, and normal-user no-debug/no-internal-leak boundary. Avoid brittle full-SVG snapshots; prefer targeted assertions. Run targeted tests or `npm run test` if practical, and `npm run lint` if code changed. Do not run a production build.
```
