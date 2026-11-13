import { getItem, removeItem, setItem } from "./safeStorage";

const CACHE_PREFIX = "momentum:user-data:";
const MAX_CACHE_SIZE = 2_500_000;

function cacheKey(userId, section) {
  return `${CACHE_PREFIX}${userId}:${section}`;
}

export function readUserDataCache(userId, section) {
  try {
    const stored = getItem(cacheKey(userId, section));
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function writeUserDataCache(userId, section, data) {
  try {
    const serialized = JSON.stringify(data);
    const key = cacheKey(userId, section);
    if (serialized.length > MAX_CACHE_SIZE) {
      removeItem(key);
      return;
    }
    setItem(key, serialized);
  } catch (error) {
    console.warn(`Could not cache ${section} data locally:`, error);
  }
}
