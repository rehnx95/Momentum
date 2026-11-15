import { useId } from "react";
import { X } from "lucide-react";
import { formatDuration, getSlotDurationMinutes } from "../../../shared/utils/time";
import Tooltip from "../../../shared/components/Tooltip";
import TimeInput from "./TimeInput";

export default function SlotRow({
  activityName,
  index,
  slot,
  issues = [],
  slotDescription = "",
  startInputRef,
  onSaveNow,
  onChange,
  onRemove,
  allowRemove = true,
  disabled,
}) {
  const durationMinutes = getSlotDurationMinutes(slot);
  const feedbackId = useId();
  const hasOverlap = issues.some((issue) => issue.type === "overlap");
  const hasError = issues.some((issue) => issue.type === "error");
  const describedBy = issues.length ? feedbackId : undefined;

  return (
    <div className="daily-slot-entry">
      <div
        className={`daily-slot-row${hasOverlap ? " is-overlapping" : ""}${hasError ? " has-slot-error" : ""}`}
        data-slot-index={index}
        role="group"
        aria-label={`${activityName} slot ${index + 1}`}
        aria-describedby={describedBy}
      >
        <div className="slot-time-controls">
          <div className="slot-time-range">
            <TimeInput
              value={slot.start}
              disabled={disabled}
              invalid={hasError}
              describedBy={describedBy}
              onChange={(value) => onChange(index, "start", value)}
              label={`${activityName} slot ${index + 1} start time`}
              showPlaceholder
              inputRef={startInputRef}
              onSaveNow={onSaveNow}
            />
            <span className="slot-time-separator" aria-hidden="true">
              –
            </span>
            <TimeInput
              value={slot.end}
              disabled={disabled}
              invalid={hasError}
              describedBy={describedBy}
              onChange={(value) => onChange(index, "end", value)}
              label={`${activityName} slot ${index + 1} end time`}
              showPlaceholder
              onSaveNow={onSaveNow}
            />
          </div>
          {allowRemove && (
            <Tooltip label="Remove slot">
              <button
                type="button"
                className="slot-remove"
                aria-label={`Remove ${activityName} slot ${index + 1}`}
                onClick={() => onRemove(index)}
                disabled={disabled}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </Tooltip>
          )}
        </div>
        <span className="slot-activity-description" aria-hidden={!slotDescription}>
          {slotDescription}
        </span>
        <span className="slot-hours" aria-label={`${activityName} slot ${index + 1} duration`}>
          {durationMinutes === null ? "—" : formatDuration(durationMinutes)}
        </span>
        {slot.endDayOffset === 1 && <span className="slot-next-day">+1 day</span>}
      </div>
      {issues.length > 0 && (
        <ul
          id={feedbackId}
          className={`daily-slot-feedback${hasError ? " has-slot-error" : ""}`}
          aria-label={`${activityName} slot ${index + 1} feedback`}
          aria-live="polite"
        >
          {issues.map((issue, issueIndex) => (
            <li key={`${issue.type}-${issueIndex}`}>{issue.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
