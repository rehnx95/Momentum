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
import "./DailyLogRedesign.css";

export default function DailyTracker({ user, sheets, activityLog, askConfirmation }) {
  const [fullLogToolbarTarget, setFullLogToolbarTarget] = useState(null);
  const daily = useDailyLog(user, activityLog);
  const title =
    daily.viewMode === "daily" ? "Daily log" : daily.viewMode === "full" ? "Full log" : "Trends";
  const subtitle =
    daily.viewMode === "daily"
      ? `Where your hours went on ${new Date(`${daily.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "long" })}.`
      : daily.viewMode === "full"
        ? "Every day at a glance."
        : "How your days add up over time.";
  const savedStatusText =
    daily.status && daily.status !== ""
      ? daily.status === "Saved"
        ? `Saved ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
        : daily.status
      : "";

  return (
    <section className="daily-tracker surface-card" aria-labelledby="daily-log-title">
      <header className="daily-toolbar">
        <div className="daily-toolbar-copy">
          <div className="daily-toolbar-title-row">
            <h2 id="daily-log-title" className="page-title">
              {title}
            </h2>
            {savedStatusText && (
              <span className="daily-save-status" role="status" aria-live="polite">
                {savedStatusText}
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
            aria-label="Daily log view"
          >
            <button
              type="button"
              className={daily.viewMode === "daily" ? "active" : ""}
              aria-pressed={daily.viewMode === "daily"}
              onClick={() => void daily.changeViewMode("daily")}
            >
              Day
            </button>
            <button
              type="button"
              className={daily.viewMode === "full" ? "active" : ""}
              aria-pressed={daily.viewMode === "full"}
              onClick={() => void daily.changeViewMode("full")}
            >
              Full log
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
          askConfirmation={askConfirmation}
          toolbarContainer={fullLogToolbarTarget}
        />
      ) : (
        <TrendsView daily={daily} />
      )}
      {daily.message && (
        <p className="daily-error-message" role="alert">
          {daily.message}
        </p>
      )}
    </section>
  );
}
