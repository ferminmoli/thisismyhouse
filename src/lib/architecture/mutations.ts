import type { ArchitecturalProgram } from "./architecturalProgram";
import type {
  GeneratedPlan,
  GeneratedPlanValidation,
  RenderWindow,
} from "./generatedPlan";
import type { TopologyGraph } from "./topologyGraph";
import {
  computeMutationEffect,
  dedupeStrings,
  type MutationEffect,
} from "./mutationEffect";
import {
  clonePlan,
  findZoneByRoom,
  mirrorPlanHorizontal,
  normalizePlanAfterMutation,
  tryExpandZone,
  zonesOverlapAny,
} from "./planNormalize";
import { validateGeneratedPlan } from "./generatedPlanValidator";

export type MutationType =
  | "base"
  | "mirror_horizontal"
  | "expand_patio"
  | "expand_social"
  | "integrate_kitchen"
  | "compact_private_wing"
  | "larger_master_bedroom"
  | "gallery_patio"
  | "add_compact_laundry"
  | "add_laundry_as_kitchen_extension";

export type MutationStatus = "ok" | "warn" | "error" | "skipped";

export type PlanMutation = {
  type: MutationType;
  label: string;
  description: string;
  apply: (plan: GeneratedPlan) => MutationApplyOutcome;
};

export type MutatedPlanResult = {
  mutationType: MutationType;
  label: string;
  description: string;
  plan: GeneratedPlan;
  validation: GeneratedPlanValidation;
  status: MutationStatus;
  eligibleForRanking: boolean;
  messages: string[];
  effect: MutationEffect;
};

type MutationApplyOutcome = {
  plan: GeneratedPlan;
  skipped?: boolean;
  skipMessage?: string;
  applyNotes?: string[];
};

const MAX_OUTDOOR_ASPECT = 4;

function outdoorAspectOk(z: { width: number; height: number }): boolean {
  const aspect = Math.max(z.width, z.height) / Math.min(z.width, z.height);
  return aspect <= MAX_OUTDOOR_ASPECT;
}

function withMutationMeta(
  plan: GeneratedPlan,
  variantLabel: string,
  extraNotes: string[],
): GeneratedPlan {
  return {
    ...plan,
    variantLabel,
    metadata: {
      ...plan.metadata,
      notes: dedupeStrings([...plan.metadata.notes, ...extraNotes]),
      warnings: [],
    },
  };
}

function applyBase(plan: GeneratedPlan): MutationApplyOutcome {
  return {
    plan: withMutationMeta(clonePlan(plan), "Base equilibrada", [
      "Variante base sin mutación geométrica.",
    ]),
    applyNotes: ["Clon validado del plano base."],
  };
}

function applyMirrorHorizontal(plan: GeneratedPlan): MutationApplyOutcome {
  const mirrored = mirrorPlanHorizontal(clonePlan(plan));
  return {
    plan: withMutationMeta(mirrored, "Versión espejada", [
      "Plano reflejado horizontalmente (ancho 100).",
    ]),
    applyNotes: ["Geometría reflejada en eje vertical del canvas."],
  };
}

function applyExpandPatio(plan: GeneratedPlan): MutationApplyOutcome {
  const p = clonePlan(plan);
  const patio = findZoneByRoom(p.zones, "PATIO");
  if (!patio) {
    return { plan: p, skipped: true, skipMessage: "PATIO no encontrado en el template." };
  }

  const extra = 4;
  if (patio.y + patio.height + extra > 100) {
    return {
      plan: p,
      skipped: true,
      skipMessage: "Patio protagonista: sin margen inferior para agrandar.",
    };
  }

  const result = tryExpandZone(p.zones, "PATIO", { dh: extra });
  if (!result.ok) {
    return {
      plan: p,
      skipped: true,
      skipMessage: result.message ?? "Patio protagonista: expansión no segura.",
    };
  }

  return {
    plan: withMutationMeta(p, "Patio protagonista", [
      `Patio +${extra} en altura (más protagonismo exterior).`,
    ]),
    applyNotes: [`PATIO altura +${extra}.`],
  };
}

