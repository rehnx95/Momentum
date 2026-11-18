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

function sameTimestamp(first, second) {
  const firstTime = Date.parse(first);
  const secondTime = Date.parse(second);
  if (Number.isFinite(firstTime) && Number.isFinite(secondTime)) {
    return firstTime === secondTime;
  }
  return first === second;
}

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

async function syncDailyLogMutation(mutation) {
  const { row, expectedUpdatedAt } = mutation.payload;
  const { data: existingLog, error: existingError } = await supabase
    .from("daily_logs")
    .select("updated_at")
    .eq("user_id", mutation.userId)
    .eq("date", row.date)
    .maybeSingle();
  if (existingError) throw existingError;

  const remoteUpdatedAt = existingLog?.updated_at ?? null;
  if (sameTimestamp(remoteUpdatedAt, row.updated_at)) return { alreadySynced: true };

  const hasConflict = expectedUpdatedAt
    ? !remoteUpdatedAt || !sameTimestamp(expectedUpdatedAt, remoteUpdatedAt)
    : Boolean(remoteUpdatedAt);
  if (hasConflict) return { conflict: true };

  const { error } = await supabase.from("daily_logs").upsert(row, { onConflict: "user_id,date" });
  if (error) throw error;
  setDailyLogCache(mutation.userId, row.date, row);
  updateFullLogCacheEntry(mutation.userId, row);
  invalidateDailyLogHistoryCache(mutation.userId);
  return {};
}

async function syncDailyLogSlotMutation(mutation) {
  const { date, task, slot } = mutation.payload;
  const { data: existingLog, error: existingError } = await supabase
    .from("daily_logs")
    .select(
      "date, sleep_time, wake_time, dsa_slots, backend_slots, dsa_hours, backend_hours, custom_tasks",
    )
    .eq("user_id", mutation.userId)
    .eq("date", date)
    .maybeSingle();
  if (existingError) throw existingError;

  const previous = existingLog || {
    date,
    sleep_time: null,
    wake_time: null,
    dsa_slots: [],
    backend_slots: [],
    dsa_hours: null,
    backend_hours: null,
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
        date,
        sleep_time: "",
        wake_time: "",
        custom_tasks: [{ ...task, slots: [slot] }],
    }).errors.length
  ) {
    throw new Error(`The existing ${date} log has validation errors.`);
  }

  const updatedRow = {
    ...nextLog,
    user_id: mutation.userId,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("daily_logs")
    .upsert(updatedRow, { onConflict: "user_id,date" });
  if (error) throw error;
  setDailyLogCache(mutation.userId, date, updatedRow);
  updateFullLogCacheEntry(mutation.userId, updatedRow);
  invalidateDailyLogHistoryCache(mutation.userId);
  return {};
}

async function applyMutation(mutation) {
  if (mutation.type === "progress") return syncProgressMutation(mutation);
  if (mutation.type === "daily-log") return syncDailyLogMutation(mutation);
  if (mutation.type === "daily-log-slot") return syncDailyLogSlotMutation(mutation);
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
      offline: !isOnline(),
    };
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
          const applyResult = await applyMutation(mutation);
          if (applyResult?.conflict) {
            result.conflicts.push({
              key: mutation.key,
              type: mutation.type,
              entityId: mutation.entityId,
            });
            continue;
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
