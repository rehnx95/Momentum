import { useMemo } from "react";
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
    if (minutes) activities.push(`${task.name || "Activity"} ${formatDuration(minutes)}`);
  });
  return activities.join(" · ");
}

function mondayKey(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return getLocalDateKey(date);
}

function WeeklyChart({ rows }) {
  const chartRows = [...rows].reverse();
  const customActivities = new Map();
  chartRows.forEach((row) => {
    (Array.isArray(row.custom_tasks) ? row.custom_tasks : []).forEach((task, index) => {
      const id = task.id || task.name || `custom-${index}`;
      if (!customActivities.has(id)) {
        customActivities.set(id, {
          id,
          name: task.name || "Custom",
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
    ...chartRows.map((row) => rowTotals(row).studied),
  );
  const width = Math.max(700, chartRows.length * 12);
  const height = 150;
  const barWidth = 8;
  const scale = 112 / maxMinutes;

  return (
    <section className="weekly-chart-card" aria-label="Daily study time by activity">
      <h3>Study by day</h3>
      {rows.length ? (
        <svg
          className="weekly-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Stacked daily study-time bars for the loaded period"
        >
          <line x1="0" x2={width} y1="126" y2="126" className="weekly-chart-axis" />
          {chartRows.map((row, index) => {
            const x = index * 12 + 2;
            let y = 126;
            const tasks = new Map(
              (Array.isArray(row.custom_tasks) ? row.custom_tasks : []).map(
                (task, taskIndex) => [task.id || task.name || `custom-${taskIndex}`, task],
              ),
            );
            return (
              <g key={row.date}>
                <title>{row.date}: {formatDuration(rowTotals(row).studied)} studied</title>
                {activities.map((activity) => {
                  const minutes = slotTotal(tasks.get(activity.id)?.slots || []);
                  if (!minutes) return null;
                  const barHeight = minutes * scale;
                  y -= barHeight;
                  return (
                    <rect
                      key={activity.id}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill={activity.color}
                      rx="1"
                    />
                  );
                })}
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

export default function FullLog({ daily, onOpenDate, askConfirmation }) {
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
        <button
          type="button"
          className="clear-daily-history"
          disabled={
            daily.clearingHistory ||
            daily.allLogsLoading ||
            daily.olderLogsLoading ||
            daily.loading
          }
          onClick={async () => {
            const confirmed = await askConfirmation(
              "Permanently delete all saved Daily Log entries and Daily Log activity choices for your account? Tracker progress and problem history will not change.",
              "Clear my Daily Log data?",
            );
            if (confirmed) await daily.clearAllLogs();
          }}
        >
          {daily.clearingHistory ? "Clearing history…" : "Clear my saved history"}
        </button>
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
