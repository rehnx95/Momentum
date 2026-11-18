import { useEffect, useRef, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

function getStatusText({ online, pendingCount, syncing, message }) {
  if (!online) {
    return pendingCount
      ? `Offline. ${pendingCount} ${pendingCount === 1 ? "change is" : "changes are"} saved here and will sync when you're back online.`
      : "Offline. Your changes will be saved here and sync when you're back online.";
  }
  if (message) return message;
  if (pendingCount) {
    return syncing
      ? `Syncing ${pendingCount} ${pendingCount === 1 ? "change" : "changes"}…`
      : `${pendingCount} ${pendingCount === 1 ? "change" : "changes"} waiting to sync.`;
  }
  return "Online. All changes are synced.";
}

export default function OfflineSyncStatus({
  online,
  pendingCount,
  syncing,
  message,
  onRetry,
}) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const containerRef = useRef(null);
  const isOpen = hovered || pinned;
  const statusText = getStatusText({ online, pendingCount, syncing, message });
  const StatusIcon = online ? Wifi : WifiOff;

  useEffect(() => {
    if (!pinned) return undefined;
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setPinned(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [pinned]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setHovered(false);
          setPinned(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setHovered(false);
          setPinned(false);
        }
      }}
    >
      <button
        type="button"
        className="icon-btn"
        aria-label={`Connection status: ${statusText}`}
        aria-expanded={isOpen}
        aria-controls="offline-sync-status"
        onClick={() => setPinned((current) => !current)}
      >
        <StatusIcon
          size={18}
          aria-hidden="true"
          style={{
            color: online && pendingCount === 0 && !message ? "var(--success)" : "var(--warning)",
          }}
        />
      </button>
      {isOpen && (
        <div
          id="offline-sync-status"
          role="group"
          aria-label="Connection status"
          className="absolute right-0 top-full z-[110] mt-2 flex w-max max-w-[min(20rem,calc(100vw-2rem))] items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl"
          style={{
            backgroundColor: "var(--surface-raised)",
            borderColor: "var(--border)",
            color: "var(--text)",
          }}
        >
          <span aria-live="polite">{statusText}</span>
          {online && pendingCount > 0 && (
            <button
              type="button"
              onClick={onRetry}
              disabled={syncing}
              className="flex-shrink-0 rounded-md px-3 py-2 font-semibold disabled:opacity-60"
              style={{ backgroundColor: "var(--accent)", color: "var(--page)" }}
            >
              {syncing ? "Syncing…" : "Sync now"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
