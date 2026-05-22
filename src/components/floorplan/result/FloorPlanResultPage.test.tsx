/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FloorPlanResultPage } from "./FloorPlanResultPage";
import {
  MOCK_DEBUG_PAYLOAD,
  MOCK_PUBLIC_RESULT,
} from "@/lib/floorplan-result/fixtures";
import { containsInternalScoreLeak } from "@/lib/floorplan-result/utils";

vi.mock("@/lib/floorplan-result/featureFlags", () => ({
  shouldShowFloorPlanDebug: vi.fn(),
}));

import { shouldShowFloorPlanDebug } from "@/lib/floorplan-result/featureFlags";

const mockShouldShowDebug = vi.mocked(shouldShowFloorPlanDebug);

describe("FloorPlanResultPage", () => {
  it("renders recommended variant first and human copy", () => {
    mockShouldShowDebug.mockReturnValue(false);
    render(
      <FloorPlanResultPage
        publicResult={MOCK_PUBLIC_RESULT}
        debug={MOCK_DEBUG_PAYLOAD}
      />,
    );

    expect(screen.getByText("Concepto recomendado")).toBeTruthy();
    expect(screen.getAllByText("Lavadero en extensión de cocina").length).toBeGreaterThan(0);
    expect(screen.getByText(/¿Por qué este plan\?/)).toBeTruthy();
    expect(screen.getByText(/Revisión profesional necesaria/)).toBeTruthy();
    expect(screen.queryByText("Developer debug")).toBeNull();
  });

  it("hides debug and score internals from normal users", () => {
    mockShouldShowDebug.mockReturnValue(false);
    const { container } = render(
      <FloorPlanResultPage
        publicResult={MOCK_PUBLIC_RESULT}
        debug={MOCK_DEBUG_PAYLOAD}
      />,
    );
    const html = container.innerHTML;
    expect(containsInternalScoreLeak(html)).toBe(false);
    expect(html).not.toContain("scoringDetails");
    expect(html).not.toContain("adjacencyScore");
  });

  it("shows debug panel when dev flag enabled", () => {
    mockShouldShowDebug.mockReturnValue(true);
    render(
      <FloorPlanResultPage
        publicResult={MOCK_PUBLIC_RESULT}
        debug={MOCK_DEBUG_PAYLOAD}
        isDev
      />,
    );
    expect(screen.getByText("Developer debug")).toBeTruthy();
  });

  it("updates visible variant label when selecting another card", () => {
    mockShouldShowDebug.mockReturnValue(false);
    render(
      <FloorPlanResultPage
        publicResult={MOCK_PUBLIC_RESULT}
        debug={MOCK_DEBUG_PAYLOAD}
      />,
    );

    const patioButtons = screen.getAllByRole("button", {
      name: /Patio protagonista/i,
    });
    fireEvent.click(patioButtons[0]!);
    expect(screen.getAllByText("Patio protagonista").length).toBeGreaterThan(0);
  });

  it("renders loading state", () => {
    mockShouldShowDebug.mockReturnValue(false);
    render(<FloorPlanResultPage publicResult={null} loading />);
    expect(screen.getByText(/Generando tu planta conceptual/)).toBeTruthy();
  });

  it("renders empty state", () => {
    mockShouldShowDebug.mockReturnValue(false);
    render(<FloorPlanResultPage publicResult={null} />);
    expect(screen.getByText(/no hay un resultado/i)).toBeTruthy();
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
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle!);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Resumen del proyecto")).toBeTruthy();
  });
});
