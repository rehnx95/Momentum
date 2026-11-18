import { useCallback, useEffect, useState } from "react";
import {
  getDailyLogCache,
  invalidateDailyLogHistoryCache,
  setDailyLogCache,
  updateFullLogCacheEntry,
} from "../lib/dailyLogHistoryCache";
import { splitIntervalByDay, validateDay } from "../../../shared/utils/time";
import { normalizeLog, timerStorageGet, timerStorageKey } from "../lib/dailyLogModel";
import { queueOfflineMutation, syncOfflineMutations } from "../../../shared/lib/offlineSync";

function addTimerSegment(log, task, slot) {
  const existingTask = log.custom_tasks.find((item) => item.id === task.id);
  return {
    ...log,
    custom_tasks: existingTask
      ? log.custom_tasks.map((item) =>
          item.id === task.id &&
          !item.slots.some((existingSlot) => existingSlot.timerId === slot.timerId)
            ? { ...item, slots: [...item.slots, slot] }
            : item,
        )
      : [...log.custom_tasks, { ...task, slots: [slot] }],
  };
}

async function saveTimerSegmentOffline(userId, date, task, slot) {
  const mutation = await queueOfflineMutation({
    userId,
    type: "daily-log-slot",
    entityId: `${date}:${task.id}:${slot.timerId}`,
    payload: { date, task, slot },
  });
  const result = await syncOfflineMutations(userId);
  const failure = result.failures.find((item) => item.key === mutation.key && !item.retryable);
  if (failure) throw new Error(failure.message);

  if (!result.syncedKeys.includes(mutation.key)) {
    const previous = normalizeLog(getDailyLogCache(userId, date), date);
    const nextLog = addTimerSegment(previous, task, slot);
    setDailyLogCache(userId, date, nextLog);
    updateFullLogCacheEntry(userId, nextLog);
  }
  invalidateDailyLogHistoryCache(userId);
}

export default function useDailyLogTimer({
  userId,
  dateRef,
  logRef,
  setLog,
  assignActivityColor,
  saveLogRef,
  flushPendingSave,
  setMessage,
}) {
  const [runningTimer, setRunningTimer] = useState(() => timerStorageGet(userId));
  const [timerNow, setTimerNow] = useState(Date.now());

  const startTimer = useCallback(
    (activityId, activityName, color) => {
      if (runningTimer) return false;
      const timer = {
        activityId,
        activityName,
        color,
        startedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(timerStorageKey(userId), JSON.stringify(timer));
        setRunningTimer(timer);
        setTimerNow(Date.now());
        return true;
      } catch (error) {
        console.error("Could not start the activity timer:", error);
        setMessage("Could not start the timer in this browser.");
        return false;
      }
    },
    [runningTimer, setMessage, userId],
  );

  const stopTimer = useCallback(async () => {
    if (!runningTimer) return false;
    if (!(await flushPendingSave())) return false;
    if (assignActivityColor) await assignActivityColor(runningTimer.activityName || "Activity");
    try {
      const segments = splitIntervalByDay(new Date(runningTimer.startedAt), new Date()).map(
        (segment) => ({
          ...segment,
          slot: { ...segment.slot, timerId: runningTimer.startedAt },
        }),
      );
      const currentDate = dateRef.current;
      for (const segment of segments) {
        const id = runningTimer.activityId;
        const task = {
          id,
          name: runningTimer.activityName,
          color: runningTimer.color,
        };
        if (segment.date === currentDate) {
          setLog((current) => addTimerSegment(current, task, segment.slot));
          continue;
        }
        const previous = normalizeLog(getDailyLogCache(userId, segment.date), segment.date);
        const nextLog = addTimerSegment(previous, task, segment.slot);
        if (validateDay(nextLog).errors.length) {
          throw new Error(`The existing ${segment.date} log has validation errors.`);
        }
        await saveTimerSegmentOffline(userId, segment.date, task, segment.slot);
      }
      if (segments.some((segment) => segment.date === currentDate)) {
        const savedCurrentDate = await saveLogRef.current(logRef.current, currentDate);
        if (!savedCurrentDate) {
          setMessage("Timer time was added, but the day needs fixes before it can be saved.");
          return false;
        }
      }
      localStorage.removeItem(timerStorageKey(userId));
      setRunningTimer(null);
      return true;
    } catch (error) {
      console.error("Failed to stop and save the activity timer:", error);
      setMessage("Could not save the timer. It is still running; please retry.");
      return false;
    }
  }, [
    assignActivityColor,
    dateRef,
    flushPendingSave,
    logRef,
    runningTimer,
    saveLogRef,
    setLog,
    setMessage,
    userId,
  ]);

  useEffect(() => {
    if (!runningTimer) return undefined;
    const interval = window.setInterval(() => setTimerNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [runningTimer]);

  const quickAdd = useCallback(
    async (activityId, minutes, activityName = "Activity", color) => {
      const end = new Date();
      const start = new Date(end.getTime() - minutes * 60 * 1000);
      const id = `quick-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
      const segments = splitIntervalByDay(start, end).map((segment) => ({
        ...segment,
        slot: { ...segment.slot, timerId: id },
      }));
      const currentDate = dateRef.current;
      if (!(await flushPendingSave())) return false;
      if (assignActivityColor) await assignActivityColor(activityName);
      try {
        for (const segment of segments) {
          const task = { id: activityId, name: activityName, color };
          if (segment.date === currentDate) {
            setLog((current) => addTimerSegment(current, task, segment.slot));
            continue;
          }
          const previous = normalizeLog(getDailyLogCache(userId, segment.date), segment.date);
          const nextLog = addTimerSegment(previous, task, segment.slot);
          if (validateDay(nextLog).errors.length) {
            throw new Error(`The existing ${segment.date} log has validation errors.`);
          }
          await saveTimerSegmentOffline(userId, segment.date, task, segment.slot);
        }
        return true;
      } catch (error) {
        console.error("Failed to add quick activity time:", error);
        setMessage("Could not save the quick-added activity.");
        return false;
      }
    },
    [assignActivityColor, dateRef, flushPendingSave, setLog, setMessage, userId],
  );

  return { quickAdd, runningTimer, startTimer, stopTimer, timerNow };
}
