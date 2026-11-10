import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDailyLogCache,
  getDailyLogHistoryCache,
  invalidateDailyLogHistoryCache,
  setDailyLogCache,
  setDailyLogHistoryCache,
} from "./dailyLogHistoryCache";

describe("daily log history cache", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps loaded history fresh until it is invalidated", () => {
    const values = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key) => values.get(key) || null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    });
    const userId = "cache-test-user";
    const logs = [{ date: "2026-11-10" }];

    expect(getDailyLogHistoryCache(userId)).toBeNull();
    setDailyLogHistoryCache(userId, logs);
    expect(getDailyLogHistoryCache(userId)).toEqual({ logs, isFresh: true });

    invalidateDailyLogHistoryCache(userId);
    expect(getDailyLogHistoryCache(userId)).toEqual({ logs, isFresh: false });

    setDailyLogCache(userId, "2026-11-10", logs[0]);
    expect(getDailyLogCache(userId, "2026-11-10")).toEqual(logs[0]);
  });
});
