# Arc POC — Procedural Conceptual Plan Generator

Spike del [poc-plan-generator.md](../poc-plan-generator.md): lenguaje natural → **programa espacial** (Gemini) → **layout procedural** (treemap + restricciones) → **Canvas CAD**.

**No es el producto.** Prueba si un usuario puede obtener un boceto útil para hablar con un arquitecto.

## Requisitos

- Node 20+
- API key de [Google AI Studio](https://aistudio.google.com/apikey)

## Setup

```bash
cd arc/poc
cp .env.example .env.local
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)

## Arquitectura

```text
User prompt
    ↓
Gemini → JSON constraint (idealArea + adjacencies, SIN coordenadas)
    ↓
ConstraintLayoutEngine
    squarified treemap → relajación → aspect ratio → puertas auto
    ↓
FloorPlan 0–100 → Canvas (texturas, muros, cotas, muebles)
```

### Formato constraint (`layoutVersion: "constraint"`)

```json
{
  "layoutVersion": "constraint",
  "lot": { "width": 100, "height": 100 },
  "zones": [
    {
      "id": "SALA_COMEDOR",
      "type": "social",
      "idealArea": 1850,
      "aspectRatioRange": [0.9, 2.4]
    }
  ],
  "adjacencies": [
    { "from": "SALA_COMEDOR", "to": "PATIO", "type": "door_connection" }
  ]
}
```

Ver `src/fixtures/sample-constraint-plan.json`.

### Flujo principal (onboarding → plano)

```text
Onboarding (brief + room counts)
    ↓
Gemini → ArchitecturalProgram (zonas + topologyGraph, SIN x/y)
    ↓
selectArchitecturalTemplate → mapProgramToTemplate
    ↓
Slots curados (x/y/w/h fijos) → Canvas CAD
```

Plantillas en `src/lib/architectural-templates/`. Caso L 3 dorm: `l_shape_family_3bed`.

Motor grilla/treemap solo con `USE_EXPERIMENTAL_GRID_ENGINE=true`.

### Módulos clave

| Ruta | Rol |
|------|-----|
| `src/lib/architectural-templates/` | Plantillas + mapeo + validación ligera |
| `src/lib/floorplan-layout/` | Orquestación layout (template por defecto) |
| `src/lib/layout-engine/` | Motor experimental (treemap) |
| `src/lib/process-constraint-plan.ts` | Constraint → FloorPlan |
| `src/hooks/useProceduralLayout.ts` | Hook React |
| `src/lib/canvas-renderer/` | Render CAD Canvas 2D |
| `src/lib/import-plan.ts` | Auto-detecta constraint vs legacy JSON |

### Modo sin API

Con `GEMINI_USE_MOCK=true` (o sin `GEMINI_API_KEY`) el programa se genera localmente desde el onboarding.

## Variables de entorno

- `GEMINI_API_KEY` — solo servidor
- `GEMINI_MODEL` — opcional (default: cadena 2.5-flash → flash-lite)
- `USE_EXPERIMENTAL_GRID_ENGINE` — `true` para grilla L / treemap; default plantillas

## Stack

Next.js · TypeScript · Zod · Gemini · Canvas 2D
