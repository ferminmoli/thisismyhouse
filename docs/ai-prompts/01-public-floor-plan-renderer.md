# 01 — Public Floor Plan Renderer

## Goal

Create or improve the public-facing SVG floor plan renderer so it looks premium and architecture-assistant ready, while keeping legacy/debug renderers hidden from normal users.

This is the first implementation prompt on purpose: do only the public renderer. Do not mix result-page layout, copy, architect brief, or visual inspiration changes into this step.

## Current repo findings

The repo already has a public renderer chain:

```text
FloorPlanResultView
→ PremiumFloorPlanSvg
→ FloorPlanSvgRenderer
→ publicPlanToGenerated
→ renderPlanToSvg
→ PlanSvgViewer
```

Relevant files:

- `src/components/floorplan/result/PremiumFloorPlanSvg.tsx`
- `src/components/floorplan/result/FloorPlanSvgRenderer.tsx`
- `src/components/floorplan/result/PlanSvgViewer.tsx`
- `src/lib/architecture/svgRenderer.ts`
- `src/lib/architecture/publicFloorPlanTypes.ts`
- `src/lib/architecture/floorPlanPipelineTypes.ts`
- `src/lib/architecture/generatedPlan.ts`
- `src/lib/architecture/spaceClassification.ts`
- `src/lib/architecture/planMetadata.ts`
- `src/lib/architecture/tests/svgRenderer.test.ts`

The existing `svgRenderer.ts` already renders:

- zones
- doors
- windows
- furniture
- legend
- title block
- disclaimer text: `Planta conceptual · no es plano de obra`

But the product need is stricter: the public SVG must not feel like a debug/prototype diagram.

## Files to inspect

- `src/components/floorplan/result/PremiumFloorPlanSvg.tsx`
- `src/components/floorplan/result/FloorPlanSvgRenderer.tsx`
- `src/components/floorplan/result/PlanSvgViewer.tsx`
- `src/lib/architecture/svgRenderer.ts`
- `src/lib/architecture/generatedPlan.ts`
- `src/lib/architecture/spaceClassification.ts`
- `src/lib/architecture/planMetadata.ts`
- `src/lib/architecture/tests/svgRenderer.test.ts`

## Files likely to modify

- `src/lib/architecture/svgRenderer.ts`
- `src/components/floorplan/result/PlanSvgViewer.tsx`
- `src/components/floorplan/result/PremiumFloorPlanSvg.tsx` only if prop naming/description needs tightening.
- `src/components/floorplan/result/FloorPlanSvgRenderer.tsx` only if area metadata mapping is incomplete.
- `src/lib/architecture/tests/svgRenderer.test.ts`

## Detailed requirements

### Renderer data

Use only public/render data:

- `plan.zones`
- `plan.doors`
- `plan.windows`
- `plan.furniture`
- `plan.metadata.areaEstimate`
- zone-level `estimatedAreaM2` mapped through `publicPlanToGenerated`
- `variantLabel`
- `variantId`

Coordinates are normalized 100×100 conceptual canvas coordinates.

Do not invent linear dimensions.
Do not show fake meters.
Show room m² only when available from area estimates.

### Visual direction

The output should feel like:

- boutique architecture concept board
- premium real estate assistant
- clean architectural diagram

Not like:

- SVG debugger
- JSON visualizer
- old conceptual prototype
- internal planning graph

### SVG composition

- Keep the plan large and readable.
- Give the drawing breathing room.
- Use off-white/paper background.
- Use subtle container/card styling.
- Avoid huge duplicated title inside SVG.
- Keep a small caption: `Planta conceptual · no es plano de obra`.
- Keep legend outside the plan drawing area or make it minimal enough not to dominate.
- No debug grid.
- No raw coordinates.
- No hover tooltip.
- No scorer/debug tokens.

### Zone styling

Subtle colors by zone type:

- social: warm light tone
- private: soft muted lavender
- service: soft blue
- circulation: very light neutral
- outdoor: light green + subtle hatch
- semi_outdoor: soft green/gray + hatch/dashed treatment

