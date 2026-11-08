import { Check, Pencil, Trash2 } from "lucide-react";
import { formatDuration, slotMinutes, toMinutes } from "../utils/time";

export default function SlotRow({
  activityId,
  activityName,
  index,
  slot,
  editing,
  onToggleEdit,
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
      {editing ? (
        <>
          <label>
            <span className="sr-only">{activityName} start time</span>
            <input
              type="time"
              value={slot.start}
              disabled={disabled}
              onChange={(event) => onChange(index, "start", event.target.value)}
              aria-label={`${activityName} slot ${index + 1} start time`}
            />
          </label>
          <span className="slot-arrow" aria-hidden="true">→</span>
          <label>
            <span className="sr-only">{activityName} end time</span>
            <input
              type="time"
              value={slot.end}
              disabled={disabled}
              onChange={(event) => onChange(index, "end", event.target.value)}
              aria-label={`${activityName} slot ${index + 1} end time`}
            />
          </label>
          <button
            type="button"
            className="slot-edit-toggle"
            onClick={onToggleEdit}
            disabled={disabled || invalidInput || invalidOrder}
            aria-label={`Finish editing ${activityName} slot ${index + 1}`}
          >
            <Check size={14} />
          </button>
        </>
      ) : (
        <button
          type="button"
          className="slot-chip"
          onClick={onToggleEdit}
          disabled={disabled}
          aria-label={`Edit ${activityName} slot ${index + 1}`}
        >
          <span>{slot.start} → {slot.end}</span>
          <span className="slot-hours">
            {duration !== null
              ? formatDuration(duration)
              : slot.endDayOffset === 1 && slot.end === "00:00" && start !== null
                ? formatDuration(1440 - start)
                : "—"}
          </span>
          <Pencil size={12} aria-hidden="true" />
        </button>
      )}
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
