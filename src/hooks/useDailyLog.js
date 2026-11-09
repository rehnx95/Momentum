import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { slotMinutes, splitIntervalByDay, validateDay } from "../utils/time";

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 10;
const TIMER_STORAGE = (userId) => `track-sheet-running-timer:${userId}`;
export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(value) {
  return value ? String(value).slice(0, 5) : "";
}

function normalizeSlots(slots) {
  if (!Array.isArray(slots)) return [];
  return slots.map((slot) => ({
    ...slot,
    start: formatTime(slot.start),
    end: formatTime(slot.end),
  }));
}

function emptyLog(date) {
  return {
    date,
    sleep_time: "",
    wake_time: "",
    dsa_slots: [],
    backend_slots: [],
    custom_tasks: [],
  };
}

function normalizeLog(data, date) {
  const row = data || emptyLog(date);
  const savedTasks = Array.isArray(row.custom_tasks) ? row.custom_tasks : [];
  return {
    ...emptyLog(date),
    ...row,
    sleep_time: formatTime(row.sleep_time),
    wake_time: formatTime(row.wake_time),
    dsa_slots: [],
    backend_slots: [],
    dsa_hours: null,
    backend_hours: null,
    custom_tasks: [
      ...savedTasks.map((task) => ({
        ...task,
        slots: normalizeSlots(task.slots),
      })),
    ],
  };
}

function durationSlots(slots) {
  return slots.reduce((total, slot) => {
    const minutes = timerSlotMinutes(slot);
    return total + (minutes ?? 0);
  }, 0);
}

function timerSlotMinutes(slot) {
  if (slot.endDayOffset === 1 && slot.end === "00:00") {
    const start = slotMinutes({ start: slot.start, end: "23:59" });
    return start === null ? 0 : start + 1;
  }
  return slotMinutes(slot);
}

function totalActivityMinutes(log) {
  const custom = (log.custom_tasks || []).reduce(
    (sum, task) => sum + durationSlots(task.slots || []),
    0,
  );
  return custom;
}

function sleepMinutes(log) {
  if (!log.sleep_time || !log.wake_time) return 0;
  return slotMinutes(
    { start: log.sleep_time, end: log.wake_time },
    { wrap: true },
  ) || 0;
}

function timerStorageGet(userId) {
  try {
    const value = localStorage.getItem(TIMER_STORAGE(userId));
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error("Could not read the running timer:", error);
    return null;
  }
}

