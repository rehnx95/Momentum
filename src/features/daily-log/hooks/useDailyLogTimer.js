import { useCallback, useEffect, useRef, useState } from "react";
import {
  getDailyLogCache,
  invalidateDailyLogHistoryCache,
  setDailyLogCache,
  updateFullLogCacheEntry,
} from "../lib/dailyLogHistoryCache";
import { splitIntervalByDay } from "../../../shared/utils/time";
import { normalizeLog, timerStorageGet, timerStorageKey } from "../lib/dailyLogModel";
import { getOfflineMutations } from "../../../shared/lib/offlineMutationStore";
import { queueOfflineMutation, syncOfflineMutations } from "../../../shared/lib/offlineSync";
import { supabase } from "../../../shared/lib/supabase";

function createTimerId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

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

function sharedTimerFromRow(row) {
  return {
    timerId: row.timer_id,
    activityId: row.activity_id,
    activityName: row.activity_name,
    color: row.color,
    startedAt: new Date(row.started_at).toISOString(),
    shared: true,
  };
}

function getStoredTimer(userId) {
  const timer = timerStorageGet(userId);
  if (!timer || timer.timerId) return timer;
  const normalized = { ...timer, timerId: createTimerId(), shared: false };
  try {
    localStorage.setItem(timerStorageKey(userId), JSON.stringify(normalized));
  } catch (error) {
    console.warn("Could not update the stored timer identifier:", error);
  }
  return normalized;
}

async function saveTimerSegmentOffline({
  userId,
  date,
  currentDate,
  task,
  slot,
  logRef,
  setLog,
  setMessage,
}) {
  const mutation = await queueOfflineMutation({
    userId,
    type: "daily-log-slot",
    entityId: `${date}:${task.id}:${slot.timerId}`,
    payload: { date, task, slot },
  });
  const baseLog =
    date === currentDate ? logRef.current : normalizeLog(getDailyLogCache(userId, date), date);
  const nextLog = addTimerSegment(baseLog, task, slot);
  setDailyLogCache(userId, date, nextLog);
  updateFullLogCacheEntry(userId, nextLog);
  if (date === currentDate) setLog(nextLog);
  invalidateDailyLogHistoryCache(userId);

  const result = await syncOfflineMutations(userId);
  const failure = result.failures.find((item) => item.key === mutation.key && !item.retryable);
  if (failure) {
    setMessage(`Timer time is saved on this device but could not sync: ${failure.message}`);
  } else if (result.conflicts.some((item) => item.key === mutation.key)) {
    setMessage(
      "Timer time is saved on this device and will sync after the log conflict is resolved.",
    );
  }
}

