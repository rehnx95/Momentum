import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  formatDuration,
  getSlotDurationMinutes,
  slotMinutes,
} from "../../../shared/utils/time";
import Tooltip from "../../../shared/components/Tooltip";
import FullLogTimeline from "./FullLogTimeline";

const PAGE_SIZE = 10;

function slotTotal(slots = []) {
  return slots.reduce(
    (total, slot) => total + (getSlotDurationMinutes(slot) || 0),
    0,
  );
}

function formatTime(value) {
  if (!value) return "--:--";
  const [hours, minutes] = String(value).slice(0, 5).split(":");
  return `${hours}:${minutes}`;
}

function dateLabel(value) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
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
    .filter((activity) => activity.minutes > 0);
}

export default function FullLog({ daily }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
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
  const visibleEntries = entries.slice(0, visibleCount);
  const hasCachedOlderDays = visibleCount < entries.length;
  const hasMoreDays = hasCachedOlderDays || daily.hasOlderLogs;
  const isShowingAll = visibleCount === Infinity;
  const paginationDisabled = daily.allLogsLoading || daily.olderLogsLoading;

  const loadMoreDays = async () => {
    if (hasCachedOlderDays) {
      setVisibleCount(Math.min(visibleCount + PAGE_SIZE, entries.length));
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

  return (
    <div className="daily-full-log">
      <section className="full-log-history" aria-label="Full log history">
        <header className="full-log-history-toolbar">
          <div className="full-log-history-toolbar-top">
            <div className="full-log-legend" aria-label="Timeline legend">
              <span><i className="sleep" aria-hidden="true" />Sleep</span>
              <span><i className="study" aria-hidden="true" />Studied</span>
            </div>
            <Tooltip label="Clear my saved history">
              <button
                type="button"
                className="full-log-clear-button"
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
                <Trash2 size={15} aria-hidden="true" />
                <span>Clear log</span>
              </button>
            </Tooltip>
          </div>

          {hasMoreDays && (
            <div className="full-log-pagination">
              <button
                type="button"
                className="load-older-button"
                disabled={paginationDisabled}
                onClick={() => void loadMoreDays()}
              >
                Load 10 older days
              </button>
              {!isShowingAll && (
                <button
                  type="button"
                  className="load-older-button full-log-show-all"
                  disabled={paginationDisabled}
                  onClick={() => void showAllDays()}
                >
                  Show all days
                </button>
              )}
            </div>
          )}

          {visibleCount > PAGE_SIZE && (
            <button
              type="button"
              className="full-log-show-latest"
              disabled={paginationDisabled}
              onClick={() => setVisibleCount(PAGE_SIZE)}
            >
              Show latest 10 days
            </button>
          )}
        </header>

        <div className="full-log-history-scroll">
          {visibleEntries.length ? (
            <ul className="full-log-day-list">
              {visibleEntries.map(({ row, activities, sleep, studied, problems }) => (
                <li key={row.date}>
                  <article className="full-log-day">
                    <div className="full-log-day-content">
                      <header className="full-log-day-heading">
                        <strong className="full-log-day-date">
                          {dateLabel(row.date)}
                        </strong>
                        <div className="full-log-day-totals">
                          <strong>{formatDuration(studied)}</strong>
                          <span>{problems} solved</span>
                        </div>
                      </header>
                      <FullLogTimeline row={row} activities={activities} />
                      {(row.sleep_time || row.wake_time) && (
                        <div className="full-log-day-sleep">
                          <span>Sleep</span>
                          <strong>
                            {formatTime(row.sleep_time)} → {formatTime(row.wake_time)}
                            {" · "}
                            {sleep ? formatDuration(sleep) : "—"}
                          </strong>
                        </div>
                      )}
                      {activities.length ? (
                        <div className="full-log-activity-chips">
                          {activities.map((activity, index) => (
                            <span
                              className="full-log-activity-chip"
                              key={`${activity.name}-${index}`}
                            >
                              <span>{activity.name}</span>
                              <strong>{formatDuration(activity.minutes)}</strong>
                            </span>
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
          {visibleEntries.length > 0 && !daily.allLogsLoading && (
            <p className="full-log-footer">
              {isShowingAll
                ? `Showing all ${entries.length} ${entries.length === 1 ? "day" : "days"}`
                : hasCachedOlderDays
                  ? `Showing ${visibleEntries.length} of ${entries.length} loaded days`
                  : `Showing ${visibleEntries.length} ${visibleEntries.length === 1 ? "day" : "days"}${daily.hasOlderLogs ? " · older days available" : ""}`}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
