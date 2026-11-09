import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { formatDuration, slotMinutes } from "../utils/time";
import { getLocalDateKey } from "../hooks/useDailyLog";

function slotTotal(slots = []) {
  return slots.reduce((total, slot) => {
    if (slot.endDayOffset === 1 && slot.end === "00:00") {
      const start = slotMinutes({ start: slot.start, end: "23:59" });
      return total + (start === null ? 1 : start + 1);
    }
    return total + (slotMinutes(slot) || 0);
  }, 0);
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

function studyTotal(row) {
  return (Array.isArray(row.custom_tasks) ? row.custom_tasks : []).reduce(
    (total, task) => total + slotTotal(task.slots || []),
    0,
  );
}

function displayActivityName(name) {
  return String(name || "Activity").trim().toLowerCase() === "dsa"
    ? "DSA"
    : name || "Activity";
}

function activityBreakdown(row) {
  const activities = [];
  (Array.isArray(row.custom_tasks) ? row.custom_tasks : []).forEach((task) => {
    const minutes = slotTotal(task.slots || []);
    if (minutes) {
      activities.push(`${displayActivityName(task.name)} ${formatDuration(minutes)}`);
    }
  });
  return activities;
}

function mondayKey(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return getLocalDateKey(date);
}

function dateLabel(dateKey, options) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, options);
}

function weekLabel(weekStart) {
  const weekEnd = new Date(`${weekStart}T00:00:00`);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const endKey = getLocalDateKey(weekEnd);
  const start = new Date(`${weekStart}T00:00:00`);
  const sameMonth = start.getMonth() === weekEnd.getMonth();
  const sameYear = start.getFullYear() === weekEnd.getFullYear();

  if (sameMonth) {
    return `${dateLabel(weekStart, { month: "short", day: "numeric" })}–${dateLabel(
      endKey,
      sameYear
        ? { day: "numeric", year: "numeric" }
        : { month: "short", day: "numeric", year: "numeric" },
    )}`;
  }
  return `${dateLabel(weekStart, { month: "short", day: "numeric" })}–${dateLabel(
    endKey,
    { month: "short", day: "numeric", year: "numeric" },
  )}`;
}

function Stat({ label, value }) {
  return (
    <div className="full-log-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
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

  const weeks = useMemo(() => {
    const groups = new Map();
    daily.allLogs.forEach((row) => {
      const key = mondayKey(row.date);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });

    return [...groups.entries()].map(([key, rows]) => {
      const studied = rows.reduce((total, row) => total + studyTotal(row), 0);
      const problems = rows.reduce(
        (total, row) => total + (daily.problemCounts[row.date] || 0),
        0,
      );
      const sleepRows = rows.map(sleepTotal).filter(Boolean);
      const averageSleep = sleepRows.length
        ? Math.round(
            sleepRows.reduce((total, minutes) => total + minutes, 0) /
              sleepRows.length,
          )
        : 0;
      return { key, rows, studied, problems, averageSleep };
    });
  }, [daily.allLogs, daily.problemCounts]);

  const overview = useMemo(() => {
    const sleepRows = daily.allLogs.map(sleepTotal).filter(Boolean);
    const studied = daily.allLogs.reduce(
      (total, row) => total + studyTotal(row),
      0,
    );
    const problems = daily.allLogs.reduce(
      (total, row) => total + (daily.problemCounts[row.date] || 0),
      0,
    );
    const averageSleep = sleepRows.length
      ? Math.round(
          sleepRows.reduce((total, minutes) => total + minutes, 0) /
            sleepRows.length,
        )
      : 0;
    return {
      days: daily.allLogs.length,
      studied,
      problems,
      averageSleep,
    };
  }, [daily.allLogs, daily.problemCounts]);

  return (
    <div className="daily-full-log">
      <div className="full-log-header">
        <div>
          <h3>Activity overview</h3>
          <p>Totals for loaded days. Open a week to see each day.</p>
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
      </div>

      {daily.allLogsLoading ? (
        <p className="daily-full-empty" role="status">
          Loading your activity…
        </p>
      ) : daily.allLogs.length === 0 ? (
        <p className="daily-full-empty">No saved daily logs yet.</p>
      ) : (
        <>
          <div className="full-log-overview" aria-label="Activity totals">
            <Stat label="Days logged" value={overview.days} />
            <Stat label="Study time" value={formatDuration(overview.studied)} />
            <Stat label="Problems solved" value={overview.problems} />
            <Stat
              label="Average sleep"
              value={overview.averageSleep ? formatDuration(overview.averageSleep) : "—"}
            />
          </div>

          <div className="full-log-week-list">
            {weeks.map((week, index) => (
              <details
                className="full-log-week"
                key={week.key}
                open={index === 0}
              >
                <summary>
                  <span className="full-log-week-title">
                    <ChevronDown size={15} aria-hidden="true" />
                    {weekLabel(week.key)}
                  </span>
                  <span className="full-log-week-stats">
                    <span>{formatDuration(week.studied)} study</span>
                    <span>{week.problems} solved</span>
                    <span>
                      {week.averageSleep
                        ? `${formatDuration(week.averageSleep)} avg sleep`
                        : "— sleep"}
                    </span>
                  </span>
                </summary>
                <ul className="full-log-days">
                  {week.rows.map((row) => {
                    const activities = activityBreakdown(row);
                    const studied = studyTotal(row);
                    const slept = sleepTotal(row);
                    const problems = daily.problemCounts[row.date] || 0;
                    return (
                      <li key={row.date}>
                        <button
                          type="button"
                          className="full-log-day"
                          onClick={() => onOpenDate(row.date)}
                          aria-label={`Open log for ${dateLabel(row.date, {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })}`}
                        >
                          <span className="full-log-day-date">
                            <strong>
                              {dateLabel(row.date, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </strong>
                            <span>
                              {activities.length
                                ? activities.join(" · ")
                                : problems
                                  ? "Problems solved"
                                  : "No timed activities"}
                            </span>
                          </span>
                          <span className="full-log-day-metrics">
                            <span>
                              <small>Study</small>
                              {studied ? formatDuration(studied) : "—"}
                            </span>
                            <span>
                              <small>Solved</small>
                              {problems}
                            </span>
                            <span>
                              <small>Sleep</small>
                              {slept ? formatDuration(slept) : "—"}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </details>
            ))}
          </div>
        </>
      )}

      {daily.hasOlderLogs && (
        <button
          type="button"
          className="load-older-button"
          disabled={daily.olderLogsLoading}
          onClick={daily.loadOlderLogs}
        >
          {daily.olderLogsLoading ? "Loading…" : "Load older"}
        </button>
      )}
    </div>
  );
}
