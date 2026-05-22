# 05 — Architect Brief Section

## Goal

Polish the collapsible architect brief so it is useful, readable, and share-ready without exposing internals.

## Current repo findings

Relevant files:

- `src/components/floorplan/result/ArchitectBriefAccordion.tsx`
- `src/lib/architecture/publicFloorPlanTypes.ts`
- `src/lib/architecture/floorPlanResultPresenter.ts`
- `src/lib/architecture/architectBriefGenerator.ts` likely generates or supports brief content.
- `src/components/floorplan/result/FloorPlanResultView.tsx`
- `src/components/floorplan/result/FloorPlanResultPage.test.tsx`

Current behavior:

- Brief is collapsed by default.
- Brief renders summary, variant label, key decisions, professional checks, areas, rooms, warnings, next steps.
- `FloorPlanResultView` passes `publicResult.architectBrief`, `selectedVariant.label`, and professional checks.

## Files to inspect

- `src/components/floorplan/result/ArchitectBriefAccordion.tsx`
- `src/lib/architecture/publicFloorPlanTypes.ts`
- `src/lib/architecture/floorPlanResultPresenter.ts`
- `src/lib/architecture/architectBriefGenerator.ts`
- `src/components/floorplan/result/FloorPlanResultView.tsx`
- `src/components/floorplan/result/FloorPlanResultPage.test.tsx`
- `src/components/floorplan/result/FloorPlanResultView.test.tsx`

## Files likely to modify

- `src/components/floorplan/result/ArchitectBriefAccordion.tsx`
- `src/lib/architecture/floorPlanResultPresenter.ts` only if brief mapping needs sanitization.
- `src/lib/architecture/architectBriefGenerator.ts` likely, if copy/source content needs improvement.
- tests listed above

## Detailed requirements

Brief should feel like:

- something the user can take to an architect,
- concise,
- structured,
- non-technical enough for clients,
- useful enough for professionals.

Keep sections:

- Summary
- Selected variant
- Key decisions
- Surfaces/areas
- Rooms
- Professional validation checklist
- Warnings/assumptions
- Next steps

Requirements:

- Collapsed by default.
- Accessible button with `aria-expanded` and `aria-controls`.
- No raw JSON.
- No scorer internals.
- No penalty objects.
- No exact construction claims.
- Use approximate area language: `~{m2} m²`.
- If data is missing, omit section gracefully.
- Public copy should say “revisar con un arquitecto”, not “construction-ready”.

## Do not do

- Do not add PDF export here.
- Do not add sharing flow here.
- Do not expose debug warnings as-is.
- Do not make the accordion open by default unless product explicitly asks.
- Do not run a production build.

## Acceptance criteria

- Accordion remains collapsed by default.
- Expanding shows structured brief sections.
- Selected variant label is accurate after switching variants.
- Missing data does not render empty headings.
- No internal scorer/debug leaks in brief.
- Tests cover expand/collapse and selected variant label.

## Final Cursor prompt

```md
Implement prompt 05.

Inspect `ArchitectBriefAccordion.tsx`, `publicFloorPlanTypes.ts`, `floorPlanResultPresenter.ts`, `architectBriefGenerator.ts`, `FloorPlanResultView.tsx`, and related tests. Polish the collapsible architect brief so it is concise, accessible, useful for an architect conversation, and fully sanitized for normal users. Keep it collapsed by default. Use approximate area language and omit empty sections. Do not add PDF/export/share features. Add/update tests for expand/collapse, selected variant label, missing data, and no internal leaks. Do not run a production build.
```
