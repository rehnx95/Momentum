import { useEffect, useMemo, useState } from "react";
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

export default function DayView({ daily, askConfirmation }) {
  const [newActivityOpen, setNewActivityOpen] = useState(false);
  const [newActivityName, setNewActivityName] = useState("");
  const [selectedTimerActivity, setSelectedTimerActivity] = useState(() => {
    try {
      return localStorage.getItem("track-sheet-last-timer-activity") || "dsa";
    } catch (error) {
      console.error("Could not read the last timer activity:", error);
      return "dsa";
    }
  });
  const activities = useMemo(
    () => [
      ...(daily.dsaEnabled
        ? [{
            id: "dsa",
            name: "DSA",
            color: "var(--activity-dsa)",
            slots: daily.log.dsa_slots,
            builtIn: true,
          }]
        : []),
      ...(daily.backendEnabled
        ? [{
            id: "backend",
            name: "Backend",
            color: "var(--activity-backend)",
            slots: daily.log.backend_slots,
            builtIn: true,
          }]
        : []),
      ...daily.activeCustomTasks.map((task) => ({
        ...task,
        slots:
          daily.log.custom_tasks.find((item) => item.id === task.id)?.slots || [],
      })),
    ],
    [
      daily.dsaEnabled,
      daily.backendEnabled,
      daily.activeCustomTasks,
      daily.log.dsa_slots,
      daily.log.backend_slots,
      daily.log.custom_tasks,
    ],
  );
  const timerActivities = useMemo(
    () => [
      ...(daily.dsaEnabled ? [{ id: "dsa", name: "DSA" }] : []),
      ...(daily.backendEnabled ? [{ id: "backend", name: "Backend" }] : []),
      ...daily.activeCustomTasks.map((task) => ({
        id: task.id,
        name: task.name,
        color: task.color,
      })),
    ],
    [daily.dsaEnabled, daily.backendEnabled, daily.activeCustomTasks],
  );
  const entryDisabled = daily.loading || daily.loadFailed;

  useEffect(() => {
    if (
      !daily.runningTimer &&
      timerActivities.length &&
      !timerActivities.some((item) => item.id === selectedTimerActivity)
    ) {
      setSelectedTimerActivity(timerActivities[0].id);
    }
  }, [daily.runningTimer, selectedTimerActivity, timerActivities]);

  const focusSlot = (activityId, index) => {
    const row = document.getElementById(`slot-${activityId}-${index}`);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
    row?.querySelector("input")?.focus({ preventScroll: true });
  };

  const addActivity = async () => {
    if (!(await daily.addCustomTask(newActivityName))) return;
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
      <div className="daily-date-nav">
        <button type="button" aria-label="Previous day" onClick={() => daily.shiftDate(-1)}>
          <ChevronLeft size={16} />
        </button>
        <label className="daily-date">
          <span className="sr-only">Log date</span>
          <input
            type="date"
            value={daily.date}
            max={getLocalDateKey()}
            onChange={(event) => daily.changeDate(event.target.value)}
          />
        </label>
        <button
          type="button"
          aria-label="Next day"
          disabled={daily.date >= getLocalDateKey()}
          onClick={() => daily.shiftDate(1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <StatStrip
        items={[
          { label: "Studied", value: formatDuration(daily.studiedMinutes), icon: Timer },
          { label: "Sleep", value: formatDuration(daily.sleptMinutes), icon: Moon },
          {
            label: "Problems solved",
            value: daily.problemCounts[daily.date] || 0,
            icon: Target,
            color: "var(--positive)",
          },
          { label: "Streak", value: daily.currentStreak, unit: "days", icon: Flame },
        ]}
      />

      <DayTimeline
        log={daily.log}
        tasks={daily.log.custom_tasks}
        enabled={{ dsa: true, backend: true }}
        date={daily.date}
        onFocusSlot={focusSlot}
      />

      <div className="sleep-entry">
        <label>
          <span>Sleep (night before)</span>
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
        <details className="new-activity-wrap">
          <summary><Plus size={14} /> New activity</summary>
          <div className="new-activity-menu">
            <button type="button" disabled={entryDisabled} onClick={() => setNewActivityOpen(true)}>
              Custom activity
            </button>
            {!daily.dsaEnabled && (
              <button type="button" disabled={entryDisabled} onClick={() => daily.toggleBuiltin("dsa")}>
                Restore DSA
              </button>
            )}
            {!daily.backendEnabled && (
              <button type="button" disabled={entryDisabled} onClick={() => daily.toggleBuiltin("backend")}>
                Restore Backend
              </button>
            )}
          </div>
        </details>
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

      <div className="daily-activity-list">
        {activities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activityId={activity.id}
            activityName={activity.name}
            color={activity.color || "#8b5cf6"}
            slots={activity.slots}
            totalMinutes={activityTotal(activity.slots)}
            builtIn={activity.builtIn}
            disabled={entryDisabled}
            onAddSlot={() => daily.addSlot(activity.id)}
            onChangeSlot={(index, field, value) =>
              updateActivitySlot(activity.id, index, field, value)
            }
            onRemoveSlot={(index) => daily.removeSlot(activity.id, index)}
            onRemoveActivity={async () => {
              const message = activity.builtIn
                ? `Hide ${activity.name} from future entry forms? Existing log data will remain visible.`
                : `Remove "${activity.name}" from future days? Past logs keep their data.`;
              if (!(await askConfirmation(message, "Remove this activity?"))) return;
              if (activity.builtIn) await daily.toggleBuiltin(activity.id);
              else daily.removeCustomTask(activity.id);
            }}
            onRename={(name) => daily.renameCustomTask(activity.id, name)}
            onColorChange={(color) => daily.setCustomColor(activity.id, color)}
          />
        ))}
      </div>

      <section className="daily-timer">
        <label>
          <span>Timer activity</span>
          <select
            value={daily.runningTimer?.activityId || selectedTimerActivity}
            disabled={Boolean(daily.runningTimer) || entryDisabled}
            onChange={(event) => {
              const activityId = event.target.value;
              setSelectedTimerActivity(activityId);
              try {
                localStorage.setItem("track-sheet-last-timer-activity", activityId);
              } catch (error) {
                console.error("Could not remember the last timer activity:", error);
              }
            }}
          >
            {timerActivities.map((activity) => (
              <option key={activity.id} value={activity.id}>{activity.name}</option>
            ))}
          </select>
        </label>
        {daily.runningTimer ? (
          <button type="button" className="timer-stop" onClick={() => daily.stopTimer()}>
            Stop {daily.runningTimer.activityName} · {timeElapsed(daily.runningTimer.startedAt, daily.timerNow)}
          </button>
        ) : (
          <button
            type="button"
            disabled={entryDisabled || !timerActivities.length}
            onClick={() => {
              const activity = timerActivities.find((item) => item.id === selectedTimerActivity) || timerActivities[0];
              if (activity) daily.startTimer(activity.id, activity.name, activity.color);
            }}
          >
            <Timer size={15} /> Start timer
          </button>
        )}
        {timerActivities.length > 0 && (
          <div className="timer-quick-add">
            <button
              type="button"
              disabled={entryDisabled}
              onClick={() => {
                const activity = timerActivities.find((item) => item.id === selectedTimerActivity);
                if (activity) daily.quickAdd(activity.id, 30, activity.name, activity.color);
              }}
            >
              +30m
            </button>
            <button
              type="button"
              disabled={entryDisabled}
              onClick={() => {
                const activity = timerActivities.find((item) => item.id === selectedTimerActivity);
                if (activity) daily.quickAdd(activity.id, 60, activity.name, activity.color);
              }}
            >
              +1h
            </button>
          </div>
        )}
      </section>

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
      </div>
    </div>
  );
}
