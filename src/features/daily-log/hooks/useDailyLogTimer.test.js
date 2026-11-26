import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useDailyLogTimer from "./useDailyLogTimer";
import { timerStorageKey } from "../lib/dailyLogModel";
import { getLocalDateKey } from "../../../shared/utils/date";
import { getOfflineMutations } from "../../../shared/lib/offlineMutationStore";

const fromMock = vi.hoisted(() => vi.fn());

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
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      setInterval: vi.fn(() => 1),
      clearInterval: vi.fn(),
    },
    configurable: true,
  });
  Object.defineProperty(globalThis, "document", {
    value: {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      visibilityState: "visible",
    },
    configurable: true,
  });
  Object.defineProperty(globalThis, "navigator", {
    value: { onLine: true },
    configurable: true,
  });
}

vi.mock("../../../shared/lib/supabase", () => ({
  supabase: { from: fromMock },
}));

describe("useDailyLogTimer", () => {
  beforeEach(() => {
    installBrowserStubs();
    localStorage.clear();
    fromMock.mockImplementation(() => {
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      const createWriteBuilder = () => {
        const builder = {
          eq: vi.fn(() => builder),
          select: vi.fn().mockResolvedValue({
            data: [{ updated_at: "2025-03-15T12:00:00.000Z" }],
            error: null,
          }),
          then: (resolve, reject) => Promise.resolve({ error: null }).then(resolve, reject),
        };
        return builder;
      };
      query.insert = vi.fn(createWriteBuilder);
      query.update = vi.fn(createWriteBuilder);
      query.delete = vi.fn(createWriteBuilder);
      return query;
    });
  });

  afterEach(() => {
    delete globalThis.localStorage;
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.navigator;
    vi.useRealTimers();
  });

  it("starts and stops a timer without leaving a stale running state", async () => {
    const setLog = vi.fn();
    const setMessage = vi.fn();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateKey = getLocalDateKey(today);
    let hookResult;

    function HookHarness() {
      hookResult = useDailyLogTimer({
        userId: "user-1",
        dateRef: { current: dateKey },
        logRef: { current: { date: dateKey, sleep_time: "", wake_time: "", custom_tasks: [] } },
        setLog,
        setMessage,
      });
      return null;
    }

    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(HookHarness));
      await Promise.resolve();
    });

    let started;
    await act(async () => {
      started = await hookResult.startTimer("task-1", "Reading", "#3b82f6");
    });
    expect(started).toBe(true);
    expect(hookResult.runningTimer).toMatchObject({ activityId: "task-1", shared: true });
    expect(localStorage.getItem(timerStorageKey("user-1"))).not.toBeNull();

    await act(async () => {
      expect(await hookResult.stopTimer()).toBe(true);
    });
    expect(hookResult.runningTimer).toBeNull();
    expect(localStorage.getItem(timerStorageKey("user-1"))).toBeNull();
    expect(await getOfflineMutations("user-1")).toHaveLength(0);
    act(() => renderer.unmount());
  });

  it("queues timer segments for each date when stopping offline", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 15, 0, 30));
    globalThis.navigator.onLine = false;
    const now = new Date();
    const previousDay = new Date(2025, 2, 14, 23, 30);
    const dateKey = getLocalDateKey(now);
    localStorage.setItem(
      timerStorageKey("user-offline"),
      JSON.stringify({
        activityId: "task-1",
        activityName: "Reading",
        color: "#3b82f6",
        startedAt: previousDay.toISOString(),
      }),
    );
    const setLog = vi.fn();
    let hookResult;

    function HookHarness() {
      hookResult = useDailyLogTimer({
        userId: "user-offline",
        dateRef: { current: dateKey },
        logRef: { current: { date: dateKey, sleep_time: "", wake_time: "", custom_tasks: [] } },
        setLog,
        setMessage: vi.fn(),
      });
      return null;
    }

    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(HookHarness));
    });
    await act(async () => {
      expect(await hookResult.stopTimer()).toBe(true);
    });

    const pending = await getOfflineMutations("user-offline");
    const slotMutations = pending.filter((mutation) => mutation.type === "daily-log-slot");
    expect(slotMutations).toHaveLength(2);
    expect(slotMutations.map(({ payload }) => payload.date)).toEqual([
      getLocalDateKey(previousDay),
      dateKey,
    ]);
    expect(pending.some((mutation) => mutation.payload.operation === "stop")).toBe(true);
    expect(setLog).toHaveBeenCalledOnce();
    expect(localStorage.getItem(timerStorageKey("user-offline"))).toBeNull();
    act(() => renderer.unmount());
  });

  it("stops a timer despite unrelated invalid entries in the current log", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 15, 12, 0));
    globalThis.navigator.onLine = false;
    const startedAt = new Date(2025, 2, 15, 11, 0).toISOString();
    localStorage.setItem(
      timerStorageKey("invalid-log-user"),
      JSON.stringify({
        timerId: "e1100000-0000-4000-8000-000000000001",
        activityId: "task-1",
        activityName: "Reading",
        startedAt,
      }),
    );
    let hookResult;

    function HookHarness() {
      hookResult = useDailyLogTimer({
        userId: "invalid-log-user",
        dateRef: { current: getLocalDateKey(new Date()) },
        logRef: {
          current: {
            date: getLocalDateKey(new Date()),
            sleep_time: "",
            wake_time: "",
            custom_tasks: [{ id: "broken", name: "Broken", slots: [{ start: "bad", end: "" }] }],
          },
        },
        setLog: vi.fn(),
        setMessage: vi.fn(),
      });
      return null;
    }

    await act(async () => {
      TestRenderer.create(React.createElement(HookHarness));
    });
    await act(async () => {
      expect(await hookResult.stopTimer()).toBe(true);
    });
    expect(hookResult.runningTimer).toBeNull();
  });
});
