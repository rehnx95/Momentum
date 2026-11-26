// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getOfflineMutations: vi.fn(),
  queueOfflineMutation: vi.fn(),
  syncOfflineMutations: vi.fn(),
}));

vi.mock("../../../shared/lib/supabase", () => ({
  supabase: { from: mocks.from },
}));

vi.mock("../../../shared/lib/offlineMutationStore", () => ({
  removeOfflineMutations: vi.fn(),
  getOfflineMutations: mocks.getOfflineMutations,
}));

vi.mock("../../../shared/lib/offlineSync", () => ({
  queueOfflineMutation: mocks.queueOfflineMutation,
  syncOfflineMutations: mocks.syncOfflineMutations,
}));

import useDailyLogHistory from "./useDailyLogHistory";
import { setFullLogCache } from "../lib/dailyLogHistoryCache";

describe("useDailyLogHistory", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.from.mockReset();
    mocks.getOfflineMutations.mockReset().mockResolvedValue([]);
    mocks.queueOfflineMutation.mockReset();
    mocks.syncOfflineMutations.mockReset();
    vi.stubGlobal("navigator", { onLine: false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses cached history without requesting the server while offline", async () => {
    const logs = [{ date: "2026-11-25", custom_tasks: [] }];
    setFullLogCache("user-1", logs, false);
    const setMessage = vi.fn();

    const { result } = renderHook(() => useDailyLogHistory("user-1", "full", setMessage));

    await waitFor(() => expect(result.current.allLogs).toEqual(logs));
    expect(mocks.from).not.toHaveBeenCalled();
    expect(setMessage).toHaveBeenCalledWith("Offline. Showing saved Full Log history.");
  });

  it("refreshes cached history after reconnecting", async () => {
    const logs = [{ date: "2026-11-25", custom_tasks: [] }];
    const refreshedLogs = [{ date: "2026-11-26", custom_tasks: [] }];
    setFullLogCache("user-1", logs, false);
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: refreshedLogs, error: null }),
    };
    mocks.from.mockReturnValue(query);
    const setMessage = vi.fn();

    const { result } = renderHook(() => useDailyLogHistory("user-1", "full", setMessage));
    await waitFor(() => expect(result.current.allLogs).toEqual(logs));
    expect(mocks.from).not.toHaveBeenCalled();

    await act(async () => {
      navigator.onLine = true;
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => expect(result.current.allLogs[0].date).toBe("2026-11-26"));
    expect(mocks.from).toHaveBeenCalled();
    expect(setMessage).toHaveBeenCalledWith(expect.any(Function));
  });
});
