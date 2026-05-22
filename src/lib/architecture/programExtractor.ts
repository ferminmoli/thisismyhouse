import {
  ARCHITECTURAL_PROGRAM_DISCLAIMER,
  type ArchitecturalProgram,
  type LlmProgramExtractorResult,
} from "./architecturalProgram";
import { buildArchitecturalProgramPrompt } from "./programPrompt";

/** Respuesta cacheada — caso L 100 m², 3 dorm (sin geometría). */
function buildHardcodedProgram(userPrompt: string): ArchitecturalProgram {
  return {
    title: "Casa familiar compacta en L con patio",
    disclaimer: ARCHITECTURAL_PROGRAM_DISCLAIMER,
    inputSummary: userPrompt.trim() || "Casa familiar compacta de 100 m² en L",
    targetAreaM2: 100,
    floorCount: 1,
    rooms: [
      {
        id: "ACCESO",
        label: "Acceso",
        type: "circulation",
        required: true,
        priority: "high",
        idealAreaM2: 4,
      },
      {
        id: "SALA_COMEDOR",
        label: "Sala / comedor",
        type: "social",
        required: true,
        priority: "high",
        idealAreaM2: 24,
      },
      {
        id: "COCINA",
        label: "Cocina",
        type: "service",
        required: true,
        priority: "high",
        idealAreaM2: 11,
        notes: "Integrada al living",
      },
      {
        id: "DORMITORIO_PRINCIPAL",
        label: "Dormitorio principal",
        type: "private",
        required: true,
        priority: "high",
        idealAreaM2: 14,
      },
      {
        id: "DORMITORIO_2",
        label: "Dormitorio 2",
        type: "private",
        required: true,
        priority: "medium",
        idealAreaM2: 10,
      },
      {
        id: "DORMITORIO_3",
        label: "Dormitorio 3",
        type: "private",
        required: true,
        priority: "medium",
        idealAreaM2: 10,
      },
      {
        id: "BANIO",
        label: "Baño",
        type: "service",
        required: true,
        priority: "high",
        idealAreaM2: 5,
      },
      {
        id: "DISTRIBUIDOR",
        label: "Distribuidor",
        type: "circulation",
        required: true,
        priority: "medium",
        idealAreaM2: 7,
      },
      {
        id: "PATIO",
        label: "Patio",
        type: "outdoor",
        required: true,
        priority: "high",
        idealAreaM2: 10,
      },
    ],
    priorities: [
      "buena luz natural",
      "cocina integrada",
      "patio como expansión social",
      "dormitorios agrupados",
    ],
    lifestyle: ["familia", "vida al aire libre"],
    styleKeywords: ["compacta", "en L", "luminosa"],
    desiredPlanShape: "l_shape",
    site: {
      lotShape: "unknown",
      accessSide: "front",
      orientation: "unknown",
    },
    hardAdjacencies: [
      {
        from: "SALA_COMEDOR",
        to: "COCINA",
        reason: "Cocina integrada al área social",
        strength: "hard",
      },
      {
        from: "SALA_COMEDOR",
        to: "PATIO",
        reason: "Living conectado al exterior",
        strength: "hard",
      },
      {
        from: "DISTRIBUIDOR",
        to: "DORMITORIO_PRINCIPAL",
        reason: "Acceso íntimo al dormitorio principal",
        strength: "hard",
      },
      {
        from: "DISTRIBUIDOR",
        to: "DORMITORIO_2",
        reason: "Acceso íntimo al dormitorio 2",
        strength: "hard",
      },
      {
        from: "DISTRIBUIDOR",
        to: "DORMITORIO_3",
        reason: "Acceso íntimo al dormitorio 3",
        strength: "hard",
      },
      {
        from: "DISTRIBUIDOR",
        to: "BANIO",
        reason: "Baño desde circulación",
        strength: "hard",
      },
      {
        from: "ACCESO",
        to: "SALA_COMEDOR",
        reason: "Acceso principal claro hacia el área social",
        strength: "hard",
      },
    ],
    softAdjacencies: [
      {
        from: "BANIO",
        to: "COCINA",
        reason: "Núcleo húmedo cercano para eficiencia de instalaciones",
        strength: "soft",
      },
      {
        from: "COCINA",
        to: "PATIO",
        reason: "Salida de servicio y ventilación",
        strength: "soft",
      },
      {
        from: "DORMITORIO_PRINCIPAL",
        to: "BANIO",
        reason: "Suite cercana al baño",
        strength: "soft",
      },
    ],
    architectQuestions: [
      "¿La orientación solar del lote confirma living al frente?",
      "¿El patio debe ser más amplio que el living?",
    ],
    limitations: [
      "Programa conceptual sin geometría — el motor local ubica ambientes.",
    ],
  };
}

export type ExtractProgramOptions = {
  useMock?: boolean;
};

/**
 * Extrae programa arquitectónico desde el brief del usuario.
 * Siempre mock/cache por ahora — no llama a Gemini/OpenAI.
 */
export async function extractArchitecturalProgram(
  userPrompt: string,
  _options?: ExtractProgramOptions,
): Promise<LlmProgramExtractorResult> {
  const program = buildHardcodedProgram(userPrompt);
  const futurePrompt = buildArchitecturalProgramPrompt(userPrompt);

  return {
    program,
    mock: true,
    model: "hardcoded-program-v1",
    rawJson: JSON.stringify(program, null, 2),
    warnings: [
      "Modo mock activo — sin llamada a LLM.",
      `Prompt futuro preparado (${futurePrompt.length} caracteres).`,
    ],
  };
}
