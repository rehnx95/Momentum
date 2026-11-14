import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useDailyLogPersistence from "./useDailyLogPersistence";

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

describe("useDailyLogPersistence", () => {
  beforeEach(() => {
    installBrowserStubs();
    fromMock.mockReset();
    fromMock.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          date: "2025-03-14",
          sleep_time: "22:30",
          wake_time: "06:15",
          custom_tasks: [
            { id: "task-1", name: "Reading", slots: [{ start: "21:00", end: "22:00" }] },
          ],
        },
        error: null,
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }));
  });

  afterEach(() => {
    delete globalThis.localStorage;
    delete globalThis.window;
    delete globalThis.document;
  });

  it("loads the saved daily log and restores the latest snapshot", async () => {
    const setLog = vi.fn();
    const setSavedSnapshot = vi.fn();
    const setStatus = vi.fn();
    const setLoadFailed = vi.fn();
    const setLoading = vi.fn();
    const setMessage = vi.fn();

    const logRef = {
      current: { date: "2025-03-14", sleep_time: "", wake_time: "", custom_tasks: [] },
    };
    const savedSnapshotRef = { current: JSON.stringify(logRef.current) };
    let hookResult;

    function HookHarness() {
      hookResult = useDailyLogPersistence({
        date: "2025-03-14",
        dateRef: { current: "2025-03-14" },
        dirty: false,
        loadFailed: false,
        loadRequest: 0,
        loading: false,
        log: logRef.current,
        logRef,
        savedSnapshotRef,
        setLoadFailed,
        setLoading,
        setLog,
        setMessage,
        setSavedSnapshot,
        setStatus,
        userId: "user-1",
        validationErrors: [],
      });
      return null;
    }

    await act(async () => {
      TestRenderer.create(React.createElement(HookHarness));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(hookResult).toBeTruthy();
    expect(setLog).toHaveBeenCalledWith(expect.objectContaining({ date: "2025-03-14" }));
    expect(setStatus).toHaveBeenCalledWith("Saved");
    expect(setLoading).toHaveBeenCalled();
  });

  it("includes the Supabase error code when a daily log save fails", async () => {
    const setStatus = vi.fn();
    const setMessage = vi.fn();
    const date = "2025-03-14";
    const logRef = {
      current: { date, sleep_time: "", wake_time: "", custom_tasks: [] },
    };
    const savedSnapshotRef = { current: JSON.stringify(logRef.current) };
    const upsert = vi.fn().mockResolvedValue({
      error: { code: "42501", message: "new row violates row-level security policy" },
    });
    fromMock.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert,
    }));
    let hookResult;

    function HookHarness() {
      hookResult = useDailyLogPersistence({
        date,
        dateRef: { current: date },
        dirty: false,
        loadFailed: false,
        loadRequest: 0,
        loading: false,
        log: logRef.current,
        logRef,
        savedSnapshotRef,
        setLoadFailed: vi.fn(),
        setLoading: vi.fn(),
        setLog: vi.fn(),
        setMessage,
        setSavedSnapshot: vi.fn(),
        setStatus,
        userId: "user-1",
        validationErrors: [],
      });
      return null;
    }

    await act(async () => {
      TestRenderer.create(React.createElement(HookHarness));
      await Promise.resolve();
      await Promise.resolve();
    });

    let result;
    await act(async () => {
      result = await hookResult.saveLog(
        {
          ...logRef.current,
          custom_tasks: [{ id: "task-1", name: "Reading", slots: [{ start: "", end: "" }] }],
        },
        date,
      );
    });

    expect(result).toBe(false);
    expect(setMessage).toHaveBeenCalledWith(expect.stringContaining("42501"));
  });
});
