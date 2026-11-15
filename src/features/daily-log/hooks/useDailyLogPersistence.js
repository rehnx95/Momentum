import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../../shared/lib/supabase";
import {
  getDailyLogCache,
  invalidateDailyLogHistoryCache,
  invalidateFullLogCache,
  setDailyLogCache,
} from "../lib/dailyLogHistoryCache";
import { normalizeLog } from "../lib/dailyLogModel";
import { validateDay } from "../../../shared/utils/time";

function sameTimestamp(first, second) {
  const firstTime = Date.parse(first);
  const secondTime = Date.parse(second);
  if (Number.isFinite(firstTime) && Number.isFinite(secondTime)) {
    return firstTime === secondTime;
  }
  return first === second;
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
        const { data: existingLog, error: existingError } = await supabase
          .from("daily_logs")
          .select("updated_at")
          .eq("user_id", userId)
          .eq("date", nextDate)
          .maybeSingle();
        if (existingError) throw existingError;

        const savedAt = savedUpdatedAtRef.current;
        const remoteAt = existingLog?.updated_at;
        const hasConflict = savedAt
          ? !remoteAt || !sameTimestamp(savedAt, remoteAt)
          : Boolean(remoteAt);
        if (hasConflict) {
          if (nextDate === dateRef.current) {
            setStatus("This day changed elsewhere");
            setMessage("This day changed elsewhere. Reload the date to keep the latest version.");
          }
          return false;
        }

        const updatedAt = new Date().toISOString();
        const { error } = await supabase.from("daily_logs").upsert(
          {
            user_id: userId,
            date: nextDate,
            sleep_time: nextDraft.sleep_time || null,
            wake_time: nextDraft.wake_time || null,
            dsa_slots: [],
            backend_slots: [],
            custom_tasks: nextDraft.custom_tasks,
            dsa_hours: null,
            backend_hours: null,
            updated_at: updatedAt,
          },
          { onConflict: "user_id,date" },
        );
        if (error) throw error;
        invalidateDailyLogHistoryCache(userId);
        invalidateFullLogCache(userId);
        const normalizedLog = normalizeLog(nextDraft, nextDate);
        normalizedLog.updated_at = updatedAt;
        setDailyLogCache(userId, nextDate, normalizedLog);
        if (nextDate === dateRef.current) {
          savedSnapshotRef.current = snapshot;
          savedUpdatedAtRef.current = updatedAt;
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

  useEffect(() => {
    let active = true;
    const cachedLog = getDailyLogCache(userId, date);
    setLoading(!cachedLog);
    setLoadFailed(false);
    setStatus("");
    if (!cachedLog) setMessage("");
    const snapshotAtRequestStart = savedSnapshotRef.current;
    supabase
      .from("daily_logs")
      .select("date, sleep_time, wake_time, custom_tasks, updated_at")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle()
      .then(({ data, error }) => {
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
      })
      .catch((error) => {
        if (!active) return;
        console.error("Failed to load daily log:", error);
        if (!cachedLog) {
          setLoadFailed(true);
          setStatus("Could not load");
          setMessage("Could not load this daily log.");
        } else {
          setStatus("Offline");
          setMessage("Showing your saved copy; the latest Daily Log could not be fetched.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
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
    saveLog,
    saveLogRef,
    saveQueueRef,
    saving,
  };
}
