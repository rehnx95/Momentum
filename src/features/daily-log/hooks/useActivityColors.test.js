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
  getOfflineMutations: mocks.getOfflineMutations,
}));

vi.mock("../../../shared/lib/offlineSync", () => ({
  queueOfflineMutation: mocks.queueOfflineMutation,
  syncOfflineMutations: mocks.syncOfflineMutations,
}));

import useActivityColors from "./useActivityColors";

describe("useActivityColors", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.from.mockReset();
    mocks.getOfflineMutations.mockReset();
    mocks.queueOfflineMutation.mockReset();
    mocks.syncOfflineMutations.mockReset();
    mocks.syncOfflineMutations.mockResolvedValue({ pending: 0, failures: [], conflicts: [] });
    vi.stubGlobal("navigator", { onLine: false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses cached and queued colors offline, then refreshes after reconnecting", async () => {
    localStorage.setItem("momentum:activity-colors:user-1", JSON.stringify({ reading: "#112233" }));
    mocks.getOfflineMutations
      .mockResolvedValueOnce([
        {
          type: "activity-color",
          payload: { activityName: "Reading", color: "#aabbcc" },
        },
      ])
      .mockResolvedValueOnce([]);

    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ activity_key: "reading", color: "#445566" }],
        error: null,
      }),
    };
    mocks.from.mockReturnValue(query);
    const onError = vi.fn();
    const { result } = renderHook(() => useActivityColors("user-1", onError));

    await waitFor(() => expect(result.current.activityColors.reading).toBe("#aabbcc"));
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.syncOfflineMutations).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();

    await act(async () => {
      navigator.onLine = true;
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => expect(result.current.activityColors.reading).toBe("#445566"));
    expect(mocks.from).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });

  it("keeps cached colors when the request fails with a fetch error", async () => {
    localStorage.setItem("momentum:activity-colors:user-1", JSON.stringify({ reading: "#112233" }));
    vi.stubGlobal("navigator", { onLine: true });
    mocks.getOfflineMutations.mockResolvedValue([]);

    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    };
    mocks.from.mockReturnValue(query);
    const onError = vi.fn();
    const { result } = renderHook(() => useActivityColors("user-1", onError));

    await waitFor(() => expect(result.current.activityColors.reading).toBe("#112233"));
    expect(onError).not.toHaveBeenCalled();
  });
});