/** Expande living hacia abajo moviendo patio a la par (mantiene contacto social-patio). */
function applyExpandSocial(plan: GeneratedPlan): MutationApplyOutcome {
  const p = clonePlan(plan);
  const social = findZoneByRoom(p.zones, "SALA_COMEDOR");
  const patio = findZoneByRoom(p.zones, "PATIO");
  const kitchen = findZoneByRoom(p.zones, "COCINA");
  if (!social || !patio) {
    return {
      plan: p,
      skipped: true,
      skipMessage: "Área social más amplia: zonas SALA_COMEDOR o PATIO ausentes.",
    };
  }

  for (const delta of [2, 4]) {
    const trial = clonePlan(p);
    const s = findZoneByRoom(trial.zones, "SALA_COMEDOR")!;
    const pt = findZoneByRoom(trial.zones, "PATIO")!;
    const k = findZoneByRoom(trial.zones, "COCINA");

    const newSocialH = s.height + delta;
    const newPatioY = pt.y + delta;
    const newPatioH = pt.height - delta;
    const minPatioH = Math.ceil(pt.width / MAX_OUTDOOR_ASPECT);

    if (newPatioH < minPatioH) continue;
    if (newPatioY + newPatioH > 100) continue;
    if (s.y + newSocialH > newPatioY + 0.01) continue;

    s.height = newSocialH;
    pt.y = newPatioY;
    pt.height = newPatioH;
    if (k && k.y === s.y) {
      k.height = newSocialH;
    }

    if (!outdoorAspectOk(pt)) continue;
    if (zonesOverlapAny(trial.zones)) continue;

    const oldSocialH = social.height;
    const oldPatioY = patio.y;
    const oldPatioH = patio.height;
    Object.assign(social, s);
    Object.assign(patio, pt);
    if (kitchen && k) Object.assign(kitchen, k);

    return {
      plan: withMutationMeta(p, "Área social más amplia", [
        `SALA_COMEDOR +${delta} altura; PATIO desplazado manteniendo contacto.`,
      ]),
      applyNotes: [
        `SALA_COMEDOR altura ${oldSocialH}→${social.height}.`,
        `PATIO y ${oldPatioY}→${patio.y}, altura ${oldPatioH}→${patio.height}.`,
      ],
    };
  }

  return {
    plan: p,
    skipped: true,
    skipMessage:
      "Área social más amplia: no hay expansión vertical segura sin romper patio.",
  };
}

function applyIntegrateKitchen(plan: GeneratedPlan): MutationApplyOutcome {
  const p = clonePlan(plan);
  const notes = [
    "Cocina más integrada: paso abierto reforzado hacia living.",
  ];
  const cocina = findZoneByRoom(p.zones, "COCINA");
  if (cocina) {
    cocina.notes = "Integrada al living (mutación integrate_kitchen)";
  }
  return {
    plan: withMutationMeta(p, "Cocina más integrada", notes),
    applyNotes: ["Paso SALA_COMEDOR↔COCINA ampliado tras normalizar."],
  };
}

function applyLargerMasterBedroom(plan: GeneratedPlan): MutationApplyOutcome {
  const p = clonePlan(plan);
  const master = findZoneByRoom(p.zones, "DORMITORIO_PRINCIPAL");
  if (!master) {
    return {
      plan: p,
      skipped: true,
      skipMessage: "Dormitorio principal no encontrado.",
    };
  }

  const baseArea = master.width * master.height;
  const attempts: Array<{ dy?: number; dh?: number }> = [
    { dy: -2, dh: 4 },
    { dy: -2, dh: 2 },
    { dh: 4 },
    { dh: 2 },
  ];

  for (const delta of attempts) {
    const trial = clonePlan(p);
    const r = tryExpandZone(trial.zones, "DORMITORIO_PRINCIPAL", delta);
    if (!r.ok) continue;
    const expanded = findZoneByRoom(trial.zones, "DORMITORIO_PRINCIPAL")!;
    if (expanded.width * expanded.height <= baseArea) continue;
    Object.assign(master, expanded);
    return {
      plan: withMutationMeta(p, "Dormitorio principal más amplio", [
        `DORMITORIO_PRINCIPAL ampliado (${expanded.width}×${expanded.height}).`,
      ]),
      applyNotes: [
        `DORMITORIO_PRINCIPAL → y=${expanded.y}, h=${expanded.height}.`,
      ],
    };
  }

  return {
    plan: p,
    skipped: true,
    skipMessage:
      "Dormitorio principal ya está en el máximo seguro para este template.",
  };
}

