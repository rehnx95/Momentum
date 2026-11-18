import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOfflineMutations } from "../../../shared/lib/offlineMutationStore";
import { queueOfflineMutation, syncOfflineMutations } from "../../../shared/lib/offlineSync";
import { emptyLog } from "../lib/dailyLogModel";
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
  Object.defineProperty(globalThis, "navigator", {
    value: { onLine: true },
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
    delete globalThis.navigator;
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
    expect(setSavedSnapshot).toHaveBeenLastCalledWith(JSON.stringify(setLog.mock.calls[0][0]));
  });

  it("merges a built-in sheet added while an uncached log is loading", async () => {
    const date = "2025-03-14";
    let finishLoad;
    const maybeSingle = vi.fn(
      () =>
        new Promise((resolve) => {
          finishLoad = resolve;
        }),
    );
    fromMock.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle,
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }));

    const initialLog = emptyLog(date);
    const logRef = { current: initialLog };
    const savedSnapshotRef = { current: null };
    const setLog = vi.fn();
    let renderer;

    function HookHarness() {
      useDailyLogPersistence({
        date,
        dateRef: { current: date },
        dirty: false,
        loadFailed: false,
        loadRequest: 0,
        loading: true,
        log: logRef.current,
        logRef,
        savedSnapshotRef,
        setLoadFailed: vi.fn(),
        setLoading: vi.fn(),
        setLog,
        setMessage: vi.fn(),
        setSavedSnapshot: vi.fn(),
        setStatus: vi.fn(),
        userId: "uncached-user",
        validationErrors: [],
      });
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(React.createElement(HookHarness));
    });
    await vi.waitFor(() => expect(maybeSingle).toHaveBeenCalledOnce());

    logRef.current = {
      ...initialLog,
      custom_tasks: [
        {
          id: "sheet:sheet-1",
          sheetId: "sheet-1",
          name: "Algorithms",
          slots: [{ start: "", end: "" }],
        },
      ],
    };

    await act(async () => {
      finishLoad({
        data: {
          date,
          sleep_time: "22:30",
          wake_time: "06:15",
          custom_tasks: [
            {
              id: "sheet:sheet-1",
              sheetId: "sheet-1",
              name: "Algorithms",
              slots: [{ start: "09:00", end: "10:00" }],
            },
          ],
        },
        error: null,
      });
      await Promise.resolve();
    });

    const mergedLog = setLog.mock.calls.at(-1)[0];
    expect(mergedLog.sleep_time).toBe("22:30");
    expect(mergedLog.custom_tasks).toHaveLength(1);
    expect(mergedLog.custom_tasks[0].slots).toEqual([
      { start: "09:00", end: "10:00" },
      { start: "", end: "" },
    ]);
    act(() => renderer.unmount());
  });

  it("unlocks a pending local log before its cloud sync finishes", async () => {
    const date = "2025-03-14";
    const userId = "pending-user";
    const draft = {
      date,
      sleep_time: "",
      wake_time: "",
      custom_tasks: [{ id: "reading", name: "Reading", slots: [{ start: "", end: "" }] }],
    };
    const updatedAt = "2025-03-14T12:00:00.000Z";
    await queueOfflineMutation({
      userId,
      type: "daily-log",
      entityId: date,
      payload: {
        row: { ...draft, user_id: userId, updated_at: updatedAt },
        draft,
        expectedUpdatedAt: null,
      },
    });
    let finishUpsert;
    const pendingUpsert = new Promise((resolve) => {
      finishUpsert = resolve;
    });
    const upsert = vi.fn(() => pendingUpsert);
    fromMock.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert,
    }));
    const setLoading = vi.fn();
    const setLog = vi.fn();
    const savedSnapshotRef = { current: null };
    let renderer;

    function HookHarness() {
      useDailyLogPersistence({
        date,
        dateRef: { current: date },
        dirty: false,
        loadFailed: false,
        loadRequest: 0,
        loading: true,
        log: { ...draft, custom_tasks: [] },
        logRef: { current: { ...draft, custom_tasks: [] } },
        savedSnapshotRef,
        setLoadFailed: vi.fn(),
        setLoading,
        setLog,
        setMessage: vi.fn(),
        setSavedSnapshot: vi.fn(),
        setStatus: vi.fn(),
        userId,
        validationErrors: [],
      });
      return null;
    }

    await act(async () => {
      renderer = TestRenderer.create(React.createElement(HookHarness));
    });
    await vi.waitFor(() => expect(upsert).toHaveBeenCalledOnce());

    expect(setLoading).toHaveBeenCalledWith(false);
    expect(setLog).toHaveBeenCalledWith(draft);

    await act(async () => {
      finishUpsert({ error: null });
      await Promise.resolve();
    });
    await vi.waitFor(async () => expect(await getOfflineMutations(userId)).toHaveLength(0));
    act(() => renderer.unmount());
  });

  it("starts autosaving shortly after an edit", async () => {
    const date = "2025-03-14";
    const log = {
      date,
      sleep_time: "",
      wake_time: "",
      custom_tasks: [{ id: "reading", name: "Reading", slots: [{ start: "", end: "" }] }],
    };
    let hookResult;

    function HookHarness() {
      hookResult = useDailyLogPersistence({
        date,
        dateRef: { current: date },
        dirty: true,
        loadFailed: false,
        loadRequest: 0,
        loading: false,
        log,
        logRef: { current: log },
        savedSnapshotRef: { current: JSON.stringify({ ...log, custom_tasks: [] }) },
        setLoadFailed: vi.fn(),
        setLoading: vi.fn(),
        setLog: vi.fn(),
        setMessage: vi.fn(),
        setSavedSnapshot: vi.fn(),
        setStatus: vi.fn(),
        userId: "user-1",
        validationErrors: [],
      });
      return null;
    }

    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(HookHarness));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(hookResult).toBeTruthy();
    expect(window.setTimeout).toHaveBeenCalledWith(expect.any(Function), 300);
    act(() => renderer.unmount());
  });

  it("stops showing saving once the local copy is secure, even if cloud sync is slow", async () => {
    const date = "2025-03-14";
    const baseLog = {
      date,
      sleep_time: "",
      wake_time: "",
      custom_tasks: [],
    };
    let finishUpsert;
    const pendingUpsert = new Promise((resolve) => {
      finishUpsert = resolve;
    });
    const upsert = vi.fn(() => pendingUpsert);
    fromMock.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert,
    }));
    const logRef = { current: baseLog };
    const savedSnapshotRef = { current: JSON.stringify(baseLog) };
    const setStatus = vi.fn();
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
        setMessage: vi.fn(),
        setSavedSnapshot: vi.fn(),
        setStatus,
        userId: "user-1",
        validationErrors: [],
      });
      return null;
    }

    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(HookHarness));
      await Promise.resolve();
      await Promise.resolve();
    });

    let saveResult;
    await act(async () => {
      saveResult = await hookResult.saveLog(
        {
          ...baseLog,
          custom_tasks: [
            { id: "reading", name: "Reading", slots: [{ start: "09:00", end: "10:00" }] },
          ],
        },
        date,
      );
    });
    await vi.waitFor(() => expect(upsert).toHaveBeenCalledOnce());

    expect(saveResult).toBe(true);
    expect(hookResult.saving).toBe(false);
    expect(setStatus).toHaveBeenCalledWith("Saved");

    await act(async () => {
      finishUpsert({ error: null });
      await Promise.resolve();
    });
    await vi.waitFor(async () => expect(await getOfflineMutations("user-1")).toHaveLength(0));
    act(() => renderer.unmount());
  });

  it("allows overlapping slots to save while keeping overlap validation as a warning", async () => {
    const date = "2025-03-14";
    const baseLog = {
      date,
      sleep_time: "",
      wake_time: "",
      dsa_slots: [],
      backend_slots: [],
      custom_tasks: [],
    };
    const logRef = { current: baseLog };
    const savedSnapshotRef = { current: JSON.stringify(baseLog) };
    const upsert = vi.fn().mockResolvedValue({ error: null });
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
        setMessage: vi.fn(),
        setSavedSnapshot: vi.fn(),
        setStatus: vi.fn(),
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
          ...baseLog,
          custom_tasks: [
            { id: "reading", name: "Reading", slots: [{ start: "09:00", end: "11:00" }] },
            { id: "coding", name: "Coding", slots: [{ start: "10:00", end: "12:00" }] },
          ],
        },
        date,
      );
    });

    expect(result).toBe(true);
    expect(upsert).toHaveBeenCalledOnce();
  });

  it("does not save an invalid time slot", async () => {
    const date = "2025-03-14";
    const logRef = {
      current: { date, sleep_time: "", wake_time: "", custom_tasks: [] },
    };
    const savedSnapshotRef = { current: JSON.stringify(logRef.current) };
    const upsert = vi.fn();
    const setStatus = vi.fn();
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
        setMessage: vi.fn(),
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
          custom_tasks: [
            { id: "reading", name: "Reading", slots: [{ start: "12:00", end: "11:00" }] },
          ],
        },
        date,
      );
    });

    expect(result).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
    expect(setStatus).toHaveBeenCalledWith("Fix errors to save");
  });

  it("does not report a conflict for equivalent timestamp formats", async () => {
    const date = "2025-03-14";
    const databaseTimestamp = "2025-03-14T12:00:00+00:00";
    const loadedLog = {
      date,
      sleep_time: "",
      wake_time: "",
      dsa_slots: [],
      backend_slots: [],
      dsa_hours: null,
      backend_hours: null,
      custom_tasks: [],
      updated_at: databaseTimestamp,
    };
    const logRef = { current: loadedLog };
    const savedSnapshotRef = { current: JSON.stringify(loadedLog) };
    const savedUpdatedAtRef = { current: "2025-03-14T12:00:00.000Z" };
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const setMessage = vi.fn();
    const setStatus = vi.fn();
    fromMock.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: loadedLog, error: null }),
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
        savedUpdatedAtRef,
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
    savedUpdatedAtRef.current = "2025-03-14T12:00:00.000Z";

    let result;
    await act(async () => {
      result = await hookResult.saveLog(
        {
          ...loadedLog,
          custom_tasks: [
            { id: "task-1", name: "Reading", slots: [{ start: "09:00", end: "10:00" }] },
          ],
        },
        date,
      );
    });

    expect(result).toBe(true);
    await vi.waitFor(() => expect(upsert).toHaveBeenCalledOnce());
    expect(setMessage).not.toHaveBeenCalledWith(expect.stringContaining("changed elsewhere"));

    savedUpdatedAtRef.current = "2025-03-14T11:00:00.000Z";
    let conflictResult;
    await act(async () => {
      conflictResult = await hookResult.saveLog(
        {
          ...loadedLog,
          custom_tasks: [
            { id: "task-1", name: "Reading", slots: [{ start: "10:00", end: "11:00" }] },
          ],
        },
        date,
      );
    });

    expect(conflictResult).toBe(true);
    await vi.waitFor(() =>
      expect(setStatus).toHaveBeenCalledWith("This day changed elsewhere"),
    );
    expect(upsert).toHaveBeenCalledOnce();
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

    expect(result).toBe(true);
    await vi.waitFor(() =>
      expect(setMessage).toHaveBeenCalledWith(expect.stringContaining("42501")),
    );
  });

  it("saves a Daily Log locally offline and syncs it after reconnecting", async () => {
    const date = "2025-03-14";
    const baseLog = {
      date,
      sleep_time: "",
      wake_time: "",
      dsa_slots: [],
      backend_slots: [],
      custom_tasks: [],
    };
    const upsert = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert,
    }));
    globalThis.navigator.onLine = false;

    const logRef = { current: baseLog };
    const savedSnapshotRef = { current: JSON.stringify(baseLog) };
    const savedUpdatedAtRef = { current: null };
    const setMessage = vi.fn();
    const setStatus = vi.fn();
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
        savedUpdatedAtRef,
        setLoadFailed: vi.fn(),
        setLoading: vi.fn(),
        setLog: vi.fn(),
        setMessage,
        setSavedSnapshot: vi.fn(),
        setStatus,
        userId: "offline-user",
        validationErrors: [],
      });
      return null;
    }

    await act(async () => {
      TestRenderer.create(React.createElement(HookHarness));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    let saveResult;
    await act(async () => {
      saveResult = await hookResult.saveLog(
        {
          ...baseLog,
          custom_tasks: [
            { id: "reading", name: "Reading", slots: [{ start: "09:00", end: "10:00" }] },
          ],
        },
        date,
      );
    });

    expect(saveResult).toBe(true);
    expect(upsert).not.toHaveBeenCalled();
    expect(await getOfflineMutations("offline-user")).toHaveLength(1);
    expect(setStatus).toHaveBeenCalledWith("Saved");
    expect(setMessage).toHaveBeenLastCalledWith("");

    globalThis.navigator.onLine = true;
    await act(async () => {
      await syncOfflineMutations("offline-user");
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        date,
        user_id: "offline-user",
        custom_tasks: [expect.objectContaining({ id: "reading" })],
      }),
      { onConflict: "user_id,date" },
    );
    expect(await getOfflineMutations("offline-user")).toHaveLength(0);
  });

  it("lets the user explicitly replace a newer cloud copy with preserved edits", async () => {
    const date = "2025-03-14";
    const remoteUpdatedAt = "2025-03-14T12:00:00.000Z";
    const baseLog = {
      date,
      sleep_time: "",
      wake_time: "",
      dsa_slots: [],
      backend_slots: [],
      custom_tasks: [],
    };
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValue({ data: { updated_at: remoteUpdatedAt }, error: null });
    fromMock.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle,
      upsert,
    }));

    const logRef = { current: baseLog };
    const savedSnapshotRef = { current: JSON.stringify(baseLog) };
    const savedUpdatedAtRef = { current: null };
    const setStatus = vi.fn();
    const setMessage = vi.fn();
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
        savedUpdatedAtRef,
        setLoadFailed: vi.fn(),
        setLoading: vi.fn(),
        setLog: vi.fn(),
        setMessage,
        setSavedSnapshot: vi.fn(),
        setStatus,
        userId: "conflict-user",
        validationErrors: [],
      });
      return null;
    }

    await act(async () => {
      TestRenderer.create(React.createElement(HookHarness));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const draft = {
      ...baseLog,
      custom_tasks: [
        { id: "local-task", name: "Local work", slots: [{ start: "09:00", end: "10:00" }] },
      ],
    };
    logRef.current = draft;
    let saveResult;
    await act(async () => {
      saveResult = await hookResult.saveLog(draft, date);
    });
    expect(saveResult).toBe(true);
    await vi.waitFor(() =>
      expect(setStatus).toHaveBeenCalledWith("This day changed elsewhere"),
    );

    let overwriteResult;
    await act(async () => {
      overwriteResult = await hookResult.overwriteConflict();
    });

    expect(overwriteResult).toBe(true);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ custom_tasks: [expect.objectContaining({ id: "local-task" })] }),
      { onConflict: "user_id,date" },
    );
    expect(await getOfflineMutations("conflict-user")).toHaveLength(0);
    expect(savedUpdatedAtRef.current).toEqual(expect.any(String));
  });
});
