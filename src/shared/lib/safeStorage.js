const getStorage = () => globalThis.localStorage;

export function getItem(key, fallback = null) {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    const value = storage.getItem(key);
    return value === null ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

export function setItem(key, value) {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch (error) {
    return false;
  }
}

export function removeItem(key) {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.removeItem(key);
    return true;
  } catch (error) {
    return false;
  }
}