export default function useDailyLog(user) {
  const [date, setDateState] = useState(() => getLocalDateKey());
  const dateRef = useRef(date);
  const [log, setLogState] = useState(() => emptyLog(getLocalDateKey()));
  const logRef = useRef(log);
  const [savedSnapshot, setSavedSnapshot] = useState(null);
  const savedSnapshotRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadRequest, setLoadRequest] = useState(0);
  const [saving, setSaving] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const saveQueueRef = useRef(Promise.resolve(true));
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const [viewMode, setViewMode] = useState("daily");
  const [currentStreak, setCurrentStreak] = useState(0);
  const [problemCounts, setProblemCounts] = useState({});
  const logsRequestRef = useRef(0);
  const [allLogs, setAllLogs] = useState([]);
  const [allLogsLoading, setAllLogsLoading] = useState(false);
  const [hasOlderLogs, setHasOlderLogs] = useState(false);
  const [olderLogsLoading, setOlderLogsLoading] = useState(false);
  const [runningTimer, setRunningTimer] = useState(() => timerStorageGet(user.id));
  const [timerNow, setTimerNow] = useState(Date.now());
  const autosaveTimer = useRef(null);

  const setDate = useCallback((nextDate) => {
    dateRef.current = nextDate;
    setDateState(nextDate);
  }, []);

  const setLog = useCallback((update) => {
    const next = typeof update === "function" ? update(logRef.current) : update;
    logRef.current = next;
    setLogState(next);
  }, []);

  const validation = useMemo(() => validateDay(log), [log]);
  const studiedMinutes = useMemo(() => totalActivityMinutes(log), [log]);
  const sleptMinutes = useMemo(() => sleepMinutes(log), [log]);
  const dirty = savedSnapshot !== null && JSON.stringify(log) !== savedSnapshot;
  const activeCustomTasks = log.custom_tasks;

  const saveLog = useCallback((draft, targetDate) => {
    const nextDraft = draft || logRef.current;
    const nextDate = targetDate || dateRef.current;
    const result = validateDay(nextDraft);
    if (result.errors.length) {
      if (nextDate === dateRef.current) {
        setStatus("Fix errors to save");
        setMessage("");
      }
      return false;
    }

    const snapshot = JSON.stringify(nextDraft);
    const save = async () => {
      if (loadFailed) return false;
      if (snapshot === savedSnapshotRef.current) return true;
      setSaving(true);
      if (nextDate === dateRef.current) {
        setStatus("Saving…");
        setMessage("");
      }
      const { error } = await supabase.from("daily_logs").upsert(
        {
          user_id: user.id,
          date: nextDate,
          sleep_time: nextDraft.sleep_time || null,
          wake_time: nextDraft.wake_time || null,
          dsa_slots: [],
          backend_slots: [],
          custom_tasks: nextDraft.custom_tasks,
          dsa_hours: null,
          backend_hours: null,
        },
        { onConflict: "user_id,date" },
      );
      if (error) throw error;
      if (nextDate === dateRef.current) {
        savedSnapshotRef.current = snapshot;
        setSavedSnapshot(snapshot);
        setStatus("Saved");
        setMessage("");
      }
      return true;
    };
    const runSave = async () => {
      try {
        return await save();
      } catch (error) {
        console.error("Failed to save daily log:", error);
        if (nextDate === dateRef.current) {
          setStatus("Could not save");
          setMessage("Could not save this daily log. Your edits are still here.");
        }
        return false;
      } finally {
        setSaving(false);
      }
    };

    const queuedPromise = saveQueueRef.current.then(runSave, runSave);
    saveQueueRef.current = queuedPromise;
    return queuedPromise;
  }, [loadFailed, user.id]);

  const saveLogRef = useRef(saveLog);
  saveLogRef.current = saveLog;

  useEffect(() => {
    let active = true;
    const cutoff = getLocalDateKey(new Date(Date.now() - 366 * DAY_MS));
    supabase
      .from("activity_log")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", cutoff)
      .order("date", { ascending: false })
      .then(({ data, error }) => {
        if (error) throw error;
        if (!active) return;
        const activeDates = new Set((data || []).map((item) => item.date));
        const today = getLocalDateKey();
        const cursor = new Date(`${today}T00:00:00`);
        if (!activeDates.has(today)) cursor.setDate(cursor.getDate() - 1);
        let streak = 0;
        while (activeDates.has(getLocalDateKey(cursor))) {
          streak += 1;
          cursor.setDate(cursor.getDate() - 1);
        }
        setCurrentStreak(streak);
      })
      .catch((error) => {
        if (!active) return;
        console.error("Failed to load the Daily Log streak:", error);
        setMessage("Could not load the current streak.");
      });
    return () => {
      active = false;
    };
  }, [user.id]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    setStatus("");
    setMessage("");
    supabase
      .from("daily_logs")
      .select("date, sleep_time, wake_time, custom_tasks")
      .eq("user_id", user.id)
      .eq("date", date)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) throw error;
        const nextLog = normalizeLog(data, date);
        const snapshot = JSON.stringify(nextLog);
        savedSnapshotRef.current = snapshot;
        setSavedSnapshot(snapshot);
        setLog(nextLog);
        setStatus("Saved");
        setLoadFailed(false);
      })
      .catch((error) => {
        if (!active) return;
        console.error("Failed to load daily log:", error);
        setLoadFailed(true);
        setStatus("Could not load");
        setMessage("Could not load this daily log.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user.id, date, loadRequest, setLog]);

  useEffect(() => {
    if (loading || loadFailed || !dirty) return undefined;
    if (validation.errors.length) {
      setStatus("Fix errors to save");
      setMessage("");
      return undefined;
    }
    setStatus("Saving soon…");
    autosaveTimer.current = window.setTimeout(() => {
      saveLogRef.current(logRef.current, dateRef.current);
    }, 800);
    return () => window.clearTimeout(autosaveTimer.current);
  }, [log, date, dirty, loading, loadFailed, validation.errors]);

  const flushPendingSave = useCallback(async () => {
    window.clearTimeout(autosaveTimer.current);
    if (loading && !loadFailed) return false;
    if (loadFailed) return true;
    if (JSON.stringify(logRef.current) === savedSnapshotRef.current) return true;
    return saveLog(logRef.current, dateRef.current);
  }, [loading, loadFailed, saveLog]);

  const changeViewMode = useCallback(async (nextMode) => {
    if (nextMode === viewMode) return true;
    if (viewMode === "daily" && !(await flushPendingSave())) return false;
    setViewMode(nextMode);
    return true;
  }, [flushPendingSave, viewMode]);

  useEffect(() => {
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") {
          if (JSON.stringify(logRef.current) !== savedSnapshotRef.current) {
            void saveLogRef.current(logRef.current, dateRef.current);
          }
      }
    };
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => document.removeEventListener("visibilitychange", flushWhenHidden);
  }, []);

  const changeDate = useCallback(async (selectedDate) => {
    if (
      loading ||
      !selectedDate ||
      selectedDate === dateRef.current ||
      selectedDate > getLocalDateKey()
    ) {
      return false;
    }
    const saved = await flushPendingSave();
    if (!saved) return false;
    savedSnapshotRef.current = null;
    setSavedSnapshot(null);
    setLog(emptyLog(selectedDate));
    setDate(selectedDate);
    return true;
  }, [flushPendingSave, loading, setDate, setLog]);

  const shiftDate = useCallback((days) => {
    const [year, month, day] = dateRef.current.split("-").map(Number);
    const target = new Date(year, month - 1, day + days);
    const key = getLocalDateKey(target);
    if (key <= getLocalDateKey()) void changeDate(key);
  }, [changeDate]);

  const updateField = useCallback((field, value) => {
    setLog((current) => ({ ...current, [field]: value }));
  }, [setLog]);

  const updateSlot = useCallback((activity, index, field, value) => {
    setLog((current) => {
      return {
        ...current,
        custom_tasks: current.custom_tasks.map((task) =>
          task.id === activity
            ? {
                ...task,
                slots: task.slots.map((slot, slotIndex) =>
                  slotIndex === index
                    ? { ...slot, [field]: value, endDayOffset: 0 }
                    : slot,
                ),
              }
            : task,
        ),
      };
    });
  }, [setLog]);

  const addSlot = useCallback((activity) => {
    setLog((current) => {
      return {
        ...current,
        custom_tasks: current.custom_tasks.map((task) =>
          task.id === activity
            ? { ...task, slots: [...task.slots, { start: "", end: "" }] }
            : task,
        ),
      };
    });
  }, [setLog]);

  const removeSlot = useCallback((activity, index) => {
    setLog((current) => {
      return {
        ...current,
        custom_tasks: current.custom_tasks.map((task) =>
          task.id === activity
            ? { ...task, slots: task.slots.filter((_, i) => i !== index) }
            : task,
        ),
      };
    });
  }, [setLog]);

  const addCustomTask = useCallback(async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const task = {
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      name: trimmed,
      slots: [],
    };
    setLog((current) => ({
      ...current,
      custom_tasks: [...current.custom_tasks, task],
    }));
    return task;
  }, [setLog]);

  const addSheetActivity = useCallback(async (sheet) => {
    const id = `sheet:${sheet.id}`;
    if (logRef.current.custom_tasks.some((task) => task.id === id)) return true;
    const task = {
      id,
      sheetId: sheet.id,
      name: sheet.title,
      slots: [],
    };
    setLog((current) => ({
      ...current,
      custom_tasks: [...current.custom_tasks, task],
    }));
    return true;
  }, [setLog]);

  const removeCustomTask = useCallback((taskId) => {
    setLog((current) => ({
      ...current,
      custom_tasks: current.custom_tasks.filter((task) => task.id !== taskId),
    }));
  }, [setLog]);

  const renameCustomTask = useCallback((taskId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLog((current) => ({
      ...current,
      custom_tasks: current.custom_tasks.map((task) =>
        task.id === taskId ? { ...task, name: trimmed } : task,
      ),
    }));
  }, [setLog]);

  const loadLogs = useCallback(async () => {
    const requestId = ++logsRequestRef.current;
    setAllLogsLoading(true);
    try {
      const logsResult = await supabase
        .from("daily_logs")
        .select("date, sleep_time, wake_time, custom_tasks")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(PAGE_SIZE + 1);
      if (logsResult.error) throw logsResult.error;
      if (requestId !== logsRequestRef.current) return;
      const fetched = logsResult.data || [];
      const rows = fetched.slice(0, PAGE_SIZE);
      let activityData = [];
      if (rows.length) {
        const activityResult = await supabase
          .from("activity_log")
          .select("date, count")
          .eq("user_id", user.id)
          .gte("date", rows[rows.length - 1].date)
          .lte("date", rows[0].date);
        if (activityResult.error) throw activityResult.error;
        activityData = activityResult.data || [];
      }
      if (requestId !== logsRequestRef.current) return;
      setAllLogs(rows);
      setProblemCounts(Object.fromEntries(
        activityData.map((item) => [item.date, Number(item.count || 0)]),
      ));
      setHasOlderLogs(fetched.length > PAGE_SIZE);
    } catch (error) {
      if (requestId !== logsRequestRef.current) return;
      console.error("Failed to load full daily log:", error);
      setMessage("Could not load the full log.");
    } finally {
      if (requestId === logsRequestRef.current) setAllLogsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    if (viewMode === "full") void loadLogs();
  }, [viewMode, loadLogs]);

  const loadOlderLogs = useCallback(async () => {
    const oldest = allLogs[allLogs.length - 1]?.date;
    if (!oldest) return;
    setOlderLogsLoading(true);
    try {
      const logsResult = await supabase
        .from("daily_logs")
        .select("date, sleep_time, wake_time, custom_tasks")
        .eq("user_id", user.id)
        .lt("date", oldest)
        .order("date", { ascending: false })
        .limit(PAGE_SIZE + 1);
      if (logsResult.error) throw logsResult.error;
      const fetched = logsResult.data || [];
      const rows = fetched.slice(0, PAGE_SIZE);
      const oldestFetched = rows[rows.length - 1]?.date;
      let activityData = [];
      if (oldestFetched) {
        const activityResult = await supabase
          .from("activity_log")
          .select("date, count")
          .eq("user_id", user.id)
          .gte("date", oldestFetched)
          .lt("date", oldest);
        if (activityResult.error) throw activityResult.error;
        activityData = activityResult.data || [];
      }
      setAllLogs((current) => [...current, ...rows]);
      setProblemCounts((current) => ({
        ...current,
        ...Object.fromEntries(
          activityData.map((item) => [item.date, Number(item.count || 0)]),
        ),
      }));
      setHasOlderLogs(fetched.length > PAGE_SIZE);
    } catch (error) {
      console.error("Failed to load older daily logs:", error);
      setMessage("Could not load older log entries.");
    } finally {
      setOlderLogsLoading(false);
    }
  }, [allLogs, user.id]);

  const clearAllLogs = useCallback(async () => {
    window.clearTimeout(autosaveTimer.current);
    setClearingHistory(true);
    try {
      await saveQueueRef.current;
      logsRequestRef.current += 1;
      const { error } = await supabase
        .from("daily_logs")
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
    } catch (error) {
      console.error("Failed to clear this user's daily logs:", error);
      setMessage("Could not clear all Daily Log data. Refresh and check your history before retrying.");
      return false;
    } finally {
      setClearingHistory(false);
    }

    const clearedLog = emptyLog(dateRef.current);
    const snapshot = JSON.stringify(clearedLog);
    setLog(clearedLog);
    savedSnapshotRef.current = snapshot;
    setSavedSnapshot(snapshot);
    setAllLogs([]);
    setHasOlderLogs(false);
    setLoadRequest((current) => current + 1);
    setStatus("Saved");
    setMessage("All saved Daily Log entries for your account were cleared.");
    return true;
  }, [setLog, user.id]);

  useEffect(() => {
    let active = true;
    supabase
      .from("activity_log")
      .select("count")
      .eq("user_id", user.id)
      .eq("date", date)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) throw error;
        if (active) setProblemCounts((current) => ({
          ...current,
          [date]: Number(data?.count || 0),
        }));
      })
      .catch((error) => {
        if (active) {
          console.error("Failed to load daily problem count:", error);
          setMessage("Could not load the problem count.");
        }
      });
    return () => {
      active = false;
    };
  }, [user.id, date]);

  const startTimer = useCallback((activityId, activityName, color) => {
    if (runningTimer) return false;
    const timer = {
      activityId,
      activityName,
      color,
      startedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(TIMER_STORAGE(user.id), JSON.stringify(timer));
      setRunningTimer(timer);
      setTimerNow(Date.now());
      return true;
    } catch (error) {
      console.error("Could not start the activity timer:", error);
      setMessage("Could not start the timer in this browser.");
      return false;
    }
  }, [runningTimer, user.id]);

  const stopTimer = useCallback(async () => {
    if (!runningTimer) return false;
    if (!(await flushPendingSave())) return false;
    try {
      const segments = splitIntervalByDay(
        new Date(runningTimer.startedAt),
        new Date(),
      ).map((segment) => ({
        ...segment,
        slot: { ...segment.slot, timerId: runningTimer.startedAt },
      }));
      const currentDate = dateRef.current;
      for (const segment of segments) {
        const id = runningTimer.activityId;
        if (segment.date === currentDate) {
          setLog((current) => {
            const exists = current.custom_tasks.some((task) => task.id === id);
            return {
              ...current,
              custom_tasks: exists
                ? current.custom_tasks.map((task) =>
                    task.id === id
                      ? {
                          ...task,
                          slots: task.slots.some((slot) => slot.timerId === segment.slot.timerId)
                            ? task.slots
                            : [...task.slots, segment.slot],
                        }
                      : task,
                  )
                : [
                    ...current.custom_tasks,
                    {
                      id,
                      name: runningTimer.activityName,
                      color: runningTimer.color,
                      slots: [segment.slot],
                    },
                  ],
            };
          });
          continue;
        }
        const { data, error } = await supabase
          .from("daily_logs")
          .select("date, sleep_time, wake_time, custom_tasks")
          .eq("user_id", user.id)
          .eq("date", segment.date)
          .maybeSingle();
        if (error) throw error;
        const previous = normalizeLog(data, segment.date);
        const exists = previous.custom_tasks.some((task) => task.id === id);
        previous.custom_tasks = exists
          ? previous.custom_tasks.map((task) =>
              task.id === id
                ? {
                    ...task,
                    slots: task.slots.some((slot) => slot.timerId === segment.slot.timerId)
                      ? task.slots
                      : [...task.slots, segment.slot],
                  }
                : task,
            )
          : [
              ...previous.custom_tasks,
              {
                id,
                name: runningTimer.activityName,
                color: runningTimer.color,
                slots: [segment.slot],
              },
            ];
        if (validateDay(previous).errors.length) {
          throw new Error(`The existing ${segment.date} log has validation errors.`);
        }
        const { error: saveError } = await supabase.from("daily_logs").upsert(
          {
            user_id: user.id,
            date: segment.date,
            sleep_time: previous.sleep_time || null,
            wake_time: previous.wake_time || null,
            dsa_slots: [],
            backend_slots: [],
            custom_tasks: previous.custom_tasks,
            dsa_hours: null,
            backend_hours: null,
          },
          { onConflict: "user_id,date" },
        );
        if (saveError) throw saveError;
      }
      if (segments.some((segment) => segment.date === currentDate)) {
        const savedCurrentDate = await saveLogRef.current(
          logRef.current,
          currentDate,
        );
        if (!savedCurrentDate) {
          setMessage("Timer time was added, but the day needs fixes before it can be saved.");
          return false;
        }
      }
      localStorage.removeItem(TIMER_STORAGE(user.id));
      setRunningTimer(null);
      return true;
    } catch (error) {
      console.error("Failed to stop and save the activity timer:", error);
      setMessage("Could not save the timer. It is still running; please retry.");
      return false;
    }
  }, [flushPendingSave, runningTimer, setLog, user.id]);

  useEffect(() => {
    if (!runningTimer) return undefined;
    const interval = window.setInterval(() => setTimerNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [runningTimer]);

  const quickAdd = useCallback(async (activityId, minutes, activityName = "Activity", color) => {
    const end = new Date();
    const start = new Date(end.getTime() - minutes * 60 * 1000);
    const id = `quick-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
    const segments = splitIntervalByDay(start, end).map((segment) => ({
      ...segment,
      slot: { ...segment.slot, timerId: id },
    }));
    const currentDate = dateRef.current;
    if (!(await flushPendingSave())) return false;
    try {
      for (const segment of segments) {
        if (segment.date === currentDate) {
          setLog((current) => {
            const exists = current.custom_tasks.some((task) => task.id === activityId);
            return {
              ...current,
              custom_tasks: exists
                ? current.custom_tasks.map((task) =>
                    task.id === activityId && !task.slots.some((slot) => slot.timerId === id)
                      ? { ...task, slots: [...task.slots, segment.slot] }
                      : task,
                  )
                : [
                    ...current.custom_tasks,
                    { id: activityId, name: activityName, color, slots: [segment.slot] },
                  ],
            };
          });
          continue;
        }
        const { data, error } = await supabase
          .from("daily_logs")
          .select("date, sleep_time, wake_time, custom_tasks")
          .eq("user_id", user.id)
          .eq("date", segment.date)
          .maybeSingle();
        if (error) throw error;
        const previous = normalizeLog(data, segment.date);
        const exists = previous.custom_tasks.some((task) => task.id === activityId);
        previous.custom_tasks = exists
          ? previous.custom_tasks.map((task) =>
              task.id === activityId && !task.slots.some((slot) => slot.timerId === id)
                ? { ...task, slots: [...task.slots, segment.slot] }
                : task,
            )
          : [
              ...previous.custom_tasks,
              { id: activityId, name: activityName, color, slots: [segment.slot] },
            ];
        if (validateDay(previous).errors.length) {
          throw new Error(`The existing ${segment.date} log has validation errors.`);
        }
        const { error: saveError } = await supabase.from("daily_logs").upsert(
          {
            user_id: user.id,
            date: segment.date,
            sleep_time: previous.sleep_time || null,
            wake_time: previous.wake_time || null,
            dsa_slots: [],
            backend_slots: [],
            custom_tasks: previous.custom_tasks,
            dsa_hours: null,
            backend_hours: null,
          },
          { onConflict: "user_id,date" },
        );
        if (saveError) throw saveError;
      }
      return true;
    } catch (error) {
      console.error("Failed to add quick activity time:", error);
      setMessage("Could not save the quick-added activity.");
      return false;
    }
  }, [flushPendingSave, setLog, user.id]);

  return {
    date, log, setLog, loading, loadFailed,
    saving, clearingHistory, status, message, setMessage,
    viewMode, setViewMode, changeViewMode,
    activeCustomTasks, currentStreak, problemCounts, allLogs, allLogsLoading,
    hasOlderLogs, olderLogsLoading, runningTimer, timerNow, validation, dirty,
    studiedMinutes, sleptMinutes, changeDate, shiftDate, updateField, updateSlot,
    addSlot, removeSlot, addCustomTask, addSheetActivity, removeCustomTask,
    renameCustomTask, saveLog, loadOlderLogs, clearAllLogs, startTimer,
    stopTimer, quickAdd,
    saveNow: flushPendingSave,
    retryLoad: () => setLoadRequest((current) => current + 1),
  };
}
