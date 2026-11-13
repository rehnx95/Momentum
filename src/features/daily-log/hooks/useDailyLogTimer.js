import { useCallback, useEffect, useState } from "react";
import { removeItem, setItem } from "../../../shared/lib/safeStorage";
import { supabase } from "../../../shared/lib/supabase";
import {
  invalidateDailyLogHistoryCache,
  setDailyLogCache,
} from "../lib/dailyLogHistoryCache";
import {
  splitIntervalByDay,
  validateDay,
} from "../../../shared/utils/time";
import { normalizeLog, timerStorageGet, timerStorageKey } from "../lib/dailyLogModel";

export default function useDailyLogTimer({
  userId,
  dateRef,
  logRef,
  setLog,
  saveLogRef,
  flushPendingSave,
  setMessage,
}) {
  const [runningTimer, setRunningTimer] = useState(() => timerStorageGet(userId));
  const [timerNow, setTimerNow] = useState(Date.now());

  const startTimer = useCallback((activityId, activityName, color) => {
    if (runningTimer) return false;
    const timer = {
      activityId,
      activityName,
      color,
      startedAt: new Date().toISOString(),
    };
    try {
      setItem(timerStorageKey(userId), JSON.stringify(timer));
      setRunningTimer(timer);
      setTimerNow(Date.now());
      return true;
    } catch (error) {
      console.error("Could not start the activity timer:", error);
      setMessage("Could not start the timer in this browser.");
      return false;
    }
  }, [runningTimer, setMessage, userId]);

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
          .eq("user_id", userId)
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
            user_id: userId,
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
        invalidateDailyLogHistoryCache(userId);
        setDailyLogCache(userId, segment.date, previous);
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
      removeItem(timerStorageKey(userId));
      setRunningTimer(null);
      return true;
    } catch (error) {
      console.error("Failed to stop and save the activity timer:", error);
      setMessage("Could not save the timer. It is still running; please retry.");
      return false;
    }
  }, [dateRef, flushPendingSave, logRef, runningTimer, saveLogRef, setLog, setMessage, userId]);

  useEffect(() => {
    if (!runningTimer) return undefined;
    const interval = window.setInterval(() => setTimerNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [runningTimer]);

  const quickAdd = useCallback(async (
    activityId,
    minutes,
    activityName = "Activity",
    color,
  ) => {
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
          .eq("user_id", userId)
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
            user_id: userId,
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
        invalidateDailyLogHistoryCache(userId);
        setDailyLogCache(userId, segment.date, previous);
      }
      return true;
    } catch (error) {
      console.error("Failed to add quick activity time:", error);
      setMessage("Could not save the quick-added activity.");
      return false;
    }
  }, [dateRef, flushPendingSave, setLog, setMessage, userId]);

  return { quickAdd, runningTimer, startTimer, stopTimer, timerNow };
}
