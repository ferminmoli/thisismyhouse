# 06 — Confidence + Professional Review Warning

## Goal

Make the confidence/professional review UI clear, trustworthy, and aligned with the product boundary: conceptual assistance, not construction-ready architecture.

## Current repo findings

Relevant files:

- `src/components/floorplan/result/ConfidenceReviewCard.tsx`
- `src/components/floorplan/result/ConceptualPlanHero.tsx`
- `src/lib/floorplan-result/utils.ts`
- `src/lib/floorplan-result/copy.ts`
- `src/lib/architecture/publicFloorPlanTypes.ts`
- `src/lib/architecture/floorPlanResultPresenter.ts`

Current behavior:

- Hero shows `professionalReviewWarning()`.
- `ConfidenceReviewCard` shows confidence badge, reasons, required professional review checklist, and disclaimer.
- Public types contain `PublicConfidence` and `PublicProfessionalReview`.

## Files to inspect

- `src/components/floorplan/result/ConfidenceReviewCard.tsx`
- `src/components/floorplan/result/ConceptualPlanHero.tsx`
- `src/lib/floorplan-result/utils.ts`
- `src/lib/floorplan-result/copy.ts`
- `src/lib/architecture/floorPlanResultPresenter.ts`
- `src/components/floorplan/result/FloorPlanResultView.test.tsx`

## Files likely to modify

- `src/components/floorplan/result/ConfidenceReviewCard.tsx`
- `src/components/floorplan/result/ConceptualPlanHero.tsx`
- `src/lib/floorplan-result/utils.ts`
- `src/lib/floorplan-result/copy.ts`
- tests

## Detailed requirements

The confidence/pro review UI should communicate:

- this is conceptual,
- a professional architect must validate the project,
- confidence depends on available site/program data,
- missing lot/orientation/normative data matters,
- the tool prepares the conversation; it does not replace the architect.

Content should remain concise and non-alarming.

Suggested review checklist items:

- Orientación solar y asoleamiento
- Medidas reales del lote
- Normativa municipal y retiros
- Estructura
- Instalaciones
- Ventilación natural
- Superficie cubierta / semicubierta / exterior

Confidence labels should be public-friendly:

- `high` → `Alta confianza`
- `medium` → `Confianza media`
- `medium_low` → `Confianza media-baja`
- `low` → `Faltan datos del terreno`

## Do not do

- Do not hide the professional warning.
- Do not claim the plan is valid/buildable.
- Do not mention permits/CAD/BIM as product outputs.
- Do not expose internal confidence calculations.
- Do not run a production build.

## Acceptance criteria

- Hero warning is visible and concise.
- Confidence card is clear and not overly scary.
- Professional review checklist is readable.
- No construction-ready claims appear.
- Tests cover warning presence and confidence labels.

## Final Cursor prompt

```md
Implement prompt 06.

Inspect `ConfidenceReviewCard.tsx`, `ConceptualPlanHero.tsx`, `utils.ts`, `copy.ts`, `floorPlanResultPresenter.ts`, and related tests. Improve the confidence/professional review UI so it clearly says the output is conceptual and must be validated by an architect, without exposing internal calculations or making construction-ready claims. Keep copy concise and premium. Add/update tests for warning presence, confidence labels, and no overclaiming. Do not run a production build.
```
