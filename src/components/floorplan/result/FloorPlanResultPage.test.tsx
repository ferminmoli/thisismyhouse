/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { FloorPlanResultPage } from "./FloorPlanResultPage";
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
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 118"></svg>',
      viewBox: "0 0 100 118",
      coordinateSystem: "normalized_canvas" as const,
      legend: [],
      warnings: [],
    })),
  };
});

import { shouldShowFloorPlanDebug } from "@/lib/floorplan-result/featureFlags";

const mockShouldShowDebug = vi.mocked(shouldShowFloorPlanDebug);

describe("FloorPlanResultPage", () => {
  beforeEach(() => cleanup());

  it("renders recommended variant via publicResult wrapper", () => {
    mockShouldShowDebug.mockReturnValue(false);
    render(
      <FloorPlanResultPage
        publicResult={MOCK_PUBLIC_RESULT}
        debug={MOCK_DEBUG_PAYLOAD}
      />,
    );

    expect(screen.getByText("Plano recomendado")).toBeTruthy();
    expect(screen.getAllByText("Lavadero en extensión de cocina").length).toBeGreaterThan(0);
    expect(screen.queryByText("Developer debug")).toBeNull();
  });

  it("architect brief accordion expands", () => {
    mockShouldShowDebug.mockReturnValue(false);
    const { container } = render(
      <FloorPlanResultPage
        publicResult={MOCK_PUBLIC_RESULT}
        debug={MOCK_DEBUG_PAYLOAD}
      />,
    );
    const toggle = container.querySelector(
      '[data-testid="architect-brief-toggle"]',
    ) as HTMLButtonElement;
    fireEvent.click(toggle!);
    expect(screen.getByText("Resumen del programa")).toBeTruthy();
  });
});