Room label rules:

- Center labels when possible.
- Use readable font sizes.
- Hide labels for extremely small rooms if necessary.
- Hide area line for small rooms.
- Humanize labels from ids.
- Do not expose raw ids like `DORMITORIO_PRINCIPAL` if a human label can be shown.

Suggested normalization:

- `SALA_COMEDOR` → `Estar / comedor`
- `DORMITORIO_PRINCIPAL` → `Dormitorio principal`
- `DORMITORIO_1` → `Dormitorio 1`
- `DORMITORIO_2` → `Dormitorio 2`
- `DORMITORIO_3` → `Dormitorio 3`
- `BANIO`, `BAÑO`, `BANO` → `Baño`
- `DISTRIBUIDOR` → `Distrib.`
- `LAVADERO` → `Lavadero`
- `PATIO` → `Patio`
- `COCINA` → `Cocina`
- `ACCESO` → `Acceso`
- `GALERIA` → `Galería`

### Walls, doors, windows

- Exterior/perimeter walls should read slightly stronger than interior boundaries if feasible.
- Shared walls must not look doubled or ugly.
- Doors should visibly interrupt/open the wall.
- `door`: subtle hinged door / swing arc if feasible.
- `open_passage`: clear opening, not a hinged door.
- `sliding`: clean wide opening, especially social-to-patio.
- Windows should be clean blue/cyan architectural line markers.
- No debug labels for openings.

### Furniture

Render furniture only when it improves readability:

- sofa
- dining_table
- kitchen_counter
- bed_double
- bed_single
- wardrobe
- bath_fixture
- grill

Furniture should be low-opacity, simple, and omitted in cramped rooms.

### Responsiveness

`PlanSvgViewer` should:

- scale SVG responsively
- avoid horizontal overflow
- keep desktop output large and elegant
- keep mobile readable
- not force a tiny inner frame

## Do not do

- Do not modify `FloorPlanResultView` layout in this prompt unless absolutely required.
- Do not modify variant selection logic.
- Do not expose debug data.
- Do not remove `FloorPlanResultDebugPanel`.
- Do not delete legacy renderers/components.
- Do not add real dimensions from normalized coordinates.
- Do not run a production build.

## Acceptance criteria

- Public SVG renders zones, doors, windows, furniture, and m² estimates where available.
- SVG includes `Planta conceptual · no es plano de obra`.
- SVG does not include scorer/debug strings such as `penalties`, `adjacencyScore`, `daylightScore`, `mutationIntentScore`, `validation`.
- Legend does not overlap the plan.
- Room labels are humanized and readable.
- Area labels hide in small rooms.
- Patio/semi-covered areas are visually distinct.
- Doors/windows are clean and visible.
- `src/lib/architecture/tests/svgRenderer.test.ts` is updated to protect the behavior.

## Final Cursor prompt

```md
Implement prompt 01.

Inspect the actual renderer chain:
- `src/components/floorplan/result/PremiumFloorPlanSvg.tsx`
- `src/components/floorplan/result/FloorPlanSvgRenderer.tsx`
- `src/components/floorplan/result/PlanSvgViewer.tsx`
- `src/lib/architecture/svgRenderer.ts`
- `src/lib/architecture/generatedPlan.ts`
- `src/lib/architecture/spaceClassification.ts`
- `src/lib/architecture/planMetadata.ts`
- `src/lib/architecture/tests/svgRenderer.test.ts`

Improve the existing public SVG renderer instead of creating a disconnected parallel renderer. The renderer must use normalized 100×100 conceptual coordinates, render zones/doors/windows/furniture/area estimates, look premium and architectural, include the subtle disclaimer `Planta conceptual · no es plano de obra`, and avoid debug grids/tooltips/raw ids/scorer internals.

Keep legacy/debug renderers available only behind dev/admin debug paths; do not delete them. Do not modify variant selection or the broader result-page layout in this prompt. Add/update targeted SVG renderer tests. Do not run a production build.
```
