import { useCallback, useMemo, useRef, useState } from "react";
import {
  getDailyLogCache,
  setDailyLogCache,
} from "../lib/dailyLogHistoryCache";
import {
  getSleepMinutes,
  getStudyMinutes,
  validateDay,
} from "../../../shared/utils/time";
import { getLocalDateKey } from "../../../shared/utils/date";
import {
  emptyLog,
  normalizeLog,
} from "../lib/dailyLogModel";
import useDailyLogHistory from "./useDailyLogHistory";
import useDailyLogTimer from "./useDailyLogTimer";
import useDailyLogActivities from "./useDailyLogActivities";
import useDailyLogPersistence from "./useDailyLogPersistence";

export default function useDailyLog(user, activityLog = {}) {
  const [date, setDateState] = useState(() => getLocalDateKey());
  const dateRef = useRef(date);
  const [log, setLogState] = useState(() => {
    const dateKey = getLocalDateKey();
    return normalizeLog(getDailyLogCache(user.id, dateKey), dateKey);
  });
  const logRef = useRef(log);
  const [savedSnapshot, setSavedSnapshot] = useState(() => {
    const dateKey = getLocalDateKey();
    const cached = getDailyLogCache(user.id, dateKey);
    return cached ? JSON.stringify(normalizeLog(cached, dateKey)) : null;
  });
  const savedSnapshotRef = useRef(savedSnapshot);
  const [loading, setLoading] = useState(
    () => !getDailyLogCache(user.id, getLocalDateKey()),
  );
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadRequest, setLoadRequest] = useState(0);
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const [viewMode, setViewMode] = useState("daily");
  const {
    allLogs,
    allLogsLoading,
    clearingHistory,
    clearHistory,
    hasOlderLogs,
    loadOlderLogs,
    olderLogsLoading,
  } = useDailyLogHistory(user.id, viewMode, setMessage);
  const currentStreak = useMemo(() => {
    const activeDates = new Set(
      Object.entries(activityLog)
        .filter(([, count]) => Number(count) > 0)
        .map(([activeDate]) => activeDate),
    );
    const today = getLocalDateKey();
    const cursor = new Date(`${today}T00:00:00`);
    if (!activeDates.has(today)) cursor.setDate(cursor.getDate() - 1);
    let streak = 0;
    while (activeDates.has(getLocalDateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }, [activityLog]);
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
  const studiedMinutes = useMemo(() => getStudyMinutes(log), [log]);
  const sleptMinutes = useMemo(() => getSleepMinutes(log), [log]);
  const problemCounts = useMemo(
    () => Object.fromEntries(
      [...new Set([date, ...allLogs.map((entry) => entry.date)])]
        .map((entryDate) => [entryDate, Number(activityLog[entryDate] || 0)]),
    ),
    [activityLog, allLogs, date],
  );
  const dirty = savedSnapshot !== null && JSON.stringify(log) !== savedSnapshot;
  const activeCustomTasks = log.custom_tasks;
  const {
    addCustomTask,
    addSheetActivity,
    addSlot,
    removeCustomTask,
    removeSlot,
    renameCustomTask,
    updateField,
    updateSlot,
  } = useDailyLogActivities(logRef, setLog);

  const {
    autosaveTimer,
    flushPendingSave,
    saveLog,
    saveLogRef,
    saveQueueRef,
    saving,
  } = useDailyLogPersistence({
    date,
    dateRef,
    dirty,
    loadFailed,
    loadRequest,
    loading,
    log,
    logRef,
    savedSnapshotRef,
    setLoadFailed,
    setLoading,
    setLog,
    setMessage,
    setSavedSnapshot,
    setStatus,
    userId: user.id,
    validationErrors: validation.errors,
  });

  const { quickAdd, runningTimer, startTimer, stopTimer, timerNow } =
    useDailyLogTimer({
      userId: user.id,
      dateRef,
      logRef,
      setLog,
      saveLogRef,
      flushPendingSave,
      setMessage,
    });

  const changeViewMode = useCallback(async (nextMode) => {
    if (nextMode === viewMode) return true;
    if (viewMode === "daily" && !(await flushPendingSave())) return false;
    setViewMode(nextMode);
    return true;
  }, [flushPendingSave, viewMode]);

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
    const cachedLog = getDailyLogCache(user.id, selectedDate);
    const nextLog = cachedLog
      ? normalizeLog(cachedLog, selectedDate)
      : emptyLog(selectedDate);
    const snapshot = cachedLog ? JSON.stringify(nextLog) : null;
    savedSnapshotRef.current = snapshot;
    setSavedSnapshot(snapshot);
    setLog(nextLog);
    setLoading(!cachedLog);
    setDate(selectedDate);
    return true;
  }, [flushPendingSave, loading, setDate, setLog, user.id]);

  const shiftDate = useCallback((days) => {
    const [year, month, day] = dateRef.current.split("-").map(Number);
    const target = new Date(year, month - 1, day + days);
    const key = getLocalDateKey(target);
    if (key <= getLocalDateKey()) void changeDate(key);
  }, [changeDate]);

  const clearAllLogs = useCallback(async () => {
    window.clearTimeout(autosaveTimer.current);
    const cleared = await clearHistory(() => saveQueueRef.current);
    if (!cleared) return false;

    const clearedLog = emptyLog(dateRef.current);
    const snapshot = JSON.stringify(clearedLog);
    setLog(clearedLog);
    savedSnapshotRef.current = snapshot;
    setSavedSnapshot(snapshot);
    setDailyLogCache(user.id, dateRef.current, clearedLog);
    setLoadRequest((current) => current + 1);
    setStatus("Saved");
    setMessage("All saved Daily Log entries for your account were cleared.");
    return true;
  }, [clearHistory, setLog, user.id]);

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
