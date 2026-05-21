import type { PlanQualityScores } from "@/lib/architectural-templates/plan-scoring";
import type { FloorplanLayoutResult } from "./types";

export function collectValidationFailures(
  scores: PlanQualityScores,
  layout: FloorplanLayoutResult,
): string[] {
  const failures: string[] = [];

  if (scores.compositeScore < 0.35) {
    failures.push(
      `composite_score_low:${Math.round(scores.compositeScore * 100)}`,
    );
  }
  if (scores.realismScore < 0.4) {
    failures.push(
      `realism_score_low:${Math.round(scores.realismScore * 100)}`,
    );
  }
  if (scores.circulationScore < 0.45) {
    failures.push("circulation_weak");
  }
  if (
    scores.patioConnectionScore < 0.5 &&
    layout.zones.some((z) => z.type === "outdoor")
  ) {
    failures.push("patio_connection_weak");
  }
  if (scores.compositionScore < 0.5) {
    failures.push("composition_weak");
  }
  if ((layout.templateMeta?.unmappedRooms.length ?? 0) > 0) {
    failures.push(
      `unmapped_rooms:${layout.templateMeta!.unmappedRooms.join(",")}`,
    );
  }
  for (const w of layout.warnings.slice(0, 5)) {
    failures.push(`layout_warning:${w}`);
  }

  return failures.length > 0 ? failures : ["quality_gate_failed"];
}
