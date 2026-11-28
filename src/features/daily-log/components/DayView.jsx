import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatDuration,
  getSleepMinutes,
  getSleepPeriods,
  getStudyMinutes,
} from "../../../shared/utils/time";
import { getLocalDateKey } from "../../../shared/utils/date";
import {
  findSheetByTitle,
  getActivityDisplayName,
  isSheetActivity,
  normalizeActivityName,
} from "../lib/activityName";
import { getActivityColor, getActivityKey } from "../lib/activityColor";
import ActivityCard from "./ActivityCard";
import CustomDatePicker from "./CustomDatePicker";
import SleepCard from "./SleepCard";

function getActivitySlotFeedback(validation, activityId) {
  const activityKey = `custom:${activityId}`;
  const feedbackBySlot = new Map();
  const addFeedback = (slotIndex, feedback) => {
    const feedbackForSlot = feedbackBySlot.get(slotIndex) || [];
    feedbackForSlot.push(feedback);
    feedbackBySlot.set(slotIndex, feedbackForSlot);
  };

  validation.errors.forEach((error) => {
    if (error.activityKey === activityKey && Number.isInteger(error.slotIndex)) {
      addFeedback(error.slotIndex, { type: "error", message: error.message });
    }
  });

  validation.warnings.forEach((warning) => {
    if (warning.code !== "overlap" || !Array.isArray(warning.slots)) return;
    warning.slots.forEach((slot, index) => {
      if (slot.activityKey !== activityKey) return;
      const otherSlot = warning.slots[index === 0 ? 1 : 0];
      addFeedback(slot.slotIndex, {
        type: "overlap",
        message: `${otherSlot.activity} slot ${otherSlot.slotIndex + 1} overlaps this slot.`,
      });
    });
  });

  return Object.fromEntries(feedbackBySlot);
}

function getSleepFeedback(validation) {
  const feedback = validation.errors
    .filter((error) => ["incomplete-sleep", "invalid-sleep"].includes(error.code))
    .map((error) => ({
      type: "error",
      slotIndex: error.slotIndex,
      message: error.message,
    }));

  validation.warnings.forEach((warning) => {
    if (warning.code !== "overlap" || !Array.isArray(warning.slots)) return;
    const sleepSlot = warning.slots.find((slot) => slot.activityKey === "sleep");
    if (!sleepSlot) return;
    const otherSlot = warning.slots.find((slot) => slot !== sleepSlot);
    feedback.push({
      type: "overlap",
      slotIndex: sleepSlot.slotIndex,
      message: `${otherSlot.activity} slot ${otherSlot.slotIndex + 1} overlaps Sleep.`,
    });
  });

  return feedback;
}

export default function DayView({ daily, sheets = [], askConfirmation }) {
  const [quickActivityName, setQuickActivityName] = useState("");
  const [quickAddTarget, setQuickAddTarget] = useState({ id: null, request: 0 });
  const activities = useMemo(
    () =>
      daily.activeCustomTasks
        .map((task) => ({
          ...task,
          name: getActivityDisplayName(task, sheets),
          slots: daily.log.custom_tasks.find((item) => item.id === task.id)?.slots || [],
        }))
        .filter((task) => task.slots.length > 0),
    [daily.activeCustomTasks, daily.log.custom_tasks, sheets],
  );
  const entryDisabled = daily.loadFailed;
  const totalLoggedMinutes = getStudyMinutes(daily.log);
  const runningTimerStart = daily.runningTimer ? Date.parse(daily.runningTimer.startedAt) : NaN;
  const runningTimerMinutes =
    Number.isFinite(runningTimerStart) && Number.isFinite(daily.timerNow)
      ? Math.max(0, Math.floor((daily.timerNow - runningTimerStart) / 60_000))
      : 0;
  const timerRunningTooLong =
    Number.isFinite(runningTimerStart) && daily.timerNow - runningTimerStart >= 4 * 60 * 60 * 1000;
  const summaryWarnings = daily.validation.warnings.filter((warning) => warning.code !== "overlap");
  const summaryErrors = daily.validation.errors.filter(
    (error) => !error.activityKey && !["incomplete-sleep", "invalid-sleep"].includes(error.code),
  );

  const addQuickSheet = (sheet) => {
    void daily.addSheetActivity(sheet);
    setQuickAddTarget((current) => ({
      id: `sheet:${sheet.id}`,
      request: current.request + 1,
    }));
  };

  const addQuickActivity = (event) => {
    event.preventDefault();
    const name = quickActivityName.trim();
    if (!name) return;
    const existing = activities.find(
      (activity) => normalizeActivityName(activity.name) === normalizeActivityName(name),
    );
    if (existing) daily.addSlot(existing.id);
    else {
      const sheet = findSheetByTitle(name, sheets);
      if (sheet) addQuickSheet(sheet);
      else void daily.addCustomTask(name);
    }
    setQuickActivityName("");
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
                  quickAddRequest={activity.id === quickAddTarget.id ? quickAddTarget.request : 0}
                  activityDescription={
                    [activity.description, activity.details].find(
                      (value) => typeof value === "string" && value.trim(),
                    ) || ""
                  }
                  slots={activity.slots}
                  activityColor={getActivityColor(activity.name, daily.activityColors)}
                  onSetActivityColor={
                    getActivityKey(activity.name) === "sleep"
                      ? undefined
                      : (color) => daily.setActivityColor?.(activity.name, color)
                  }
                  fromSheet={isSheetActivity(activity)}
                  slotFeedback={getActivitySlotFeedback(daily.validation, activity.id)}
                  disabled={entryDisabled}
                  runningTimer={daily.runningTimer}
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
            {summaryErrors.length > 0 && (
              <ul className="daily-errors" aria-label="Daily log errors">
                {summaryErrors.map((error, index) => (
                  <li key={`${error.code}-${index}`}>{error.message}</li>
                ))}
              </ul>
            )}
            {timerRunningTooLong && (
              <p className="daily-warnings" role="status">
                This timer has been running for over four hours. Stop it if you have finished to
                avoid recording unintended time.
              </p>
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
                autoComplete="off"
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
                  onClick={() => addQuickSheet(sheet)}
                  disabled={entryDisabled}
                >
                  {sheet.title}
                </button>
              ))}
            </div>
          </form>
          <SleepCard
            key={daily.date}
            sleepPeriods={getSleepPeriods(daily.log)}
            totalMinutes={getSleepMinutes(daily.log)}
            feedback={getSleepFeedback(daily.validation)}
            disabled={entryDisabled}
            onSaveNow={daily.saveNow}
            onChange={daily.updateSleepPeriod}
            onAdd={daily.addSleepPeriod}
            onRemove={daily.removeSleepPeriod}
          />
        </aside>
      </div>
    </div>
  );
}
