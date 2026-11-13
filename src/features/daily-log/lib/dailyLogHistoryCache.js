import { getItem, removeItem, setItem } from "../../../shared/lib/safeStorage";

const CACHE_DURATION = 60_000;
const cache = new Map();
const HISTORY_STORAGE_PREFIX = "momentum:log-history:";
const DAY_STORAGE_PREFIX = "momentum:day-log:";
const FULL_LOG_STORAGE_PREFIX = "momentum:full-log:";

export function getDailyLogHistoryCache(userId) {
  let entry = cache.get(userId);
  if (!entry) {
    try {
      const stored = getItem(`${HISTORY_STORAGE_PREFIX}${userId}`);
      entry = stored ? JSON.parse(stored) : null;
      if (entry?.logs && Number.isFinite(entry.loadedAt)) cache.set(userId, entry);
    } catch {
      entry = null;
    }
  }
  if (!entry) return null;
  return {
    logs: entry.logs,
    isFresh: Date.now() - entry.loadedAt < CACHE_DURATION,
  };
}

export function setDailyLogHistoryCache(userId, logs) {
  const entry = { logs, loadedAt: Date.now() };
  cache.set(userId, entry);
  try {
    setItem(`${HISTORY_STORAGE_PREFIX}${userId}`, JSON.stringify(entry));
  } catch (error) {
    console.warn("Could not cache Daily Log history locally:", error);
  }
}

export function invalidateDailyLogHistoryCache(userId) {
  const entry = cache.get(userId) || getDailyLogHistoryCache(userId);
  if (entry) {
    const staleEntry = { ...entry, loadedAt: 0 };
    cache.set(userId, staleEntry);
    try {
      setItem(`${HISTORY_STORAGE_PREFIX}${userId}`, JSON.stringify(staleEntry));
    } catch (error) {
      console.warn("Could not invalidate cached Daily Log history:", error);
    }
  }
}

export function getDailyLogCache(userId, date) {
  try {
    const stored = getItem(`${DAY_STORAGE_PREFIX}${userId}:${date}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function setDailyLogCache(userId, date, log) {
  try {
    setItem(`${DAY_STORAGE_PREFIX}${userId}:${date}`, JSON.stringify(log));
  } catch (error) {
    console.warn("Could not cache the Daily Log entry locally:", error);
  }
}

export function clearDailyLogCaches(userId) {
  cache.delete(userId);
  try {
    removeItem(`${HISTORY_STORAGE_PREFIX}${userId}`);
    removeItem(`${FULL_LOG_STORAGE_PREFIX}${userId}`);
    const dayPrefix = `${DAY_STORAGE_PREFIX}${userId}:`;
    const keys = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(dayPrefix)) keys.push(key);
    }
    keys.forEach((key) => removeItem(key));
  } catch (error) {
    console.warn("Could not clear cached Daily Log data:", error);
  }
}

export function getFullLogCache(userId) {
  try {
    const stored = getItem(`${FULL_LOG_STORAGE_PREFIX}${userId}`);
    const entry = stored ? JSON.parse(stored) : null;
    return entry && Array.isArray(entry.logs) ? entry : null;
  } catch {
    return null;
  }
}

export function setFullLogCache(userId, logs, hasOlderLogs) {
  try {
    setItem(
      `${FULL_LOG_STORAGE_PREFIX}${userId}`,
      JSON.stringify({ logs, hasOlderLogs, loadedAt: Date.now() }),
    );
  } catch (error) {
    console.warn("Could not cache Full Log history locally:", error);
  }
}

export function invalidateFullLogCache(userId) {
  try {
    removeItem(`${FULL_LOG_STORAGE_PREFIX}${userId}`);
  } catch (error) {
    console.warn("Could not invalidate cached Full Log history:", error);
  }
}