export default function useDailyLogTimer({
  userId,
  dateRef,
  logRef,
  setLog,
  assignActivityColor,
  setMessage,
}) {
  const [runningTimer, setRunningTimer] = useState(() => getStoredTimer(userId));
  const [timerNow, setTimerNow] = useState(Date.now());
  const refreshingTimer = useRef(false);

  const storeTimerLocally = useCallback(
    (timer) => {
      try {
        const key = timerStorageKey(userId);
        const serialized = timer ? JSON.stringify(timer) : null;
        const current = localStorage.getItem(key);
        const changed = current !== serialized;
        if (changed) {
          if (serialized) localStorage.setItem(key, serialized);
          else localStorage.removeItem(key);
          setTimerNow(Date.now());
        }
        setRunningTimer((currentTimer) =>
          JSON.stringify(currentTimer) === serialized ? currentTimer : timer,
        );
      } catch (error) {
        console.error("Could not save the running timer locally:", error);
        setMessage("Could not update the running timer in this browser.");
      }
    },
    [setMessage, userId],
  );

  const refreshSharedTimer = useCallback(async () => {
    if (refreshingTimer.current || (typeof navigator !== "undefined" && !navigator.onLine)) {
      return;
    }
    refreshingTimer.current = true;
    try {
      const { data, error } = await supabase
        .from("daily_log_timers")
        .select("timer_id, activity_id, activity_name, color, started_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;

      const mutations = await getOfflineMutations(userId);
      if (data) {
        const stopping = mutations.some(
          (mutation) =>
            mutation.type === "daily-log-timer" &&
            mutation.payload.operation === "stop" &&
            mutation.payload.timer.timerId === data.timer_id,
        );
        if (stopping) {
          storeTimerLocally(null);
          return;
        }
        const timer = sharedTimerFromRow(data);
        storeTimerLocally(timer);
        return;
      }

      const localTimer = getStoredTimer(userId);
      if (!localTimer) {
        setRunningTimer(null);
        return;
      }

      const hasQueuedStart = mutations.some(
        (mutation) =>
          mutation.type === "daily-log-timer" &&
          mutation.payload.operation === "start" &&
          mutation.payload.timer.timerId === localTimer.timerId,
      );
      if (hasQueuedStart) {
        const result = await syncOfflineMutations(userId);
        if (result.conflicts.some((item) => item.entityId === `start:${localTimer.timerId}`)) {
          setMessage("A timer is already running on another device.");
        }
        return;
      }

      if (localTimer.shared) {
        storeTimerLocally(null);
        return;
      }
      const mutation = await queueOfflineMutation({
        userId,
        type: "daily-log-timer",
        entityId: `start:${localTimer.timerId}`,
        payload: { operation: "start", timer: localTimer },
      });
      const result = await syncOfflineMutations(userId);
      if (result.conflicts.some((item) => item.key === mutation.key)) {
        setMessage("A timer is already running on another device.");
      } else if (result.syncedKeys.includes(mutation.key)) {
        storeTimerLocally({ ...localTimer, shared: true });
      }
    } catch (error) {
      console.error("Could not sync the running timer:", error);
      setMessage(`Could not sync the running timer: ${error?.message || "Please retry."}`);
    } finally {
      refreshingTimer.current = false;
    }
  }, [setMessage, storeTimerLocally, userId]);

  const startTimer = useCallback(
    async (activityId, activityName, color) => {
      if (runningTimer) return false;
      const timer = {
        timerId: createTimerId(),
        activityId,
        activityName,
        color,
        startedAt: new Date().toISOString(),
        shared: false,
      };
      try {
        storeTimerLocally(timer);
        const mutation = await queueOfflineMutation({
          userId,
          type: "daily-log-timer",
          entityId: `start:${timer.timerId}`,
          payload: { operation: "start", timer },
        });
        const result = await syncOfflineMutations(userId);
        if (result.conflicts.some((item) => item.key === mutation.key)) {
          storeTimerLocally(null);
          setMessage("A timer is already running on another device.");
          void refreshSharedTimer();
          return false;
        }
        if (result.syncedKeys.includes(mutation.key)) {
          storeTimerLocally({ ...timer, shared: true });
        }
        const failure = result.failures.find(
          (item) => item.key === mutation.key && !item.retryable,
        );
        if (failure) setMessage(`Timer is running locally but could not sync: ${failure.message}`);
        return true;
      } catch (error) {
        console.error("Could not start the activity timer:", error);
        storeTimerLocally(null);
        setMessage(`Could not start the timer: ${error?.message || "Please retry."}`);
        return false;
      }
    },
    [refreshSharedTimer, runningTimer, setMessage, storeTimerLocally, userId],
  );

  const stopTimer = useCallback(async () => {
    if (!runningTimer) return false;
    try {
      if (assignActivityColor) {
        try {
          await assignActivityColor(runningTimer.activityName || "Activity");
        } catch (error) {
          console.error("Could not assign a color to the timer activity:", error);
          setMessage("Timer time will be saved, but its activity color could not be updated.");
        }
      }
      const now = new Date();
      const segments = splitIntervalByDay(new Date(runningTimer.startedAt), now).map((segment) => ({
        ...segment,
        slot: { ...segment.slot, timerId: runningTimer.timerId },
      }));
      const currentDate = dateRef.current;
      const task = {
        id: runningTimer.activityId,
        name: runningTimer.activityName,
        color: runningTimer.color,
      };
      for (const segment of segments) {
        await saveTimerSegmentOffline({
          userId,
          date: segment.date,
          currentDate,
          task,
          slot: segment.slot,
          logRef,
          setLog,
          setMessage,
        });
      }

      await queueOfflineMutation({
        userId,
        type: "daily-log-timer",
        entityId: `stop:${runningTimer.timerId}`,
        payload: { operation: "stop", timer: runningTimer },
      });
      storeTimerLocally(null);
      void syncOfflineMutations(userId).catch((error) => {
        console.error("Could not sync the stopped timer:", error);
        setMessage(
          "Timer stopped on this device. Its shared state will sync when connection returns.",
        );
      });
      return true;
    } catch (error) {
      console.error("Failed to stop and save the activity timer:", error);
      setMessage(`Could not save the timer: ${error?.message || "Please retry."}`);
      return false;
    }
  }, [
    assignActivityColor,
    dateRef,
    logRef,
    runningTimer,
    setLog,
    setMessage,
    storeTimerLocally,
    userId,
  ]);

  const quickAdd = useCallback(
    async (activityId, minutes, activityName = "Activity", color) => {
      const end = new Date();
      const start = new Date(end.getTime() - minutes * 60 * 1000);
      const timerId = `quick-${createTimerId()}`;
      const segments = splitIntervalByDay(start, end).map((segment) => ({
        ...segment,
        slot: { ...segment.slot, timerId },
      }));
      const currentDate = dateRef.current;
      try {
        if (assignActivityColor) await assignActivityColor(activityName);
        for (const segment of segments) {
          await saveTimerSegmentOffline({
            userId,
            date: segment.date,
            currentDate,
            task: { id: activityId, name: activityName, color },
            slot: segment.slot,
            logRef,
            setLog,
            setMessage,
          });
        }
        return true;
      } catch (error) {
        console.error("Failed to add quick activity time:", error);
        setMessage(`Could not save the quick-added activity: ${error?.message || "Please retry."}`);
        return false;
      }
    },
    [assignActivityColor, dateRef, logRef, setLog, setMessage, userId],
  );

  useEffect(() => {
    if (!runningTimer) return undefined;
    const interval = window.setInterval(() => setTimerNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [runningTimer]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== timerStorageKey(userId)) return;
      setRunningTimer(getStoredTimer(userId));
      setTimerNow(Date.now());
      void refreshSharedTimer();
    };
    const handleSync = (event) => {
      if (event.detail?.userId === userId) void refreshSharedTimer();
    };
    const handleOnline = () => void refreshSharedTimer();
    const interval = window.setInterval(() => void refreshSharedTimer(), 15_000);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("online", handleOnline);
    window.addEventListener("momentum:offline-sync", handleSync);
    void refreshSharedTimer();
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("momentum:offline-sync", handleSync);
    };
  }, [refreshSharedTimer, userId]);

  return { quickAdd, runningTimer, startTimer, stopTimer, timerNow };
}
