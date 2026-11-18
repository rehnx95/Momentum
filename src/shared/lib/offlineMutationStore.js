const DATABASE_NAME = "momentum-offline";
const DATABASE_VERSION = 1;
const STORE_NAME = "mutations";
const FALLBACK_STORAGE_KEY = "momentum:offline-mutations";

let databasePromise;
let lastMutationTimestamp = Date.now();

function openDatabase() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is unavailable."));
  }
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error || new Error("Could not open offline storage."));
    request.onblocked = () => reject(new Error("Offline storage is blocked by another tab."));
  }).catch((error) => {
    databasePromise = null;
    throw error;
  });

  return databasePromise;
}

function readFallbackMutations() {
  const raw = localStorage.getItem(FALLBACK_STORAGE_KEY);
  if (!raw) return [];
  const mutations = JSON.parse(raw);
  if (!Array.isArray(mutations)) throw new Error("Offline storage data is invalid.");
  return mutations;
}

function writeFallbackMutations(mutations) {
  localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(mutations));
}

async function getIndexedMutations() {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error("Could not read offline changes."));
    transaction.onabort = () =>
      reject(transaction.error || new Error("Could not read offline changes."));
  });
}

async function putIndexedMutation(mutation) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(mutation);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error || new Error("Could not store offline changes."));
    transaction.onabort = () =>
      reject(transaction.error || new Error("Could not store offline changes."));
  });
}

async function deleteIndexedMutation(key, expectedUpdatedAt) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    let removed = false;
    const request = store.get(key);
    request.onsuccess = () => {
      if (
        request.result &&
        (expectedUpdatedAt === undefined || request.result.updatedAt === expectedUpdatedAt)
      ) {
        store.delete(key);
        removed = true;
      }
    };
    transaction.oncomplete = () => resolve(removed);
    transaction.onerror = () =>
      reject(transaction.error || new Error("Could not remove a synced change."));
    transaction.onabort = () =>
      reject(transaction.error || new Error("Could not remove a synced change."));
  });
}

function mergeMutations(...groups) {
  const byKey = new Map();
  for (const mutation of groups.flat()) {
    const previous = byKey.get(mutation.key);
    if (!previous || mutation.updatedAt >= previous.updatedAt) {
      byKey.set(mutation.key, mutation);
    }
  }
  return [...byKey.values()];
}

async function getAllOfflineMutations() {
  let indexedMutations = [];
  try {
    indexedMutations = await getIndexedMutations();
  } catch (error) {
    if (typeof indexedDB !== "undefined") {
      console.warn("Using fallback storage for offline changes:", error);
    }
  }

  let fallbackMutations = [];
  try {
    fallbackMutations = readFallbackMutations();
  } catch (error) {
    if (typeof indexedDB === "undefined" || indexedMutations.length === 0) throw error;
    console.warn("Could not read fallback offline storage:", error);
  }
  return mergeMutations(indexedMutations, fallbackMutations);
}

export async function getOfflineMutations(userId) {
  return (await getAllOfflineMutations())
    .filter((mutation) => mutation.userId === userId)
    .sort((first, second) => first.updatedAt - second.updatedAt);
}

export async function putOfflineMutation({ userId, type, entityId, payload }) {
  lastMutationTimestamp = Math.max(Date.now(), lastMutationTimestamp + 1);
  const mutation = {
    key: `${userId}:${type}:${entityId}`,
    userId,
    type,
    entityId,
    payload,
    updatedAt: lastMutationTimestamp,
  };

  try {
    await putIndexedMutation(mutation);
    try {
      const fallbackMutations = readFallbackMutations().filter((item) => item.key !== mutation.key);
      writeFallbackMutations(fallbackMutations);
    } catch (error) {
      console.warn("Could not clean up fallback offline storage:", error);
    }
  } catch (error) {
    if (typeof indexedDB !== "undefined") {
      console.warn("Using fallback storage for offline changes:", error);
    }
    const fallbackMutations = readFallbackMutations().filter((item) => item.key !== mutation.key);
    writeFallbackMutations([...fallbackMutations, mutation]);
  }
  return mutation;
}

export async function removeOfflineMutation(key, expectedUpdatedAt) {
  let indexedError;
  let removed = false;
  try {
    removed = await deleteIndexedMutation(key, expectedUpdatedAt);
  } catch (error) {
    indexedError = error;
  }

  let fallbackAvailable = true;
  try {
    const fallbackMutations = readFallbackMutations().filter((mutation) => {
      const shouldRemove =
        mutation.key === key &&
        (expectedUpdatedAt === undefined || mutation.updatedAt <= expectedUpdatedAt);
      if (shouldRemove) removed = true;
      return !shouldRemove;
    });
    writeFallbackMutations(fallbackMutations);
  } catch (error) {
    fallbackAvailable = false;
    console.warn("Could not update fallback offline storage:", error);
  }
  if (indexedError && typeof indexedDB !== "undefined") {
    console.warn("Could not remove an IndexedDB offline change:", indexedError);
  }
  if (!fallbackAvailable) return removed;
  return removed && !(await getAllOfflineMutations()).some((mutation) => mutation.key === key);
}

export async function countOfflineMutations(userId) {
  return (await getOfflineMutations(userId)).length;
}

export async function removeOfflineMutations(userId, types) {
  const allowedTypes = new Set(types);
  const mutations = await getOfflineMutations(userId);
  for (const mutation of mutations) {
    if (allowedTypes.has(mutation.type)) {
      await removeOfflineMutation(mutation.key, mutation.updatedAt);
    }
  }
}

export function notifyOfflineQueueChanged(userId) {
  if (
    typeof window !== "undefined" &&
    typeof window.dispatchEvent === "function" &&
    typeof CustomEvent !== "undefined"
  ) {
    window.dispatchEvent(new CustomEvent("momentum:offline-queue", { detail: { userId } }));
  }
}
