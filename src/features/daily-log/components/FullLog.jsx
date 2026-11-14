import { createPortal } from "react-dom";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, List, Trash2 } from "lucide-react";
import { formatDuration, getSlotDurationMinutes, slotMinutes } from "../../../shared/utils/time";
import Tooltip from "../../../shared/components/Tooltip";
import Dropdown from "../../../shared/components/Dropdown";
import FullLogTimeline from "./FullLogTimeline";
import { getActivityColor } from "../lib/activityColor";

const PAGE_SIZE = 10;

function slotTotal(slots = []) {
  return slots.reduce((total, slot) => total + (getSlotDurationMinutes(slot) || 0), 0);
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
      id: task.id,
      name:
        String(task.name || "Activity")
          .trim()
          .toLowerCase() === "dsa"
          ? "DSA"
          : task.name || "Activity",
      slots: Array.isArray(task.slots) ? task.slots : [],
      minutes: slotTotal(task.slots || []),
    }))
    .filter((activity) => activity.minutes > 0);
}

export default function FullLog({ daily, askConfirmation, toolbarContainer }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activityFilter, setActivityFilter] = useState("All");
  const entries = useMemo(
    () =>
      daily.allLogs.map((row) => {
        const activities = activityBreakdown(row);
        return {
          row,
          activities,
          sleep: sleepTotal(row),
          studied: activities.reduce((total, activity) => total + activity.minutes, 0),
          problems: daily.problemCounts[row.date] || 0,
        };
      }),
    [daily.allLogs, daily.problemCounts],
  );
  const activityFilters = useMemo(() => {
    const names = new Set(
      entries.flatMap(({ activities }) => activities.map((activity) => activity.name)),
    );
    const filters = ["All"];
    if (entries.some(({ sleep }) => sleep > 0)) filters.push("Sleep");
    return [...filters, ...names];
  }, [entries]);
  const legendItems = activityFilters
    .filter((filter) => filter !== "All")
    .map((label) => ({
      label,
      color: label === "Sleep" ? null : getActivityColor(label),
    }));
  const filteredEntries = entries.filter(({ row, activities }) => {
    if (activityFilter === "All") return true;
    if (activityFilter === "Sleep") return Boolean(row.sleep_time || row.wake_time);
    return activities.some((activity) => activity.name === activityFilter);
  });
  const visibleEntries = filteredEntries.slice(0, visibleCount);
  const hasCachedOlderDays = visibleCount < filteredEntries.length;
  const hasMoreDays = hasCachedOlderDays || daily.hasOlderLogs;
  const isShowingAll = visibleCount === Infinity;
  const paginationDisabled = daily.allLogsLoading || daily.olderLogsLoading;

  const loadMoreDays = async () => {
    if (hasCachedOlderDays) {
      setVisibleCount(Math.min(visibleCount + PAGE_SIZE, filteredEntries.length));
      return;
    }
    if (!daily.hasOlderLogs) return;
    if (await daily.loadOlderLogs()) {
      setVisibleCount((current) => current + PAGE_SIZE);
    }
  };

  const showAllDays = async () => {
    if (daily.hasOlderLogs && !(await daily.loadOlderLogs(true))) return;
    setVisibleCount(Infinity);
  };

  const clearHistory = async () => {
    const confirmed = await askConfirmation(
      "This permanently deletes your saved Daily Log entries. This cannot be undone.",
      "Clear saved log history?",
      { dangerous: true, requireWord: "CLEAR", confirmText: "Clear" },
    );
    if (confirmed) await daily.clearAllLogs();
  };

  const toolbarActions = toolbarContainer
    ? createPortal(
        <div className="full-log-toolbar-actions">
          <Tooltip label="Clear log">
            <button
              type="button"
              className="full-log-icon-button"
              aria-label="Clear log"
              disabled={
                daily.clearingHistory ||
                daily.allLogsLoading ||
                daily.olderLogsLoading ||
                daily.loading
              }
              onClick={() => void clearHistory()}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </Tooltip>
          {hasMoreDays && (
            <Tooltip label="Load 10 older days">
              <button
                type="button"
                className="full-log-icon-button"
                aria-label="Load 10 older days"
                disabled={paginationDisabled}
                onClick={() => void loadMoreDays()}
              >
                <ArrowDown size={16} aria-hidden="true" />
              </button>
            </Tooltip>
          )}
          {hasMoreDays && !isShowingAll && (
            <Tooltip label="Show all days">
              <button
                type="button"
                className="full-log-icon-button"
                aria-label="Show all days"
                disabled={paginationDisabled}
                onClick={() => void showAllDays()}
              >
                <List size={16} aria-hidden="true" />
              </button>
            </Tooltip>
          )}
          {visibleCount > PAGE_SIZE && (
            <Tooltip label="Show latest 10 days">
              <button
                type="button"
                className="full-log-icon-button"
                aria-label="Show latest 10 days"
                disabled={paginationDisabled}
                onClick={() => setVisibleCount(PAGE_SIZE)}
              >
                <ArrowUp size={16} aria-hidden="true" />
              </button>
            </Tooltip>
          )}
        </div>,
        toolbarContainer,
      )
    : null;

  return (
    <div className="daily-full-log">
      {toolbarActions}
      <section className="full-log-history" aria-label="Full log history">
        <header className="full-log-history-toolbar">
          <Dropdown
            ariaLabel="Filter full log"
            className="full-log-filter-dropdown"
            value={activityFilter}
            onChange={(filter) => {
              setActivityFilter(filter);
              setVisibleCount(PAGE_SIZE);
            }}
            options={activityFilters.map((filter) => ({
              value: filter,
              label: filter === "All" ? "All activities" : filter,
            }))}
          />
          <div className="full-log-legend" role="group" aria-label="Activity colors">
            {legendItems.map(({ label, color }) => (
              <span key={label}>
                <i
                  className={label === "Sleep" ? "sleep" : ""}
                  aria-hidden="true"
                  style={color ? { "--activity-color": color } : undefined}
                />
                {label}
              </span>
            ))}
          </div>
        </header>

        <div className="full-log-history-scroll">
          {visibleEntries.length ? (
            <div className="full-log-table">
              <div className="full-log-table-header" aria-hidden="true">
                <span>Date</span>
                <div className="full-log-table-axis">
                  <span>12am</span>
                  <span>6am</span>
                  <span>12pm</span>
                  <span>6pm</span>
                  <span>12am</span>
                </div>
                <span>Sleep</span>
                <span>Active</span>
              </div>
              <ul className="full-log-day-list">
                {visibleEntries.map(({ row, activities, sleep, studied }) => (
                  <li className="full-log-day" key={row.date}>
                    <span className="full-log-day-date">
                      <span className="full-log-day-weekday">
                        {new Date(`${row.date}T00:00:00`).toLocaleDateString(undefined, {
                          weekday: "short",
                        })}
                      </span>
                      <button
                        type="button"
                        className="full-log-date-button"
                        aria-label={`Open daily log for ${new Date(`${row.date}T00:00:00`).toLocaleDateString()}`}
                        onClick={async () => {
                          if (row.date === daily.date || (await daily.changeDate(row.date))) {
                            await daily.changeViewMode("daily");
                          }
                        }}
                      >
                        {new Date(`${row.date}T00:00:00`).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                        })}
                      </button>
                    </span>
                    <FullLogTimeline
                      row={row}
                      activities={activities}
                      showAxis={false}
                      activityFilter={activityFilter}
                    />
                    <span className="full-log-sleep-total">
                      {row.sleep_time || row.wake_time ? formatDuration(sleep) : "—"}
                    </span>
                    <span className="full-log-active-total">
                      {activityFilter === "Sleep" ? "—" : formatDuration(studied)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : daily.allLogsLoading ? (
            <div className="daily-full-empty" aria-hidden="true" />
          ) : (
            <p className="daily-full-empty">No saved daily logs yet.</p>
          )}
          {visibleEntries.length > 0 && !daily.allLogsLoading && (
            <p className="full-log-footer sr-only">
              {isShowingAll
                ? `Showing all ${filteredEntries.length} ${filteredEntries.length === 1 ? "day" : "days"}`
                : hasCachedOlderDays
                  ? `Showing ${visibleEntries.length} of ${filteredEntries.length} loaded days`
                  : `Showing ${visibleEntries.length} ${visibleEntries.length === 1 ? "day" : "days"}${daily.hasOlderLogs ? " · older days available" : ""}`}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
