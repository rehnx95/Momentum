const CACHE_DURATION = 60_000;
const cache = new Map();

export function getDailyLogHistoryCache(userId) {
  const entry = cache.get(userId);
  if (!entry) return null;
  return {
    logs: entry.logs,
    isFresh: Date.now() - entry.loadedAt < CACHE_DURATION,
  };
}

export function setDailyLogHistoryCache(userId, logs) {
  cache.set(userId, { logs, loadedAt: Date.now() });
}

export function invalidateDailyLogHistoryCache(userId) {
  const entry = cache.get(userId);
  if (entry) cache.set(userId, { ...entry, loadedAt: 0 });
}
