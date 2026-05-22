import type { PlanLayout } from "./types";

/** Light dot grid behind the plan — drafting-board feel. */
export function renderDraftingBackground(layout: PlanLayout): string {
  const { planAreaX, planAreaY, planAreaW, planAreaH } = layout;
  return (
    `<g id="drafting-background" pointer-events="none">` +
    `<rect x="${planAreaX}" y="${planAreaY}" width="${planAreaW}" height="${planAreaH}" fill="#FAFAF9"/>` +
    `<rect x="${planAreaX}" y="${planAreaY}" width="${planAreaW}" height="${planAreaH}" fill="url(#arch-pat-dots)"/>` +
    `</g>`
  );
}
