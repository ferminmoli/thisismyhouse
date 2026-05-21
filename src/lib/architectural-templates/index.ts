export { isExperimentalGridEngine } from "./config";
export {
  ARCHITECTURAL_TEMPLATES,
  L_SHAPE_FAMILY_3BED,
  TEMPLATE_BY_ID,
} from "./architecturalTemplates";
export { applyTemplateLayout } from "./apply-template-layout";
export { mapProgramToTemplate } from "./map-program-to-template";
export { selectArchitecturalTemplate } from "./select-template";
export { validateTemplateLayout } from "./validate-template-layout";
export type {
  ArchitecturalTemplate,
  TemplateLayoutMeta,
  TemplateMappingResult,
  TemplateSelectionResult,
  TemplateSlot,
} from "./types";
