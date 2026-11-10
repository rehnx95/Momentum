import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Moon,
  Plus,
} from "lucide-react";
import { formatDuration, getSleepMinutes, slotMinutes } from "../utils/time";
import { getLocalDateKey } from "../hooks/useDailyLog";
import ActivityCard from "./ActivityCard";
import TimeInput from "./TimeInput";

function activityTotal(slots) {
  return slots.reduce((total, slot) => {
    if (slot.endDayOffset === 1 && slot.end === "00:00") {
      const start = slotMinutes({ start: slot.start, end: "23:59" });
      return total + (start === null ? 1 : start + 1);
    }
    return total + (slotMinutes(slot) || 0);
  }, 0);
}

export default function DayView({ daily, sheets = [], askConfirmation }) {
  const [newActivityOpen, setNewActivityOpen] = useState(false);
  const [newActivityName, setNewActivityName] = useState("");
  const [activityMenuOpen, setActivityMenuOpen] = useState(false);
  const activityMenuRef = useRef(null);
  const activities = useMemo(
    () => daily.activeCustomTasks.map((task) => ({
        ...task,
        slots:
          daily.log.custom_tasks.find((item) => item.id === task.id)?.slots || [],
      })),
    [daily.activeCustomTasks, daily.log.custom_tasks],
  );
  const availableSheetActivities = sheets.filter(
    (sheet) =>
      !daily.activeCustomTasks.some(
        (task) => task.sheetId === sheet.id || task.id === `sheet:${sheet.id}`,
      ),
  );
  const entryDisabled =
    daily.loading ||
    daily.loadFailed;

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
      </div>

      <section className="daily-summary full-log-summary" aria-label="Day summary">
        <div className="full-log-summary-item">
          <small>Sleep</small>
          <strong>
            <TimeInput
              value={daily.log.sleep_time}
              disabled={entryDisabled}
              onChange={(value) => daily.updateField("sleep_time", value)}
              label="Sleep time"
            />
          </strong>
        </div>
        <div className="full-log-summary-item">
          <small>Wake</small>
          <strong>
            <TimeInput
              value={daily.log.wake_time}
              disabled={entryDisabled}
              onChange={(value) => daily.updateField("wake_time", value)}
              label="Wake time"
            />
          </strong>
        </div>
        <div className="full-log-summary-item">
          <small>Sleep duration</small>
          <strong>
            {daily.log.sleep_time && daily.log.wake_time
              ? formatDuration(getSleepMinutes(daily.log))
              : "—"}
          </strong>
        </div>
        <div className="full-log-summary-item">
          <small>Studied</small>
          <strong>{formatDuration(daily.studiedMinutes)}</strong>
        </div>
        <div className="full-log-summary-item">
          <small>Solved</small>
          <strong>{daily.problemCounts[daily.date] || 0}</strong>
        </div>
      </section>

      <div className="daily-entry-heading">
        <h3>Activities</h3>
        <div className="new-activity-wrap" ref={activityMenuRef}>
          <button
            type="button"
            className="new-activity-trigger"
            aria-expanded={activityMenuOpen}
            aria-haspopup="menu"
            disabled={entryDisabled}
            onClick={() => setActivityMenuOpen((open) => !open)}
          >
            <Plus size={14} /> New activity
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
                    : "No sheets available. Add a custom activity instead."}
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
            slots={activity.slots}
            totalMinutes={activityTotal(activity.slots)}
            disabled={entryDisabled}
            onAddSlot={() => daily.addSlot(activity.id)}
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
