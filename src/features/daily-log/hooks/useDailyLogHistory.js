import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../../shared/lib/supabase";
import {
  clearDailyLogCaches,
  getFullLogCache,
  invalidateFullLogCache,
  setFullLogCache,
} from "../lib/dailyLogHistoryCache";
import { getLocalDateKey } from "../../../shared/utils/date";
import { removeOfflineMutations } from "../../../shared/lib/offlineMutationStore";
import { queueOfflineMutation, syncOfflineMutations } from "../../../shared/lib/offlineSync";
import { isNetworkUnavailable } from "../../../shared/utils/network";

const PAGE_SIZE = 10;
const FULL_LOG_CACHE_DURATION = 60_000;
const OFFLINE_HISTORY_MESSAGES = [
  "Offline. Showing saved Full Log history.",
  "Full Log history is not available offline until it has loaded online.",
];

export default function useDailyLogHistory(userId, viewMode, setMessage) {
  const [cachedFullLog] = useState(() => getFullLogCache(userId));
  const [allLogs, setAllLogs] = useState(() => cachedFullLog?.logs || []);
  const [allLogsLoading, setAllLogsLoading] = useState(false);
  const [hasOlderLogs, setHasOlderLogs] = useState(() => cachedFullLog?.hasOlderLogs || false);
  const [olderLogsLoading, setOlderLogsLoading] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const logsRequestRef = useRef(0);

  const loadLogs = useCallback(
    async (forceRefresh = false) => {
      const requestId = ++logsRequestRef.current;
      const cached = getFullLogCache(userId);
      const trendsStart = new Date();
      trendsStart.setDate(trendsStart.getDate() - 181);
      const trendsStartKey = getLocalDateKey(trendsStart);
      const isTrendsView = viewMode === "trends";
      const cachedHasOlderLogs = Boolean(
        cached?.hasOlderLogs || (cached?.logs || []).some((row) => row.date < trendsStartKey),
      );
      let hasOlderTrendLogs = cachedHasOlderLogs;
      const findOlderTrendLogs = async () => {
        const result = await supabase
          .from("daily_logs")
          .select("date")
          .eq("user_id", userId)
          .lt("date", trendsStartKey)
          .limit(1);
        if (result.error) throw result.error;
        return Boolean(result.data?.length);
      };

      if (cached) {
        setAllLogs(cached.logs);
        setHasOlderLogs(cachedHasOlderLogs);
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          setAllLogsLoading(false);
          setMessage(
            cached.logs.length ? OFFLINE_HISTORY_MESSAGES[0] : OFFLINE_HISTORY_MESSAGES[1],
          );
          return;
        }
        if (
          !forceRefresh &&
          Date.now() - cached.loadedAt < FULL_LOG_CACHE_DURATION &&
          viewMode !== "trends"
        ) {
          return;
        }
      } else {
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          setAllLogsLoading(false);
          setMessage(OFFLINE_HISTORY_MESSAGES[1]);
          return;
        }
        setAllLogsLoading(true);
      }
      try {
        if (cached && isTrendsView && !cachedHasOlderLogs) {
          hasOlderTrendLogs = await findOlderTrendLogs();
          if (requestId !== logsRequestRef.current) return;
          setHasOlderLogs(hasOlderTrendLogs);
          if (!hasOlderTrendLogs) {
            setFullLogCache(userId, cached.logs, false);
            return;
          }
        }

        const query = supabase
          .from("daily_logs")
          .select("date, sleep_time, wake_time, custom_tasks")
          .eq("user_id", userId);
        if (isTrendsView) query.gte("date", trendsStartKey);
        const result = await query
          .order("date", { ascending: false })
          .limit(isTrendsView ? 183 : PAGE_SIZE + 1);
        if (result.error) throw result.error;
        if (requestId !== logsRequestRef.current) return;
        const fetched = result.data || [];
        const rows = fetched.slice(0, PAGE_SIZE);
        const currentDates = new Set(rows.map((row) => row.date));
        const retainedRows = (cached?.logs || []).filter(
          (row) => !currentDates.has(row.date) && (!isTrendsView || row.date >= trendsStartKey),
        );
        const refreshedRows = [...(isTrendsView ? fetched : rows), ...retainedRows]
          .filter(
            (row, index, entries) =>
              entries.findIndex((entry) => entry.date === row.date) === index,
          )
          .sort((a, b) => b.date.localeCompare(a.date));
        setAllLogs(refreshedRows);
        let nextHasOlderLogs = isTrendsView ? hasOlderTrendLogs : false;
        if (!isTrendsView) {
          nextHasOlderLogs = fetched.length > PAGE_SIZE || retainedRows.length > 0;
        }
        if (isTrendsView && !nextHasOlderLogs) {
          nextHasOlderLogs = await findOlderTrendLogs();
          if (requestId !== logsRequestRef.current) return;
        }
        setHasOlderLogs(nextHasOlderLogs);
        setFullLogCache(userId, refreshedRows, nextHasOlderLogs);
        setMessage((current) => (OFFLINE_HISTORY_MESSAGES.includes(current) ? "" : current));
      } catch (error) {
        if (requestId !== logsRequestRef.current) return;
        if (isNetworkUnavailable(error)) {
          setMessage(
            cached?.logs?.length ? OFFLINE_HISTORY_MESSAGES[0] : OFFLINE_HISTORY_MESSAGES[1],
          );
        } else {
          console.error("Failed to load full daily log:", error);
          setMessage("Could not load the full log.");
        }
      } finally {
        if (requestId === logsRequestRef.current) setAllLogsLoading(false);
      }
    },
    [setMessage, userId, viewMode],
  );

  useEffect(() => {
    if (viewMode === "full" || viewMode === "trends") void loadLogs();
    const handleOnline = () => {
      if (viewMode === "full" || viewMode === "trends") void loadLogs(true);
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [viewMode, loadLogs]);

  const loadOlderLogs = useCallback(
    async (loadAll = false) => {
      const oldest = allLogs[allLogs.length - 1]?.date;
      if (!oldest) return false;
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setMessage("Offline. Older history is not available on this device yet.");
        return false;
      }
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
        return true;
      } catch (error) {
        if (isNetworkUnavailable(error)) {
          setMessage("Offline. Older history is not available on this device yet.");
        } else {
          console.error("Failed to load older daily logs:", error);
          setMessage("Could not load older log entries.");
        }
        return false;
      } finally {
        setOlderLogsLoading(false);
      }
    },
    [allLogs, setMessage, userId],
  );

  const clearHistory = useCallback(
    async (waitForPendingSave) => {
      setClearingHistory(true);
      try {
        await waitForPendingSave();
        logsRequestRef.current += 1;
        await removeOfflineMutations(userId, ["daily-log", "daily-log-slot"]);
        const mutation = await queueOfflineMutation({
          userId,
          type: "delete-daily-logs",
          entityId: "all",
          payload: {},
        });
        const syncResult = await syncOfflineMutations(userId);
        const failure = syncResult.failures.find(
          (item) => item.key === mutation.key && !item.retryable,
        );
        clearDailyLogCaches(userId);
        setAllLogs([]);
        setHasOlderLogs(false);
        invalidateFullLogCache(userId);
        if (failure) {
          setMessage(
            `Daily Log history was cleared on this device but could not sync: ${failure.message}`,
          );
        }
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
    },
    [setMessage, userId],
  );

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
