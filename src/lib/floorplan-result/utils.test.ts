import { describe, expect, it } from "vitest";
import {
  confidenceBadge,
  containsInternalScoreLeak,
  resolveInitialVariantId,
} from "./utils";
import {
  canUseWallGraphDebug,
  isArcadaPocTabEnabled,
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

describe("isArcadaPocTabEnabled", () => {
  it("is off in production for normal users", () => {
    const prevEnv = process.env.NODE_ENV;
    const prevFlag = process.env.NEXT_PUBLIC_ENABLE_ARCADA_POC;
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_ENABLE_ARCADA_POC;
    expect(isArcadaPocTabEnabled({ isAdmin: false, isDev: false })).toBe(
      false,
    );
    process.env.NODE_ENV = prevEnv;
    if (prevFlag !== undefined) {
      process.env.NEXT_PUBLIC_ENABLE_ARCADA_POC = prevFlag;
    }
  });

  it("is on in local development without passing isDev", () => {
    const prevEnv = process.env.NODE_ENV;
    const prevFlag = process.env.NEXT_PUBLIC_ENABLE_ARCADA_POC;
    process.env.NODE_ENV = "development";
    delete process.env.NEXT_PUBLIC_ENABLE_ARCADA_POC;
    expect(isArcadaPocTabEnabled()).toBe(true);
    process.env.NODE_ENV = prevEnv;
    if (prevFlag !== undefined) {
      process.env.NEXT_PUBLIC_ENABLE_ARCADA_POC = prevFlag;
    }
  });

  it("is on for dev/admin in production", () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    expect(isArcadaPocTabEnabled({ isDev: true })).toBe(true);
    process.env.NODE_ENV = prevEnv;
  });

  it("respects NEXT_PUBLIC_ENABLE_ARCADA_POC=false in development", () => {
    const prevEnv = process.env.NODE_ENV;
    const prevFlag = process.env.NEXT_PUBLIC_ENABLE_ARCADA_POC;
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_ENABLE_ARCADA_POC = "false";
    expect(isArcadaPocTabEnabled()).toBe(false);
    process.env.NODE_ENV = prevEnv;
    if (prevFlag === undefined) {
      delete process.env.NEXT_PUBLIC_ENABLE_ARCADA_POC;
    } else {
      process.env.NEXT_PUBLIC_ENABLE_ARCADA_POC = prevFlag;
    }
  });

  it("respects NEXT_PUBLIC_ENABLE_ARCADA_POC=true in production", () => {
    const prevEnv = process.env.NODE_ENV;
    const prevFlag = process.env.NEXT_PUBLIC_ENABLE_ARCADA_POC;
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_ENABLE_ARCADA_POC = "true";
    expect(isArcadaPocTabEnabled()).toBe(true);
    process.env.NODE_ENV = prevEnv;
    if (prevFlag === undefined) {
      delete process.env.NEXT_PUBLIC_ENABLE_ARCADA_POC;
    } else {
      process.env.NEXT_PUBLIC_ENABLE_ARCADA_POC = prevFlag;
    }
  });
});
