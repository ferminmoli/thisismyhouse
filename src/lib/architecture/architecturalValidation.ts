import type { ArchitecturalProgram } from "./architecturalProgram";
import type {
  GeneratedPlan,
  ArchitecturalValidationIssue,
} from "./generatedPlan";
import type { TopologyGraph } from "./topologyGraph";
import { findZoneByRoom } from "./planNormalize";
import {
  galleryModeledAsFurniture,
  hasSemiOutdoorGalleryZone,
  patioMiscountedAsCovered,
} from "./planMetadata";
import {
  isBedroomRoom,
  isCoveredSpace,
  isFamilyHouseProgram,
  isOutdoorSpace,
  isWetServiceRoom,
  zoneCanvasArea,
} from "./spaceClassification";
import {
  analyzeZoneAdjacency,
  hasRealSharedWall,
  MIN_SHARED_WALL_LENGTH,
} from "./zoneGeometry";

const MAX_BEDROOM_ASPECT = 2.2;
const MAX_CIRCULATION_SHARE = 0.22;
const MIN_CIRCULATION_SHARE = 0.04;

function norm(id: string): string {
  return id.trim().toUpperCase();
}

function hasWindow(plan: GeneratedPlan, roomId: string): boolean {
  const n = norm(roomId);
  return plan.windows.some((w) => norm(w.zoneId) === n);
}

function doorBetween(plan: GeneratedPlan, from: string, to: string) {
  const a = norm(from);
  const b = norm(to);
  return plan.doors.find(
    (d) =>
      (norm(d.from) === a && norm(d.to) === b) ||
      (norm(d.from) === b && norm(d.to) === a),
  );
}

function pushIssue(
  issues: ArchitecturalValidationIssue[],
  issue: ArchitecturalValidationIssue,
) {
  issues.push(issue);
}