const MIN_BED_W = 18;
const MIN_BED_H = 14;

function applyCompactPrivateWing(plan: GeneratedPlan): MutationApplyOutcome {
  return {
    plan: clonePlan(plan),
    skipped: true,
    skipMessage:
      "Ala privada compacta omitida: reducir dormitorios violaría mínimos (≥18×14 unidades canvas) o rompería contactos con distribuidor.",
  };
}

function applyAddLaundryAsKitchenExtension(
  plan: GeneratedPlan,
): MutationApplyOutcome {
  const p = clonePlan(plan);
  if (findZoneByRoom(p.zones, "LAVADERO")) {
    return {
      plan: p,
      skipped: true,
      skipMessage: "Lavadero en extensión de cocina: ya existe LAVADERO.",
    };
  }

  const cocina = findZoneByRoom(p.zones, "COCINA");
  const banio = findZoneByRoom(p.zones, "BANIO");
  if (!cocina) {
    return {
      plan: p,
      skipped: true,
      skipMessage: "Lavadero en extensión de cocina: COCINA no encontrada.",
    };
  }

  const laundryW = 10;
  const laundryH = 8;
  if (cocina.height - laundryH < 12) {
    return {
      plan: p,
      skipped: true,
      skipMessage:
        "Lavadero en extensión de cocina: cocina demasiado baja para ceder franja al lavadero.",
    };
  }

  cocina.height -= laundryH;

  const laundryX = cocina.x + Math.min(4, Math.max(2, cocina.width - laundryW - 2));
  const laundryY = cocina.y + cocina.height;

  const laundryZone = {
    id: "zone_LAVADERO",
    label: "Lavadero",
    type: "service" as const,
    x: laundryX,
    y: laundryY,
    width: laundryW,
    height: laundryH,
    sourceRoomId: "LAVADERO",
    slotId: "laundry_kitchen_extension",
    priority: "medium" as const,
    notes: "Franja de lavadero bajo cocina, orientada a patio/exterior.",
  };

  const trial = [...p.zones, laundryZone];
  if (zonesOverlapAny(trial)) {
    return {
      plan: p,
      skipped: true,
      skipMessage:
        "Lavadero en extensión de cocina: solape con zonas existentes.",
    };
  }

  p.zones = trial;

  const laundryWindow: RenderWindow = {
    id: "window_lavadero_patio",
    zoneId: "LAVADERO",
    wall: "bottom",
    position: 50,
    width: 6,
    size: "small",
    reason: "Ventilación natural del lavadero hacia banda exterior/patio",
  };
  p.windows = [...p.windows, laundryWindow];

  return {
    plan: withMutationMeta(p, "Lavadero en extensión de cocina", [
      "Lavadero adosado a cocina en núcleo húmedo compacto.",
      "Ventana pequeña en muro inferior hacia exterior.",
      "No altera adjacencia living-patio.",
    ]),
    applyNotes: [
      `LAVADERO ${laundryW}×${laundryH} adosado al muro izquierdo de COCINA.`,
      "Ventana de ventilación en LAVADERO.",
    ],
  };
}

function applyAddCompactLaundry(plan: GeneratedPlan): MutationApplyOutcome {
  const p = clonePlan(plan);
  if (findZoneByRoom(p.zones, "LAVADERO")) {
    return {
      plan: p,
      skipped: true,
      skipMessage: "Lavadero compacto: ya existe zona LAVADERO.",
    };
  }

  const laundryZone = {
    id: "zone_LAVADERO",
    label: "Lavadero",
    type: "service" as const,
    x: 76,
    y: 64,
    width: 8,
    height: 10,
    sourceRoomId: "LAVADERO",
    slotId: "laundry_compact",
    priority: "medium" as const,
    notes: "Lavadero compacto agregado por warning de casa familiar.",
  };

  const trial = [...p.zones, laundryZone];
  if (zonesOverlapAny(trial)) {
    return {
      plan: p,
      skipped: true,
      skipMessage:
        "Lavadero compacto: no hay espacio libre junto a cocina sin solapes.",
    };
  }

  if (
    laundryZone.x + laundryZone.width > 100 ||
    laundryZone.y + laundryZone.height > 100
  ) {
    return {
      plan: p,
      skipped: true,
      skipMessage: "Lavadero compacto: fuera de canvas.",
    };
  }

  p.zones = trial;

  return {
    plan: withMutationMeta(p, "Lavadero compacto", [
      "Lavadero compacto junto al núcleo húmedo (cocina/baño).",
      "No se cuenta como área exterior.",
    ]),
    applyNotes: [
      "Zona LAVADERO service 8×10 junto a cocina.",
      "Soft: LAVADERO ↔ COCINA, LAVADERO ↔ BANIO.",
    ],
  };
}

