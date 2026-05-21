import type {
  ArchitecturalProgram,
  ProgramZoneType,
} from "@/lib/architectural-program/types";
import type { PlanQualityScores } from "@/lib/architectural-templates/plan-scoring";
import type { TemplateLayoutMeta } from "@/lib/architectural-templates/types";
import type { PlanShape, UserPreferences } from "@/lib/onboarding/user-preferences";

export type LayoutRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LotContainer = LayoutRect & {
  shape: PlanShape;
  /** Área habitable real (px²); en L excluye el vacío del cuadrante. */
  buildableAreaPx?: number;
};

export type LotMask = {
  shape: PlanShape;
  bbox: LayoutRect;
  cols: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  buildable: boolean[][];
  buildableCellCount: number;
  voidCells: Array<{ col: number; row: number }>;
  /** Superficie objetivo del programa (m²). */
  targetTotalAreaM2: number;
  /** m² reales por celda: targetTotalAreaM2 / buildableCellCount. */
  m2PerCell: number;
};

export type PlacedZoneRect = {
  id: string;
  label: string;
  type: ProgramZoneType;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FloorplanLayoutResult = {
  zones: PlacedZoneRect[];
  container: LotContainer;
  warnings: string[];
  /** Suma de áreas px² vs área habitable del lote (~1). */
  fillRatio: number;
  /** Presente cuando shape === l_shape (grilla restringida). */
  mask?: LotMask;
  /** Mapa celda → zoneId; garantiza cero solapes en L. */
  cellOccupancy?: Record<string, string>;
  /** Escala para cotas exteriores (px por metro). */
  pxPerMeter?: number;
  /** Metadatos del motor por plantillas (debug / sidebar). */
  templateMeta?: TemplateLayoutMeta;
  /** Puntuación de calidad arquitectónica (0–1). */
  planScores?: PlanQualityScores;
};

export type FloorplanLayoutInput = {
  program: ArchitecturalProgram;
  planShape: PlanShape;
  preferences?: UserPreferences;
};
