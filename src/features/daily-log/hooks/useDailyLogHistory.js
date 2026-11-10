import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../../shared/lib/supabase";
import {
  clearDailyLogCaches,
  getFullLogCache,
  invalidateFullLogCache,
  setFullLogCache,
} from "../lib/dailyLogHistoryCache";

const PAGE_SIZE = 10;
const FULL_LOG_CACHE_DURATION = 60_000;

export default function useDailyLogHistory(userId, viewMode, setMessage) {
  const [cachedFullLog] = useState(() => getFullLogCache(userId));
  const [allLogs, setAllLogs] = useState(() => cachedFullLog?.logs || []);
  const [allLogsLoading, setAllLogsLoading] = useState(false);
  const [hasOlderLogs, setHasOlderLogs] = useState(
    () => cachedFullLog?.hasOlderLogs || false,
  );
  const [olderLogsLoading, setOlderLogsLoading] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const logsRequestRef = useRef(0);

  const loadLogs = useCallback(async () => {
    const requestId = ++logsRequestRef.current;
    const cached = getFullLogCache(userId);
    if (cached) {
      setAllLogs(cached.logs);
      setHasOlderLogs(cached.hasOlderLogs);
      if (Date.now() - cached.loadedAt < FULL_LOG_CACHE_DURATION) return;
    } else {
      setAllLogsLoading(true);
    }
    try {
      const logsResult = await supabase
        .from("daily_logs")
        .select("date, sleep_time, wake_time, custom_tasks")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(PAGE_SIZE + 1);
      if (logsResult.error) throw logsResult.error;
      if (requestId !== logsRequestRef.current) return;
      const fetched = logsResult.data || [];
      const rows = fetched.slice(0, PAGE_SIZE);
      const currentDates = new Set(rows.map((row) => row.date));
      const retainedRows = (cached?.logs || []).filter(
        (row) => !currentDates.has(row.date),
      );
      const refreshedRows = [...rows, ...retainedRows].sort((a, b) =>
        b.date.localeCompare(a.date),
      );
      setAllLogs(refreshedRows);
      const nextHasOlderLogs =
        fetched.length > PAGE_SIZE || retainedRows.length > 0;
      setHasOlderLogs(nextHasOlderLogs);
      setFullLogCache(userId, refreshedRows, nextHasOlderLogs);
    } catch (error) {
      if (requestId !== logsRequestRef.current) return;
      console.error("Failed to load full daily log:", error);
      setMessage("Could not load the full log.");
    } finally {
      if (requestId === logsRequestRef.current) setAllLogsLoading(false);
    }
  }, [setMessage, userId]);

  useEffect(() => {
    if (viewMode === "full") void loadLogs();
  }, [viewMode, loadLogs]);

  const loadOlderLogs = useCallback(async (loadAll = false) => {
    const oldest = allLogs[allLogs.length - 1]?.date;
    if (!oldest) return;
    setOlderLogsLoading(true);
    let cursor = oldest;
    let more = true;
    let accumulatedLogs = allLogs;
    try {
      while (more) {
        const logsResult = await supabase
          .from("daily_logs")
          .select("date, sleep_time, wake_time, custom_tasks")
          .eq("user_id", userId)
          .lt("date", cursor)
          .order("date", { ascending: false })
          .limit(PAGE_SIZE + 1);
        if (logsResult.error) throw logsResult.error;
        const fetched = logsResult.data || [];
        const rows = fetched.slice(0, PAGE_SIZE);
        const oldestFetched = rows[rows.length - 1]?.date;
        if (rows.length) {
          accumulatedLogs = [...accumulatedLogs, ...rows];
          setAllLogs(accumulatedLogs);
        }
        more = fetched.length > PAGE_SIZE;
        setHasOlderLogs(more);
        setFullLogCache(userId, accumulatedLogs, more);
        if (!loadAll || !oldestFetched) break;
        cursor = oldestFetched;
      }
    } catch (error) {
      console.error("Failed to load older daily logs:", error);
      setMessage("Could not load older log entries.");
    } finally {
      setOlderLogsLoading(false);
    }
  }, [allLogs, setMessage, userId]);

  const clearHistory = useCallback(async (waitForPendingSave) => {
    setClearingHistory(true);
    try {
      await waitForPendingSave();
      logsRequestRef.current += 1;
      const { error } = await supabase
        .from("daily_logs")
        .delete()
        .eq("user_id", userId);
      if (error) throw error;
      clearDailyLogCaches(userId);
      setAllLogs([]);
      setHasOlderLogs(false);
      invalidateFullLogCache(userId);
      return true;
    } catch (error) {
      console.error("Failed to clear this user's daily logs:", error);
      setMessage(
        "Could not clear all Daily Log data. Refresh and check your history before retrying.",
      );
      return false;
    } finally {
      setClearingHistory(false);
    }
  }, [setMessage, userId]);

  return {
    allLogs,
    allLogsLoading,
    clearingHistory,
    clearHistory,
    hasOlderLogs,
    loadOlderLogs,
    olderLogsLoading,
  };
}
