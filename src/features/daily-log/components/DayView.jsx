import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDuration, getSlotDurationMinutes } from "../../../shared/utils/time";
import { getLocalDateKey } from "../../../shared/utils/date";
import { getActivityColor } from "../lib/activityColor";
import ActivityCard from "./ActivityCard";
import CustomDatePicker from "./CustomDatePicker";
import SleepCard from "./SleepCard";

function activityTotal(slots) {
  return slots.reduce((total, slot) => {
    return total + (getSlotDurationMinutes(slot) || 0);
  }, 0);
}

function overlapsSleep(warnings, activityName) {
  const name = activityName.trim().toLocaleLowerCase();
  return warnings.some(
    (warning) =>
      warning.code === "overlap" &&
      [warning.activityA, warning.activityB].some(
        (activity) =>
          String(activity || "")
            .trim()
            .toLocaleLowerCase() === name,
      ) &&
      [warning.activityA, warning.activityB].some(
        (activity) =>
          String(activity || "")
            .trim()
            .toLocaleLowerCase() === "sleep",
      ),
  );
}

export default function DayView({ daily, sheets = [], askConfirmation }) {
  const [quickActivityName, setQuickActivityName] = useState("");
  const activities = useMemo(
    () =>
      daily.activeCustomTasks
        .map((task) => ({
          ...task,
          slots: daily.log.custom_tasks.find((item) => item.id === task.id)?.slots || [],
        }))
        .filter((task) => task.slots.length > 0),
    [daily.activeCustomTasks, daily.log.custom_tasks],
  );
  const entryDisabled = daily.loading || daily.loadFailed;
  const totalLoggedMinutes = activities.reduce(
    (total, activity) => total + activityTotal(activity.slots),
    0,
  );
  const runningTimerStart = daily.runningTimer ? Date.parse(daily.runningTimer.startedAt) : NaN;
  const runningTimerMinutes =
    Number.isFinite(runningTimerStart) && Number.isFinite(daily.timerNow)
      ? Math.max(0, Math.floor((daily.timerNow - runningTimerStart) / 60_000))
      : 0;
  const summaryWarnings = daily.validation.warnings.filter(
    (warning) =>
      !(
        warning.code === "overlap" &&
        [warning.activityA, warning.activityB].some(
          (activity) =>
            String(activity || "")
              .trim()
              .toLocaleLowerCase() === "sleep",
        ) &&
        activities.some((activity) => overlapsSleep([warning], activity.name))
      ),
  );

  const addQuickActivity = async (event) => {
    event.preventDefault();
    const name = quickActivityName.trim();
    if (!name) return;
    const existing = activities.find(
      (activity) => activity.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (existing) daily.addSlot(existing.id);
    else if (!(await daily.addCustomTask(name))) return;
    setQuickActivityName("");
  };

  const addQuickSheet = async (sheet) => {
    const activityId = `sheet:${sheet.id}`;
    const existing = activities.find((activity) => activity.id === activityId);
    if (existing) daily.addSlot(existing.id);
    else await daily.addSheetActivity(sheet);
  };

  const removeActivity = async (activity) => {
    const message = `Remove "${activity.name}" and its slots from this day?`;
    if (!(await askConfirmation(message, "Remove this activity?"))) return;
    daily.removeCustomTask(activity.id);
  };

  const updateActivitySlot = (activityId, index, field, value) =>
    daily.updateSlot(activityId, index, field, value);

  return (
    <div className="daily-day-view">
      {daily.loadFailed && (
        <div className="daily-load-error" role="alert">
          Could not load this day. Existing data is not being overwritten.
          <button type="button" onClick={daily.retryLoad}>
            Try again
          </button>
        </div>
      )}
      <div className="daily-day-header">
        <div className="daily-date-nav">
          <button
            type="button"
            className="date-navigation-arrow"
            aria-label="Previous day"
            disabled={daily.loading}
            onClick={() => daily.shiftDate(-1)}
          >
            <ChevronLeft size={16} />
          </button>
          <CustomDatePicker
            value={daily.date}
            max={getLocalDateKey()}
            disabled={daily.loading}
            onChange={(date) => daily.changeDate(date)}
          />
          <button
            type="button"
            className="date-navigation-arrow"
            aria-label="Next day"
            disabled={daily.loading || daily.date >= getLocalDateKey()}
            onClick={() => daily.shiftDate(1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="daily-shell-layout">
        <div className="daily-main-column">
          <section className="daily-activities-card" aria-label="Activities">
            <div className="daily-entry-heading">
              <h3>Activities</h3>
              <span>
                {activities.length} {activities.length === 1 ? "category" : "categories"}
                {" · "}
                {formatDuration(totalLoggedMinutes + runningTimerMinutes)}
              </span>
            </div>

            {activities.length === 0 && (
              <p className="daily-empty-state">
                Nothing logged yet. Add an activity to get started.
              </p>
            )}

            <div className="daily-activity-list">
              {activities.map((activity) => (
                <ActivityCard
                  key={`${daily.date}-${activity.id}`}
                  activityId={activity.id}
                  activityName={activity.name}
                  activityDescription={
                    [activity.description, activity.details].find(
                      (value) => typeof value === "string" && value.trim(),
                    ) || ""
                  }
                  slots={activity.slots}
                  totalMinutes={activityTotal(activity.slots)}
                  activityColor={getActivityColor(activity.name)}
                  fromSheet={Boolean(
                    activity.sheetId ||
                    activity.sheet_id ||
                    String(activity.id || "").startsWith("sheet:"),
                  )}
                  overlapsSleep={overlapsSleep(daily.validation.warnings, activity.name)}
                  disabled={entryDisabled}
                  runningTimer={daily.runningTimer}
                  timerNow={daily.timerNow}
                  onSaveNow={daily.saveNow}
                  onAddSlot={() => daily.addSlot(activity.id)}
                  onStopTimer={daily.stopTimer}
                  onChangeSlot={(index, field, value) =>
                    updateActivitySlot(activity.id, index, field, value)
                  }
                  onRemoveSlot={(index) => daily.removeSlot(activity.id, index)}
                  onRemoveActivity={() => removeActivity(activity)}
                  onDiscardEmptySlot={(index) => daily.discardEmptySlot(activity.id, index)}
                />
              ))}
            </div>

            {summaryWarnings.length > 0 && (
              <ul className="daily-warnings" aria-label="Daily log warnings">
                {summaryWarnings.map((warning, index) => (
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
          </section>
        </div>

        <aside className="daily-side-panel">
          <form className="quick-log-card" onSubmit={(event) => void addQuickActivity(event)}>
            <h3>Quick log</h3>
            <label className="sr-only" htmlFor="quick-activity-name">
              New activity
            </label>
            <div className="quick-log-input-row">
              <input
                id="quick-activity-name"
                type="text"
                placeholder="What did you work on?"
                value={quickActivityName}
                onChange={(event) => setQuickActivityName(event.target.value)}
              />
              <button
                type="submit"
                className="quick-add-primary"
                disabled={!quickActivityName.trim() || entryDisabled}
              >
                Add
              </button>
            </div>

            <div className="quick-log-tags">
              {sheets.map((sheet) => (
                <button
                  type="button"
                  key={sheet.id}
                  className="tag-chip"
                  onClick={() => void addQuickSheet(sheet)}
                  disabled={entryDisabled}
                >
                  {sheet.title}
                </button>
              ))}
            </div>
          </form>
          <SleepCard
            sleepTime={daily.log.sleep_time || ""}
            wakeTime={daily.log.wake_time || ""}
            totalMinutes={daily.sleptMinutes}
            disabled={entryDisabled}
            onSaveNow={daily.saveNow}
            onChange={(field, value) => daily.updateField(field, value)}
          />
        </aside>
      </div>
    </div>
  );
}
