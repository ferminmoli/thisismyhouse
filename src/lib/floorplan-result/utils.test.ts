import { describe, expect, it } from "vitest";
import {
  confidenceBadge,
  containsInternalScoreLeak,
  findSvgForVariant,
  resolveInitialVariantId,
} from "./utils";
import { shouldShowFloorPlanDebug } from "./featureFlags";
import { MOCK_PUBLIC_RESULT } from "./fixtures";

describe("floorplan-result utils", () => {
  it("resolves recommended variant id first", () => {
    expect(resolveInitialVariantId(MOCK_PUBLIC_RESULT)).toBe(
      "add_laundry_as_kitchen_extension",
    );
  });

  it("finds svg by variant id", () => {
    const svg = findSvgForVariant(
      MOCK_PUBLIC_RESULT.svgPlans,
      "expand_patio",
    );
    expect(svg?.variantLabel).toBe("Patio protagonista");
  });

  it("confidence labels are user-facing", () => {
    expect(confidenceBadge("medium_low").label).toBe("Confianza conceptual");
  });

  it("detects internal score leak strings", () => {
    expect(containsInternalScoreLeak('{"penalties":{}}')).toBe(true);
    expect(containsInternalScoreLeak("Buen patio con living")).toBe(false);
  });
});

describe("shouldShowFloorPlanDebug", () => {
  it("returns false for normal users in production mode", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    expect(
      shouldShowFloorPlanDebug({ isAdmin: false, isDev: false }),
    ).toBe(false);
    process.env.NODE_ENV = prev;
  });

  it("returns true when isAdmin", () => {
    expect(shouldShowFloorPlanDebug({ isAdmin: true })).toBe(true);
  });
});
