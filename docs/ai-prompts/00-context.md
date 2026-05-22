# 00 — Context for Cursor Implementation Prompts

## Goal

Give Cursor the actual repository context before any implementation prompt is executed. This file is the shared contract for the prompt pack.

## Current repo findings

This repository is the POC app at `arc/poc`.

Current product direction:

```text
User Prompt
→ LLM Program Extractor
→ Topological Graph Builder
→ Architectural Strategy Selector
→ Parametric Parti Generator
→ Mutation Engine
→ Wall Graph Builder
→ Geometric Validator
→ Plan Scorer
→ Top 3 Variations
→ SVG Renderer + AI Visual Inspiration + Architect Brief
```

Actual result UI / public output files found:

- `src/components/floorplan/result/FloorPlanResultView.tsx` — main public result UI; resolves recommended + selected variant.
- `src/components/floorplan/result/FloorPlanResultPage.tsx` — compatibility wrapper around `FloorPlanResultView`.
- `src/components/floorplan/result/FinalPlanRenderer.tsx` — **primary** public renderer (Argentine preliminary plan).
- `src/lib/architecture/finalPlanRenderer.ts` + `src/lib/architecture/final-plan/*` — architectural SVG pipeline.
- `src/components/floorplan/result/PremiumFloorPlanSvg.tsx` — deprecated wrapper; debug/legacy only.
- `src/components/floorplan/result/FloorPlanSvgRenderer.tsx` — legacy adapter → `renderPlanToSvg`.
- `src/components/floorplan/result/PlanSvgViewer.tsx` — responsive SVG container.
- `src/lib/architecture/svgRenderer.ts` — legacy colorful renderer (not public default).
- `src/lib/architecture/publicFloorPlanTypes.ts` — public result/data contract; excludes internals.
- `src/lib/architecture/floorPlanPipelineTypes.ts` — re-exports public types and pipeline result types.
- `src/lib/architecture/floorPlanResultPresenter.ts` — maps internal pipeline output to sanitized `publicResult` + optional debug.
- `src/lib/floorplan-result/selection.ts` — recommended/top variant resolution.
- `src/lib/floorplan-result/copy.ts` — public copy for why/recommended/highlights.
- `src/lib/floorplan-result/utils.ts` — confidence labels, quality tags, internal leak detector.
- `src/lib/floorplan-result/featureFlags.ts` — debug visibility gate.

Current debug/admin behavior:

- `shouldShowFloorPlanDebug({ isAdmin, isDev })` returns true only for explicit admin/dev or `forceDebug`.
- `FloorPlanResultView` renders `FloorPlanResultDebugPanel` only when `showDebug && debug`.
- Normal users must use only `publicResult`.

Important current tests:

- `src/lib/architecture/tests/finalPlanRenderer.test.ts`
- `src/lib/architecture/tests/sheetTitleBlock.test.ts`
- `src/lib/architecture/tests/preliminaryDimensions.test.ts`
- `src/lib/architecture/tests/svgRenderer.test.ts` (legacy)
- `src/components/floorplan/result/FloorPlanResultView.test.tsx`
- `src/components/floorplan/result/FloorPlanResultPage.test.tsx`
- `src/lib/architecture/tests/floorPlanResultPresenter.test.ts`
- `src/lib/floorplan-result/selection.test.ts`
- `src/lib/floorplan-result/utils.test.ts`

Current package scripts:

- `npm run lint`
- `npm run test`
- `npm run test:watch`
- `npm run debug:pipeline`
- `npm run validate:templates`

## Files to inspect

At the start of each prompt, re-open the files listed for that prompt. Do not rely on stale context.

Core files to keep in mind across all prompts:

- `src/components/floorplan/result/FloorPlanResultView.tsx`
- `src/components/floorplan/result/PremiumFloorPlanSvg.tsx`
- `src/components/floorplan/result/FloorPlanSvgRenderer.tsx`
- `src/components/floorplan/result/PlanSvgViewer.tsx`
- `src/lib/architecture/svgRenderer.ts`
- `src/lib/architecture/publicFloorPlanTypes.ts`
- `src/lib/architecture/floorPlanPipelineTypes.ts`
- `src/lib/architecture/floorPlanResultPresenter.ts`
- `src/lib/floorplan-result/featureFlags.ts`

## Files likely to modify

This file is context only; do not modify product code when using this file alone.

## Detailed requirements

The implementation prompts in this folder must preserve these product rules:

1. Recommended plan appears first.
2. `selectedVariant` / `selectedVariantId` is the single source of truth in the result UI.
3. Normal users must not see:
   - scorer internals
   - raw validation object
   - raw JSON
   - penalty objects
   - `adjacencyScore`
   - `daylightScore`
   - `mutationIntentScore`
   - legacy renderer
   - internal pipeline logs
4. Dev/admin users may see internals only inside a collapsible debug panel.
5. Public renderer must use normalized 100×100 conceptual coordinates.
6. Do not invent real dimensions from normalized coordinates.
7. Show approximate m² only when area estimates exist.
8. Keep architecture assistant positioning: conceptual, premium, and explicitly not construction-ready.

## Do not do

- Do not rewrite the whole pipeline.
- Do not expose `debug` data in normal public UI.
- Do not weaken `shouldShowFloorPlanDebug`.
- Do not make Gemini/LLM calls for UI-only renderer changes.
- Do not create parallel data contracts unless required.
- Do not delete legacy/debug components unless explicitly asked.
- Do not run a production build.

## Acceptance criteria

This context is satisfied if Cursor understands:

- the actual component names,
- the real public data contracts,
- where debug gating lives,
- where renderer logic lives,
- which tests should protect public output.

## Final Cursor prompt

```md
Read `docs/ai-prompts/00-context.md` first. Treat it as the shared repository context and product boundary for the remaining prompts. Do not implement anything from this file alone. Then execute the next numbered prompt exactly, re-inspecting the files listed there before editing.
```
