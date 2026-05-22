export type DebugVisibilityOptions = {
  isAdmin?: boolean;
  isDev?: boolean;
  forceDebug?: boolean;
};

export function shouldShowFloorPlanDebug(
  options: DebugVisibilityOptions = {},
): boolean {
  if (options.forceDebug === true) return true;
  if (options.isAdmin === true) return true;
  if (options.isDev === true) return true;
  if (process.env.NEXT_PUBLIC_FLOOR_PLAN_DEBUG === "true") return true;
  if (process.env.NEXT_PUBLIC_PIPELINE_DEBUG === "true") return true;
  if (process.env.NODE_ENV === "development") return true;
  return false;
}
