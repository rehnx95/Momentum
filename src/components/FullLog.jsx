import { useMemo } from "react";
import { Clock3, Trash2 } from "lucide-react";
import { formatDuration, slotMinutes } from "../utils/time";
import Tooltip from "./Tooltip";

function slotDuration(slot) {
  if (slot.endDayOffset === 1 && slot.end === "00:00") {
    const start = slotMinutes({ start: slot.start, end: "23:59" });
    return start === null ? 1 : start + 1;
  }
  return slotMinutes(slot);
}

function slotTotal(slots = []) {
  return slots.reduce((total, slot) => total + (slotDuration(slot) || 0), 0);
}

function formatTime(value) {
  if (!value) return "—";
  const [hours, minutes] = String(value).slice(0, 5).split(":");
  return `${hours}:${minutes}`;
}

function dateLabel(value) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

export default function FullLog({ daily }) {
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
        <div className="full-log-pagination">
          <button
            type="button"
            className="load-older-button"
            disabled={
              daily.allLogsLoading ||
              daily.olderLogsLoading ||
              !daily.hasOlderLogs
            }
            onClick={() => daily.loadOlderLogs()}
          >
            {daily.hasOlderLogs ? "Load 10 older days" : "No older days"}
          </button>
          <button
            type="button"
            className="load-older-button full-log-show-all"
            disabled={
              daily.allLogsLoading ||
              daily.olderLogsLoading ||
              !daily.hasOlderLogs
            }
            onClick={() => daily.loadOlderLogs(true)}
          >
            {daily.hasOlderLogs ? "Show all days" : "All days shown"}
          </button>
        </div>
        <Tooltip label="Clear my saved history">
          <button
            type="button"
            className="full-log-clear-button"
            aria-label="Clear my saved history"
            disabled={
              daily.clearingHistory ||
              daily.allLogsLoading ||
              daily.olderLogsLoading ||
              daily.loading
            }
            onClick={async () => {
              const confirmation = window.prompt(
                "This permanently deletes your saved Daily Log entries. Type CLEAR to continue.",
              );
              if (confirmation === "CLEAR") await daily.clearAllLogs();
            }}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </Tooltip>
      </header>

      {entries.length ? (
        <ul className="full-log-day-list">
          {entries.map(({ row, activities, sleep, studied, problems }) => (
            <li key={row.date}>
              <article className="full-log-day">
                <div className="full-log-day-content">
                  <header className="full-log-day-heading">
                    <strong className="full-log-day-date">{dateLabel(row.date)}</strong>
                  </header>
                  <div className="full-log-summary">
                    <div className="full-log-summary-item">
                      <small>Sleep</small>
                      <strong>{formatTime(row.sleep_time)}</strong>
                    </div>
                    <div className="full-log-summary-item">
                      <small>Wake</small>
                      <strong>{formatTime(row.wake_time)}</strong>
                    </div>
                    <div className="full-log-summary-item">
                      <small>Sleep duration</small>
                      <strong>{sleep ? formatDuration(sleep) : "—"}</strong>
                    </div>
                    <div className="full-log-summary-item">
                      <small>Studied</small>
                      <strong>{studied ? formatDuration(studied) : "—"}</strong>
                    </div>
                    <div className="full-log-summary-item">
                      <small>Solved</small>
                      <strong>{problems}</strong>
                    </div>
                  </div>
                  {activities.length ? (
                    <div className="full-log-activities">
                      {activities.map((activity, index) => (
                        <div
                          className="full-log-activity"
                          key={`${activity.name}-${index}`}
                        >
                          <div className="full-log-activity-heading">
                            <div className="full-log-activity-identity">
                              <Clock3 size={15} aria-hidden="true" />
                              <strong>{activity.name}</strong>
                            </div>
                            <span className="activity-total">
                              {formatDuration(activity.minutes)}
                            </span>
                          </div>
                          <div className="full-log-activity-slots">
                            {activity.slots.map((slot, slotIndex) => {
                              const duration = slotDuration(slot);
                              return (
                                <div
                                  className="full-log-activity-slot"
                                  key={`${slot.start}-${slot.end}-${slotIndex}`}
                                  aria-label={`${activity.name} slot ${slotIndex + 1}`}
                                >
                                  <span className="time-input full-log-readonly-time">
                                    {formatTime(slot.start)}
                                  </span>
                                  <span className="slot-arrow" aria-hidden="true">→</span>
                                  <span className="time-input full-log-readonly-time">
                                    {formatTime(slot.end)}
                                  </span>
                                  <span className="slot-hours">
                                    {duration === null ? "—" : formatDuration(duration)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="full-log-no-activities">
                      No timed activities
                    </p>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      ) : daily.allLogsLoading ? (
        <div className="daily-full-empty" aria-hidden="true" />
      ) : (
        <p className="daily-full-empty">No saved daily logs yet.</p>
      )}
    </div>
  );
}
