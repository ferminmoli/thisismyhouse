/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { FloorPlanResultView } from "./FloorPlanResultView";
import { renderFinalPlanToSvg } from "@/lib/architecture/finalPlanRenderer";
import {
  MOCK_DEBUG_PAYLOAD,
  MOCK_PUBLIC_RESULT,
} from "@/lib/floorplan-result/fixtures";
import { containsInternalScoreLeak } from "@/lib/floorplan-result/utils";

vi.mock("@/lib/floorplan-result/featureFlags", () => ({
  shouldShowFloorPlanDebug: vi.fn(() => false),
  isWallGraphDebugEnabled: vi.fn(() => false),
  canUseWallGraphDebug: vi.fn(() => false),
}));

vi.mock("@/lib/architecture/finalPlanRenderer", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/architecture/finalPlanRenderer")>();
  return {
    ...actual,
    renderFinalPlanToSvg: vi.fn(() => ({
      variantId: "mock",
      variantLabel: "mock",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 118"><g id="arch-plan-drawing"></g></svg>',
      viewBox: "0 0 100 118",
      coordinateSystem: "normalized_canvas" as const,
      legend: [],
      warnings: [],
    })),
  };
});

vi.mock("@/lib/architecture/svgRenderer", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/architecture/svgRenderer")>();
  return {
    ...actual,
    renderPlanToSvg: vi.fn(() => ({
      variantId: "mock-conceptual",
      variantLabel: "mock",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 116"><title>conceptual</title></svg>',
      viewBox: "0 0 100 116",
      coordinateSystem: "normalized_canvas" as const,
      legend: [],
      warnings: [],
    })),
  };
});

import {
  isWallGraphDebugEnabled,
  shouldShowFloorPlanDebug,
} from "@/lib/floorplan-result/featureFlags";

const mockShouldShowDebug = vi.mocked(shouldShowFloorPlanDebug);
const mockWallGraphDebug = vi.mocked(isWallGraphDebugEnabled);
const mockRenderFinalPlanToSvg = vi.mocked(renderFinalPlanToSvg);

const LAUNDRY_ID = "add_laundry_as_kitchen_extension";
const KITCHEN_ID = "integrate_kitchen";

function buildPresented() {
  const recommended = MOCK_PUBLIC_RESULT.recommendedVariant;
  const kitchen = MOCK_PUBLIC_RESULT.topVariants.find((v) => v.id === KITCHEN_ID)!;
  const patio = MOCK_PUBLIC_RESULT.topVariants.find((v) => v.id === "expand_patio")!;

  return {
    publicResult: {
      ...MOCK_PUBLIC_RESULT,
      recommendedVariant: {
        ...recommended,
        id: LAUNDRY_ID,
        label: "Lavadero en extensión de cocina",
      },
      topVariants: [
        {
          ...recommended,
          id: LAUNDRY_ID,
          label: "Lavadero en extensión de cocina",
          rank: 1,
        },
        { ...patio, rank: 2 },
        { ...kitchen, id: KITCHEN_ID, label: "Cocina más integrada", rank: 3 },
      ],
      whyRecommended: MOCK_PUBLIC_RESULT.whyRecommended,
    },
    debug: MOCK_DEBUG_PAYLOAD,
  };
}

