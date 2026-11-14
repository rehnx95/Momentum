import { createPortal } from "react-dom";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, List, Trash2 } from "lucide-react";
import {
  formatDuration,
  getSlotDurationMinutes,
  slotMinutes,
  toMinutes,
} from "../../../shared/utils/time";
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

function detailEntries(row, activities, filter, activityColors) {
  const details = [];
  const sleep = sleepTotal(row);

  if ((filter === "All" || filter === "Sleep") && sleep > 0) {
    details.push({
      key: "sleep",
      name: "Sleep",
      start: row.sleep_time,
      end: row.wake_time,
      minutes: sleep,
      color: "var(--activity-color-sleep)",
      isSleep: true,
    });
  }

  activities.forEach((activity) => {
    if (filter !== "All" && activity.name !== filter) return;
    activity.slots.forEach((slot, index) => {
      const minutes = getSlotDurationMinutes(slot) || 0;
      if (!minutes) return;
      details.push({
        key: `${activity.id || activity.name}-${index}`,
        name: activity.name,
        start: slot.start,
        end: slot.end,
        minutes,
        color: getActivityColor(activity.name, activityColors),
        isSleep: false,
      });
    });
  });

  return details.sort((first, second) => toMinutes(first.start) - toMinutes(second.start));
}

export default function FullLog({ daily, askConfirmation, toolbarContainer }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activityFilter, setActivityFilter] = useState("All");
  const [expandedDates, setExpandedDates] = useState(null);
  const [visibleEntryCounts, setVisibleEntryCounts] = useState({});
  const entries = useMemo(() => {
    const logsByDate = new Map(daily.allLogs.map((row) => [row.date, row]));
    const solvedDates = Object.entries(daily.problemCounts)
      .filter(([, count]) => Number(count) > 0)
      .map(([date]) => date);
    const dates = new Set([...logsByDate.keys(), ...solvedDates]);

    return [...dates]
      .sort((first, second) => second.localeCompare(first))
      .map((date) => {
        const row = logsByDate.get(date) || {
          date,
          sleep_time: "",
          wake_time: "",
          custom_tasks: [],
        };
        const activities = activityBreakdown(row);
        return {
          row,
          activities,
          sleep: sleepTotal(row),
          studied: activities.reduce((total, activity) => total + activity.minutes, 0),
          problems: daily.problemCounts[row.date] || 0,
        };
      });
  }, [daily.allLogs, daily.problemCounts]);
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
      color: getActivityColor(label, daily.activityColors),
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

  const toggleDate = (date) => {
    setExpandedDates((current) => {
      const next = current
        ? new Set(current)
        : new Set(visibleEntries.length ? [visibleEntries[0].row.date] : []);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
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
              <div className="full-log-table-header">
                <span>Date</span>
                <span>Share of active time</span>
                <span>Active</span>
                <span>Sleep</span>
                <span>Solved</span>
              </div>
              <ul className="full-log-day-list">
                {visibleEntries.map(({ row, activities, sleep, studied, problems }, index) => {
                  const date = new Date(`${row.date}T00:00:00`);
                  const dayLabel = date.toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });
                  const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
                  const monthDay = date.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  });
                  const details = detailEntries(
                    row,
                    activities,
                    activityFilter,
                    daily.activityColors,
                  );
                  const isExpanded = expandedDates ? expandedDates.has(row.date) : index === 0;
                  const visibleEntriesForDate = details.slice(
                    0,
                    visibleEntryCounts[row.date] || PAGE_SIZE,
                  );
                  const detailsId = `full-log-details-${row.date}`;

                  return (
                    <li className="full-log-day" key={row.date}>
                      <div className="full-log-day-header">
                        <div className="full-log-day-date">
                          <button
                            type="button"
                            className="full-log-expand-button"
                            aria-label={`${isExpanded ? "Collapse" : "Expand"} entries for ${dayLabel}`}
                            aria-expanded={isExpanded}
                            aria-controls={detailsId}
                            onClick={() => toggleDate(row.date)}
                          >
                            {isExpanded ? (
                              <ChevronDown size={16} aria-hidden="true" />
                            ) : (
                              <ChevronRight size={16} aria-hidden="true" />
                            )}
                          </button>
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
                            <span>{weekday}</span>
                            <strong>{monthDay}</strong>
                          </button>
                        </div>
                        <FullLogTimeline
                          activities={activities}
                          activityColors={daily.activityColors}
                          totalMinutes={studied}
                          activityFilter={activityFilter}
                        />
                        <span
                          className="full-log-active-total"
                          aria-label={`Active ${activityFilter === "Sleep" ? "time not shown" : formatDuration(studied)}`}
                        >
                          <small>Active</small>
                          {activityFilter === "Sleep" ? "—" : formatDuration(studied)}
                        </span>
                        <span
                          className="full-log-sleep-total"
                          aria-label={`Sleep ${row.sleep_time || row.wake_time ? formatDuration(sleep) : "not recorded"}`}
                        >
                          <small>Sleep</small>
                          {row.sleep_time || row.wake_time ? formatDuration(sleep) : "—"}
                        </span>
                        <span
                          className="full-log-solved-total"
                          aria-label={`${problems} ${problems === 1 ? "problem" : "problems"} solved`}
                        >
                          <small>Solved</small>
                          {problems}
                        </span>
                      </div>
                      {isExpanded && (
                        <div className="full-log-day-details" id={detailsId}>
                          {visibleEntriesForDate.length > 0 ? (
                            <ul className="full-log-entry-list">
                              {visibleEntriesForDate.map((entry) => (
                                <li className="full-log-entry" key={entry.key}>
                                  <span className="full-log-entry-activity">
                                    <span className="full-log-entry-time">
                                      {String(entry.start || "").slice(0, 5)} –{" "}
                                      {String(entry.end || "").slice(0, 5)}
                                    </span>
                                    <span className="full-log-entry-name">
                                      <i
                                        className={entry.isSleep ? "sleep" : ""}
                                        aria-hidden="true"
                                        style={{ "--activity-color": entry.color }}
                                      />
                                      {entry.name}
                                    </span>
                                  </span>
                                  <span
                                    className={`full-log-entry-duration${entry.isSleep ? " is-sleep" : ""}`}
                                  >
                                    {formatDuration(entry.minutes)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="full-log-no-entries">
                              No activity or sleep entries for this day.
                            </p>
                          )}
                          {details.length > visibleEntriesForDate.length && (
                            <button
                              type="button"
                              className="full-log-show-more"
                              onClick={() =>
                                setVisibleEntryCounts((current) => ({
                                  ...current,
                                  [row.date]: (current[row.date] || PAGE_SIZE) + PAGE_SIZE,
                                }))
                              }
                            >
                              Show 10 more entries
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
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
