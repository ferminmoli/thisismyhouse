# 04 — “Why This Plan?” Copy

## Goal

Improve the human explanation section so it feels like a helpful architecture assistant, not a scorer report.

## Current repo findings

Relevant files:

- `src/components/floorplan/result/WhyRecommended.tsx`
- `src/components/floorplan/result/PlanHighlights.tsx`
- `src/lib/floorplan-result/copy.ts`
- `src/lib/floorplan-result/utils.ts`
- `src/lib/ai-prompts/user-explanation.ts`
- `src/lib/ai-prompts/fetch-user-explanation.ts`
- `src/app/api/user-explanation/route.ts`

Current behavior:

- `FloorPlanResultView` calls `buildWhyNarrative(publicResult, selectedVariant, isShowingRecommended)`.
- Recommended variant uses `publicResult.whyRecommended`, `architectBrief.summary`, and fallback copy.
- Non-recommended variants use selected variant description/highlights.
- Public result presenter attempts to sanitize internal scorer phrases.

## Files to inspect

- `src/components/floorplan/result/WhyRecommended.tsx`
- `src/components/floorplan/result/PlanHighlights.tsx`
- `src/lib/floorplan-result/copy.ts`
- `src/lib/floorplan-result/utils.ts`
- `src/lib/architecture/floorPlanResultPresenter.ts`
- `src/lib/ai-prompts/user-explanation.ts`
- `src/lib/ai-prompts/user-explanation-types.ts`
- tests that assert no internal leaks

## Files likely to modify

- `src/lib/floorplan-result/copy.ts`
- `src/components/floorplan/result/WhyRecommended.tsx`
- `src/components/floorplan/result/PlanHighlights.tsx`
- `src/lib/architecture/floorPlanResultPresenter.ts` only if sanitization gaps are found.
- tests for copy/leak behavior

## Detailed requirements

Public copy should explain:

- why the recommended plan fits the brief,
- what tradeoff the selected variant makes,
- how the layout supports living patterns,
- what to discuss with an architect.

Tone:

- warm,
- plain language,
- architectural but non-jargon,
- honest about conceptual nature.

Avoid:

- `adjacencyScore`
- `daylightScore`
- `mutationIntentScore`
- `penalties`
- `hard adjacency`
- raw validation terms
- overclaiming buildability

For recommended variant:

- title: `¿Por qué este plan?`
- narrative should be one strong paragraph.
- bullets should be concrete public reasons.

For non-recommended selected variants:

- title: `¿Por qué considerar esta variante?`
- narrative should explain what changes compared with recommended.
- bullets should describe tradeoffs.

## Do not do

- Do not make LLM calls mandatory for rendering result UI.
- Do not expose raw AI explanation JSON.
- Do not add long copy blocks that push the plan below the fold.
- Do not expose scorer internals.
- Do not run a production build.

## Acceptance criteria

- Explanation changes when selected variant changes.
- Copy remains public/user-facing.
- No internal scorer words leak in result HTML.
- Recommended and alternate variants have appropriate section titles.
- Tests cover copy behavior and leak prevention.

## Final Cursor prompt

```md
Implement prompt 04.

Inspect `WhyRecommended.tsx`, `PlanHighlights.tsx`, `copy.ts`, `utils.ts`, `floorPlanResultPresenter.ts`, and existing no-leak tests. Improve the “Why this plan?” public copy so it explains fit, tradeoffs, and next architect questions in warm non-technical language. Ensure recommended vs alternate selected variants use different titles/content. Keep scorer internals and raw validation language out of normal UI. Add/update tests for copy updates on variant switch and no internal leaks. Do not run a production build.
```
