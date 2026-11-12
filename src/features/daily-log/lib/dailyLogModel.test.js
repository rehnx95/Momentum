import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDailyLogViewMode,
  setDailyLogViewMode,
} from "./dailyLogModel";

describe("Daily Log view preference", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists valid views per user and defaults invalid values to Day", () => {
    const values = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key) => values.get(key) || null,
      setItem: (key, value) => values.set(key, value),
    });

    expect(getDailyLogViewMode("user-a")).toBe("daily");
    expect(setDailyLogViewMode("user-a", "full")).toBe(true);
    expect(setDailyLogViewMode("user-b", "trends")).toBe(true);
    expect(setDailyLogViewMode("user-a", "unknown")).toBe(false);
    values.set("momentum:daily-log-view:user-c", "unknown");

    expect(getDailyLogViewMode("user-a")).toBe("full");
    expect(getDailyLogViewMode("user-b")).toBe("trends");
    expect(getDailyLogViewMode("user-c")).toBe("daily");
  });
});
