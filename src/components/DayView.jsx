import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Moon,
  Plus,
  Target,
  Timer,
} from "lucide-react";
import { formatDuration, slotMinutes } from "../utils/time";
import { getLocalDateKey } from "../hooks/useDailyLog";
import ActivityCard from "./ActivityCard";
import DayTimeline from "./DayTimeline";
import StatStrip from "./StatStrip";

function activityTotal(slots) {
  return slots.reduce((total, slot) => {
    if (slot.endDayOffset === 1 && slot.end === "00:00") {
      const start = slotMinutes({ start: slot.start, end: "23:59" });
      return total + (start === null ? 1 : start + 1);
    }
    return total + (slotMinutes(slot) || 0);
  }, 0);
}

function timeElapsed(startedAt, now) {
  const total = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const hours = String(Math.floor(total / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export default function DayView({ daily, sheets = [], askConfirmation }) {
  const [newActivityOpen, setNewActivityOpen] = useState(false);
  const [newActivityName, setNewActivityName] = useState("");
  const [activityMenuOpen, setActivityMenuOpen] = useState(false);
  const [quickEntry, setQuickEntry] = useState("");
  const activityMenuRef = useRef(null);
  const [selectedTimerActivity, setSelectedTimerActivity] = useState(() => {
    try {
      return localStorage.getItem("track-sheet-last-timer-activity") || "";
    } catch (error) {
      console.error("Could not read the last timer activity:", error);
      return "";
    }
  });
  const activities = useMemo(
    () => daily.activeCustomTasks.map((task) => ({
        ...task,
        slots:
          daily.log.custom_tasks.find((item) => item.id === task.id)?.slots || [],
      })),
    [daily.activeCustomTasks, daily.log.custom_tasks],
  );
  const timerActivities = useMemo(
    () => daily.activeCustomTasks.map((task) => ({
      id: task.id,
      name: task.name,
      color: task.color,
    })),
    [daily.activeCustomTasks],
  );
  const timerActivityId = timerActivities.some(
    (activity) => activity.id === selectedTimerActivity,
  )
    ? selectedTimerActivity
    : timerActivities[0]?.id || "";
  const availableSheetActivities = sheets.filter(
    (sheet) =>
      !daily.activeCustomTasks.some(
        (task) => task.sheetId === sheet.id || task.id === `sheet:${sheet.id}`,
      ),
  );
  const entryDisabled =
    daily.loading ||
    daily.loadFailed;

  const selectTimerActivity = (activityId) => {
    setSelectedTimerActivity(activityId);
    try {
      localStorage.setItem("track-sheet-last-timer-activity", activityId);
    } catch (error) {
      console.error("Could not remember the last timer activity:", error);
    }
  };
  const selectedActivity = timerActivities.find(
    (activity) => activity.id === timerActivityId,
  );
  const startSelectedTimer = () => {
    if (selectedActivity) {
      daily.startTimer(
        selectedActivity.id,
        selectedActivity.name,
        selectedActivity.color,
      );
    }
  };

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!activityMenuRef.current?.contains(event.target)) {
        setActivityMenuOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setActivityMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (
      !daily.runningTimer &&
      timerActivities.length &&
      !timerActivities.some((item) => item.id === selectedTimerActivity)
    ) {
      setSelectedTimerActivity(timerActivities[0].id);
    }
  }, [daily.runningTimer, selectedTimerActivity, timerActivities]);

  useEffect(() => {
    const processStopRequest = () => {
      try {
        if (localStorage.getItem("track-sheet-stop-timer-on-open") !== "1") return;
        localStorage.removeItem("track-sheet-stop-timer-on-open");
        if (daily.runningTimer) void daily.stopTimer();
      } catch (error) {
        console.error("Could not process the timer stop request:", error);
      }
    };
    processStopRequest();
    window.addEventListener("daily-log-stop-timer", processStopRequest);
    return () => window.removeEventListener("daily-log-stop-timer", processStopRequest);
  }, [daily.runningTimer, daily.stopTimer]);

  useEffect(() => {
    const handleSpace = (event) => {
      if (
        event.code !== "Space" ||
        event.repeat ||
        window.matchMedia("(max-width: 700px)").matches ||
        event.target instanceof HTMLElement &&
          (event.target.isContentEditable ||
            ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(event.target.tagName))
      ) {
        return;
      }
      event.preventDefault();
      if (daily.runningTimer) void daily.stopTimer();
      else startSelectedTimer();
    };
    document.addEventListener("keydown", handleSpace);
    return () => document.removeEventListener("keydown", handleSpace);
  }, [daily.runningTimer, daily.stopTimer, selectedActivity]);

  const focusSlot = (activityId, index) => {
    const row = document.getElementById(`slot-${activityId}-${index}`);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
    row?.querySelector("input, .slot-chip")?.focus({ preventScroll: true });
  };

  const addActivity = async () => {
    const activity = await daily.addCustomTask(newActivityName);
    if (!activity) return;
    selectTimerActivity(activity.id);
    setNewActivityName("");
    setNewActivityOpen(false);
  };

  const updateActivitySlot = (activityId, index, field, value) =>
    daily.updateSlot(activityId, index, field, value);

  return (
    <div className="daily-day-view">
      {daily.loadFailed && (
        <div className="daily-load-error" role="alert">
          Could not load this day. Existing data is not being overwritten.
          <button type="button" onClick={daily.retryLoad}>Try again</button>
        </div>
      )}
      {daily.yesterdayNotLogged && (
        <div className="missed-day-banner">
          Yesterday isn’t logged.
          <button type="button" onClick={() => daily.shiftDate(-1)}>Add it</button>
        </div>
      )}
      <div className="daily-day-header">
        <div className="daily-date-nav">
          <button
            type="button"
            aria-label="Previous day"
            disabled={daily.loading}
            onClick={() => daily.shiftDate(-1)}
          >
            <ChevronLeft size={16} />
          </button>
          <label className="daily-date">
            <span className="sr-only">Log date</span>
            <input
              type="date"
              value={daily.date}
              max={getLocalDateKey()}
              disabled={daily.loading}
              onChange={(event) => daily.changeDate(event.target.value)}
            />
          </label>
          <button
            type="button"
            aria-label="Next day"
            disabled={daily.loading || daily.date >= getLocalDateKey()}
            onClick={() => daily.shiftDate(1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <section className="daily-timer">
          <div className="timer-activity-chips" aria-label="Choose timer activity">
            {timerActivities.map((activity) => (
              <button
                type="button"
                key={activity.id}
                className={activity.id === timerActivityId ? "selected" : ""}
                style={{ "--activity-color": activity.color }}
                disabled={Boolean(daily.runningTimer) || entryDisabled}
                onClick={() => selectTimerActivity(activity.id)}
              >
                {activity.name}
              </button>
            ))}
            <div className="new-activity-wrap" ref={activityMenuRef}>
              <button
                type="button"
                className="timer-add-activity"
                aria-label="Add activity"
                aria-expanded={activityMenuOpen}
                disabled={entryDisabled}
                onClick={() => setActivityMenuOpen((open) => !open)}
              >
                <Plus size={16} />
              </button>
              {activityMenuOpen && (
                <div className="new-activity-menu" role="menu">
                  <span className="activity-menu-label">From a sheet</span>
                  {availableSheetActivities.map((sheet) => (
                    <button
                      type="button"
                      role="menuitem"
                      key={sheet.id}
                      onClick={async () => {
                        if (await daily.addSheetActivity(sheet)) {
                          selectTimerActivity(`sheet:${sheet.id}`);
                          setActivityMenuOpen(false);
                        }
                      }}
                    >
                      {sheet.title}
                    </button>
                  ))}
                  {availableSheetActivities.length === 0 && (
                    <span className="new-activity-empty">
                      {sheets.length
                        ? "All sheets are already added."
                        : "No sheets available."}
                    </span>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActivityMenuOpen(false);
                      setNewActivityOpen(true);
                    }}
                  >
                    Create a new activity
                  </button>
                </div>
              )}
            </div>
          </div>
          {daily.runningTimer ? (
            <button
              type="button"
              className="timer-stop"
              aria-keyshortcuts="Space"
              title="Stop timer (Space)"
              onClick={() => daily.stopTimer()}
            >
              Stop {daily.runningTimer.activityName} · {timeElapsed(daily.runningTimer.startedAt, daily.timerNow)}
            </button>
          ) : (
            <button
              type="button"
              className="timer-start"
              aria-keyshortcuts="Space"
              title="Start timer (Space)"
              disabled={entryDisabled || !selectedActivity}
              onClick={startSelectedTimer}
            >
              <Timer size={15} /> Start timer
            </button>
          )}
          <form
            className="quick-time-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!selectedActivity || !daily.addTimeEntry(selectedActivity.id, quickEntry)) return;
              setQuickEntry("");
            }}
          >
            <label className="sr-only" htmlFor="quick-time-entry">
              Log a duration or time range
            </label>
            <input
              id="quick-time-entry"
              value={quickEntry}
              onChange={(event) => setQuickEntry(event.target.value)}
              placeholder="2h · 90m · 10-12:30"
              disabled={entryDisabled || !selectedActivity}
            />
            <button type="submit" disabled={entryDisabled || !selectedActivity || !quickEntry.trim()}>
              Add
            </button>
          </form>
        </section>
      </div>

      <section className="daily-goal-hero">
        <div>
          <span className="daily-goal-label">
            {daily.date === getLocalDateKey()
              ? "Today"
              : new Date(`${daily.date}T00:00:00`).toLocaleDateString(undefined, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
          </span>
          <div className="daily-goal-value">
            {formatDuration(daily.studiedMinutes)}
            {daily.goalMinutes > 0 && <span> / </span>}
            <label>
              <span className="sr-only">Daily study goal in hours</span>
              <input
                type="number"
                min="0"
                max="24"
                step="1"
                value={daily.goalMinutes / 60}
                aria-label="Daily study goal in hours (zero turns goal off)"
                onChange={(event) => {
                  const hours = Number(event.target.value);
                  if (hours >= 0 && hours <= 24) daily.setGoalMinutes(hours * 60);
                }}
              />
              <span>{daily.goalMinutes > 0 ? "h goal" : "h goal off"}</span>
            </label>
          </div>
        </div>
        {daily.goalMinutes > 0 ? (
          <>
            <div
              className="daily-goal-track"
              role="progressbar"
              aria-label="Daily study goal progress"
              aria-valuemin={0}
              aria-valuemax={daily.goalMinutes}
              aria-valuenow={Math.min(daily.studiedMinutes, daily.goalMinutes)}
            >
              <span style={{ width: `${Math.min(100, (daily.studiedMinutes / daily.goalMinutes) * 100)}%` }} />
            </div>
            <span className="daily-goal-percent">
              {Math.floor((daily.studiedMinutes / daily.goalMinutes) * 100)}%
            </span>
          </>
        ) : (
          <span className="daily-goal-off">Set a goal or enter 0 to turn it off.</span>
        )}
      </section>

      <StatStrip
        items={[
          { label: "Sleep", value: formatDuration(daily.sleptMinutes), icon: Moon },
          {
            label: "Problems solved",
            value: daily.problemCounts[daily.date] || 0,
            icon: Target,
            color: "var(--positive)",
          },
          { label: "1h+ logging streak", value: daily.currentStreak, unit: "days", icon: Flame },
        ]}
      />

      <DayTimeline
        log={daily.log}
        tasks={activities}
        date={daily.date}
        onFocusSlot={focusSlot}
      />

      <div className="sleep-entry">
        {daily.yesterdaySleep && (
          <button
            type="button"
            className="sleep-copy-button"
            disabled={entryDisabled}
            onClick={() => {
              daily.updateField("sleep_time", daily.yesterdaySleep.sleep_time);
              daily.updateField("wake_time", daily.yesterdaySleep.wake_time);
            }}
          >
            Same as yesterday ({daily.yesterdaySleep.sleep_time} → {daily.yesterdaySleep.wake_time})
          </button>
        )}
        <label>
          <span>Sleep (night before) <small>ended this morning</small></span>
          <input
            type="time"
            value={daily.log.sleep_time}
            disabled={entryDisabled}
            onChange={(event) => daily.updateField("sleep_time", event.target.value)}
          />
        </label>
        <label>
          <span>Wake</span>
          <input
            type="time"
            value={daily.log.wake_time}
            disabled={entryDisabled}
            onChange={(event) => daily.updateField("wake_time", event.target.value)}
          />
        </label>
        <span className="sleep-duration">{formatDuration(daily.sleptMinutes)}</span>
      </div>

      <div className="daily-entry-heading">
        <h3>Activities</h3>
        {activities.length > 0 && (
          <button
            type="button"
            className="new-activity-trigger"
            disabled={entryDisabled}
            onClick={() => setNewActivityOpen(true)}
          >
            <Plus size={14} /> Add activity
          </button>
        )}
      </div>

      {newActivityOpen && (
        <form
          className="daily-new-task-row daily-new-inline"
          onSubmit={(event) => {
            event.preventDefault();
            void addActivity();
          }}
        >
          <label className="sr-only" htmlFor="new-daily-activity">Activity name</label>
          <input
            id="new-daily-activity"
            autoFocus
            value={newActivityName}
            onChange={(event) => setNewActivityName(event.target.value)}
            placeholder="e.g. System Design"
          />
          <button type="submit" disabled={!newActivityName.trim()}>Add</button>
          <button type="button" onClick={() => setNewActivityOpen(false)}>Cancel</button>
        </form>
      )}

      {activities.every((activity) => activity.slots.length === 0) &&
        !daily.log.sleep_time &&
        !daily.log.wake_time && (
          <p className="daily-empty-state">Nothing logged yet. Add an activity or record sleep for this day.</p>
        )}

      <div className="daily-activity-list">
        {activities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activityId={activity.id}
            activityName={activity.name}
            color={activity.color || "#8b5cf6"}
            slots={activity.slots}
            totalMinutes={activityTotal(activity.slots)}
            disabled={entryDisabled}
            onAddSlot={() => {
              selectTimerActivity(activity.id);
              document.getElementById("quick-time-entry")?.focus();
            }}
            onChangeSlot={(index, field, value) =>
              updateActivitySlot(activity.id, index, field, value)
            }
            onRemoveSlot={(index) => daily.removeSlot(activity.id, index)}
            onRemoveActivity={async () => {
              const message = `Remove "${activity.name}" from future days? Past logs keep their data.`;
              if (!(await askConfirmation(message, "Remove this activity?"))) return;
              daily.removeCustomTask(activity.id);
            }}
            onRename={(name) => daily.renameCustomTask(activity.id, name)}
            onColorChange={(color) => daily.setCustomColor(activity.id, color)}
          />
        ))}
      </div>

      {daily.validation.warnings.length > 0 && (
        <ul className="daily-warnings" aria-label="Daily log warnings">
          {daily.validation.warnings.map((warning, index) => (
            <li key={`${warning.code}-${index}`}>{warning.message}</li>
          ))}
        </ul>
      )}
      {daily.validation.errors.length > 0 && (
        <ul className="daily-errors" aria-label="Daily log errors">
          {daily.validation.errors.map((error, index) => (
            <li key={`${error.code}-${index}`}>{error.message}</li>
          ))}
        </ul>
      )}
      <div className="daily-save-status" role="status" aria-live="polite">
        {daily.saving
          ? "Saving…"
          : daily.validation.errors.length
            ? "Fix errors to save"
            : daily.status === "Saved"
              ? "Saved ✓"
              : daily.status || "Saved"}
        {daily.message && <span>{daily.message}</span>}
        {daily.dirty && !daily.saving && daily.validation.errors.length === 0 && (
          <button type="button" onClick={() => void daily.saveNow()}>
            Save now
          </button>
        )}
      </div>
    </div>
  );
}
