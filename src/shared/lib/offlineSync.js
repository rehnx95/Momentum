import { supabase } from "./supabase";
import {
  getOfflineMutations,
  notifyOfflineQueueChanged,
  putOfflineMutation,
  removeOfflineMutation,
} from "./offlineMutationStore";
import { validateDay } from "../utils/time";
import {
  invalidateDailyLogHistoryCache,
  setDailyLogCache,
  updateFullLogCacheEntry,
} from "../../features/daily-log/lib/dailyLogHistoryCache";

const syncByUser = new Map();
const syncRequestedAgain = new Set();

function isOnline() {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

function isRetryableError(error) {
  if (!isOnline()) return true;
  if (error?.name === "TypeError" || error?.name === "AbortError") return true;
  if (error?.status === 0 || error?.status === 429 || error?.status >= 500) return true;
  if (["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT"].includes(error?.code)) return true;
  return /failed to fetch|network|connection|timed?\s*out/i.test(error?.message || "");
}

async function syncProgressMutation(mutation) {
  const { operation, rows, problemId } = mutation.payload;
  if (operation === "upsert") {
    const { error } = await supabase
      .from("progress")
      .upsert(rows, { onConflict: "user_id,problem_id" });
    if (error) throw error;
    return;
  }
  if (operation === "delete") {
    const { error } = await supabase
      .from("progress")
      .delete()
      .eq("user_id", mutation.userId)
      .eq("problem_id", problemId);
    if (error) throw error;
    return;
  }
  if (operation === "clear") {
    const { error } = await supabase.from("progress").delete().eq("user_id", mutation.userId);
    if (error) throw error;
    return;
  }
  throw new Error(`Unknown progress operation: ${operation}`);
}

async function syncDailyLogMutation(mutation, previousLocalUpdatedAt) {
  const { row, expectedUpdatedAt } = mutation.payload;
  const expected = previousLocalUpdatedAt || expectedUpdatedAt;
  let savedRow;
  if (expected) {
    const { data, error } = await supabase
      .from("daily_logs")
      .update({
        sleep_time: row.sleep_time,
        wake_time: row.wake_time,
        sleep_periods: row.sleep_periods,
        custom_tasks: row.custom_tasks,
      })
      .eq("user_id", mutation.userId)
      .eq("date", row.date)
      .eq("updated_at", expected)
      .select("updated_at");
    if (error) throw error;
    savedRow = data?.[0];
    if (!savedRow) {
      const { data: current, error: readError } = await supabase
        .from("daily_logs")
        .select("sleep_time, wake_time, sleep_periods, custom_tasks, updated_at")
        .eq("user_id", mutation.userId)
        .eq("date", row.date)
        .maybeSingle();
      if (readError) throw readError;
      if (
        current &&
        current.sleep_time === row.sleep_time &&
        current.wake_time === row.wake_time &&
        JSON.stringify(current.sleep_periods || []) === JSON.stringify(row.sleep_periods || []) &&
        JSON.stringify(current.custom_tasks || []) === JSON.stringify(row.custom_tasks || [])
      ) {
        return { alreadySynced: true, updatedAt: current.updated_at };
      }
      return { conflict: true };
    }
  } else {
    const insertRow = { ...row };
    delete insertRow.updated_at;
    const { data, error } = await supabase
      .from("daily_logs")
      .insert(insertRow)
      .select("updated_at");
    if (error?.code === "23505") return { conflict: true };
    if (error) throw error;
    savedRow = data?.[0];
  }
  const savedLog = { ...row, updated_at: savedRow?.updated_at || row.updated_at };
  setDailyLogCache(mutation.userId, row.date, savedLog);
  updateFullLogCacheEntry(mutation.userId, savedLog);
  invalidateDailyLogHistoryCache(mutation.userId);
  return { updatedAt: savedLog.updated_at };
}

async function syncDailyLogSlotMutation(mutation) {
  const { date, task, slot } = mutation.payload;
  const { data: existingLog, error: existingError } = await supabase
    .from("daily_logs")
    .select("date, sleep_time, wake_time, sleep_periods, custom_tasks, updated_at")
    .eq("user_id", mutation.userId)
    .eq("date", date)
    .maybeSingle();
  if (existingError) throw existingError;

  const previous = existingLog || {
    date,
    sleep_time: null,
    wake_time: null,
    sleep_periods: [],
    custom_tasks: [],
  };
  const tasks = Array.isArray(previous.custom_tasks) ? previous.custom_tasks : [];
  const existingTask = tasks.find((item) => item.id === task.id);
  const existingSlots = Array.isArray(existingTask?.slots) ? existingTask.slots : [];
  if (existingSlots.some((item) => item.timerId === slot.timerId)) {
    setDailyLogCache(mutation.userId, date, previous);
    updateFullLogCacheEntry(mutation.userId, previous);
    return { alreadySynced: true };
  }

  const customTasks = existingTask
    ? tasks.map((item) =>
        item.id === task.id
          ? { ...item, slots: [...(Array.isArray(item.slots) ? item.slots : []), slot] }
          : item,
      )
    : [...tasks, { ...task, slots: [slot] }];
  const nextLog = { ...previous, date, custom_tasks: customTasks };
  if (
    validateDay({
      custom_tasks: [{ ...task, slots: [slot] }],
    }).errors.length
  ) {
    throw new Error(`The timer slot for ${date} is invalid.`);
  }

  let savedRow;
  if (existingLog) {
    const { data, error } = await supabase
      .from("daily_logs")
      .update({ custom_tasks: customTasks })
      .eq("user_id", mutation.userId)
      .eq("date", date)
      .eq("updated_at", existingLog.updated_at)
      .select("updated_at");
    if (error) throw error;
    savedRow = data?.[0];
    if (!savedRow) return { conflict: true };
  } else {
    const { data, error } = await supabase
      .from("daily_logs")
      .insert({ ...nextLog, user_id: mutation.userId })
      .select("updated_at");
    if (error?.code === "23505") return { conflict: true };
    if (error) throw error;
    savedRow = data?.[0];
  }
  const updatedRow = { ...nextLog, user_id: mutation.userId, updated_at: savedRow?.updated_at };
  setDailyLogCache(mutation.userId, date, updatedRow);
  updateFullLogCacheEntry(mutation.userId, updatedRow);
  invalidateDailyLogHistoryCache(mutation.userId);
  return {};
}

async function syncDailyLogTimerMutation(mutation) {
  const { operation, timer } = mutation.payload;
  if (operation === "start") {
    const { error } = await supabase.from("daily_log_timers").insert({
      user_id: mutation.userId,
      timer_id: timer.timerId,
      activity_id: timer.activityId,
      activity_name: timer.activityName,
      color: timer.color || null,
      started_at: timer.startedAt,
    });
    if (error?.code === "23505") {
      const { data: current, error: readError } = await supabase
        .from("daily_log_timers")
        .select("timer_id")
        .eq("user_id", mutation.userId)
        .maybeSingle();
      if (readError) throw readError;
      if (current?.timer_id === timer.timerId) return { alreadySynced: true };
      return { conflict: true };
    }
    if (error) throw error;
    return {};
  }
  if (operation === "stop") {
    const { error } = await supabase
      .from("daily_log_timers")
      .delete()
      .eq("user_id", mutation.userId)
      .eq("timer_id", timer.timerId);
    if (error) throw error;
    return {};
  }
  throw new Error(`Unknown daily log timer operation: ${operation}`);
}

async function applyMutation(mutation, recentDailyLogVersions) {
  if (mutation.type === "progress") return syncProgressMutation(mutation);
  if (mutation.type === "daily-log") {
    return syncDailyLogMutation(mutation, recentDailyLogVersions.get(mutation.entityId));
  }
  if (mutation.type === "daily-log-slot") return syncDailyLogSlotMutation(mutation);
  if (mutation.type === "daily-log-timer") return syncDailyLogTimerMutation(mutation);
  if (mutation.type === "activity-color") {
    const { activityName, color } = mutation.payload;
    const { error } = await supabase.rpc("set_activity_color", {
      p_activity_name: activityName,
      p_color: color,
    });
    if (error) throw error;
    return {};
  }
  if (mutation.type === "delete-daily-logs") {
    const { error } = await supabase.from("daily_logs").delete().eq("user_id", mutation.userId);
    if (error) throw error;
    return {};
  }
  throw new Error(`Unknown offline change type: ${mutation.type}`);
}

function notifySyncResult(userId, result) {
  if (
    typeof window !== "undefined" &&
    typeof window.dispatchEvent === "function" &&
    typeof CustomEvent !== "undefined"
  ) {
    window.dispatchEvent(
      new CustomEvent("momentum:offline-sync", { detail: { userId, ...result } }),
    );
  }
  notifyOfflineQueueChanged(userId);
}

export async function queueOfflineMutation(mutation) {
  const savedMutation = await putOfflineMutation(mutation);
  notifyOfflineQueueChanged(mutation.userId);
  return savedMutation;
}

export async function syncOfflineMutations(userId) {
  if (!userId) return { synced: 0, pending: 0, conflicts: [], failures: [], offline: !isOnline() };
  if (syncByUser.has(userId)) {
    syncRequestedAgain.add(userId);
    return syncByUser.get(userId);
  }

  const syncPromise = (async () => {
    const result = {
      synced: 0,
      syncedKeys: [],
      pending: 0,
      conflicts: [],
      failures: [],
      updatedAtByKey: {},
      offline: !isOnline(),
    };
    const recentDailyLogVersions = new Map();
    if (result.offline) {
      result.pending = (await getOfflineMutations(userId)).length;
      notifySyncResult(userId, result);
      return result;
    }

    let shouldRepeat = true;
    while (shouldRepeat) {
      syncRequestedAgain.delete(userId);
      const mutations = await getOfflineMutations(userId);
      let retryableFailure = false;
      for (const mutation of mutations) {
        try {
          const applyResult = await applyMutation(mutation, recentDailyLogVersions);
          if (applyResult?.conflict) {
            result.conflicts.push({
              key: mutation.key,
              type: mutation.type,
              entityId: mutation.entityId,
            });
            if (mutation.type === "daily-log-timer" && mutation.payload.operation === "start") {
              const removed = await removeOfflineMutation(mutation.key, mutation.updatedAt);
              if (removed) result.syncedKeys.push(mutation.key);
            }
            continue;
          }
          if (mutation.type === "daily-log" && applyResult?.updatedAt) {
            recentDailyLogVersions.set(mutation.entityId, applyResult.updatedAt);
            result.updatedAtByKey[mutation.key] = applyResult.updatedAt;
          }
          const removed = await removeOfflineMutation(mutation.key, mutation.updatedAt);
          result.synced += 1;
          if (removed) result.syncedKeys.push(mutation.key);
        } catch (error) {
          const retryable = isRetryableError(error);
          result.failures.push({
            key: mutation.key,
            type: mutation.type,
            message: error?.message || "Could not sync this change.",
            code: error?.code,
            retryable,
          });
          if (retryable) {
            retryableFailure = true;
            break;
          }
        }
      }
      shouldRepeat = !retryableFailure && syncRequestedAgain.has(userId) && isOnline();
    }
    result.pending = (await getOfflineMutations(userId)).length;
    notifySyncResult(userId, result);
    return result;
  })();

  syncByUser.set(userId, syncPromise);
  try {
    return await syncPromise;
  } finally {
    if (syncByUser.get(userId) === syncPromise) syncByUser.delete(userId);
  }
}
