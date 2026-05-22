import { describe, expect, it } from "vitest";
import {
  confidenceBadge,
  containsInternalScoreLeak,
  resolveInitialVariantId,
} from "./utils";
import {
  canUseWallGraphDebug,
  isWallGraphDebugEnabled,
  shouldShowFloorPlanDebug,
} from "./featureFlags";
import { MOCK_PUBLIC_RESULT } from "./fixtures";

describe("floorplan-result utils", () => {
  it("resolves recommended variant id first", () => {
    expect(resolveInitialVariantId(MOCK_PUBLIC_RESULT)).toBe(
      "add_laundry_as_kitchen_extension",
    );
  });

  it("confidence labels are user-facing", () => {
    expect(confidenceBadge("medium_low").label).toBe("Confianza media-baja");
  });

  it("detects internal score leak strings", () => {
    expect(containsInternalScoreLeak('{"penalties":{}}')).toBe(true);
    expect(containsInternalScoreLeak("adjacencyScore: 12")).toBe(true);
    expect(containsInternalScoreLeak("daylightScore")).toBe(true);
    expect(containsInternalScoreLeak("Developer debug")).toBe(true);
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

describe("wallGraphDebug", () => {
  it("is off for normal users even if toggle requested", () => {
    expect(
      isWallGraphDebugEnabled({
        isAdmin: false,
        isDev: false,
        wallGraphDebug: true,
      }),
    ).toBe(false);
  });

  it("requires dev/admin and explicit toggle", () => {
    expect(
      isWallGraphDebugEnabled({ isDev: true, wallGraphDebug: false }),
    ).toBe(false);
    expect(
      isWallGraphDebugEnabled({ isDev: true, wallGraphDebug: true }),
    ).toBe(true);
    expect(canUseWallGraphDebug({ isAdmin: true })).toBe(true);
  });
});
