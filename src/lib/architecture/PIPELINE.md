# ArcPoc conceptual floor plan pipeline

End-to-end flow for **conceptual** residential floor plans (not construction documents).

## Stages

1. **Program Extractor** — LLM/mock brief → `ArchitecturalProgram`
2. **Topological Graph Builder** — rooms and adjacency graph
3. **Architectural Strategy Selector** — parti, lot constraints, priorities
4. **Parametric Parti Generator** — L-shape template, normalized 100×100 canvas
5. **Mutation Engine** — variants (patio, kitchen, laundry, gallery, …)
6. **Geometric Validator** — hard adjacencies, architectural issues
7. **Plan Scorer** — single ranked list by `score.total` (descending)
8. **Recommendation Engine** — top variant + confidence + narrative
9. **SVG Renderer** — conceptual SVG per top/recommended variant
10. **Architect Brief Generator** — handoff text for a licensed architect
11. **Visual Inspiration Prompt** — mood-board prompt only (not technical)

Wall graph building is deferred; openings are derived from zone geometry at render time.

## Entry points

| Function | Use |
|----------|-----|
| `runFloorPlanPipeline(prompt)` | **Production** — returns `FloorPlanPipelineResult` with `publicResult` + `debug` |
| `runArchitecturalPipeline(prompt, { debug })` | Legacy compact API + optional debug blob |
| `POST /api/floor-plan-pipeline` | HTTP — `{ prompt, admin?: true }` → `publicResult`; `debug` only if `admin: true` |

## Public vs debug

- **`publicResult`** — Curated via `FloorPlanResultPresenter` (`presentFloorPlanPipeline`): recommended + top 3 variants with public-safe plan geometry, brief, confidence, disclaimer. No penalties, validation objects, or stage traces.
- **`debug`** — Optional (dev/admin): stages, scored variants, selection method, raw validation. Omitted in production unless debug flags are on.
- **`debug`** — Admin/dev: full stages, `scoringDetails`, `validationDetails`, `plansById`, selection trace.

## Ranking rules

Eligible variants: `status === "ok"`, `eligibleForRanking`, finite `score.total`.

`recommendedVariant` === `scoredVariants[0]` === `topVariants[0]` (score-based; no lifestyle override).

Family homes penalize missing laundry; ventilated kitchen-extension laundry is preferred when it scores highest.

## Professional disclaimer

Every public response includes disclaimers: conceptual sketch only; architect must validate orientation, lot, code, structure, MEP, ventilation, and covered/outdoor areas.
