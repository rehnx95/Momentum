import { Trash2 } from "lucide-react";
import { formatDuration, slotMinutes, toMinutes } from "../utils/time";
import TimeInput from "./TimeInput";

export default function SlotRow({
  activityId,
  activityName,
  index,
  slot,
  onChange,
  onRemove,
  disabled,
}) {
  const duration = slotMinutes(slot);
  const start = toMinutes(slot.start);
  const end = toMinutes(slot.end);
  const invalidOrder =
    Boolean(slot.start && slot.end) &&
    (end <= start) &&
    !(slot.endDayOffset === 1 && slot.end === "00:00");
  const invalidInput =
    Boolean(slot.start || slot.end) &&
    (start === null || end === null);

  return (
    <div className="daily-slot-row" id={`slot-${activityId}-${index}`}>
      <label>
        <span className="sr-only">{activityName} start time</span>
        <TimeInput
          value={slot.start}
          disabled={disabled}
          onChange={(value) => onChange(index, "start", value)}
          label={`${activityName} slot ${index + 1} start time`}
        />
      </label>
      <span className="slot-arrow" aria-hidden="true">→</span>
      <label>
        <span className="sr-only">{activityName} end time</span>
        <TimeInput
          value={slot.end}
          disabled={disabled}
          onChange={(value) => onChange(index, "end", value)}
          label={`${activityName} slot ${index + 1} end time`}
        />
      </label>
      <span className="slot-hours">
        {duration !== null
          ? formatDuration(duration)
          : slot.endDayOffset === 1 && slot.end === "00:00" && start !== null
            ? formatDuration(1440 - start)
            : "—"}
      </span>
      {slot.endDayOffset === 1 && <span className="slot-next-day">+1 day</span>}
      {(invalidOrder || invalidInput) && (
        <span className="slot-fix-badge" role="status">Fix this slot</span>
      )}
      <button
        type="button"
        className="slot-remove"
        aria-label={`Remove ${activityName} slot ${index + 1}`}
        onClick={() => onRemove(index)}
        disabled={disabled}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
