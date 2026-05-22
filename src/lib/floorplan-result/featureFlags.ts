export type DebugVisibilityOptions = {
  isAdmin?: boolean;
  isDev?: boolean;
  forceDebug?: boolean;
};

/** Debug/scorer UI only for explicit dev or admin (not all local dev sessions). */
export function shouldShowFloorPlanDebug(
  options: DebugVisibilityOptions = {},
): boolean {
  if (options.forceDebug === true) return true;
  return options.isAdmin === true || options.isDev === true;
}

/** Dev/admin may enable the wall-graph experiment toggle in the UI. */
export function canUseWallGraphDebug(
  options: DebugVisibilityOptions = {},
): boolean {
  return shouldShowFloorPlanDebug(options);
}

export type WallGraphDebugOptions = DebugVisibilityOptions & {
  /** Explicit UI toggle — never on for normal users. */
  wallGraphDebug?: boolean;
};

/**
 * Thick wall graph + structural overlays — only when dev/admin AND toggle on.
 * Public hero plan always passes wallGraphDebug: false.
 */
export function isWallGraphDebugEnabled(
  options: WallGraphDebugOptions = {},
): boolean {
  if (!canUseWallGraphDebug(options)) return false;
  return options.wallGraphDebug === true;
}

/**
 * Arcada experimental renderer tab.
 * - Off when NEXT_PUBLIC_ENABLE_ARCADA_POC=false
 * - On when NEXT_PUBLIC_ENABLE_ARCADA_POC=true, NODE_ENV=development, or dev/admin
 */
export function isArcadaPocTabEnabled(
  options: DebugVisibilityOptions = {},
): boolean {
  const flag = process.env.NEXT_PUBLIC_ENABLE_ARCADA_POC;
  if (flag === "false") return false;
  if (flag === "true") return true;
  if (process.env.NODE_ENV === "development") return true;
  return shouldShowFloorPlanDebug(options);
}
