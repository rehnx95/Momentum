import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readUserDataCache, writeUserDataCache } from "../../../shared/lib/userDataCache";
import { useProgress } from "./useProgress";

const fromMock = vi.hoisted(() => vi.fn());
const progressStateFilterMock = vi.hoisted(() => vi.fn());

function installBrowserStubs() {
  const store = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
      key: (index) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    },
    configurable: true,
  });

  Object.defineProperty(globalThis, "window", {
    value: {
      setInterval: vi.fn(() => 1),
      clearInterval: vi.fn(),
      setTimeout: vi.fn(() => 1),
      clearTimeout: vi.fn(),
    },
    configurable: true,
  });

  Object.defineProperty(globalThis, "document", {
    value: {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      visibilityState: "visible",
      documentElement: {
        setAttribute: vi.fn(),
        removeAttribute: vi.fn(),
      },
    },
    configurable: true,
  });
}

vi.mock("../../../shared/lib/supabase", () => ({
  supabase: { from: fromMock },
}));

vi.mock("../../../shared/lib/userDataCache", () => ({
  readUserDataCache: vi.fn(() => null),
  writeUserDataCache: vi.fn(),
}));

describe("useProgress", () => {
  beforeEach(() => {
    installBrowserStubs();
    fromMock.mockReset();
    progressStateFilterMock.mockReset();
    vi.mocked(readUserDataCache).mockReset();
    vi.mocked(readUserDataCache).mockReturnValue(null);
    fromMock.mockImplementation((table) => {
      if (table === "progress") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: progressStateFilterMock.mockResolvedValue({
            data: [
              {
                problem_id: "problem-1",
                state: "done",
                completed_on: "2025-03-14",
                updated_at: "2025-03-14T12:00:00.000Z",
              },
              {
                problem_id: "problem-2",
                state: "done",
                completed_on: null,
                updated_at: "2025-03-14T23:00:00.000Z",
              },
              {
                problem_id: "problem-3",
                state: "todo",
                completed_on: null,
                updated_at: "2025-03-15T12:00:00.000Z",
              },
            ],
            error: null,
          }),
        };
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ date: "2025-03-14", count: 1 }],
          error: null,
        }),
      };
    });
  });

  afterEach(() => {
    delete globalThis.localStorage;
    delete globalThis.window;
    delete globalThis.document;
  });

  it("derives activity metrics from solved progress dates", async () => {
    let hookResult;
    const user = { id: "user-1" };

    function HookHarness() {
      hookResult = useProgress(user);
      return null;
    }

    await act(async () => {
      TestRenderer.create(React.createElement(HookHarness));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(hookResult.progress["problem-1"]).toBe("done");
    expect(hookResult.getState("problem-3")).toBe("todo");
    expect(hookResult.activityLog["2025-03-14"]).toBe(2);
    expect(hookResult.completedOn["problem-1"]).toBe("2025-03-14");
    expect(progressStateFilterMock).toHaveBeenCalledWith("state", ["todo", "done", "skipped"]);
  });

  it("renders a valid cached progress snapshot before the network refresh", async () => {
    const cachedData = {
      progress: { "problem-1": "done" },
      activityLog: { "2025-03-14": 1 },
      completedOn: { "problem-1": "2025-03-14" },
      completedAt: { "problem-1": "2025-03-14T12:00:00.000Z" },
    };
    vi.mocked(readUserDataCache).mockReturnValue(cachedData);
    let firstRender;
    let hookResult;
    const user = { id: "user-1" };

    function HookHarness() {
      hookResult = useProgress(user);
      React.useLayoutEffect(() => {
        firstRender = {
          loading: hookResult.loading,
          progress: hookResult.progress,
        };
      }, []);
      return null;
    }

    await act(async () => {
      TestRenderer.create(React.createElement(HookHarness));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(firstRender.loading).toBe(false);
    expect(firstRender.progress).toEqual(cachedData.progress);
  });

  it("does not issue a separate activity-log write when progress changes", async () => {
    const progressUpsert = vi.fn().mockResolvedValue({ error: null });
    const activityWrite = vi.fn();
    fromMock.mockImplementation((table) => {
      if (table === "progress") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
          upsert: progressUpsert,
        };
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        upsert: activityWrite,
        delete: vi.fn(() => ({ match: activityWrite })),
      };
    });

    let hookResult;
    const user = { id: "user-1" };
    function HookHarness() {
      hookResult = useProgress(user);
      return null;
    }

    await act(async () => {
      TestRenderer.create(React.createElement(HookHarness));
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      await hookResult.update("problem-2", "done");
    });

    expect(progressUpsert).toHaveBeenCalledOnce();
    expect(activityWrite).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalledWith("activity_log");
  });

  it("caches local-only progress resets without changing other sheet progress", async () => {
    let hookResult;
    const user = { id: "user-1" };

    function HookHarness() {
      hookResult = useProgress(user);
      return null;
    }

    await act(async () => {
      TestRenderer.create(React.createElement(HookHarness));
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      await hookResult.reset(["problem-1"], { persist: false });
    });

    const cachedProgress = vi.mocked(writeUserDataCache).mock.lastCall[2];
    expect(cachedProgress.progress).not.toHaveProperty("problem-1");
    expect(cachedProgress.progress).toMatchObject({
      "problem-2": "done",
      "problem-3": "todo",
    });
    expect(cachedProgress.activityLog["2025-03-14"]).toBe(1);
  });
});
