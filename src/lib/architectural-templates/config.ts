/**
 * Motor experimental (grilla / treemap / BSP). Por defecto desactivado.
 * Activar: USE_EXPERIMENTAL_GRID_ENGINE=true en .env
 */
export function isExperimentalGridEngine(): boolean {
  const v =
    process.env.USE_EXPERIMENTAL_GRID_ENGINE ??
    process.env.NEXT_PUBLIC_USE_EXPERIMENTAL_GRID_ENGINE;
  return v === "true" || v === "1";
}
