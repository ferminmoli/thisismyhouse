# 01 — Public Floor Plan Renderer (Planta preliminar argentina)

## Goal

Improve the public-facing SVG floor plan so it reads like a **professional Argentine preliminary architectural plan** — monochrome, thick dark walls, cotas exteriores estimadas, rótulo inferior, norte — while clearly stating it is **conceptual and not construction-ready**.

Do **not** build a colorful “premium app diagram”. Do **not** claim municipal/IRAM compliance.

## Current repo findings

Public result UI uses:

```text
FloorPlanResultView
→ FinalPlanRenderer
→ renderFinalPlanToSvg
→ final-plan/architecturalPlanSvg.ts
```

Legacy chain (debug / deprecated wrapper only):

```text
PremiumFloorPlanSvg → FloorPlanSvgRenderer → svgRenderer.ts
```

**Primary implementation path:** `src/lib/architecture/final-plan/*` and `finalPlanRenderer.ts`.

## Visual target

The floor plan must look like a professional Argentine preliminary architectural plan, not like a colorful app diagram.

### Reference style

- Argentine “planta preliminar”
- Mostly black / white / off-white
- Thick dark walls (`#111827`)
- Clean room labels in Spanish
- Exterior dimension lines (cotas) when scale is safely estimable
- North arrow
- Title block / rótulo at bottom
- Furniture as thin architectural linework
- Patio / exterior with hatch or dashed boundary
- Disclaimer: “No apto para obra”

### Required language (rótulo / notas)

- “Planta preliminar”
- “Superficie cubierta aprox.”
- “Superficie exterior aprox.”
- “Escala conceptual / S.E.”
- “Medidas preliminares estimadas”
- “No apto para obra”
- “Sin validez municipal”
- “Revisión profesional requerida”

### Do NOT use

- Colorful category-board look
- Big colorful legend inside SVG
- Debug style boxes / raw IDs / scorer values
- Fake matrícula, firma, sello, carátula municipal
- Claims of IRAM or municipal compliance
- Construction-ready or permit-ready wording

## Argentine plan standard requirement

Visually inspired by Argentine drawing conventions (IRAM-style linework as reference only), but **must NOT** claim formal regulatory compliance.

Important:

- Do not generate a legally valid municipal plan.
- Do not generate a construction-ready drawing.
- Do not include fake professional signatures, license numbers, approval stamps, municipal seals, or expediente numbers.

## Renderer style requirements

### 1. Monochrome architectural look

- White/off-white paper
- Very subtle room fills
- Dark navy/black walls
- Thin gray furniture
- Light blue-gray cotas
- Minimal color only for windows / outdoor hatch

### 2. Walls

- Exterior: thick dark stroke
- Interior: slightly thinner dark stroke
- Squared corners / miter joins
- Doors/windows cut through walls
- Public path: **one stroke per zone** via `simpleRoomBoundaryLayer` (perimeter thick / interior thinner). **Do not** enable `buildWallSegments` on public — it duplicates strokes into an unreadable grid.

### 3. Openings

- Doors: wall gap + leaf + swing arc
- Passages: clear interruption, wider opening
- Windows: gap + thin double-line marker

### 4. Room labels (Spanish)

Examples: Dormitorio principal, Estar / comedor, Cocina, Baño, Patio, Galería, Acceso / Ingreso.

Format:

```text
Dormitorio principal
21 m²
```

Hide m² in tiny rooms. Never show raw IDs.

### 5. Furniture

Thin stroke, low weight, architectural symbols (bed, table, sofa, fixtures).

### 6. Patio / exterior

Dashed border, diagonal hatch, label “Patio”.

### 7. Cotas

Only when `derivePreliminaryScale` is safe. Argentine comma decimals: `13,50 m`. Footer note when shown.

### 8. North arrow

Small “N” + arrow, upper-right drawing area.

### 9. Title block

Compact bottom rótulo — see language list above. Plan remains the hero (`titleBlockH: 14`).

### 10. Legend

**No colorful legend inside public SVG.** `legend: []` from final renderer.

## Files to focus on

Improve existing path — do not duplicate renderers:

- `src/lib/architecture/final-plan/*`
- `src/lib/architecture/finalPlanRenderer.ts`
- `src/components/floorplan/result/FinalPlanRenderer.tsx`
- `src/components/floorplan/result/FloorPlanResultView.tsx`

Legacy (debug only):

- `src/lib/architecture/svgRenderer.ts`
- `PremiumFloorPlanSvg.tsx` / `FloorPlanSvgRenderer.tsx`

## Data

Use:

- `selectedVariant.plan` / `publicPlanToGenerated`
- `selectedVariant.label`
- `publicResult.title`
- `plan.metadata.areaEstimate` for m² and safe scale

## Acceptance criteria

- Thick dark architectural walls on public path
- Clean white/off-white sheet
- Clear door/window openings
- Architectural furniture (when plan includes hints)
- Patio hatch
- Exterior cotas when safely estimated (comma decimals)
- North arrow + bottom rótulo with all disclaimer lines
- Spanish Argentine labels
- No colorful legend inside plan
- No debug UI / raw IDs / scorer internals
- Clearly preliminary: “No apto para obra”, “Sin validez municipal”

## Final Cursor prompt

```md
Implement prompt 01 — Argentine preliminary plan visual target.

Primary path: FinalPlanRenderer → final-plan/*. Do not create a parallel renderer.

Apply monochrome Argentine preliminary style: thick #111827 walls via renderArchitecturalWallLayer, subtle fills, thin furniture, blue-gray cotas with comma decimals, north arrow, bottom rótulo with required Spanish disclaimer copy (including Sin validez municipal and Revisión profesional requerida).

No colorful legend in public SVG. No municipal/legal claims. No fake signatures or stamps.

Update tests in finalPlanRenderer.test.ts, sheetTitleBlock.test.ts, preliminaryDimensions.test.ts. Do not run production build.
```
