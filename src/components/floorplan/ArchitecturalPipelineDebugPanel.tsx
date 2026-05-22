"use client";

import type { Adjacency } from "@/lib/architecture/architecturalProgram";
import type {
  MutatedPlanResult,
  MutationStatus,
  MutationType,
} from "@/lib/architecture/mutations";
import type { PipelineResult, PipelineStageStatus } from "@/lib/architecture/generationPipeline";
import { getDebugPipelineView } from "@/lib/architecture/pipelineUiAdapter";
import { TopologyGraphViz } from "@/components/floorplan/TopologyGraphViz";
import { useMemo, useState } from "react";

const STATUS_BADGE: Record<
  PipelineStageStatus,
  { label: string; className: string }
> = {
  ok: { label: "ok", className: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  warn: { label: "warn", className: "bg-amber-100 text-amber-900 ring-amber-200" },
  error: { label: "error", className: "bg-red-100 text-red-900 ring-red-200" },
};

const MUTATION_STATUS: Record<
  MutationStatus,
  { hint: string; className: string }
> = {
  ok: {
    hint: "usable — elegible para ranking",
    className: "bg-emerald-100 text-emerald-900",
  },
  warn: {
    hint: "generada con advertencias — no elegible",
    className: "bg-amber-100 text-amber-950",
  },
  error: {
    hint: "inválida — no elegible",
    className: "bg-red-100 text-red-900",
  },
  skipped: {
    hint: "no aplicada (no-op / insegura) — no elegible",
    className: "bg-stone-200 text-stone-700",
  },
};

type SectionProps = {
  id: string;
  title: string;
  badge?: PipelineStageStatus;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

function Section({ id, title, badge, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const badgeStyle = badge ? STATUS_BADGE[badge] : null;

  return (
    <div className="rounded-xl border border-stone-200 bg-white/90">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`arch-pipeline-${id}`}
      >
        <span className="min-w-0 flex-1 font-medium text-stone-900">{title}</span>
        {badgeStyle && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${badgeStyle.className}`}
          >
            {badgeStyle.label}
          </span>
        )}
        <span className="text-stone-400">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div
          id={`arch-pipeline-${id}`}
          className="border-t border-stone-100 px-3 py-3 text-[11px] leading-relaxed text-stone-700"
        >
          {children}
        </div>
      )}
    </div>
  );
}

function AdjacencyList({
  edges,
  variant,
}: {
  edges: Adjacency[];
  variant: "hard" | "soft";
}) {
  if (edges.length === 0) {
    return <p className="text-stone-500">Sin relaciones.</p>;
  }
  const ring =
    variant === "hard"
      ? "ring-rose-200 bg-rose-50/60"
      : "ring-sky-200 bg-sky-50/60";

  return (
    <ul className={`space-y-1.5 rounded-lg p-2 ring-1 ${ring}`}>
      {edges.map((e, i) => (
        <li key={`${e.from}-${e.to}-${i}`} className="flex flex-col gap-0.5">
          <span className="font-medium text-stone-900">
            {e.from} ↔ {e.to}
          </span>
          <span className="text-stone-600">{e.reason}</span>
        </li>
      ))}
    </ul>
  );
}

type Props = {
  result: PipelineResult | null;
  title?: string;
  selectedVariantType?: MutationType;
  onSelectVariant?: (type: MutationType) => void;
};

export function ArchitecturalPipelineDebugPanel({
  result,
  title = "Pipeline arquitectónico (paso 5)",
  selectedVariantType,
  onSelectVariant,
}: Props) {
  const [copyOk, setCopyOk] = useState(false);
  const [inspectedVariant, setInspectedVariant] = useState<MutationType | null>(
    null,
  );

  const jsonExport = useMemo(
    () => (result ? JSON.stringify(result, null, 2) : ""),
    [result],
  );

  if (!result) return null;

  const {
    program,
    topologyGraph,
    topologyValidation,
    strategy,
    validation,
    extractorMeta,
    recommendation,
  } = result;

  const {
    generatedPlan,
    generatedPlanValidation,
    variants,
    scoredVariants,
    topVariants,
    recommendedVariant,
    stages,
  } = getDebugPipelineView(result);

  const okVariants = variants.filter((v) => v.status === "ok").length;
  const warnVariants = variants.filter((v) => v.status === "warn").length;
  const errorVariants = variants.filter((v) => v.status === "error").length;
  const skippedVariants = variants.filter((v) => v.status === "skipped").length;
  const eligibleVariants = variants.filter((v) => v.eligibleForRanking).length;
  const activeInspect =
    inspectedVariant ??
    selectedVariantType ??
    variants[0]?.mutationType ??
    "base";
  const inspected: MutatedPlanResult | undefined = variants.find(
    (v) => v.mutationType === activeInspect,
  );

  const hardEdges = topologyGraph.edges.filter((e) => e.strength === "hard");
  const softEdges = topologyGraph.edges.filter((e) => e.strength === "soft");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonExport);
    setCopyOk(true);
    window.setTimeout(() => setCopyOk(false), 2000);
  };

  return (
    <section
      className="rounded-2xl border border-teal-200 bg-teal-50/30 p-4 font-mono text-xs text-stone-800 shadow-sm"
      aria-label="Depuración pipeline arquitectónico"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-teal-700">
            {title}
          </p>
          <p className="mt-0.5 text-[11px] text-stone-500">
            prompt → programa → topología → estrategia → parti · mock LLM ·{" "}
            <span className="font-semibold text-teal-800">
              {strategy.preferredParti}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-medium text-teal-900 ring-1 ring-teal-200 hover:bg-teal-50"
        >
          {copyOk ? "Copiado" : "Copiar JSON"}
        </button>
      </div>

      <div className="max-h-[min(75vh,640px)] space-y-2 overflow-y-auto pr-1">
        <Section id="prompt" title="A. User prompt" defaultOpen>
          <p className="whitespace-pre-wrap rounded-lg bg-stone-50 p-2 text-stone-800">
            {result.userPrompt}
          </p>
        </Section>

        <Section
          id="extractor"
          title="B. Program Extractor"
          badge={validation.ok ? "ok" : "error"}
          defaultOpen
        >
          <dl className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
            <div>
              <dt className="text-stone-500">mock mode</dt>
              <dd className="font-semibold">{String(extractorMeta.mock)}</dd>
            </div>
            <div>
              <dt className="text-stone-500">model</dt>
              <dd className="font-semibold">{extractorMeta.model}</dd>
            </div>
            <div>
              <dt className="text-stone-500">title</dt>
              <dd className="font-semibold">{program.title}</dd>
            </div>
            <div>
              <dt className="text-stone-500">target area</dt>
              <dd className="font-semibold">
                {program.targetAreaM2 != null
                  ? `${program.targetAreaM2} m²`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">site.lotShape</dt>
              <dd className="font-semibold">{program.site.lotShape}</dd>
            </div>
            <div>
              <dt className="text-stone-500">desiredPlanShape</dt>
              <dd className="font-semibold text-teal-900">
                {program.desiredPlanShape ?? "—"}
              </dd>
            </div>
          </dl>
          <p className="mb-2 text-[10px] text-stone-500">
            lotShape = geometría del lote · desiredPlanShape = parti / forma del plano
          </p>

          <p className="mb-1 font-semibold text-stone-800">Rooms</p>
          <div className="overflow-x-auto rounded-lg ring-1 ring-stone-200">
            <table className="w-full min-w-[480px] border-collapse text-left">
              <thead className="bg-stone-100 text-[10px] uppercase text-stone-500">
                <tr>
                  <th className="px-2 py-1">id</th>
                  <th className="px-2 py-1">label</th>
                  <th className="px-2 py-1">type</th>
                  <th className="px-2 py-1">priority</th>
                  <th className="px-2 py-1">m²</th>
                </tr>
              </thead>
              <tbody>
                {program.rooms.map((r) => (
                  <tr key={r.id} className="border-t border-stone-100">
                    <td className="px-2 py-1 font-medium">{r.id}</td>
                    <td className="px-2 py-1">{r.label}</td>
                    <td className="px-2 py-1">{r.type}</td>
                    <td className="px-2 py-1">{r.priority}</td>
                    <td className="px-2 py-1">
                      {r.idealAreaM2 ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 font-semibold text-rose-800">Hard adjacencies</p>
              <AdjacencyList edges={program.hardAdjacencies} variant="hard" />
            </div>
            <div>
              <p className="mb-1 font-semibold text-sky-800">Soft adjacencies</p>
              <AdjacencyList edges={program.softAdjacencies} variant="soft" />
            </div>
          </div>
        </Section>

        <Section
          id="topology"
          title="C. Topological Graph"
          badge={
            topologyValidation.errors.length > 0
              ? "error"
              : topologyValidation.warnings.length > 0
                ? "warn"
                : "ok"
          }
          defaultOpen
        >
          <p className="mb-2 font-semibold text-stone-800">A. Graph summary</p>
          <dl className="mb-4 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-5">
            <div>
              <dt className="text-stone-500">nodes</dt>
              <dd className="font-semibold">{topologyGraph.nodes.length}</dd>
            </div>
            <div>
              <dt className="text-stone-500">edges</dt>
              <dd className="font-semibold">{topologyGraph.edges.length}</dd>
            </div>
            <div>
              <dt className="text-stone-500">hard</dt>
              <dd className="font-semibold text-rose-800">{hardEdges.length}</dd>
            </div>
            <div>
              <dt className="text-stone-500">soft</dt>
              <dd className="font-semibold text-sky-800">{softEdges.length}</dd>
            </div>
            <div>
              <dt className="text-stone-500">clusters</dt>
              <dd className="font-semibold">{topologyGraph.clusters.length}</dd>
            </div>
          </dl>

          <p className="mb-1 font-semibold text-stone-800">B. Clusters</p>
          <div className="mb-4 space-y-2">
            {topologyGraph.clusters.map((c) => (
              <div
                key={c.id}
                className="rounded-lg bg-stone-50 p-2 ring-1 ring-stone-200"
              >
                <p className="font-medium text-stone-900">
                  {c.label}{" "}
                  <span className="text-stone-500">({c.id} · {c.type})</span>
                </p>
                <p className="text-stone-600">
                  rooms: {c.roomIds.join(", ")} · priority: {c.priority}
                </p>
                {c.notes.length > 0 && (
                  <ul className="mt-1 list-disc pl-4 text-stone-600">
                    {c.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <p className="mb-1 font-semibold text-stone-800">C. Nodes</p>
          <div className="mb-4 overflow-x-auto rounded-lg ring-1 ring-stone-200">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead className="bg-stone-100 text-[10px] uppercase text-stone-500">
                <tr>
                  <th className="px-2 py-1">roomId</th>
                  <th className="px-2 py-1">label</th>
                  <th className="px-2 py-1">type</th>
                  <th className="px-2 py-1">required</th>
                  <th className="px-2 py-1">priority</th>
                  <th className="px-2 py-1">clusterId</th>
                </tr>
              </thead>
              <tbody>
                {topologyGraph.nodes.map((n) => (
                  <tr key={n.id} className="border-t border-stone-100">
                    <td className="px-2 py-1 font-medium">{n.roomId}</td>
                    <td className="px-2 py-1">{n.label}</td>
                    <td className="px-2 py-1">{n.type}</td>
                    <td className="px-2 py-1">{String(n.required)}</td>
                    <td className="px-2 py-1">{n.priority}</td>
                    <td className="px-2 py-1">{n.clusterId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mb-1 font-semibold text-stone-800">D. Edges</p>
          <div className="mb-4 overflow-x-auto rounded-lg ring-1 ring-stone-200">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead className="bg-stone-100 text-[10px] uppercase text-stone-500">
                <tr>
                  <th className="px-2 py-1">from</th>
                  <th className="px-2 py-1">to</th>
                  <th className="px-2 py-1">strength</th>
                  <th className="px-2 py-1">connection</th>
                  <th className="px-2 py-1">weight</th>
                  <th className="px-2 py-1">reason</th>
                </tr>
              </thead>
              <tbody>
                {topologyGraph.edges.map((e) => (
                  <tr
                    key={e.id}
                    className={`border-t border-stone-100 ${
                      e.strength === "hard" ? "bg-rose-50/30" : "bg-sky-50/20"
                    }`}
                  >
                    <td className="px-2 py-1 font-medium">{e.from}</td>
                    <td className="px-2 py-1">{e.to}</td>
                    <td className="px-2 py-1">{e.strength}</td>
                    <td className="px-2 py-1">{e.desiredConnection}</td>
                    <td className="px-2 py-1 font-semibold">{e.weight}</td>
                    <td className="px-2 py-1 text-stone-600">{e.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mb-1 font-semibold text-stone-800">E. Graph validation</p>
          {topologyValidation.errors.length > 0 && (
            <ul className="mb-2 list-disc pl-4 text-red-900">
              {topologyValidation.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
          {topologyValidation.warnings.length > 0 ? (
            <ul className="mb-4 list-disc pl-4 text-amber-900">
              {topologyValidation.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-emerald-800">Grafo válido sin advertencias.</p>
          )}

          <p className="mb-1 font-semibold text-stone-800">F. Abstract visualization</p>
          <TopologyGraphViz graph={topologyGraph} />
        </Section>

        <Section id="strategy" title="D. Strategy Selector" badge="ok" defaultOpen>
          <dl className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div>
              <dt className="text-stone-500">preferred parti</dt>
              <dd className="text-base font-bold text-teal-900">
                {strategy.preferredParti}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-stone-500">candidates</dt>
              <dd className="font-medium">
                {strategy.partiCandidates.join(" · ")}
              </dd>
            </div>
          </dl>
          <p className="mb-1 font-semibold text-stone-800">Por qué</p>
          <ul className="list-disc space-y-1 pl-4">
            {strategy.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <p className="mt-2 mb-1 font-semibold text-stone-800">Constraints</p>
          <pre className="overflow-x-auto rounded-lg bg-stone-50 p-2 text-[10px]">
            {JSON.stringify(strategy.constraints, null, 2)}
          </pre>
        </Section>

        <Section
          id="validation"
          title="E. Program validation"
          badge={
            validation.errors.length > 0
              ? "error"
              : validation.warnings.length > 0
                ? "warn"
                : "ok"
          }
        >
          {validation.errors.length > 0 && (
            <>
              <p className="mb-1 font-semibold text-red-800">Errors</p>
              <ul className="mb-2 list-disc pl-4 text-red-900">
                {validation.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </>
          )}
          {validation.warnings.length > 0 ? (
            <>
              <p className="mb-1 font-semibold text-amber-800">Warnings</p>
              <ul className="list-disc pl-4 text-amber-900">
                {validation.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-emerald-800">Sin advertencias.</p>
          )}
        </Section>

        <Section
          id="parti"
          title="F. Parametric Parti Generator"
          badge={
            !generatedPlan
              ? "error"
              : generatedPlanValidation.errors.length > 0
                ? "error"
                : generatedPlanValidation.warnings.length > 0
                  ? "warn"
                  : "ok"
          }
          defaultOpen
        >
          <div className="mb-3 rounded-lg border border-teal-300 bg-teal-50/80 px-3 py-2 text-teal-950">
            <p className="font-semibold">Geometry source: curated l_shape_patio template</p>
            <p>LLM geometry: disabled · Grid engine: disabled</p>
          </div>

          {!generatedPlan ? (
            <p className="text-red-800">No se generó plano.</p>
          ) : (
            <>
              <p className="mb-1 font-semibold text-stone-800">A. Selected template</p>
              <dl className="mb-4 grid grid-cols-1 gap-1 sm:grid-cols-3">
                <div>
                  <dt className="text-stone-500">id</dt>
                  <dd className="font-semibold">{generatedPlan.templateId}</dd>
                </div>
                <div>
                  <dt className="text-stone-500">name</dt>
                  <dd className="font-semibold">{generatedPlan.metadata.templateName}</dd>
                </div>
                <div>
                  <dt className="text-stone-500">variant</dt>
                  <dd>{generatedPlan.variantLabel}</dd>
                </div>
              </dl>

              <p className="mb-1 font-semibold text-stone-800">B. Room slot mapping</p>
              <div className="mb-4 overflow-x-auto rounded-lg ring-1 ring-stone-200">
                <table className="w-full min-w-[520px] border-collapse text-left">
                  <thead className="bg-stone-100 text-[10px] uppercase text-stone-500">
                    <tr>
                      <th className="px-2 py-1">roomId</th>
                      <th className="px-2 py-1">label</th>
                      <th className="px-2 py-1">slotId</th>
                      <th className="px-2 py-1">confidence</th>
                      <th className="px-2 py-1">reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedPlan.metadata.mapping.map((m) => (
                      <tr key={m.roomId} className="border-t border-stone-100">
                        <td className="px-2 py-1 font-medium">{m.roomId}</td>
                        <td className="px-2 py-1">{m.roomLabel}</td>
                        <td className="px-2 py-1">{m.slotId}</td>
                        <td className="px-2 py-1">{m.confidence}</td>
                        <td className="px-2 py-1 text-stone-600">{m.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mb-1 font-semibold text-stone-800">C. Generated zones (%)</p>
              <div className="mb-4 overflow-x-auto rounded-lg ring-1 ring-stone-200">
                <table className="w-full min-w-[560px] border-collapse text-left">
                  <thead className="bg-stone-100 text-[10px] uppercase text-stone-500">
                    <tr>
                      <th className="px-2 py-1">id</th>
                      <th className="px-2 py-1">label</th>
                      <th className="px-2 py-1">type</th>
                      <th className="px-2 py-1">x</th>
                      <th className="px-2 py-1">y</th>
                      <th className="px-2 py-1">w</th>
                      <th className="px-2 py-1">h</th>
                      <th className="px-2 py-1">slot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedPlan.zones.map((z) => (
                      <tr key={z.id} className="border-t border-stone-100">
                        <td className="px-2 py-1 font-medium">{z.sourceRoomId}</td>
                        <td className="px-2 py-1">{z.label}</td>
                        <td className="px-2 py-1">{z.type}</td>
                        <td className="px-2 py-1">{z.x}</td>
                        <td className="px-2 py-1">{z.y}</td>
                        <td className="px-2 py-1">{z.width}</td>
                        <td className="px-2 py-1">{z.height}</td>
                        <td className="px-2 py-1">{z.slotId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mb-1 font-semibold text-stone-800">D. Doors</p>
              <div className="mb-4 overflow-x-auto rounded-lg ring-1 ring-stone-200">
                <table className="w-full min-w-[480px] border-collapse text-left text-[10px]">
                  <thead className="bg-stone-100 uppercase text-stone-500">
                    <tr>
                      <th className="px-2 py-1">from</th>
                      <th className="px-2 py-1">to</th>
                      <th className="px-2 py-1">type</th>
                      <th className="px-2 py-1">wall</th>
                      <th className="px-2 py-1">pos</th>
                      <th className="px-2 py-1">w</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedPlan.doors.map((d) => (
                      <tr key={d.id} className="border-t border-stone-100">
                        <td className="px-2 py-1">{d.from}</td>
                        <td className="px-2 py-1">{d.to}</td>
                        <td className="px-2 py-1">{d.type}</td>
                        <td className="px-2 py-1">{d.wall}</td>
                        <td className="px-2 py-1">{d.position}</td>
                        <td className="px-2 py-1">{d.width}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mb-1 font-semibold text-stone-800">E. Windows</p>
              <div className="mb-4 overflow-x-auto rounded-lg ring-1 ring-stone-200">
                <table className="w-full min-w-[520px] border-collapse text-left text-[10px]">
                  <thead className="bg-stone-100 uppercase text-stone-500">
                    <tr>
                      <th className="px-2 py-1">zoneId</th>
                      <th className="px-2 py-1">wall</th>
                      <th className="px-2 py-1">pos</th>
                      <th className="px-2 py-1">w</th>
                      <th className="px-2 py-1">size</th>
                      <th className="px-2 py-1">reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedPlan.windows.map((w) => (
                      <tr key={w.id} className="border-t border-stone-100">
                        <td className="px-2 py-1">{w.zoneId}</td>
                        <td className="px-2 py-1">{w.wall}</td>
                        <td className="px-2 py-1">{w.position}</td>
                        <td className="px-2 py-1">{w.width}</td>
                        <td className="px-2 py-1">{w.size}</td>
                        <td className="px-2 py-1 text-stone-600">{w.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mb-1 font-semibold text-stone-800">F. Furniture hints</p>
              <div className="mb-4 overflow-x-auto rounded-lg ring-1 ring-stone-200">
                <table className="w-full min-w-[360px] border-collapse text-left text-[10px]">
                  <thead className="bg-stone-100 uppercase text-stone-500">
                    <tr>
                      <th className="px-2 py-1">zoneId</th>
                      <th className="px-2 py-1">type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedPlan.furniture.map((f) => (
                      <tr key={f.id} className="border-t border-stone-100">
                        <td className="px-2 py-1">{f.zoneId}</td>
                        <td className="px-2 py-1">{f.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mb-1 font-semibold text-stone-800">G. Validation</p>
              {generatedPlanValidation.errors.length > 0 && (
                <ul className="mb-2 list-disc pl-4 text-red-900">
                  {generatedPlanValidation.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
              {generatedPlanValidation.warnings.length > 0 ? (
                <ul className="mb-4 list-disc pl-4 text-amber-900">
                  {generatedPlanValidation.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              ) : (
                <p className="mb-4 text-emerald-800">Plano válido.</p>
              )}

              <p className="mb-1 font-semibold text-stone-800">
                H. Hard adjacency geometry
              </p>
              <div className="mb-4 overflow-x-auto rounded-lg ring-1 ring-stone-200">
                <table className="w-full min-w-[720px] border-collapse text-left text-[10px]">
                  <thead className="bg-stone-100 uppercase text-stone-500">
                    <tr>
                      <th className="px-2 py-1">from</th>
                      <th className="px-2 py-1">to</th>
                      <th className="px-2 py-1">connection</th>
                      <th className="px-2 py-1">ok</th>
                      <th className="px-2 py-1">wall</th>
                      <th className="px-2 py-1">overlap</th>
                      <th className="px-2 py-1">message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedPlanValidation.hardAdjacencyChecks.map((c) => (
                      <tr
                        key={`${c.from}-${c.to}`}
                        className={`border-t border-stone-100 ${
                          c.satisfied ? "bg-emerald-50/40" : "bg-red-50/40"
                        }`}
                      >
                        <td className="px-2 py-1">{c.from}</td>
                        <td className="px-2 py-1">{c.to}</td>
                        <td className="px-2 py-1">{c.desiredConnection}</td>
                        <td className="px-2 py-1">{String(c.satisfied)}</td>
                        <td className="px-2 py-1">{c.sharedWall ?? "—"}</td>
                        <td className="px-2 py-1">{c.overlapLength}</td>
                        <td className="px-2 py-1 text-stone-600">{c.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mb-1 font-semibold text-stone-800">
                I. Door contact validation
              </p>
              <div className="mb-4 overflow-x-auto rounded-lg ring-1 ring-stone-200">
                <table className="w-full min-w-[720px] border-collapse text-left text-[10px]">
                  <thead className="bg-stone-100 uppercase text-stone-500">
                    <tr>
                      <th className="px-2 py-1">from</th>
                      <th className="px-2 py-1">to</th>
                      <th className="px-2 py-1">type</th>
                      <th className="px-2 py-1">wall</th>
                      <th className="px-2 py-1">ok</th>
                      <th className="px-2 py-1">shared</th>
                      <th className="px-2 py-1">overlap</th>
                      <th className="px-2 py-1">message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedPlanValidation.doorContactChecks.map((c) => (
                      <tr
                        key={c.doorId}
                        className={`border-t border-stone-100 ${
                          c.satisfied ? "bg-emerald-50/40" : "bg-amber-50/50"
                        }`}
                      >
                        <td className="px-2 py-1">{c.from}</td>
                        <td className="px-2 py-1">{c.to}</td>
                        <td className="px-2 py-1">{c.type}</td>
                        <td className="px-2 py-1">{c.wall}</td>
                        <td className="px-2 py-1">{String(c.satisfied)}</td>
                        <td className="px-2 py-1">{c.sharedWall ?? "—"}</td>
                        <td className="px-2 py-1">{c.overlapLength}</td>
                        <td className="px-2 py-1 text-stone-600">{c.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Section>

        <Section
          id="mutations"
          title="G. Mutation Engine"
          badge={
            errorVariants > 0
              ? "warn"
              : warnVariants > 0
                ? "warn"
                : variants.length > 0
                  ? "ok"
                  : "error"
          }
          defaultOpen
        >
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-900 ring-1 ring-teal-200">
              deterministic mutations
            </span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-800 ring-1 ring-stone-200">
              no LLM geometry
            </span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-800 ring-1 ring-stone-200">
              no grid engine
            </span>
          </div>

          <p className="mb-2 font-semibold text-stone-800">A. Summary</p>
          <dl className="mb-4 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-6">
            <div>
              <dt className="text-stone-500">total variants</dt>
              <dd className="font-semibold">{variants.length}</dd>
            </div>
            <div>
              <dt className="text-stone-500">ok</dt>
              <dd className="font-semibold text-emerald-800">{okVariants}</dd>
            </div>
            <div>
              <dt className="text-stone-500">warn</dt>
              <dd className="font-semibold text-amber-800">{warnVariants}</dd>
            </div>
            <div>
              <dt className="text-stone-500">error</dt>
              <dd className="font-semibold text-red-800">{errorVariants}</dd>
            </div>
            <div>
              <dt className="text-stone-500">skipped</dt>
              <dd className="font-semibold text-stone-700">{skippedVariants}</dd>
            </div>
            <div>
              <dt className="text-stone-500">eligible</dt>
              <dd className="font-semibold text-teal-800">{eligibleVariants}</dd>
            </div>
          </dl>

          <p className="mb-1 font-semibold text-stone-800">B. Variant table</p>
          <div className="mb-4 overflow-x-auto rounded-lg ring-1 ring-stone-200">
            <table className="w-full min-w-[880px] border-collapse text-left">
              <thead className="bg-stone-100 text-[10px] uppercase text-stone-500">
                <tr>
                  <th className="px-2 py-1">mutationType</th>
                  <th className="px-2 py-1">label</th>
                  <th className="px-2 py-1">status</th>
                  <th className="px-2 py-1">eligible</th>
                  <th className="px-2 py-1">changed</th>
                  <th className="px-2 py-1">warn</th>
                  <th className="px-2 py-1">err</th>
                  <th className="px-2 py-1">inspect</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr
                    key={v.mutationType}
                    className={`border-t border-stone-100 ${
                      activeInspect === v.mutationType ? "bg-teal-50/50" : ""
                    }`}
                  >
                    <td className="px-2 py-1 font-medium">{v.mutationType}</td>
                    <td className="px-2 py-1">{v.label}</td>
                    <td className="px-2 py-1">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${MUTATION_STATUS[v.status].className}`}
                        title={MUTATION_STATUS[v.status].hint}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="px-2 py-1">
                      {String(v.eligibleForRanking)}
                    </td>
                    <td className="px-2 py-1">
                      {String(v.effect.changed)}
                      {v.effect.changedZones.length > 0 && (
                        <span className="block text-stone-500">
                          {v.effect.changedZones.join(", ")}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1">{v.validation.warnings.length}</td>
                    <td className="px-2 py-1">{v.validation.errors.length}</td>
                    <td className="px-2 py-1">
                      <button
                        type="button"
                        className="text-teal-800 underline"
                        onClick={() => {
                          setInspectedVariant(v.mutationType);
                          onSelectVariant?.(v.mutationType);
                        }}
                      >
                        ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {inspected && (
            <>
              <p className="mb-1 font-semibold text-stone-800">
                C. Selected variant — {inspected.label}
              </p>
              <dl className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <dt className="text-stone-500">status</dt>
                  <dd>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${MUTATION_STATUS[inspected.status].className}`}
                    >
                      {inspected.status}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-stone-500">
                      {MUTATION_STATUS[inspected.status].hint}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">eligibleForRanking</dt>
                  <dd className="font-semibold">
                    {String(inspected.eligibleForRanking)}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">effect.changed</dt>
                  <dd className="font-semibold">
                    {String(inspected.effect.changed)}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">changed zones</dt>
                  <dd className="text-stone-700">
                    {inspected.effect.changedZones.length > 0
                      ? inspected.effect.changedZones.join(", ")
                      : "—"}
                  </dd>
                </div>
              </dl>
              {inspected.messages.length > 0 && (
                <ul className="mb-3 list-disc pl-4 text-stone-700">
                  {inspected.messages.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              )}

              <div className="mb-4 overflow-x-auto rounded-lg ring-1 ring-stone-200">
                <table className="w-full min-w-[560px] border-collapse text-left">
                  <thead className="bg-stone-100 text-[10px] uppercase text-stone-500">
                    <tr>
                      <th className="px-2 py-1">room</th>
                      <th className="px-2 py-1">x</th>
                      <th className="px-2 py-1">y</th>
                      <th className="px-2 py-1">w</th>
                      <th className="px-2 py-1">h</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspected.plan.zones.map((z) => (
                      <tr key={z.id} className="border-t border-stone-100">
                        <td className="px-2 py-1 font-medium">{z.sourceRoomId}</td>
                        <td className="px-2 py-1">{z.x}</td>
                        <td className="px-2 py-1">{z.y}</td>
                        <td className="px-2 py-1">{z.width}</td>
                        <td className="px-2 py-1">{z.height}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mb-1 font-semibold text-stone-800">
                Hard adjacency checks
              </p>
              <div className="mb-4 overflow-x-auto rounded-lg ring-1 ring-stone-200">
                <table className="w-full min-w-[640px] border-collapse text-left text-[10px]">
                  <thead className="bg-stone-100 uppercase text-stone-500">
                    <tr>
                      <th className="px-2 py-1">from</th>
                      <th className="px-2 py-1">to</th>
                      <th className="px-2 py-1">ok</th>
                      <th className="px-2 py-1">message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspected.validation.hardAdjacencyChecks.map((c) => (
                      <tr
                        key={`${c.from}-${c.to}`}
                        className={`border-t border-stone-100 ${
                          c.satisfied ? "bg-emerald-50/40" : "bg-red-50/40"
                        }`}
                      >
                        <td className="px-2 py-1">{c.from}</td>
                        <td className="px-2 py-1">{c.to}</td>
                        <td className="px-2 py-1">{String(c.satisfied)}</td>
                        <td className="px-2 py-1 text-stone-600">{c.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mb-1 font-semibold text-stone-800">
                Door contact checks
              </p>
              <div className="overflow-x-auto rounded-lg ring-1 ring-stone-200">
                <table className="w-full min-w-[640px] border-collapse text-left text-[10px]">
                  <thead className="bg-stone-100 uppercase text-stone-500">
                    <tr>
                      <th className="px-2 py-1">from</th>
                      <th className="px-2 py-1">to</th>
                      <th className="px-2 py-1">ok</th>
                      <th className="px-2 py-1">message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspected.validation.doorContactChecks.map((c) => (
                      <tr
                        key={c.doorId}
                        className={`border-t border-stone-100 ${
                          c.satisfied ? "bg-emerald-50/40" : "bg-amber-50/50"
                        }`}
                      >
                        <td className="px-2 py-1">{c.from}</td>
                        <td className="px-2 py-1">{c.to}</td>
                        <td className="px-2 py-1">{String(c.satisfied)}</td>
                        <td className="px-2 py-1 text-stone-600">{c.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Section>

        <Section
          id="scorer"
          title="H. Plan Scorer"
          badge={recommendedVariant ? "ok" : "warn"}
          defaultOpen
        >
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-900 ring-1 ring-violet-200">
              deterministic scorer
            </span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-800 ring-1 ring-stone-200">
              no LLM
            </span>
          </div>

          {recommendation && recommendedVariant && (
            <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50/70 px-3 py-2 text-violet-950">
              <p className="font-semibold">
                Recomendada: {recommendation.bestVariantLabel}{" "}
                <span className="text-violet-700">
                  ({recommendedVariant.score.total}/100)
                </span>
              </p>
              <p className="mt-1 text-[10px] font-medium text-violet-800">Por qué</p>
              <ul className="list-disc pl-4">
                {recommendation.why.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] font-medium text-violet-800">
                Tradeoffs
              </p>
              <ul className="list-disc pl-4 text-violet-900/90">
                {recommendation.tradeoffs.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="mb-2 font-semibold text-stone-800">A. Summary</p>
          <dl className="mb-4 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
            <div>
              <dt className="text-stone-500">scored</dt>
              <dd className="font-semibold">{scoredVariants.length}</dd>
            </div>
            <div>
              <dt className="text-stone-500">top 3</dt>
              <dd className="font-semibold">{topVariants.length}</dd>
            </div>
            <div>
              <dt className="text-stone-500">ignored</dt>
              <dd className="font-semibold">
                {variants.length - scoredVariants.length}
              </dd>
            </div>
          </dl>

          <p className="mb-1 font-semibold text-stone-800">B. Top variants</p>
          <div className="mb-4 overflow-x-auto rounded-lg ring-1 ring-stone-200">
            <table className="w-full min-w-[800px] border-collapse text-left text-[10px]">
              <thead className="bg-stone-100 uppercase text-stone-500">
                <tr>
                  <th className="px-2 py-1">rank</th>
                  <th className="px-2 py-1">label</th>
                  <th className="px-2 py-1">total</th>
                  <th className="px-2 py-1">adj</th>
                  <th className="px-2 py-1">day</th>
                  <th className="px-2 py-1">soc/out</th>
                  <th className="px-2 py-1">priv</th>
                  <th className="px-2 py-1">kit</th>
                  <th className="px-2 py-1">area</th>
                  <th className="px-2 py-1">intent</th>
                </tr>
              </thead>
              <tbody>
                {topVariants.map((v) => (
                  <tr
                    key={v.mutationType}
                    className={`border-t border-stone-100 ${
                      v.mutationType === recommendedVariant?.mutationType
                        ? "bg-violet-50/60"
                        : ""
                    }`}
                  >
                    <td className="px-2 py-1 font-bold">{v.rank}</td>
                    <td className="px-2 py-1">{v.label}</td>
                    <td className="px-2 py-1 font-semibold">{v.score.total}</td>
                    <td className="px-2 py-1">{v.score.adjacencyScore}</td>
                    <td className="px-2 py-1">{v.score.daylightScore}</td>
                    <td className="px-2 py-1">{v.score.socialOutdoorScore}</td>
                    <td className="px-2 py-1">{v.score.privateWingScore}</td>
                    <td className="px-2 py-1">{v.score.kitchenIntegrationScore}</td>
                    <td className="px-2 py-1">{v.score.areaEfficiencyScore}</td>
                    <td className="px-2 py-1">{v.score.mutationIntentScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {topVariants[0] && (
            <>
              <p className="mb-1 font-semibold text-stone-800">
                C. Reasons — #{topVariants[0].rank} {topVariants[0].label}
              </p>
              <ul className="mb-4 list-disc pl-4">
                {topVariants[0].score.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </>
          )}

          <p className="mb-1 font-semibold text-stone-800">D. Ignored variants</p>
          <div className="overflow-x-auto rounded-lg ring-1 ring-stone-200">
            <table className="w-full min-w-[520px] border-collapse text-left text-[10px]">
              <thead className="bg-stone-100 uppercase text-stone-500">
                <tr>
                  <th className="px-2 py-1">mutationType</th>
                  <th className="px-2 py-1">label</th>
                  <th className="px-2 py-1">status</th>
                  <th className="px-2 py-1">eligible</th>
                  <th className="px-2 py-1">reason</th>
                </tr>
              </thead>
              <tbody>
                {variants
                  .filter((v) => !v.eligibleForRanking || v.status !== "ok")
                  .map((v) => (
                    <tr key={v.mutationType} className="border-t border-stone-100">
                      <td className="px-2 py-1 font-medium">{v.mutationType}</td>
                      <td className="px-2 py-1">{v.label}</td>
                      <td className="px-2 py-1">{v.status}</td>
                      <td className="px-2 py-1">{String(v.eligibleForRanking)}</td>
                      <td className="px-2 py-1 text-stone-600">
                        {v.status === "skipped"
                          ? "Mutación omitida (skipped)."
                          : !v.eligibleForRanking
                            ? "No elegible para ranking."
                            : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-[10px] text-stone-500">
          Stages raw ({stages.length})
        </summary>
        <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-white/80 p-2 text-[10px]">
          {JSON.stringify(stages, null, 2)}
        </pre>
      </details>
    </section>
  );
}
