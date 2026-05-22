/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { VisualInspirationCard } from "./VisualInspirationCard";

describe("VisualInspirationCard", () => {
  it("renders nothing without prompt", () => {
    const { container } = render(<VisualInspirationCard />);
    expect(container.firstChild).toBeNull();
  });

  it("renders premium inspiration section when data exists", () => {
    render(
      <VisualInspirationCard
        inspiration={{
          prompt: "Casa familiar con luz cálida y patio social.",
          notes: ["No es render final."],
        }}
      />,
    );
    expect(screen.getByTestId("visual-inspiration-card")).toBeTruthy();
    expect(screen.getByText("Inspiración visual")).toBeTruthy();
    expect(screen.getByText(/no es un render final/i)).toBeTruthy();
    expect(screen.getByText(/Casa familiar/)).toBeTruthy();
  });
});
