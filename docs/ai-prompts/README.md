# Cursor Prompt Pack — Premium Public Floor Plan Result

This folder contains implementation prompts for Cursor. Use them one by one, in order.

## Recommended execution order

1. `00-context.md` — read-only context. Do not implement from this file alone.
2. `01-public-floor-plan-renderer.md` — improve/create the premium public SVG renderer.
3. `02-result-page-integration.md` — ensure selected variant drives all public result UI.
4. `03-top-variants-selector.md` — polish top 3 variant cards/tabs.
5. `04-why-this-plan-copy.md` — improve public explanation copy.
6. `05-architect-brief-section.md` — polish architect brief accordion.
7. `06-confidence-professional-review.md` — polish professional warning/confidence UI.
8. `07-debug-admin-panel.md` — strengthen debug/admin-only boundary.
9. `08-ai-visual-inspiration.md` — polish visual inspiration section.
10. `09-responsive-premium-polish.md` — polish full responsive public UI.
11. `10-tests-and-acceptance.md` — add/strengthen acceptance tests.

## What each prompt does

| Prompt | Purpose | Scope |
| ------ | ------- | ----- |
| `00-context.md` | Shared repo/product context | Read-only |
| `01-public-floor-plan-renderer.md` | Premium SVG floor plan renderer | Renderer-focused |
| `02-result-page-integration.md` | Selected variant integration | UI state/integration |
| `03-top-variants-selector.md` | Top 3 public variant selector | UI-only |
| `04-why-this-plan-copy.md` | Human explanation copy | UI/copy, maybe presenter sanitization |
| `05-architect-brief-section.md` | Collapsible architect brief | UI/copy, maybe brief generator/presenter |
| `06-confidence-professional-review.md` | Confidence/pro review warning | UI/copy |
| `07-debug-admin-panel.md` | Debug/admin-only gating | UI/data-boundary |
| `08-ai-visual-inspiration.md` | Inspiration section polish | UI/copy, maybe prompt/presenter |
| `09-responsive-premium-polish.md` | Overall responsive premium finish | UI-only |
| `10-tests-and-acceptance.md` | Test coverage and acceptance checks | Tests |

## How to use them in Cursor

For each numbered prompt:

1. Open the markdown file.
2. Copy the `Final Cursor prompt` block.
3. Paste it into Cursor.
4. Let Cursor inspect the files listed in that prompt.
5. Review the diff before accepting.
6. Run only the relevant verification command when the prompt asks for it.
7. Commit after each prompt if the diff is clean.

Do not paste multiple implementation prompts at once. The order is designed to reduce blast radius.

## How to verify each stage

Recommended checks by stage:

- Prompt 01: `npm run test -- src/lib/architecture/tests/svgRenderer.test.ts`
- Prompt 02: `npm run test -- src/components/floorplan/result/FloorPlanResultView.test.tsx`
- Prompt 03: `npm run test -- src/lib/floorplan-result/selection.test.ts src/components/floorplan/result/FloorPlanResultView.test.tsx`
- Prompt 04: run result view tests and leak utility tests.
- Prompt 05: run result page/view tests.
- Prompt 06: run result view tests.
- Prompt 07: run result view, presenter, and utility tests.
- Prompt 08: run result view tests and any visual inspiration tests added.
- Prompt 09: run lint and result view tests if UI code changed.
- Prompt 10: run `npm run test` and `npm run lint` if practical.

Project rule: do **not** run a production build.

## UI-only prompts

Mostly UI-only:

- `01-public-floor-plan-renderer.md`
- `02-result-page-integration.md`
- `03-top-variants-selector.md`
- `04-why-this-plan-copy.md`
- `05-architect-brief-section.md`
- `06-confidence-professional-review.md`
- `08-ai-visual-inspiration.md`
- `09-responsive-premium-polish.md`

## Prompts that may affect data/contracts

Be more careful with:

- `05-architect-brief-section.md` — may touch `floorPlanResultPresenter` or `architectBriefGenerator`.
- `07-debug-admin-panel.md` — may touch public/debug data separation and feature flags.
- `08-ai-visual-inspiration.md` — may touch `visualInspirationPrompt` or presenter mapping.
- `10-tests-and-acceptance.md` — may update fixtures/contracts to make tests explicit.

## Safe refactors

Safe refactor candidates across prompts:

- Extract SVG helper functions inside `src/lib/architecture/svgRenderer.ts`.
- Improve label normalization in the renderer.
- Tighten `containsInternalScoreLeak` forbidden terms.
- Add component-level tests without changing public contracts.
- Improve Tailwind classes for spacing/responsiveness.

## Product boundary reminders

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

Dev/admin mode can show internals only inside a collapsible debug panel.

The public floor plan is conceptual. It must never claim to be construction-ready.
