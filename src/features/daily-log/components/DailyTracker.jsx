import DayView from "./DayView";
import FullLog from "./FullLog";
import useDailyLog from "../hooks/useDailyLog";
import "./DailyTracker.css";
import "./ActivityEditor.css";
import "./DailyTrackerStatus.css";
import "./DailyTrackerStatus.responsive.css";
import "./FullLog.css";
import "./FullLog.responsive.css";

export default function DailyTracker({ user, sheets, activityLog, askConfirmation }) {
  const daily = useDailyLog(user, activityLog);

  return (
    <section className="daily-tracker surface-card" aria-labelledby="daily-log-title">
      <header className="daily-toolbar">
        <h2 id="daily-log-title" className="page-title">
          {daily.viewMode === "daily" ? "Daily log" : "Full log"}
        </h2>
        <div className="daily-view-switch" aria-label="Daily log view">
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
        </div>
      </header>

      {daily.viewMode === "daily" ? (
        <DayView daily={daily} sheets={sheets} askConfirmation={askConfirmation} />
      ) : (
        <FullLog daily={daily} />
      )}
      {daily.message && (
        <p className="daily-error-message" role="alert">{daily.message}</p>
      )}
    </section>
  );
}
