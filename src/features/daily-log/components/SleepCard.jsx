import { useId } from "react";
import { Plus, X } from "lucide-react";
import { formatDuration } from "../../../shared/utils/time";
import TimeInput from "./TimeInput";

export default function SleepCard({
  sleepPeriods = [],
  totalMinutes = 0,
  feedback = [],
  disabled,
  onChange,
  onAdd,
  onRemove,
  onSaveNow,
}) {
  const feedbackId = useId();
  const hasError = feedback.some((issue) => issue.type === "error");
  const describedBy = feedback.length ? feedbackId : undefined;
  const visibleSleepPeriods = sleepPeriods.length
    ? sleepPeriods
    : [{ id: "new-sleep-period", start: "", end: "" }];

  return (
    <section className="daily-sleep-panel" aria-label="Sleep time">
      <header className="daily-sleep-header">
        <h3>Sleep</h3>
        <span className="daily-sleep-total">
          {totalMinutes > 0 ? formatDuration(totalMinutes) : "—"}
        </span>
      </header>
      <div className="daily-sleep-period-list">
        {visibleSleepPeriods.map((period, index) => {
          const periodIssues = feedback.filter(
            (issue) => issue.slotIndex === undefined || issue.slotIndex === index,
          );
          const periodHasError = periodIssues.some((issue) => issue.type === "error");
          const periodHasOverlap = periodIssues.some((issue) => issue.type === "overlap");
          return (
            <div
              className={`daily-sleep-time-range${periodHasOverlap ? " is-overlapping" : ""}${periodHasError ? " has-slot-error" : ""}`}
              aria-describedby={describedBy}
              key={period.id}
            >
              <TimeInput
                value={period.start}
                disabled={disabled}
                invalid={periodHasError}
                describedBy={describedBy}
                onChange={(value) => onChange(period.id, "start", value)}
                label={`Sleep period ${index + 1} start time`}
                showPlaceholder
                onSaveNow={onSaveNow}
              />
              <span className="daily-sleep-time-separator" aria-hidden="true">
                –
              </span>
              <TimeInput
                value={period.end}
                disabled={disabled}
                invalid={periodHasError}
                describedBy={describedBy}
                onChange={(value) => onChange(period.id, "end", value)}
                label={`Sleep period ${index + 1} wake time`}
                showPlaceholder
                onSaveNow={onSaveNow}
              />
              <button
                type="button"
                className="slot-remove"
                aria-label={`Remove sleep period ${index + 1}`}
                onClick={() => onRemove(period.id)}
                disabled={disabled}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
        <button type="button" className="daily-add-slot" onClick={onAdd} disabled={disabled}>
          <Plus size={14} aria-hidden="true" />
          Add sleep period
        </button>
      </div>
      {feedback.length > 0 && (
        <ul
          id={feedbackId}
          className={`daily-sleep-feedback${hasError ? " has-slot-error" : ""}`}
          aria-label="Sleep time feedback"
          aria-live="polite"
        >
          {feedback.map((issue, index) => (
            <li key={`${issue.type}-${index}`}>{issue.message}</li>
          ))}
        </ul>
      )}
      <p className="daily-sleep-note">
        Overnight sleep is counted only from midnight to wake-up for this day.
      </p>
    </section>
  );
}
