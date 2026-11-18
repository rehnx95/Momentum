export default function OfflineSyncStatus({ online, pendingCount, syncing, message, onRetry }) {
  if (online && pendingCount === 0 && !message) return null;

  const statusText = !online
    ? "Offline. Changes are saved on this device."
    : message || `${pendingCount} ${pendingCount === 1 ? "change" : "changes"} waiting to sync.`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 z-[90] mx-auto flex max-w-xl items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl"
      style={{
        backgroundColor: "var(--surface-raised)",
        borderColor: "var(--border)",
        color: "var(--text)",
      }}
    >
      <span>{statusText}</span>
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
  );
}
