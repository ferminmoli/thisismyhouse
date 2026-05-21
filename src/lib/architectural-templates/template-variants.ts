import type { ArchitecturalTemplate } from "./types";

export type TemplateVariantId =
  | "default"
  | "patio_wide"
  | "kitchen_integrated"
  | "privacy_strong"
  | "social_generous";

export type TemplateVariantSpec = {
  id: TemplateVariantId;
  label: string;
  description: string;
};

const L_SHAPE_VARIANTS: TemplateVariantSpec[] = [
  { id: "default", label: "Equilibrada", description: "Composición base familiar" },
  { id: "patio_wide", label: "Patio amplio", description: "Más aire exterior" },
  { id: "kitchen_integrated", label: "Cocina integrada", description: "Social + cocina más fluidos" },
  { id: "social_generous", label: "Social generoso", description: "Living más amplio" },
  { id: "privacy_strong", label: "Privacidad", description: "Dormitorios más compactos, living amplio" },
];

export function variantsForTemplate(templateId: string): TemplateVariantSpec[] {
  if (templateId === "l_shape_family_3bed") return L_SHAPE_VARIANTS;
  if (templateId === "compact_2bed_patio") {
    return [
      { id: "default", label: "Equilibrada", description: "Base 2 dorm" },
      { id: "patio_wide", label: "Patio amplio", description: "Patio dominante" },
      { id: "social_generous", label: "Social generoso", description: "Living expandido" },
    ];
  }
  return [{ id: "default", label: "Estándar", description: "Plantilla base" }];
}

function adjustSlot(
  template: ArchitecturalTemplate,
  slotId: string,
  delta: Partial<{ x: number; y: number; width: number; height: number }>,
): void {
  const slot = template.slots.find((s) => s.slotId === slotId);
  if (!slot) return;
  if (delta.x != null) slot.x += delta.x;
  if (delta.y != null) slot.y += delta.y;
  if (delta.width != null) slot.width += delta.width;
  if (delta.height != null) slot.height += delta.height;
}

/** Clona plantilla y aplica micro-variación (geometría curada, no packing). */
export function applyTemplateVariant(
  base: ArchitecturalTemplate,
  variantId: TemplateVariantId,
): ArchitecturalTemplate {
  const template: ArchitecturalTemplate = {
    ...base,
    slots: base.slots.map((s) => ({ ...s })),
    defaultDoors: [...base.defaultDoors],
    defaultWindows: [...base.defaultWindows],
    furnitureHints: [...base.furnitureHints],
    hardAdjacencies: [...base.hardAdjacencies],
    softAdjacencies: [...base.softAdjacencies],
  };

  if (variantId === "default") return template;

  if (base.id === "l_shape_family_3bed") {
    switch (variantId) {
      case "patio_wide":
        adjustSlot(template, "patio", { height: 16, y: -8 });
        adjustSlot(template, "social_main", { height: -8 });
        break;
      case "kitchen_integrated":
        adjustSlot(template, "kitchen", { width: 12, x: -6 });
        adjustSlot(template, "social_main", { width: 12 });
        break;
      case "social_generous":
        adjustSlot(template, "social_main", { width: 20, height: 8 });
        adjustSlot(template, "kitchen", { width: -12, x: 12 });
        break;
      case "privacy_strong":
        adjustSlot(template, "private_bed_1", { width: -8 });
        adjustSlot(template, "private_bed_2", { width: -8 });
        adjustSlot(template, "social_main", { width: 16, height: 6 });
        break;
    }
  }

  if (base.id === "compact_2bed_patio" && variantId === "patio_wide") {
    adjustSlot(template, "patio", { height: 24 });
    adjustSlot(template, "social_main", { height: -16, y: 16 });
  }

  return template;
}

export function variantFromSeed(
  templateId: string,
  layoutSeed: number,
): TemplateVariantId {
  const variants = variantsForTemplate(templateId);
  const idx = (layoutSeed - 1) % variants.length;
  return variants[idx]?.id ?? "default";
}
