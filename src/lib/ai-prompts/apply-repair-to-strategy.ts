import type { LayoutStrategySpec } from "./layout-strategies";
import { templateVariantFromStrategyId } from "./layout-strategies";
import type { RepairInstructionsOutput } from "./repair-instructions-types";
import type { TemplateVariantId } from "@/lib/architectural-templates/template-variants";

const VARIANT_HINTS: Record<string, TemplateVariantId> = {
  default: "default",
  patio_wide: "patio_wide",
  patio: "patio_wide",
  kitchen_integrated: "kitchen_integrated",
  kitchen: "kitchen_integrated",
  privacy_strong: "privacy_strong",
  privacy: "privacy_strong",
  social_generous: "social_generous",
  social: "social_generous",
};

function variantFromHints(hints: string[]): TemplateVariantId | undefined {
  for (const h of hints) {
    const key = h.toLowerCase().replace(/\s+/g, "_");
    for (const [needle, id] of Object.entries(VARIANT_HINTS)) {
      if (key.includes(needle)) return id;
    }
  }
  return undefined;
}

function bumpStrategy(
  strategy: LayoutStrategySpec,
  repair: RepairInstructionsOutput,
): LayoutStrategySpec {
  const adj = { ...strategy.priorityAdjustments };
  for (const a of repair.areaAdjustments) {
    const z = a.zoneId.toLowerCase();
    const delta = a.change === "increase" ? 1 : a.change === "decrease" ? -1 : 0;
    if (delta === 0) continue;
    if (z.includes("living") || z.includes("social")) {
      adj.socialAreaBias = Math.max(-2, Math.min(2, adj.socialAreaBias + delta));
    }
    if (z.includes("patio") || z.includes("outdoor")) {
      adj.patioAreaBias = Math.max(-2, Math.min(2, adj.patioAreaBias + delta));
    }
    if (z.includes("bed") || z.includes("private")) {
      adj.privateAreaBias = Math.max(-2, Math.min(2, adj.privateAreaBias + delta));
    }
    if (z.includes("circ") || z.includes("distrib")) {
      adj.circulationBias = Math.max(-2, Math.min(2, adj.circulationBias + delta));
    }
  }
  const extraAvoid = repair.adjacencyAdjustments
    .filter((a) => a.change === "avoid")
    .map((a) => `${a.from}↔${a.to}`);
  return {
    ...strategy,
    priorityAdjustments: adj,
    avoid: [...strategy.avoid, ...extraAvoid].slice(0, 8),
    description: `${strategy.description} (ajuste reparación)`,
  };
}

export type AppliedRepair = {
  strategy: LayoutStrategySpec;
  variantId: TemplateVariantId;
};

export function applyRepairToStrategy(
  strategy: LayoutStrategySpec,
  repair: RepairInstructionsOutput,
  failures: string[],
): AppliedRepair {
  let variantId =
    variantFromHints(repair.templateHints) ??
    templateVariantFromStrategyId(strategy.id);

  if (failures.some((f) => f.includes("patio"))) {
    variantId = "patio_wide";
  } else if (failures.some((f) => f.includes("circulation"))) {
    variantId = "default";
  } else if (failures.some((f) => f.includes("composition"))) {
    variantId = "social_generous";
  } else if (failures.some((f) => f.includes("realism") || f.includes("unmapped"))) {
    variantId = "privacy_strong";
  }

  if (repair.repairPriority === "high" && repair.strategyAdjustments.length > 0) {
    const hint = repair.strategyAdjustments.join(" ").toLowerCase();
    if (hint.includes("patio")) variantId = "patio_wide";
    if (hint.includes("compact") || hint.includes("privacy")) {
      variantId = "privacy_strong";
    }
    if (hint.includes("kitchen") || hint.includes("wet")) {
      variantId = "kitchen_integrated";
    }
  }

  return {
    strategy: bumpStrategy(strategy, repair),
    variantId,
  };
}
