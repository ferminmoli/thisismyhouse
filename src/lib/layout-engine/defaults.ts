import type { ZoneType } from "@/lib/types";
import type { AspectRatioRange } from "./types";

/** Sane aspect ratio bounds per program type. */
export const DEFAULT_ASPECT_BY_TYPE: Record<ZoneType, AspectRatioRange> = {
  social: [0.75, 2.2],
  private: [0.65, 1.8],
  service: [0.55, 1.5],
  outdoor: [0.7, 2.5],
  flex: [0.4, 2.8],
  work: [0.6, 2],
};

export function resolveAspectRange(
  type: ZoneType,
  range?: AspectRatioRange,
): AspectRatioRange {
  const base = range ?? DEFAULT_ASPECT_BY_TYPE[type];
  const min = Math.max(0.35, Math.min(base[0], base[1]));
  const max = Math.max(min + 0.1, base[1]);
  return [min, max] as AspectRatioRange;
}
