import { describe, expect, it } from "vitest";
import {
  getDailyLogHistoryCache,
  invalidateDailyLogHistoryCache,
  setDailyLogHistoryCache,
} from "./dailyLogHistoryCache";

describe("daily log history cache", () => {
  it("keeps loaded history fresh until it is invalidated", () => {
    const userId = "cache-test-user";
    const logs = [{ date: "2026-11-10" }];

    expect(getDailyLogHistoryCache(userId)).toBeNull();
    setDailyLogHistoryCache(userId, logs);
    expect(getDailyLogHistoryCache(userId)).toEqual({ logs, isFresh: true });

    invalidateDailyLogHistoryCache(userId);
    expect(getDailyLogHistoryCache(userId)).toEqual({ logs, isFresh: false });
  });
});