function applyGalleryPatio(plan: GeneratedPlan): MutationApplyOutcome {
  const p = clonePlan(plan);
  const social = findZoneByRoom(p.zones, "SALA_COMEDOR");
  const patio = findZoneByRoom(p.zones, "PATIO");
  if (!social || !patio) {
    return {
      plan: p,
      skipped: true,
      skipMessage: "Patio con galería: faltan SALA_COMEDOR o PATIO.",
    };
  }

  const galleryH = 4;
  const socialBottom = social.y + social.height;
  if (Math.abs(socialBottom - patio.y) > 1) {
    return {
      plan: p,
      skipped: true,
      skipMessage:
        "Patio con galería: transición social-patio no alineada para insertar galería.",
    };
  }

  if (social.height - galleryH < 20) {
    return {
      plan: p,
      skipped: true,
      skipMessage:
        "Patio con galería: living demasiado bajo para ceder altura a galería sin romper proporciones.",
    };
  }

  social.height -= galleryH;

  const galleryZone = {
    id: "zone_GALERIA",
    label: "Galería",
    type: "semi_outdoor" as const,
    x: social.x,
    y: social.y + social.height,
    width: social.width,
    height: galleryH,
    sourceRoomId: "GALERIA",
    slotId: "gallery_transition",
    priority: "medium" as const,
    notes: "Transición semi-cubierta living-patio",
  };

  p.zones = [...p.zones, galleryZone];

  const notes = [
    "Galería semi-cubierta entre living y patio (zona GALERIA).",
    "Patio no se cuenta como área cubierta.",
  ];

  return {
    plan: withMutationMeta(p, "Patio con galería", notes),
    applyNotes: [
      `Zona GALERIA semi_outdoor ${galleryH}u entre living y patio.`,
      "SALA_COMEDOR y PATIO mantienen contacto vía galería.",
    ],
  };
}

export const PLAN_MUTATIONS: PlanMutation[] = [
  {
    type: "base",
    label: "Base equilibrada",
    description: "Planta curada original sin alteraciones.",
    apply: applyBase,
  },
  {
    type: "mirror_horizontal",
    label: "Versión espejada",
    description: "Reflejo horizontal para probar orientación de lote.",
    apply: applyMirrorHorizontal,
  },
  {
    type: "expand_patio",
    label: "Patio protagonista",
    description: "Patio más alto y presente en la composición.",
    apply: applyExpandPatio,
  },
  {
    type: "expand_social",
    label: "Área social más amplia",
    description: "Amplía living hacia patio manteniendo adjacencias.",
    apply: applyExpandSocial,
  },
  {
    type: "integrate_kitchen",
    label: "Cocina más integrada",
    description: "Refuerza el paso abierto cocina-living.",
    apply: applyIntegrateKitchen,
  },
  {
    type: "larger_master_bedroom",
    label: "Dormitorio principal más amplio",
    description: "Amplía el dormitorio principal si hay margen.",
    apply: applyLargerMasterBedroom,
  },
  {
    type: "gallery_patio",
    label: "Patio con galería",
    description: "Anotación y hints de galería en transición exterior.",
    apply: applyGalleryPatio,
  },
  {
    type: "add_compact_laundry",
    label: "Lavadero compacto",
    description: "Agrega lavadero de servicio junto al núcleo húmedo.",
    apply: applyAddCompactLaundry,
  },
  {
    type: "add_laundry_as_kitchen_extension",
    label: "Lavadero en extensión de cocina",
    description:
      "Lavadero adosado a cocina con ventilación, sin dispersar el núcleo húmedo.",
    apply: applyAddLaundryAsKitchenExtension,
  },
  {
    type: "compact_private_wing",
    label: "Ala privada compacta",
    description: "Omitida: template en mínimos seguros.",
    apply: applyCompactPrivateWing,
  },
];

