import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../../shared/lib/supabase";
import {
  getDailyLogCache,
  invalidateDailyLogHistoryCache,
  setDailyLogCache,
  updateFullLogCacheEntry,
} from "../lib/dailyLogHistoryCache";
import { queueOfflineMutation, syncOfflineMutations } from "../../../shared/lib/offlineSync";
import {
  getOfflineMutations,
  removeOfflineMutation,
} from "../../../shared/lib/offlineMutationStore";
import { emptyLog, normalizeLog } from "../lib/dailyLogModel";
import { validateDay } from "../../../shared/utils/time";

function buildDailyLogRow(userId, date, draft, updatedAt) {
  return {
    user_id: userId,
    date,
    sleep_time: draft.sleep_time || null,
    wake_time: draft.wake_time || null,
    dsa_slots: [],
    backend_slots: [],
    custom_tasks: draft.custom_tasks,
    dsa_hours: null,
    backend_hours: null,
    updated_at: updatedAt,
  };
}

export default function useDailyLogPersistence({
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
  userId,
  savedUpdatedAtRef = { current: null },
  validationErrors,
}) {
  const [saving, setSaving] = useState(false);
  const saveQueueRef = useRef(Promise.resolve(true));
  const autosaveTimer = useRef(null);

  const saveLog = useCallback(
    (draft, targetDate) => {
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
        const updatedAt = new Date().toISOString();
        const row = buildDailyLogRow(userId, nextDate, nextDraft, updatedAt);
        const mutation = await queueOfflineMutation({
          userId,
          type: "daily-log",
          entityId: nextDate,
          payload: { row, draft: nextDraft, expectedUpdatedAt: savedUpdatedAtRef.current },
        });
        invalidateDailyLogHistoryCache(userId);
        const normalizedLog = normalizeLog(nextDraft, nextDate);
        normalizedLog.updated_at = updatedAt;
        setDailyLogCache(userId, nextDate, normalizedLog);
        updateFullLogCacheEntry(userId, normalizedLog);
        if (nextDate === dateRef.current) {
          savedSnapshotRef.current = snapshot;
          setSavedSnapshot(snapshot);
        }

        const syncResult = await syncOfflineMutations(userId);
        const conflict = syncResult.conflicts.some((item) => item.key === mutation.key);
        const synced = syncResult.syncedKeys.includes(mutation.key);
        const failure = syncResult.failures.find((item) => item.key === mutation.key);
        if (nextDate === dateRef.current) {
          if (conflict) {
            setStatus("This day changed elsewhere");
            setMessage(
              "Your edits are preserved on this device, but this day also changed in the cloud.",
            );
          } else if (synced) {
            savedUpdatedAtRef.current = updatedAt;
            setStatus("Saved");
            setMessage("");
          } else if (failure && !failure.retryable) {
            setStatus("Could not save");
            setMessage(
              `Could not sync this daily log: ${failure.message}${failure.code ? ` ${failure.code}` : ""}`,
            );
          } else {
            setStatus("Saved on this device");
            setMessage(
              failure
                ? `Saved locally; sync could not complete: ${failure.message}`
                : "Saved locally. Changes will sync when your connection returns.",
            );
          }
        }
        return !conflict && !(failure && !failure.retryable);
      };
      const runSave = async () => {
        try {
          return await save();
        } catch (error) {
          console.error("Failed to save daily log:", error);
          if (nextDate === dateRef.current) {
            setStatus("Could not save");
            const details =
              error && typeof error === "object"
                ? [error.message, error.code].filter((value) => typeof value === "string").join(" ")
                : "";
            setMessage(
              `Could not save this daily log. Your edits are still here.${details ? ` ${details}` : ""}`,
            );
          }
          return false;
        } finally {
          setSaving(false);
        }
      };

      const queuedPromise = saveQueueRef.current.then(runSave, runSave);
      saveQueueRef.current = queuedPromise;
      return queuedPromise;
    },
    [
      dateRef,
      loadFailed,
      logRef,
      savedSnapshotRef,
      savedUpdatedAtRef,
      setMessage,
      setSavedSnapshot,
      setStatus,
      userId,
    ],
  );

  const saveLogRef = useRef(saveLog);
  saveLogRef.current = saveLog;

  const reloadConflict = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setMessage("Reconnect to load the cloud copy. Your local edits are preserved.");
      return false;
    }

    const targetDate = dateRef.current;
    try {
      const { data, error } = await supabase
        .from("daily_logs")
        .select("date, sleep_time, wake_time, custom_tasks, updated_at")
        .eq("user_id", userId)
        .eq("date", targetDate)
        .maybeSingle();
      if (error) throw error;

      const pending = (await getOfflineMutations(userId)).find(
        (mutation) => mutation.type === "daily-log" && mutation.entityId === targetDate,
      );
      if (pending && !(await removeOfflineMutation(pending.key, pending.updatedAt))) {
        setMessage("Your local edits changed while resolving this conflict. Try again.");
        return false;
      }

      const nextLog = normalizeLog(data, targetDate);
      nextLog.updated_at = data?.updated_at ?? null;
      const snapshot = JSON.stringify(nextLog);
      setDailyLogCache(userId, targetDate, nextLog);
      updateFullLogCacheEntry(userId, nextLog);
      invalidateDailyLogHistoryCache(userId);
      savedSnapshotRef.current = snapshot;
      savedUpdatedAtRef.current = data?.updated_at ?? null;
      setSavedSnapshot(snapshot);
      setLog(nextLog);
      setStatus("Saved");
      setMessage("Loaded the latest cloud copy. Your offline edits were discarded.");
      setLoadFailed(false);
      return true;
    } catch (error) {
      console.error("Could not reload the cloud Daily Log:", error);
      setMessage(`Could not load the cloud copy: ${error?.message || "Please retry."}`);
      return false;
    }
  }, [
    dateRef,
    savedSnapshotRef,
    savedUpdatedAtRef,
    setLoadFailed,
    setLog,
    setMessage,
    setSavedSnapshot,
    setStatus,
    userId,
  ]);

  const overwriteConflict = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setMessage("Reconnect before replacing the cloud copy. Your local edits are preserved.");
      return false;
    }

    const targetDate = dateRef.current;
    const draft = logRef.current;
    if (validateDay(draft).errors.length) {
      setStatus("Fix errors to save");
      setMessage("");
      return false;
    }

    try {
      const { data: existingLog, error: existingError } = await supabase
        .from("daily_logs")
        .select("updated_at")
        .eq("user_id", userId)
        .eq("date", targetDate)
        .maybeSingle();
      if (existingError) throw existingError;

      const updatedAt = new Date().toISOString();
      const snapshot = JSON.stringify(draft);
      const row = buildDailyLogRow(userId, targetDate, draft, updatedAt);
      const mutation = await queueOfflineMutation({
        userId,
        type: "daily-log",
        entityId: targetDate,
        payload: {
          row,
          draft,
          expectedUpdatedAt: existingLog?.updated_at ?? null,
        },
      });
      const normalizedLog = normalizeLog(draft, targetDate);
      normalizedLog.updated_at = updatedAt;
      setDailyLogCache(userId, targetDate, normalizedLog);
      updateFullLogCacheEntry(userId, normalizedLog);
      invalidateDailyLogHistoryCache(userId);
      savedSnapshotRef.current = snapshot;
      savedUpdatedAtRef.current = existingLog?.updated_at ?? null;
      setSavedSnapshot(snapshot);

      const syncResult = await syncOfflineMutations(userId);
      const conflict = syncResult.conflicts.some((item) => item.key === mutation.key);
      const failure = syncResult.failures.find((item) => item.key === mutation.key);
      if (conflict) {
        setStatus("This day changed elsewhere");
        setMessage("The cloud copy changed again. Review the conflict and retry.");
        return false;
      }
      if (failure && !failure.retryable) {
        setStatus("Could not save");
        setMessage(`Could not replace the cloud copy: ${failure.message}`);
        return false;
      }
      if (syncResult.syncedKeys.includes(mutation.key)) {
        savedUpdatedAtRef.current = updatedAt;
        setStatus("Saved");
        setMessage("Your copy replaced the cloud version.");
      } else {
        setStatus("Saved on this device");
        setMessage("Your copy is saved here and will sync when possible.");
      }
      return true;
    } catch (error) {
      console.error("Could not replace the cloud Daily Log:", error);
      setStatus("Could not save");
      setMessage(`Could not replace the cloud copy: ${error?.message || "Please retry."}`);
      return false;
    }
  }, [
    dateRef,
    logRef,
    savedSnapshotRef,
    savedUpdatedAtRef,
    setMessage,
    setSavedSnapshot,
    setStatus,
    userId,
  ]);

  useEffect(() => {
    const handleOfflineSync = (event) => {
      if (event.detail?.userId !== userId) return;
      const mutationKey = `${userId}:daily-log:${dateRef.current}`;
      if (event.detail.conflicts.some((item) => item.key === mutationKey)) {
        setStatus("This day changed elsewhere");
        setMessage(
          "Your edits are preserved on this device, but this day also changed in the cloud.",
        );
        return;
      }
      if (!event.detail.syncedKeys.includes(mutationKey)) return;
      const cachedLog = getDailyLogCache(userId, dateRef.current);
      savedUpdatedAtRef.current = cachedLog?.updated_at ?? null;
      if (JSON.stringify(logRef.current) === savedSnapshotRef.current) {
        setStatus("Saved");
        setMessage("");
      }
    };

    if (typeof window.addEventListener !== "function") return undefined;
    window.addEventListener("momentum:offline-sync", handleOfflineSync);
    return () => window.removeEventListener("momentum:offline-sync", handleOfflineSync);
  }, [dateRef, logRef, savedSnapshotRef, savedUpdatedAtRef, setMessage, setStatus, userId]);

  useEffect(() => {
    let active = true;
    const cachedLog = getDailyLogCache(userId, date);
    const online = typeof navigator === "undefined" || navigator.onLine !== false;
    setLoading(!cachedLog && online);
    setLoadFailed(false);
    setStatus("");
    if (!cachedLog) setMessage("");
    const snapshotAtRequestStart = savedSnapshotRef.current;
    const loadLog = async () => {
      try {
        let syncResult = null;
        if (online) {
          try {
            syncResult = await syncOfflineMutations(userId);
          } catch (error) {
            console.error("Could not sync pending Daily Log changes:", error);
          }
        }
        const pending = (await getOfflineMutations(userId)).find(
          (mutation) => mutation.type === "daily-log" && mutation.entityId === date,
        );
        if (!active || savedSnapshotRef.current !== snapshotAtRequestStart) return;

        if (pending) {
          const nextLog = pending.payload.draft || normalizeLog(pending.payload.row, date);
          const snapshot = JSON.stringify(nextLog);
          const conflict = syncResult?.conflicts.some((item) => item.key === pending.key);
          setDailyLogCache(userId, date, {
            ...normalizeLog(nextLog, date),
            updated_at: pending.payload.row.updated_at,
          });
          savedSnapshotRef.current = snapshot;
          savedUpdatedAtRef.current = pending.payload.expectedUpdatedAt ?? null;
          setSavedSnapshot(snapshot);
          setLog(nextLog);
          setLoadFailed(false);
          setStatus(conflict ? "This day changed elsewhere" : "Saved on this device");
          setMessage(
            conflict
              ? "Your edits are preserved on this device, but this day also changed in the cloud."
              : "Showing edits saved on this device. They will sync when possible.",
          );
          return;
        }

        if (!online) {
          const nextLog = cachedLog ? normalizeLog(cachedLog, date) : emptyLog(date);
          const snapshot = JSON.stringify(nextLog);
          savedSnapshotRef.current = snapshot;
          savedUpdatedAtRef.current = cachedLog?.updated_at ?? null;
          setSavedSnapshot(snapshot);
          setLog(nextLog);
          setLoadFailed(false);
          setStatus("Offline");
          setMessage(
            cachedLog
              ? "Showing your saved copy. Changes will sync when your connection returns."
              : "Starting a new Daily Log on this device. It will sync when your connection returns.",
          );
          return;
        }

        const { data, error } = await supabase
          .from("daily_logs")
          .select("date, sleep_time, wake_time, custom_tasks, updated_at")
          .eq("user_id", userId)
          .eq("date", date)
          .maybeSingle();
        if (!active) return;
        if (error) throw error;
        if (savedSnapshotRef.current !== snapshotAtRequestStart) return;
        const nextLog = normalizeLog(data, date);
        const hasUnsavedChanges =
          logRef.current.date === date &&
          savedSnapshotRef.current !== null &&
          JSON.stringify(logRef.current) !== savedSnapshotRef.current;
        if (hasUnsavedChanges) return;
        nextLog.updated_at = data?.updated_at ?? null;
        const snapshot = JSON.stringify(nextLog);
        setDailyLogCache(userId, date, nextLog);
        savedSnapshotRef.current = snapshot;
        savedUpdatedAtRef.current = data?.updated_at ?? null;
        setSavedSnapshot(snapshot);
        setLog(nextLog);
        setStatus("Saved");
        setLoadFailed(false);
      } catch (error) {
        if (!active) return;
        console.error("Failed to load daily log:", error);
        if (!cachedLog) {
          if (typeof navigator !== "undefined" && navigator.onLine === false) {
            const nextLog = emptyLog(date);
            const snapshot = JSON.stringify(nextLog);
            savedSnapshotRef.current = snapshot;
            savedUpdatedAtRef.current = null;
            setSavedSnapshot(snapshot);
            setLog(nextLog);
            setLoadFailed(false);
            setStatus("Offline");
            setMessage(
              "Starting a new Daily Log on this device. It will sync when your connection returns.",
            );
          } else {
            setLoadFailed(true);
            setStatus("Could not load");
            setMessage("Could not load this daily log.");
          }
        } else {
          setStatus("Offline");
          setMessage("Showing your saved copy; the latest Daily Log could not be fetched.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadLog();
    return () => {
      active = false;
    };
  }, [
    date,
    loadRequest,
    logRef,
    savedSnapshotRef,
    savedUpdatedAtRef,
    setLoadFailed,
    setLoading,
    setLog,
    setMessage,
    setSavedSnapshot,
    setStatus,
    userId,
  ]);

  useEffect(() => {
    if (loading || loadFailed || !dirty) return undefined;
    if (validationErrors.length) {
      setStatus("Fix errors to save");
      setMessage("");
      return undefined;
    }
    setStatus("Saving soon…");
    autosaveTimer.current = window.setTimeout(() => {
      saveLogRef.current(logRef.current, dateRef.current);
    }, 800);
    return () => window.clearTimeout(autosaveTimer.current);
  }, [dateRef, dirty, loadFailed, loading, log, logRef, setMessage, setStatus, validationErrors]);

  const flushPendingSave = useCallback(async () => {
    window.clearTimeout(autosaveTimer.current);
    if (loading && !loadFailed) return false;
    if (loadFailed) return JSON.stringify(logRef.current) === savedSnapshotRef.current;
    if (JSON.stringify(logRef.current) === savedSnapshotRef.current) return true;
    return saveLog(logRef.current, dateRef.current);
  }, [dateRef, loadFailed, loading, logRef, saveLog, savedSnapshotRef]);

  useEffect(() => {
    const flushWhenHidden = () => {
      if (
        document.visibilityState === "hidden" &&
        JSON.stringify(logRef.current) !== savedSnapshotRef.current
      ) {
        void saveLogRef.current(logRef.current, dateRef.current);
      }
    };
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => document.removeEventListener("visibilitychange", flushWhenHidden);
  }, [dateRef, logRef, savedSnapshotRef]);

  return {
    autosaveTimer,
    flushPendingSave,
    overwriteConflict,
    reloadConflict,
    saveLog,
    saveLogRef,
    saveQueueRef,
    saving,
  };
}
