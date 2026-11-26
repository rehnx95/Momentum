import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../../shared/lib/supabase";
import { readUserDataCache, writeUserDataCache } from "../../../shared/lib/userDataCache";
import { getOfflineMutations } from "../../../shared/lib/offlineMutationStore";
import { queueOfflineMutation, syncOfflineMutations } from "../../../shared/lib/offlineSync";
import { getLocalDateKey } from "../../../shared/utils/date";

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readCachedProgress(userId) {
  if (!userId) return null;
  const cached = readUserDataCache(userId, "progress");
  return isRecord(cached?.progress) &&
    isRecord(cached?.activityLog) &&
    isRecord(cached?.completedOn) &&
    isRecord(cached?.completedAt)
    ? cached
    : null;
}

export function useProgress(user) {
  const userId = user?.id;
  const [initialCache] = useState(() => ({
    userId,
    data: readCachedProgress(userId),
  }));
  const cachedForCurrentUser = initialCache.userId === userId ? initialCache.data : null;
  const [progress, setProgress] = useState(() => cachedForCurrentUser?.progress || {});
  const progressRef = useRef(progress);
  const completedOnRef = useRef(cachedForCurrentUser?.completedOn || {});
  const [completedOn, setCompletedOn] = useState(() => cachedForCurrentUser?.completedOn || {});
  const completedAtRef = useRef(cachedForCurrentUser?.completedAt || {});
  const [completedAt, setCompletedAt] = useState(() => cachedForCurrentUser?.completedAt || {});
  const [activityLog, setActivityLog] = useState(() => cachedForCurrentUser?.activityLog || {});
  const activityRef = useRef(activityLog);
  const [loading, setLoading] = useState(Boolean(user) && !cachedForCurrentUser);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("theme") || "dark";
    } catch {
      return "dark";
    }
  });
  const writeQueue = useRef(Promise.resolve());
  const cacheProgress = useCallback(
    (userId, nextProgress, nextActivity, nextCompletedOn, nextCompletedAt) => {
      writeUserDataCache(userId, "progress", {
        progress: nextProgress,
        activityLog: nextActivity,
        completedOn: nextCompletedOn,
        completedAt: nextCompletedAt,
      });
    },
    [],
  );

  const replaceProgress = useCallback((nextProgress) => {
    progressRef.current = nextProgress;
    setProgress(nextProgress);
  }, []);

  const replaceActivity = useCallback((nextActivity) => {
    activityRef.current = nextActivity;
    setActivityLog(nextActivity);
  }, []);

  const replaceCompletedOn = useCallback((nextCompletedOn) => {
    completedOnRef.current = nextCompletedOn;
    setCompletedOn(nextCompletedOn);
  }, []);

  const replaceCompletedAt = useCallback((nextCompletedAt) => {
    completedAtRef.current = nextCompletedAt;
    setCompletedAt(nextCompletedAt);
  }, []);

  const save = useCallback(
    (mutations) => {
      const runSave = async () => {
        if (!user?.id) return false;
        cacheProgress(
          user.id,
          progressRef.current,
          activityRef.current,
          completedOnRef.current,
          completedAtRef.current,
        );
        for (const mutation of mutations) {
          await queueOfflineMutation({ userId: user.id, ...mutation });
        }
        const syncResult = await syncOfflineMutations(user.id);
        const mutationKeys = new Set(
          mutations.map(({ type, entityId }) => `${user.id}:${type}:${entityId}`),
        );
        const failure = syncResult.failures.find(
          (item) => mutationKeys.has(item.key) && !item.retryable,
        );
        if (failure) {
          setError(
            `Your progress is saved on this device but could not sync: ${failure.message}${failure.code ? ` ${failure.code}` : ""}`,
          );
        } else {
          setError("");
        }
        return !failure;
      };
      const write = writeQueue.current.then(runSave, runSave);
      writeQueue.current = write.catch((saveError) => {
        console.error("Failed to save user data locally:", saveError);
        setError(
          "Some changes could not be saved on this device. Check your available storage and try again.",
        );
      });
      return write.then(
        (saved) => saved,
        () => false,
      );
    },
    [cacheProgress, user],
  );

  useEffect(() => {
    if (!userId || !supabase) {
      replaceProgress({});
      replaceActivity({});
      replaceCompletedOn({});
      replaceCompletedAt({});
      setLoading(false);
      return undefined;
    }

    let active = true;
    const cached = initialCache.userId === userId ? initialCache.data : readCachedProgress(userId);
    const hasCachedData = Boolean(cached);
    setError("");
    replaceProgress(hasCachedData ? cached.progress : {});
    replaceActivity(hasCachedData ? cached.activityLog : {});
    replaceCompletedOn(hasCachedData ? cached.completedOn : {});
    replaceCompletedAt(hasCachedData ? cached.completedAt : {});
    setLoading(!hasCachedData);

    const loadProgress = async () => {
      try {
        if (typeof navigator === "undefined" || navigator.onLine !== false) {
          await syncOfflineMutations(userId);
        }
        const progressResult = await supabase
          .from("progress")
          .select("problem_id, state, completed_on, updated_at")
          .eq("user_id", userId)
          .in("state", ["todo", "done", "skipped"]);
        if (progressResult.error) throw progressResult.error;
        if (!active) return;

        const progressMap = {};
        const completedOnMap = {};
        const completedAtMap = {};
        for (const item of progressResult.data) {
          progressMap[item.problem_id] = item.state;
          if (item.state === "done" && item.completed_on) {
            completedOnMap[item.problem_id] = item.completed_on;
          }
          if (item.state === "done" && item.updated_at) {
            completedAtMap[item.problem_id] = item.updated_at;
          }
        }

        const pendingMutations = await getOfflineMutations(userId);
        for (const mutation of pendingMutations) {
          if (mutation.type !== "progress") continue;
          const { operation, problemId, rows } = mutation.payload;
          if (operation === "clear") {
            Object.keys(progressMap).forEach((id) => delete progressMap[id]);
            Object.keys(completedOnMap).forEach((id) => delete completedOnMap[id]);
            Object.keys(completedAtMap).forEach((id) => delete completedAtMap[id]);
          } else if (operation === "delete") {
            delete progressMap[problemId];
            delete completedOnMap[problemId];
            delete completedAtMap[problemId];
          } else if (operation === "upsert") {
            for (const row of rows) {
              progressMap[row.problem_id] = row.state;
              if (row.state === "done" && row.completed_on) {
                completedOnMap[row.problem_id] = row.completed_on;
              } else {
                delete completedOnMap[row.problem_id];
              }
              if (row.state === "done" && row.updated_at) {
                completedAtMap[row.problem_id] = row.updated_at;
              } else {
                delete completedAtMap[row.problem_id];
              }
            }
          }
        }

        const activityMap = {};
        for (const [problemId, state] of Object.entries(progressMap)) {
          if (state !== "done") continue;
          const timestamp = Date.parse(completedAtMap[problemId]);
          const activityDate =
            completedOnMap[problemId] ||
            (Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : null);
          if (activityDate) activityMap[activityDate] = (activityMap[activityDate] || 0) + 1;
        }
        replaceProgress(progressMap);
        replaceActivity(activityMap);
        replaceCompletedOn(completedOnMap);
        replaceCompletedAt(completedAtMap);
        cacheProgress(userId, progressMap, activityMap, completedOnMap, completedAtMap);
      } catch (loadError) {
        if (!active) return;
        console.error("Failed to load user data from Supabase:", loadError);
        setError(
          typeof navigator !== "undefined" && navigator.onLine === false
            ? hasCachedData
              ? ""
              : "Offline. No saved progress is available on this device yet."
            : "Could not load your saved progress. Check your Supabase database setup and reload.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadProgress();

    return () => {
      active = false;
    };
  }, [
    userId,
    initialCache,
    cacheProgress,
    replaceActivity,
    replaceCompletedAt,
    replaceCompletedOn,
    replaceProgress,
  ]);

  useEffect(() => {
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // ignore quota errors
    }
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [theme]);

  const update = useCallback(
    async (id, state) => {
      if (!user || !supabase) return;

      const currentState = progressRef.current[id];
      const currentCompletedOn = completedOnRef.current[id];
      const currentCompletedAt = completedAtRef.current[id];
      const today = getLocalDateKey();
      const now = new Date().toISOString();
      const nextProgress = { ...progressRef.current, [id]: state };
      const nextCompletedOn = { ...completedOnRef.current };
      const nextCompletedAt = { ...completedAtRef.current };
      if (state === "done")
        nextCompletedOn[id] = currentState === "done" ? currentCompletedOn || today : today;
      else delete nextCompletedOn[id];
      if (state === "done")
        nextCompletedAt[id] = currentState === "done" ? currentCompletedAt || now : now;
      else delete nextCompletedAt[id];
      replaceProgress(nextProgress);
      replaceCompletedOn(nextCompletedOn);
      replaceCompletedAt(nextCompletedAt);

      const deltas = {};
      if (currentState === "done") {
        const date = currentCompletedOn || today;
        deltas[date] = (deltas[date] || 0) - 1;
      }
      if (state === "done") {
        const date = nextCompletedOn[id];
        deltas[date] = (deltas[date] || 0) + 1;
      }
      const changedDates = Object.keys(deltas).filter((date) => deltas[date] !== 0);
      if (changedDates.length > 0) {
        const nextActivity = { ...activityRef.current };
        for (const date of changedDates) {
          const count = Math.max(0, (nextActivity[date] || 0) + deltas[date]);
          if (count > 0) nextActivity[date] = count;
          else delete nextActivity[date];
        }
        replaceActivity(nextActivity);
      }

      await save([
        {
          type: "progress",
          entityId: id,
          payload: {
            operation: "upsert",
            rows: [
              {
                user_id: user.id,
                problem_id: id,
                state,
                completed_on: state === "done" ? nextCompletedOn[id] : null,
                updated_at: state === "done" ? nextCompletedAt[id] : now,
              },
            ],
          },
        },
      ]);
    },
    [user, replaceActivity, replaceCompletedAt, replaceCompletedOn, replaceProgress, save],
  );

  const bulkUpdate = useCallback(
    async (newProgress) => {
      if (!user || !supabase) return;

      const previousProgress = progressRef.current;
      const previousCompletedOn = completedOnRef.current;
      const previousCompletedAt = completedAtRef.current;
      const today = getLocalDateKey();
      const now = new Date().toISOString();
      const nextCompletedOn = { ...previousCompletedOn };
      const nextCompletedAt = { ...previousCompletedAt };
      const dateDeltas = {};
      for (const [id, state] of Object.entries(newProgress)) {
        const currentState = previousProgress[id];
        const oldDate = previousCompletedOn[id] || today;
        if (currentState === "done") dateDeltas[oldDate] = (dateDeltas[oldDate] || 0) - 1;
        if (state === "done") {
          nextCompletedOn[id] = currentState === "done" ? oldDate : today;
          nextCompletedAt[id] = currentState === "done" ? previousCompletedAt[id] || now : now;
          const newDate = nextCompletedOn[id];
          dateDeltas[newDate] = (dateDeltas[newDate] || 0) + 1;
        } else {
          delete nextCompletedOn[id];
          delete nextCompletedAt[id];
        }
      }
      const changedDates = Object.keys(dateDeltas).filter((date) => dateDeltas[date] !== 0);
      const mergedProgress = { ...progressRef.current, ...newProgress };
      const entries = Object.entries(newProgress).map(([problem_id, state]) => ({
        user_id: user.id,
        problem_id,
        state,
        completed_on: state === "done" ? nextCompletedOn[problem_id] : null,
        updated_at: state === "done" ? nextCompletedAt[problem_id] : now,
      }));
      replaceProgress(mergedProgress);
      replaceCompletedOn(nextCompletedOn);
      replaceCompletedAt(nextCompletedAt);

      if (changedDates.length > 0) {
        const nextActivity = { ...activityRef.current };
        for (const date of changedDates) {
          const count = Math.max(0, (nextActivity[date] || 0) + dateDeltas[date]);
          if (count > 0) nextActivity[date] = count;
          else delete nextActivity[date];
        }
        replaceActivity(nextActivity);
      }

      return save(
        entries.map((entry) => ({
          type: "progress",
          entityId: entry.problem_id,
          payload: { operation: "upsert", rows: [entry] },
        })),
      );
    },
    [user, replaceActivity, replaceCompletedAt, replaceCompletedOn, replaceProgress, save],
  );

  const getState = useCallback((id) => progress[id] || "todo", [progress]);

  const reset = useCallback(
    async (problemIds, { persist = true } = {}) => {
      if (!user || !supabase) return;

      if (Array.isArray(problemIds)) {
        const idsToReset = [...new Set(problemIds)].filter((id) => progressRef.current[id]);
        if (idsToReset.length === 0) {
          if (!persist) {
            cacheProgress(
              user.id,
              progressRef.current,
              activityRef.current,
              completedOnRef.current,
              completedAtRef.current,
            );
          }
          return;
        }

        const nextProgress = { ...progressRef.current };
        const nextCompletedOn = { ...completedOnRef.current };
        const nextCompletedAt = { ...completedAtRef.current };
        const dateDeltas = {};
        for (const id of idsToReset) {
          if (nextProgress[id] === "done") {
            const date = nextCompletedOn[id] || getLocalDateKey();
            dateDeltas[date] = (dateDeltas[date] || 0) - 1;
          }
          delete nextProgress[id];
          delete nextCompletedOn[id];
          delete nextCompletedAt[id];
        }

        const changedDates = Object.keys(dateDeltas).filter((date) => dateDeltas[date] !== 0);
        const nextActivity = { ...activityRef.current };
        for (const date of changedDates) {
          const count = Math.max(0, (nextActivity[date] || 0) + dateDeltas[date]);
          if (count > 0) nextActivity[date] = count;
          else delete nextActivity[date];
        }

        replaceProgress(nextProgress);
        replaceCompletedOn(nextCompletedOn);
        replaceCompletedAt(nextCompletedAt);
        if (changedDates.length > 0) replaceActivity(nextActivity);

        if (!persist) {
          cacheProgress(user.id, nextProgress, nextActivity, nextCompletedOn, nextCompletedAt);
          return;
        }

        await save(
          idsToReset.map((problemId) => ({
            type: "progress",
            entityId: problemId,
            payload: { operation: "delete", problemId },
          })),
        );
        return;
      }

      replaceProgress({});
      replaceActivity({});
      replaceCompletedOn({});
      replaceCompletedAt({});

      await save([
        {
          type: "progress",
          entityId: "all",
          payload: { operation: "clear" },
        },
      ]);
    },
    [
      user,
      cacheProgress,
      replaceActivity,
      replaceCompletedAt,
      replaceCompletedOn,
      replaceProgress,
      save,
    ],
  );

  return {
    progress,
    activityLog,
    completedOn,
    completedAt,
    loading,
    error,
    setError,
    update,
    bulkUpdate,
    getState,
    theme,
    setTheme,
    reset,
  };
}
