import { useCallback } from "react";
import DayView from "./DayView";
import FullLog from "./FullLog";
import useDailyLog from "../hooks/useDailyLog";
import "./DailyTracker.css";

export default function DailyTracker({ user, askConfirmation }) {
  const daily = useDailyLog(user);

  const openDate = useCallback(async (date) => {
    if (await daily.changeDate(date)) daily.setViewMode("daily");
  }, [daily.changeDate, daily.setViewMode]);

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
            onClick={() => daily.setViewMode("daily")}
          >
            Day
          </button>
          <button
            type="button"
            className={daily.viewMode === "full" ? "active" : ""}
            aria-pressed={daily.viewMode === "full"}
            onClick={() => daily.setViewMode("full")}
          >
            Full log
          </button>
        </div>
      </header>

      {daily.viewMode === "daily" ? (
        daily.loading ? (
          <p className="daily-full-empty" role="status">Loading daily log…</p>
        ) : (
          <DayView daily={daily} askConfirmation={askConfirmation} />
        )
      ) : (
        <FullLog daily={daily} onOpenDate={openDate} />
      )}
      {daily.viewMode === "full" && daily.message && (
        <p className="daily-error-message" role="alert">{daily.message}</p>
      )}
    </section>
  );
}