export function validateArchitecturalDesign(
  plan: GeneratedPlan,
  program: ArchitecturalProgram,
  topologyGraph: TopologyGraph,
  hardAdjacencyChecks: import("./generatedPlan").HardAdjacencyGeometryCheck[] = [],
): ArchitecturalValidationIssue[] {
  const issues: ArchitecturalValidationIssue[] = [];
  const hardChecks = hardAdjacencyChecks;

  const attachChecks = (checks: typeof hardChecks) => {
    for (const c of checks) {
      if (!c.satisfied) {
        pushIssue(issues, {
          code: "HARD_ADJACENCY_UNSATISFIED",
          severity: "warning",
          affectedRoomIds: [c.from, c.to],
          message: `Hard adjacency ${c.from} ↔ ${c.to} not satisfied in geometry.`,
          suggestion: "Adjust zone layout or door placement to share a real wall segment.",
        });
      }
    }
  };
  attachChecks(hardChecks);

  if (isFamilyHouseProgram(program.rooms)) {
    const hasLaundry =
      program.rooms.some((r) => /LAVADERO|LAVANDER/i.test(r.id)) ||
      plan.zones.some((z) => /LAVADERO|LAVANDER/i.test(z.sourceRoomId));
    if (!hasLaundry) {
      pushIssue(issues, {
        code: "MISSING_LAUNDRY_FAMILY_HOME",
        severity: "warning",
        affectedRoomIds: ["COCINA"],
        message:
          "Family house program has no dedicated laundry (lavadero) zone.",
        suggestion:
          "Add a laundry or washing space near the wet core (kitchen/bath).",
      });
    }
  }

  const cocina = findZoneByRoom(plan.zones, "COCINA");
  const banio = findZoneByRoom(plan.zones, "BANIO");
  if (cocina && banio) {
    const geo = analyzeZoneAdjacency(cocina, banio);
    const distScore =
      Math.abs(cocina.x - banio.x) + Math.abs(cocina.y - banio.y);
    if (!geo.touches && distScore > 45) {
      pushIssue(issues, {
        code: "WET_CORE_TOO_DISTANT",
        severity: "warning",
        affectedRoomIds: ["COCINA", "BANIO"],
        message: "Bathroom is far from the kitchen wet service cluster.",
        suggestion:
          "Place bath and kitchen closer to reduce plumbing runs.",
      });
    }
  }

  for (const z of plan.zones) {
    if (isBedroomRoom(z.sourceRoomId, z.type)) {
      const aspect =
        Math.max(z.width, z.height) / Math.min(z.width, z.height);
      if (aspect > MAX_BEDROOM_ASPECT) {
        pushIssue(issues, {
          code: "BEDROOM_ASPECT_RATIO_HIGH",
          severity: "warning",
          affectedRoomIds: [z.sourceRoomId],
          message: `${z.label} is too elongated for comfortable furniture layout.`,
          suggestion:
            "Review proportions or adjust the private wing layout.",
        });
      }
    }

    if (isCoveredSpace(z.type) && !isOutdoorSpace(z.type)) {
      if (!hasWindow(plan, z.sourceRoomId) && z.type !== "circulation") {
        const sev =
          z.type === "service" && /BANIO|BAÑO/i.test(z.sourceRoomId)
            ? "warning"
            : "warning";
        pushIssue(issues, {
          code: "ROOM_WITHOUT_NATURAL_VENTILATION",
          severity: sev,
          affectedRoomIds: [z.sourceRoomId],
          message: `${z.label} has no window for natural ventilation.`,
          suggestion: "Add a window on an exterior wall where possible.",
        });
      }
    }
  }

  const social = findZoneByRoom(plan.zones, "SALA_COMEDOR");
  const patio = findZoneByRoom(plan.zones, "PATIO");
  if (social && patio) {
    const socialPatioCheck = hardChecks.find(
      (c) =>
        (norm(c.from) === "SALA_COMEDOR" && norm(c.to) === "PATIO") ||
        (norm(c.from) === "PATIO" && norm(c.to) === "SALA_COMEDOR"),
    );
    const door = doorBetween(plan, "SALA_COMEDOR", "PATIO");
    if (!socialPatioCheck?.satisfied && !door) {
      pushIssue(issues, {
        code: "SOCIAL_WITHOUT_EXTERIOR_CONNECTION",
        severity: "warning",
        affectedRoomIds: ["SALA_COMEDOR", "PATIO"],
        message: "Living/dining lacks a strong connection to outdoor space.",
        suggestion:
          "Ensure sliding or open passage to patio with shared wall.",
      });
    }
  }

  for (const edge of topologyGraph.edges.filter((e) => e.strength === "hard")) {
    const a = norm(edge.from);
    const b = norm(edge.to);
    const za = findZoneByRoom(plan.zones, a);
    const zb = findZoneByRoom(plan.zones, b);
    if (!za || !zb) continue;
    if (
      isBedroomRoom(a, za.type) &&
      (b === "SALA_COMEDOR" || zb.type === "social")
    ) {
      const geo = analyzeZoneAdjacency(za, zb);
      if (geo.touches && geo.overlapLength >= 4) {
        pushIssue(issues, {
          code: "BEDROOM_ACCESSED_FROM_SOCIAL",
          severity: "warning",
          affectedRoomIds: [a, b],
          message: `Private room ${a} shares direct wall with social area.`,
          suggestion:
            "Route bedroom access through distributor, not from living.",
        });
      }
    }
  }

  const coveredTotal = plan.zones
    .filter((z) => isCoveredSpace(z.type))
    .reduce((s, z) => s + zoneCanvasArea(z), 0);
  const circ = plan.zones
    .filter((z) => z.type === "circulation")
    .reduce((s, z) => s + zoneCanvasArea(z), 0);
  if (coveredTotal > 0) {
    const share = circ / coveredTotal;
    if (share > MAX_CIRCULATION_SHARE) {
      pushIssue(issues, {
        code: "CIRCULATION_TOO_LARGE",
        severity: "info",
        affectedRoomIds: ["DISTRIBUIDOR", "ACCESO"],
        message: "Circulation area is large relative to covered program.",
        suggestion: "Compact hallways if buildable area is tight.",
      });
    }
    if (share < MIN_CIRCULATION_SHARE) {
      pushIssue(issues, {
        code: "CIRCULATION_TOO_SMALL",
        severity: "info",
        affectedRoomIds: ["DISTRIBUIDOR"],
        message: "Very little dedicated circulation area.",
        suggestion: "Ensure distributor width allows comfortable passage.",
      });
    }
  }

  if (
    program.priorities.some((p) => /luz natural/i.test(p)) &&
    program.site.orientation === "unknown"
  ) {
    pushIssue(issues, {
      code: "DAYLIGHT_ORIENTATION_UNKNOWN",
      severity: "info",
      affectedRoomIds: ["SALA_COMEDOR"],
      message:
        "Daylight is a stated priority but site orientation is unknown.",
      suggestion:
        "Confirm solar orientation before trusting daylight scores.",
    });
  }

  if (patioMiscountedAsCovered(plan)) {
    pushIssue(issues, {
      code: "PATIO_COUNTED_AS_COVERED",
      severity: "error",
      affectedRoomIds: ["PATIO"],
      message: "Patio must not be classified as covered area.",
      suggestion: "Set PATIO zone type to outdoor.",
    });
  }

  if (galleryModeledAsFurniture(plan) && !hasSemiOutdoorGalleryZone(plan)) {
    pushIssue(issues, {
      code: "GALLERY_MODELED_AS_FURNITURE",
      severity: "warning",
      affectedRoomIds: ["PATIO"],
      message: "Gallery transition modeled as furniture instead of semi_outdoor zone.",
      suggestion: "Use a GALERIA semi_outdoor zone between living and patio.",
    });
  }

  const wetRooms = plan.zones.filter((z) => isWetServiceRoom(z.sourceRoomId));
  const cocinaZone = findZoneByRoom(plan.zones, "COCINA");
  const lavaderoZone = findZoneByRoom(plan.zones, "LAVADERO");

  if (wetRooms.length >= 2) {
    let maxDist = 0;
    for (let i = 0; i < wetRooms.length; i++) {
      for (let j = i + 1; j < wetRooms.length; j++) {
        const a = wetRooms[i]!;
        const b = wetRooms[j]!;
        const pairIsLaundryBath =
          (/LAVADERO|LAVANDER/i.test(a.sourceRoomId) &&
            /BANIO|BAÑO/i.test(b.sourceRoomId)) ||
          (/LAVADERO|LAVANDER/i.test(b.sourceRoomId) &&
            /BANIO|BAÑO/i.test(a.sourceRoomId));
        if (pairIsLaundryBath && cocinaZone && lavaderoZone) {
          const geo = analyzeZoneAdjacency(cocinaZone, lavaderoZone);
          if (hasRealSharedWall(geo, MIN_SHARED_WALL_LENGTH)) {
            continue;
          }
        }
        const d = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        maxDist = Math.max(maxDist, d);
      }
    }
    if (maxDist > 50) {
      pushIssue(issues, {
        code: "WET_ROOMS_TOO_FAR",
        severity: "warning",
        affectedRoomIds: wetRooms.map((z) => z.sourceRoomId),
        message: "Wet rooms are spread apart; plumbing efficiency may suffer.",
        suggestion: "Group kitchen, bath, and laundry in a compact wet core.",
      });
    }
  }

  return issues;
}

export function issuesToValidationStrings(
  issues: ArchitecturalValidationIssue[],
): { errors: string[]; warnings: string[]; infos: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const infos: string[] = [];
  for (const i of issues) {
    const line = `[${i.code}] ${i.message}`;
    if (i.severity === "error") errors.push(line);
    else if (i.severity === "warning") warnings.push(line);
    else infos.push(line);
  }
  return { errors, warnings, infos };
}