describe("FloorPlanResultView", () => {
  beforeEach(() => {
    cleanup();
    mockRenderFinalPlanToSvg.mockClear();
    mockShouldShowDebug.mockReturnValue(false);
    mockWallGraphDebug.mockReturnValue(false);
  });

  it("shows recommended variant as hero and passes plan to final renderer", () => {
    render(<FloorPlanResultView result={buildPresented()} />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Plano recomendado",
    );
    expect(screen.getAllByText("Lavadero en extensión de cocina").length).toBeGreaterThan(0);
    expect(mockRenderFinalPlanToSvg).toHaveBeenCalled();
    const firstCall = mockRenderFinalPlanToSvg.mock.calls[0]![0];
    expect(firstCall.variantId).toBe(LAUNDRY_ID);
    expect(firstCall.variantLabel).toBe("Lavadero en extensión de cocina");
  });

  it("renders final plan before variant selector in DOM order", () => {
    const { container } = render(<FloorPlanResultView result={buildPresented()} />);
    const finalPlan = container.querySelector('[data-testid="final-plan-renderer"]');
    const variantSection = screen.getByText("Otras variantes").closest("section");
    expect(finalPlan).toBeTruthy();
    expect(variantSection).toBeTruthy();
    const position = finalPlan!.compareDocumentPosition(variantSection!);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows conceptual review badge in header", () => {
    render(<FloorPlanResultView result={buildPresented()} />);
    expect(
      screen.getAllByText("Conceptual · requiere revisión profesional").length,
    ).toBeGreaterThan(0);
  });

  it("shows professional review warning below explanation", () => {
    render(<FloorPlanResultView result={buildPresented()} />);
    expect(screen.getByTestId("professional-review-warning")).toBeTruthy();
  });

  it("renders variant selector with top 3 options", () => {
    render(<FloorPlanResultView result={buildPresented()} />);
    expect(screen.getAllByText("Otras variantes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Muy buena alternativa").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cocina más integrada").length).toBeGreaterThan(0);
  });

  it("updates final plan when selecting another variant", () => {
    render(<FloorPlanResultView result={buildPresented()} />);
    const kitchenTabs = screen.getAllByRole("tab", {
      name: /Cocina más integrada/i,
    });
    fireEvent.click(kitchenTabs[0]!);
    const lastCall = mockRenderFinalPlanToSvg.mock.calls.at(-1)![0];
    expect(lastCall.variantId).toBe(KITCHEN_ID);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Plano seleccionado",
    );
    expect(screen.getAllByText("Por qué esta variante").length).toBeGreaterThan(0);
  });

  it("hides numeric variant scores for normal users", () => {
    render(<FloorPlanResultView result={buildPresented()} />);
    expect(screen.queryByTestId("variant-debug-score")).toBeNull();
  });

  it("shows Por qué este plano section", () => {
    render(<FloorPlanResultView result={buildPresented()} />);
    expect(screen.getAllByText("Por qué este plano").length).toBeGreaterThan(0);
  });

  it("does not show legacy conceptual renderer to normal users", () => {
    render(<FloorPlanResultView result={buildPresented()} />);
    expect(screen.getByTestId("final-plan-renderer")).toBeTruthy();
    expect(screen.queryByTestId("conceptual-plan-renderer")).toBeNull();
    expect(screen.queryByTestId("premium-plan-svg-viewer")).toBeNull();
  });

  it("shows architect brief collapsed by default", () => {
    render(<FloorPlanResultView result={buildPresented()} />);
    expect(
      screen.getAllByText("Brief para revisar con un arquitecto").length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("Resumen del programa")).toBeNull();
  });

  it("hides debug panel for normal users", () => {
    mockShouldShowDebug.mockReturnValue(false);
    render(<FloorPlanResultView result={buildPresented()} />);
    expect(screen.queryByText("Developer debug")).toBeNull();
  });

  it("shows debug panel with conceptual renderer in dev/admin mode", () => {
    mockShouldShowDebug.mockReturnValue(true);
    render(<FloorPlanResultView result={buildPresented()} isDev />);
    expect(screen.getByTestId("floor-plan-debug-panel")).toBeTruthy();
    fireEvent.click(screen.getByTestId("floor-plan-debug-toggle"));
    expect(screen.getByTestId("debug-conceptual-plan-section")).toBeTruthy();
    expect(screen.getByTestId("conceptual-plan-renderer")).toBeTruthy();
    expect(screen.getByTestId("wall-graph-debug-toggle")).toBeTruthy();
  });

  it("passes wallGraphDebug to renderer when dev toggles it on", () => {
    mockShouldShowDebug.mockReturnValue(true);
    mockWallGraphDebug.mockImplementation(
      (opts) => opts?.wallGraphDebug === true,
    );
    render(<FloorPlanResultView result={buildPresented()} isDev />);
    fireEvent.click(screen.getByTestId("floor-plan-debug-toggle"));
    fireEvent.click(screen.getByTestId("wall-graph-debug-toggle").querySelector("input")!);
    expect(screen.getByTestId("final-plan-renderer").getAttribute("data-wall-graph-debug")).toBe("true");
    const lastCall = mockRenderFinalPlanToSvg.mock.calls.at(-1)![0];
    expect(lastCall.wallGraphDebug).toBe(true);
  });

  it("does not leak scorer internals in rendered output", () => {
    const { container } = render(<FloorPlanResultView result={buildPresented()} />);
    expect(containsInternalScoreLeak(container.innerHTML)).toBe(false);
  });

  it("shows final plan disclaimer", () => {
    render(<FloorPlanResultView result={buildPresented()} />);
    expect(screen.getAllByText(/no apto para obra|validación profesional/i).length).toBeGreaterThan(0);
  });
});
