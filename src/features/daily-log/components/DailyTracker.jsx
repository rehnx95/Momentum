import { useEffect, useState } from "react";
import DayView from "./DayView";
import FullLog from "./FullLog";
import TrendsView from "./TrendsView";
import useDailyLog from "../hooks/useDailyLog";
import "./ActivityEditor.css";
import "./DailyTrackerStatus.css";
import "./DailyTrackerStatus.responsive.css";
import "./FullLog.css";
import "./FullLog.responsive.css";
import "./DailyTracker.css";
import "./DailyLogPage.css";
import "./DailyLogPolish.css";

function formatClock(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function DailyTracker({ user, sheets, activityLog, askConfirmation }) {
  const [fullLogToolbarTarget, setFullLogToolbarTarget] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const daily = useDailyLog(user, activityLog);

  useEffect(() => {
    if (daily.status === "Saved") setSavedAt(new Date());
  }, [daily.status]);

  const title =
    daily.viewMode === "daily" ? "Daily Log" : daily.viewMode === "full" ? "Full Log" : "Trends";
  const subtitle =
    daily.viewMode === "daily"
      ? `Where your hours went on ${new Date(`${daily.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "long" })}.`
      : daily.viewMode === "full"
        ? "Every day at a glance."
        : "How your days add up over time.";
  const canSaveNow =
    daily.dirty &&
    !daily.saving &&
    !daily.loading &&
    !daily.loadFailed &&
    daily.status !== "This day changed elsewhere" &&
    daily.validation.errors.length === 0;
  const showSaveStatus = daily.status || daily.message || daily.dirty;
  const statusLabel =
    daily.status === "Saved"
      ? savedAt
        ? `Saved ${formatClock(savedAt)}`
        : "Saved"
      : daily.status === "Saving…" || daily.status === "Saving soon…"
        ? "Saving…"
        : daily.status;

  return (
    <section className="daily-tracker surface-card" aria-labelledby="daily-log-title">
      <header className="daily-toolbar">
        <div className="daily-toolbar-copy">
          <div className="daily-title-row">
            <h2 id="daily-log-title" className="page-title">
              {title}
            </h2>
            {showSaveStatus && (
              <div className="daily-save-status" role="status" aria-live="polite">
                <div className="daily-save-status-copy">
                  {statusLabel && <span>{statusLabel}</span>}
                </div>
                <div className="daily-save-action-slot">
                  {canSaveNow && (
                    <button type="button" onClick={() => void daily.saveNow()}>
                      {daily.status === "Could not save" ? "Retry save" : "Save now"}
                    </button>
                  )}
                </div>
              </div>
            )}
            {daily.message && (
              <span className="daily-save-message" role="alert" aria-live="assertive">
                {daily.message}
              </span>
            )}
          </div>
          <p className="daily-toolbar-subtitle">{subtitle}</p>
        </div>
        <div className="daily-toolbar-controls" data-view-mode={daily.viewMode}>
          {daily.viewMode === "full" && (
            <div
              ref={setFullLogToolbarTarget}
              className="daily-full-log-toolbar-actions"
              role="group"
              aria-label="Full log actions"
            />
          )}
          <div
            className={`daily-view-switch ${daily.viewMode === "full" ? "" : "daily-view-switch-content-sized"}`}
            aria-label="Daily Log view"
          >
            <button
              type="button"
              className={daily.viewMode === "daily" ? "active" : ""}
              aria-pressed={daily.viewMode === "daily"}
              onClick={() => void daily.changeViewMode("daily")}
            >
              Daily Log
            </button>
            <button
              type="button"
              className={daily.viewMode === "full" ? "active" : ""}
              aria-pressed={daily.viewMode === "full"}
              onClick={() => void daily.changeViewMode("full")}
            >
              Full Log
            </button>
            <button
              type="button"
              className={daily.viewMode === "trends" ? "active" : ""}
              aria-pressed={daily.viewMode === "trends"}
              onClick={() => void daily.changeViewMode("trends")}
            >
              Trends
            </button>
          </div>
        </div>
      </header>

      {daily.viewMode === "daily" ? (
        <DayView daily={daily} sheets={sheets} askConfirmation={askConfirmation} />
      ) : daily.viewMode === "full" ? (
        <FullLog
          daily={daily}
          sheets={sheets}
          toolbarContainer={fullLogToolbarTarget}
          askConfirmation={askConfirmation}
        />
      ) : (
        <TrendsView daily={daily} sheets={sheets} />
      )}
    </section>
  );
}
