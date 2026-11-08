import { useEffect, useMemo, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
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
  return slotMinutes(
    { start: String(row.sleep_time).slice(0, 5), end: String(row.wake_time).slice(0, 5) },
    { wrap: true },
  ) || 0;
}

function rowTotals(row) {
  const custom = (Array.isArray(row.custom_tasks) ? row.custom_tasks : []).reduce(
    (total, task) => total + slotTotal(task.slots || []),
    0,
  );
  return { custom, studied: custom };
}

function activityBreakdown(row) {
  const activities = [];
  (Array.isArray(row.custom_tasks) ? row.custom_tasks : []).forEach((task) => {
    const minutes = slotTotal(task.slots || []);
    if (minutes) activities.push(`${displayActivityName(task.name)} ${formatDuration(minutes)}`);
  });
  return activities.join(" · ");
}

function displayActivityName(name) {
  return String(name || "Activity").trim().toLowerCase() === "dsa"
    ? "DSA"
    : name || "Activity";
}

function mondayKey(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return getLocalDateKey(date);
}

function WeeklyChart({ rows }) {
  const latestDate = rows[0]?.date;
  const weekStart = latestDate ? mondayKey(latestDate) : null;
  const weekDays = weekStart
    ? Array.from({ length: 7 }, (_, index) => {
        const date = new Date(`${weekStart}T00:00:00`);
        date.setDate(date.getDate() + index);
        return getLocalDateKey(date);
      })
    : [];
  const rowsByDate = new Map(rows.map((row) => [row.date, row]));
  const customActivities = new Map();
  weekDays.forEach((date) => {
    const row = rowsByDate.get(date);
    if (!row) return;
    (Array.isArray(row.custom_tasks) ? row.custom_tasks : []).forEach((task, index) => {
      if (slotTotal(task.slots || []) <= 0) return;
      const id = task.id || task.name || `custom-${index}`;
      if (!customActivities.has(id)) {
        customActivities.set(id, {
          id,
          name: displayActivityName(task.name || "Custom"),
          color: task.color || "var(--activity-custom)",
        });
      }
    });
  });
  const activities = [
    ...customActivities.values(),
  ];
  const maxMinutes = Math.max(
    60,
    ...weekDays.map((date) => rowTotals(rowsByDate.get(date) || {}).studied),
  );
  const maxHours = Math.max(1, Math.ceil(maxMinutes / 60));
  const width = 420;
  const height = 184;
  const plotLeft = 38;
  const plotRight = 410;
  const plotTop = 24;
  const baseline = 142;
  const plotHeight = baseline - plotTop;
  const slotWidth = (plotRight - plotLeft) / 7;
  const barWidth = 20;
  const scale = plotHeight / (maxHours * 60);
  const yTicks = [...new Set([0, Math.ceil(maxHours / 2), maxHours])];

  return (
    <section className="weekly-chart-card" aria-label="Daily study time by activity">
      <h3>
        Study by day
        {weekStart && (
          <span className="weekly-chart-period">
            {new Date(`${weekStart}T00:00:00`).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
            {" – "}
            {new Date(`${weekDays[6]}T00:00:00`).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </h3>
      {rows.length ? (
        <svg
          className="weekly-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Stacked daily study-time bars for the latest week"
        >
          {yTicks.map((hours) => {
            const y = baseline - hours * 60 * scale;
            return (
              <g key={hours}>
                <line
                  x1={plotLeft}
                  x2={plotRight}
                  y1={y}
                  y2={y}
                  className="weekly-chart-grid"
                />
                <text x="2" y={y + 3} className="weekly-chart-axis-label">
                  {hours}h
                </text>
              </g>
            );
          })}
          {weekDays.map((date, index) => {
            const row = rowsByDate.get(date);
            const center = plotLeft + slotWidth * (index + 0.5);
            let y = baseline;
            const tasks = new Map(
              (Array.isArray(row?.custom_tasks) ? row.custom_tasks : []).map(
                (task, taskIndex) => [task.id || task.name || `custom-${taskIndex}`, task],
              ),
            );
            const tooltipDetails = activities.flatMap((activity) => {
              const minutes = slotTotal(tasks.get(activity.id)?.slots || []);
              return minutes > 0
                ? [`${activity.name} ${formatDuration(minutes)}`]
                : [];
            });
            const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString(
              undefined,
              { month: "short", day: "numeric" },
            );
            const title = tooltipDetails.length
              ? `${dateLabel} · ${tooltipDetails.join(" · ")}`
              : `${dateLabel} · Nothing logged`;
            return (
              <g key={date}>
                <title>{title}</title>
                {activities.map((activity) => {
                  const minutes = slotTotal(tasks.get(activity.id)?.slots || []);
                  if (!minutes) return null;
                  const barHeight = minutes * scale;
                  y -= barHeight;
                  return (
                    <rect
                      key={activity.id}
                      x={center - barWidth / 2}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill={activity.color}
                      rx="1"
                    />
                  );
                })}
                {!tooltipDetails.length && (
                  <line
                    x1={center - 4}
                    x2={center + 4}
                    y1={baseline - 2}
                    y2={baseline - 2}
                    className="weekly-chart-empty-tick"
                  />
                )}
                <text
                  x={center}
                  y="163"
                  textAnchor="middle"
                  className="weekly-chart-day-label"
                >
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}
                </text>
              </g>
            );
          })}
        </svg>
      ) : (
        <p>No study entries yet.</p>
      )}
      <div className="weekly-chart-legend">
        {activities.map((activity) => (
          <span key={activity.id}>
            <i style={{ background: activity.color }} />
            {activity.name}
          </span>
        ))}
      </div>
    </section>
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
      const total = rows.reduce((sum, row) => sum + rowTotals(row).studied, 0);
      const sleepRows = rows.map(sleepTotal).filter((value) => value > 0);
      const averageSleep =
        sleepRows.length > 0
          ? Math.round(sleepRows.reduce((sum, value) => sum + value, 0) / sleepRows.length)
          : 0;
      return { key, rows, total, averageSleep };
    });
  }, [daily.allLogs]);

  return (
    <div className="daily-full-log">
      <div className="full-log-actions">
        <p>Daily time and sleep entries</p>
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
                    'This permanently deletes your saved Daily Log entries. Type CLEAR to continue.',
                  );
                  if (confirmation === "CLEAR") await daily.clearAllLogs();
                }}
              >
                {daily.clearingHistory ? "Clearing history…" : "Clear my saved history"}
              </button>
            </div>
          )}
        </div>
      </div>
      <WeeklyChart rows={daily.allLogs} />

      {daily.allLogsLoading ? (
        <p className="daily-full-empty">Loading full log…</p>
      ) : daily.allLogs.length === 0 ? (
        <p className="daily-full-empty">No saved daily logs yet.</p>
      ) : (
        <div className="weekly-log-groups">
          {weeks.map((week) => (
            <section className="weekly-log-group" key={week.key}>
              <header>
                <h3>
                  Week of{" "}
                  {new Date(`${week.key}T00:00:00`).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h3>
                <span>
                  {formatDuration(week.total)} studied
                  <span aria-hidden="true"> · </span>
                  {week.averageSleep
                    ? `${formatDuration(week.averageSleep)} avg sleep`
                    : "No sleep data"}
                </span>
              </header>
              <div className="weekly-log-table-wrap">
                <table className="weekly-log-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Sleep</th>
                      <th>Activities</th>
                      <th>Total · problems</th>
                    </tr>
                  </thead>
                  <tbody>
                    {week.rows.map((row) => {
                      const totals = rowTotals(row);
                      const slept = sleepTotal(row);
                      const problems = daily.problemCounts[row.date] || 0;
                      return (
                        <tr
                          key={row.date}
                          tabIndex={0}
                          onClick={() => onOpenDate(row.date)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onOpenDate(row.date);
                            }
                          }}
                        >
                          <th scope="row">
                            {new Date(`${row.date}T00:00:00`).toLocaleDateString(
                              undefined,
                              { weekday: "short", month: "short", day: "numeric" },
                            )}
                          </th>
                          {totals.studied === 0 && slept === 0 ? (
                            <td colSpan={3}>
                              Nothing logged
                              {problems > 0 ? ` · ${problems} problems` : ""}
                            </td>
                          ) : (
                            <>
                              <td>{formatDuration(slept)}</td>
                              <td>{activityBreakdown(row) || "Nothing logged"}</td>
                              <td>{formatDuration(totals.studied)} · {problems} problems</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
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
