import { useCallback, useEffect, useState } from "react";
import { countOfflineMutations } from "../lib/offlineMutationStore";
import { syncOfflineMutations } from "../lib/offlineSync";

function getOnlineState() {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

function getSyncMessage(result) {
  if (result.conflicts.length) {
    return "Some Daily Log edits conflict with newer cloud changes. Your local copy is preserved.";
  }
  if (result.failures.length) {
    return `Changes are waiting to sync: ${result.failures[0].message}`;
  }
  return "";
}

export default function useOfflineSync(userId) {
  const [online, setOnline] = useState(getOnlineState);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  const refreshPendingCount = useCallback(async () => {
    if (!userId) {
      setPendingCount(0);
      return;
    }
    try {
      setPendingCount(await countOfflineMutations(userId));
    } catch (error) {
      console.error("Could not read pending offline changes:", error);
      setMessage(
        "Could not check the offline sync queue. Your saved changes remain on this device.",
      );
    }
  }, [userId]);

  const sync = useCallback(async () => {
    if (!userId) return null;
    setSyncing(true);
    try {
      const result = await syncOfflineMutations(userId);
      setPendingCount(result.pending);
      setMessage(getSyncMessage(result));
      return result;
    } catch (error) {
      console.error("Could not sync offline changes:", error);
      setMessage(
        `Could not sync changes: ${error?.message || "Please check your connection and try again."}`,
      );
      return null;
    } finally {
      setSyncing(false);
    }
  }, [userId]);

  useEffect(() => {
    let active = true;
    const handleOffline = () => setOnline(false);
    const handleOnline = () => {
      setOnline(true);
      void sync();
    };
    const handleQueueChange = (event) => {
      if (event.detail?.userId === userId) void refreshPendingCount();
    };
    const handleSync = (event) => {
      if (event.detail?.userId !== userId) return;
      setPendingCount(event.detail.pending);
      setMessage(getSyncMessage(event.detail));
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && getOnlineState()) {
        void sync();
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    window.addEventListener("momentum:offline-queue", handleQueueChange);
    window.addEventListener("momentum:offline-sync", handleSync);
    document.addEventListener("visibilitychange", handleVisibility);
    setOnline(getOnlineState());
    void refreshPendingCount().then(() => {
      if (active && getOnlineState()) void sync();
    });

    return () => {
      active = false;
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("momentum:offline-queue", handleQueueChange);
      window.removeEventListener("momentum:offline-sync", handleSync);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshPendingCount, sync, userId]);

  return { online, pendingCount, syncing, message, retrySync: sync };
}