export const DEFAULT_MUTATION_TYPES: MutationType[] = [
  "base",
  "mirror_horizontal",
  "expand_patio",
  "expand_social",
  "integrate_kitchen",
  "larger_master_bedroom",
  "gallery_patio",
  "add_compact_laundry",
  "add_laundry_as_kitchen_extension",
  "compact_private_wing",
];

export function statusFromValidation(
  validation: GeneratedPlanValidation,
): "ok" | "warn" | "error" {
  if (validation.errors.length > 0) return "error";
  if (validation.warnings.length > 0) return "warn";
  return "ok";
}

function resolveMutationStatus(
  skipped: boolean,
  effect: MutationEffect,
  validation: GeneratedPlanValidation,
): MutationStatus {
  if (skipped || !effect.changed) return "skipped";
  const v = statusFromValidation(validation);
  if (v === "error") return "error";
  if (v === "warn") return "warn";
  return "ok";
}

function eligibleForRanking(status: MutationStatus): boolean {
  return status === "ok";
}

function buildVariantMessages(
  validation: GeneratedPlanValidation,
  effect: MutationEffect,
  skipMessage?: string,
): string[] {
  return dedupeStrings([
    ...(skipMessage ? [skipMessage] : []),
    ...validation.errors,
    ...validation.warnings,
    ...effect.notes,
  ]);
}

function reinforceKitchenPassage(plan: GeneratedPlan): GeneratedPlan {
  const door = plan.doors.find(
    (d) =>
      (d.from === "SALA_COMEDOR" && d.to === "COCINA") ||
      (d.to === "SALA_COMEDOR" && d.from === "COCINA"),
  );
  if (door) {
    door.width = Math.max(door.width, 14);
    door.type = "open_passage";
  }
  return plan;
}

export function applyMutationPipeline(
  basePlan: GeneratedPlan,
  topologyGraph: TopologyGraph,
  mutation: PlanMutation,
  program?: ArchitecturalProgram,
): MutatedPlanResult {
  const source = clonePlan(basePlan);
  const outcome = mutation.apply(source);

  let workingPlan: GeneratedPlan;
  let skipped = Boolean(outcome.skipped);

  if (skipped) {
    workingPlan = withMutationMeta(
      clonePlan(basePlan),
      mutation.label,
      outcome.skipMessage ? [outcome.skipMessage] : [],
    );
  } else {
    workingPlan = outcome.plan;
  }

  let normalized = normalizePlanAfterMutation(
    workingPlan,
    topologyGraph,
    mutation.label,
  );

  if (mutation.type === "integrate_kitchen" && !skipped) {
    normalized = reinforceKitchenPassage(normalized);
  }

  const validation = validateGeneratedPlan(normalized, {
    topologyGraph,
    program: program ?? undefined,
  });
  const effect = computeMutationEffect(
    basePlan,
    normalized,
    dedupeStrings([
      ...(outcome.applyNotes ?? []),
      ...(outcome.skipMessage && skipped ? [outcome.skipMessage] : []),
    ]),
  );

  if (!skipped && !effect.changed) {
    skipped = true;
    normalized = normalizePlanAfterMutation(
      withMutationMeta(clonePlan(basePlan), mutation.label, [
        "Mutación sin cambios efectivos; se conserva geometría base.",
      ]),
      topologyGraph,
      mutation.label,
    );
  }

  const status = resolveMutationStatus(skipped, effect, validation);
  let finalEffect: MutationEffect = skipped
    ? {
        changed: false,
        changedZones: [],
        changedDoors: [],
        changedWindows: [],
        changedFurniture: [],
        notes: dedupeStrings([
          outcome.skipMessage ?? "Mutación omitida sin cambios.",
        ]),
      }
    : effect;

  if (mutation.type === "base" && !skipped) {
    finalEffect = {
      ...finalEffect,
      changed: false,
      changedZones: [],
      changedDoors: [],
      changedWindows: [],
      changedFurniture: [],
    };
  }
  const messages = buildVariantMessages(
    validation,
    finalEffect,
    skipped ? outcome.skipMessage : undefined,
  );

  return {
    mutationType: mutation.type,
    label: mutation.label,
    description: mutation.description,
    plan: normalized,
    validation,
    status,
    eligibleForRanking: eligibleForRanking(status),
    messages,
    effect: finalEffect,
  };
}

export type { MutationEffect } from "./mutationEffect";
