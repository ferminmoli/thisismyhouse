# 07 — Debug/Admin Panel Boundary

## Goal

Ensure raw pipeline/scorer/debug information is available only to dev/admin users inside a collapsible debug panel, never in normal public UI.

## Current repo findings

Relevant files:

- `src/lib/floorplan-result/featureFlags.ts`
- `src/components/floorplan/result/FloorPlanResultDebugPanel.tsx`
- `src/components/floorplan/result/FloorPlanResultView.tsx`
- `src/lib/architecture/floorPlanResultPresenter.ts`
- `src/lib/architecture/publicFloorPlanTypes.ts`
- `src/lib/floorplan-result/utils.ts`
- `src/components/floorplan/result/FloorPlanResultView.test.tsx`
- `src/lib/architecture/tests/floorPlanResultPresenter.test.ts`

Current behavior:

- `shouldShowFloorPlanDebug` returns true only for `forceDebug`, `isAdmin`, or `isDev`.
- `FloorPlanResultView` renders `FloorPlanResultDebugPanel` only when `showDebug && debug`.
- `FloorPlanResultDebugPanel` is collapsible.
- `floorPlanResultPresenter` can attach debug based on options/env; confirm this still matches product intent.

## Files to inspect

- `src/lib/floorplan-result/featureFlags.ts`
- `src/components/floorplan/result/FloorPlanResultDebugPanel.tsx`
- `src/components/floorplan/result/FloorPlanResultView.tsx`
- `src/lib/architecture/floorPlanResultPresenter.ts`
- `src/lib/architecture/pipelinePublicOutput.ts`
- `src/lib/floorplan-result/utils.ts`
- relevant tests

## Files likely to modify

- `src/lib/floorplan-result/featureFlags.ts` only if behavior is too permissive.
- `src/components/floorplan/result/FloorPlanResultDebugPanel.tsx`
- `src/components/floorplan/result/FloorPlanResultView.tsx` only if gating is incomplete.
- `src/lib/architecture/floorPlanResultPresenter.ts` only if public/debug payload separation is incomplete.
- tests listed above

## Detailed requirements

Normal users must never see:

- scorer internals
- raw validation object
- raw JSON
- penalty objects
- `adjacencyScore`
- `daylightScore`
- `mutationIntentScore`
- legacy renderer
- internal pipeline logs

Dev/admin may see:

- collapsible debug panel
- stage timings
- selected raw/debug variant info
- scorer internals
- validation details
- warnings
- legacy renderer only if intentionally added inside debug panel

Requirements:

- Keep debug panel collapsed by default.
- Keep all `<pre>` JSON inside debug panel only.
- Add or strengthen tests using `containsInternalScoreLeak`.
- Avoid broad env behavior that exposes debug in normal local usage unless explicitly dev/admin. Product rule: explicit `isDev` or `isAdmin`.

## Do not do

- Do not remove debug capability.
- Do not show debug panel for normal users.
- Do not sprinkle debug blocks outside `FloorPlanResultDebugPanel`.
- Do not weaken public sanitizer.
- Do not run a production build.

## Acceptance criteria

- Normal render does not include `Developer debug`.
- Normal render does not include internal leak strings.
- Dev/admin render can show `Developer debug` but collapsed by default.
- Debug panel includes raw details only after opening.
- Tests cover both normal and dev/admin modes.

## Final Cursor prompt

```md
Implement prompt 07.

Inspect `featureFlags.ts`, `FloorPlanResultDebugPanel.tsx`, `FloorPlanResultView.tsx`, `floorPlanResultPresenter.ts`, `pipelinePublicOutput.ts`, `utils.ts`, and related tests. Strengthen the public/debug boundary: normal users must never see scorer internals, JSON, validation objects, penalty objects, or legacy/debug renderers; dev/admin may see them only inside a collapsed debug panel. Preserve debug usefulness. Add/update tests for normal no-leak behavior and dev/admin visibility. Do not run a production build.
```
