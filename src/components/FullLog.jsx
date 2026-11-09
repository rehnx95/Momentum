import { useEffect, useMemo, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { formatDuration, slotMinutes } from "../utils/time";

function slotTotal(slots = []) {
  return slots.reduce((total, slot) => {
    if (slot.endDayOffset === 1 && slot.end === "00:00") {
      const start = slotMinutes({ start: slot.start, end: "23:59" });
      return total + (start === null ? 1 : start + 1);
    }
    return total + (slotMinutes(slot) || 0);
  }, 0);
}

function formatTime(value) {
  if (!value) return "—";
  const [hours, minutes] = String(value).slice(0, 5).split(":");
  return `${hours}:${minutes}`;
}

function sleepTotal(row) {
  if (!row.sleep_time || !row.wake_time) return 0;
  return (
    slotMinutes(
      {
        start: String(row.sleep_time).slice(0, 5),
        end: String(row.wake_time).slice(0, 5),
      },
      { wrap: true },
    ) || 0
  );
}

function activityBreakdown(row) {
  return (Array.isArray(row.custom_tasks) ? row.custom_tasks : [])
    .map((task) => ({
      name:
        String(task.name || "Activity").trim().toLowerCase() === "dsa"
          ? "DSA"
          : task.name || "Activity",
      slots: Array.isArray(task.slots) ? task.slots : [],
      minutes: slotTotal(task.slots || []),
    }))
    .filter((activity) => activity.minutes > 0 || activity.slots.length > 0);
}

function dateLabel(dateKey) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function FullLog({ daily, onOpenDate }) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef(null);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!actionsRef.current?.contains(event.target)) setActionsOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setActionsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const entries = useMemo(
    () =>
      daily.allLogs.map((row) => {
        const activities = activityBreakdown(row);
        return {
          row,
          activities,
          sleep: sleepTotal(row),
          studied: activities.reduce(
            (total, activity) => total + activity.minutes,
            0,
          ),
          problems: daily.problemCounts[row.date] || 0,
        };
      }),
    [daily.allLogs, daily.problemCounts],
  );

  return (
    <div className="daily-full-log">
      <header className="full-log-header">
        <div>
          <h3>Full log</h3>
          <p>Showing {entries.length} entries · loads 10 days at a time</p>
        </div>
        <div className="full-log-menu-wrap" ref={actionsRef}>
          <button
            type="button"
            className="full-log-menu-trigger"
            aria-label="Full log actions"
            aria-haspopup="menu"
            aria-expanded={actionsOpen}
            onClick={() => setActionsOpen((open) => !open)}
          >
            <MoreHorizontal size={18} />
          </button>
          {actionsOpen && (
            <div className="full-log-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                className="clear-daily-history"
                disabled={
                  daily.clearingHistory ||
                  daily.allLogsLoading ||
                  daily.olderLogsLoading ||
                  daily.loading
                }
                onClick={async () => {
                  setActionsOpen(false);
                  const confirmation = window.prompt(
                    "This permanently deletes your saved Daily Log entries. Type CLEAR to continue.",
                  );
                  if (confirmation === "CLEAR") await daily.clearAllLogs();
                }}
              >
                {daily.clearingHistory
                  ? "Clearing history…"
                  : "Clear my saved history"}
              </button>
            </div>
          )}
        </div>
      </header>

      {daily.allLogsLoading ? (
        <p className="daily-full-empty" role="status">
          Loading recent days…
        </p>
      ) : entries.length ? (
        <ul className="full-log-day-list">
          {entries.map(({ row, activities, sleep, studied, problems }) => (
            <li key={row.date}>
              <button
                type="button"
                className="full-log-day"
                onClick={() => onOpenDate(row.date)}
                aria-label={`Open log for ${dateLabel(row.date)}`}
              >
                <span className="full-log-day-content">
                  <strong className="full-log-day-date">
                    {dateLabel(row.date)}
                  </strong>
                  <span className="full-log-day-overview">
                    <span className="full-log-sleep-card">
                      <span className="full-log-sleep-value">
                        <small>Sleep</small>
                        <strong>{formatTime(row.sleep_time)}</strong>
                      </span>
                      <span className="full-log-sleep-value">
                        <small>Wake</small>
                        <strong>{formatTime(row.wake_time)}</strong>
                      </span>
                    </span>
                    <span className="full-log-metrics-card">
                      <span className="full-log-metric">
                        <strong>{problems}</strong>
                        <span>solved</span>
                      </span>
                      <span className="full-log-metric">
                        <strong>{sleep ? formatDuration(sleep) : "—"}</strong>
                        <span>sleep duration</span>
                      </span>
                      <span className="full-log-metric">
                        <strong>{studied ? formatDuration(studied) : "—"}</strong>
                        <span>studied</span>
                      </span>
                    </span>
                  </span>
                  {activities.length ? (
                    <span className="full-log-activities">
                      {activities.map((activity, index) => (
                        <span
                          className="full-log-activity"
                          key={`${activity.name}-${index}`}
                        >
                          <span className="full-log-activity-heading">
                            <strong>{activity.name}</strong>
                            <strong>{formatDuration(activity.minutes)}</strong>
                          </span>
                          <span className="full-log-activity-slots">
                            {activity.slots.map((slot, slotIndex) => (
                              <span
                                className="full-log-activity-slot"
                                key={`${slot.start}-${slot.end}-${slotIndex}`}
                              >
                                {formatTime(slot.start)}–{formatTime(slot.end)}
                              </span>
                            ))}
                          </span>
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="full-log-no-activities">
                      No timed activities
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="daily-full-empty">No saved daily logs yet.</p>
      )}

      {daily.hasOlderLogs && (
        <button
          type="button"
          className="load-older-button"
          disabled={daily.olderLogsLoading}
          onClick={daily.loadOlderLogs}
        >
          {daily.olderLogsLoading ? "Loading…" : "Load 10 older days"}
        </button>
      )}
    </div>
  );
}
