import type { ArchitecturalProgram } from "./architecturalProgram";
import { hasLaundryZone, hasSemiOutdoorGalleryZone } from "./planMetadata";
import type { ScoredPlanVariant } from "./planScorer";
import type { ArchitecturalStrategy } from "./strategySelector";
import type { VisualInspirationPrompt } from "./floorPlanPipelineTypes";
import { detectPromptLanguage } from "./prioritySelection";

export type VisualInspirationParams = {
  program: ArchitecturalProgram;
  strategy: ArchitecturalStrategy;
  recommended: ScoredPlanVariant;
  userPrompt: string;
};

export function generateVisualInspirationPrompt(
  params: VisualInspirationParams,
): VisualInspirationPrompt {
  const lang = detectPromptLanguage(params.userPrompt);
  const { program, strategy, recommended } = params;
  const plan = recommended.plan;
  const hasGallery = hasSemiOutdoorGalleryZone(plan);
  const hasLaundry = hasLaundryZone(plan);
  const hasGrill = plan.furniture.some((f) => f.type === "grill");

  const styleTags = [
    "modern compact family home",
    "Latin American residential",
    "warm natural light",
    "architectural visualization",
    "conceptual mood board",
  ];

  if (strategy.preferredParti === "l_shape_patio") {
    styleTags.push("L-shaped house", "courtyard patio");
  }
  if (hasGallery) {
    styleTags.push("semi-covered gallery", "indoor-outdoor transition");
  }
  if (hasGrill) {
    styleTags.push("outdoor grill", "social patio");
  }
  if (hasLaundry) {
    styleTags.push("functional service core");
  }

  const partsEs = [
    "Visualización de inspiración (NO es plano de construcción) de una casa familiar compacta moderna en Argentina/Latinoamérica.",
    "Distribución en L con living-comedor integrado a cocina y fuerte conexión con patio social.",
    "Luz natural cálida, materiales contemporáneos (hormigón visto suave, madera, grandes aberturas).",
    `Concepto seleccionado: ${recommended.label}.`,
  ];
  if (hasGallery) {
    partsEs.push("Galería semi-cubierta entre el área social y el patio.");
  }
  if (hasGrill) {
    partsEs.push("Parrilla o zona de asado en el exterior.");
  }
  if (hasLaundry) {
    partsEs.push("Área de servicio discreta adosada a cocina.");
  }
  partsEs.push(
    `Ambiente: ${program.title}. Estrategia: ${strategy.reasons[0] ?? strategy.preferredParti}.`,
  );

  const partsEn = [
    "Inspiration render only (NOT a construction document) of a modern compact family home.",
    "L-shaped layout with integrated kitchen-living and strong social patio connection.",
    "Warm natural light, contemporary materials, large openings.",
    `Selected concept: ${recommended.label}.`,
  ];
  if (hasGallery) partsEn.push("Semi-covered gallery between social area and patio.");
  if (hasGrill) partsEn.push("Outdoor grill area.");
  if (hasLaundry) partsEn.push("Discrete service laundry near kitchen.");

  const prompt = (lang === "es" ? partsEs : partsEn).join(" ");

  const negativePrompt =
    lang === "es"
      ? "plano técnico, cotas, sección constructiva, detalle estructural, documento municipal, texto ilegible, distorsión extrema"
      : "technical floor plan, dimensions, construction detail, structural drawing, blueprint text, illegible labels, extreme distortion";

  const safetyNote =
    lang === "es"
      ? "Imagen de referencia estética únicamente. No sustituye proyecto ejecutivo ni validación profesional."
      : "Aesthetic reference image only. Does not replace executive design or professional validation.";

  return {
    prompt,
    negativePrompt,
    styleTags,
    safetyNote,
  };
}
