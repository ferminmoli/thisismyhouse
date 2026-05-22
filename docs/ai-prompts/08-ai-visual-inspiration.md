# 08 — AI Visual Inspiration Section

## Goal

Improve the AI visual inspiration section so it complements the plan with mood/style direction without pretending to be a final render or technical design.

## Current repo findings

Relevant files:

- `src/components/floorplan/result/VisualInspirationCard.tsx`
- `src/lib/architecture/visualInspirationPrompt.ts`
- `src/lib/architecture/floorPlanResultPresenter.ts`
- `src/lib/architecture/publicFloorPlanTypes.ts`
- `src/lib/architecture/floorPlanPipelineTypes.ts`

Current behavior:

- `PublicVisualInspiration` has `prompt` and `notes`.
- `VisualInspirationCard` shows prompt and notes.
- The section currently appears after architect brief in `FloorPlanResultView`.

## Files to inspect

- `src/components/floorplan/result/VisualInspirationCard.tsx`
- `src/lib/architecture/visualInspirationPrompt.ts`
- `src/lib/architecture/floorPlanResultPresenter.ts`
- `src/lib/architecture/publicFloorPlanTypes.ts`
- `src/components/floorplan/result/FloorPlanResultView.tsx`
- tests/fixtures using `visualInspiration`

## Files likely to modify

- `src/components/floorplan/result/VisualInspirationCard.tsx`
- `src/lib/architecture/visualInspirationPrompt.ts` likely, if generated prompt text needs better structure.
- `src/lib/architecture/floorPlanResultPresenter.ts` only if mapping/sanitization needs change.
- `src/lib/floorplan-result/fixtures.ts` if tests need fixture coverage.
- tests

## Detailed requirements

The visual inspiration section should:

- feel premium and optional,
- explain the mood/style direction,
- make clear it is inspiration, not a final architectural render,
- avoid technical/permit/buildability claims,
- avoid raw prompt-engineering language,
- use user-facing copy.

Good public labels:

- `Inspiración visual`
- `Dirección de ambiente`
- `Materialidad sugerida para conversar`
- `Sensación buscada`

If `inspiration.prompt` exists:

- show it as a readable paragraph or styled prompt block.
- do not show raw JSON.

If `inspiration.notes` exist:

- show them as short bullets.

If absent:

- component should render nothing.

Optional improvement:

- Add a small visual placeholder/card using gradients/colors, not generated images.
- Do not call image generation in this prompt unless there is already a safe abstraction.

## Do not do

- Do not add external image generation.
- Do not expose raw LLM prompt internals.
- Do not call it a final render.
- Do not claim materials are specified.
- Do not run a production build.

## Acceptance criteria

- Visual inspiration renders only when data exists.
- Copy is premium and non-technical.
- No build-ready/render-ready claims.
- Notes are concise and readable.
- Tests cover presence/absence and no internal leaks.

## Final Cursor prompt

```md
Implement prompt 08.

Inspect `VisualInspirationCard.tsx`, `visualInspirationPrompt.ts`, `floorPlanResultPresenter.ts`, public types, fixtures, and result view usage. Improve the AI visual inspiration section so it feels premium, user-facing, optional, and clearly inspirational rather than a final render. Do not add image generation. Do not expose raw prompt-engineering/JSON. Add/update tests for presence, absence, and no internal leak behavior. Do not run a production build.
```
