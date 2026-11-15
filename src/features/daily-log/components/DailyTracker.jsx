import { useState } from "react";
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

export default function DailyTracker({ user, sheets, activityLog, askConfirmation }) {
  const [fullLogToolbarTarget, setFullLogToolbarTarget] = useState(null);
  const daily = useDailyLog(user, activityLog);
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

  return (
    <section className="daily-tracker surface-card" aria-labelledby="daily-log-title">
      <header className="daily-toolbar">
        <div className="daily-toolbar-copy">
          <h2 id="daily-log-title" className="page-title">
            {title}
          </h2>
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

      {showSaveStatus && (
        <div
          className="daily-save-status"
          role={daily.message ? "alert" : "status"}
          aria-live={daily.message ? "assertive" : "polite"}
        >
          <div className="daily-save-status-copy">
            {daily.status && <span>{daily.status}</span>}
            {daily.message && <span className="daily-save-message">{daily.message}</span>}
          </div>
          {canSaveNow && (
            <button type="button" onClick={() => void daily.saveNow()}>
              {daily.status === "Could not save" ? "Retry save" : "Save now"}
            </button>
          )}
        </div>
      )}

      {daily.viewMode === "daily" ? (
        <DayView daily={daily} sheets={sheets} askConfirmation={askConfirmation} />
      ) : daily.viewMode === "full" ? (
        <FullLog
          daily={daily}
          sheets={sheets}
          askConfirmation={askConfirmation}
          toolbarContainer={fullLogToolbarTarget}
        />
      ) : (
        <TrendsView daily={daily} sheets={sheets} />
      )}
    </section>
  );
}
