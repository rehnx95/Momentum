import { Trash2 } from "lucide-react";
import { formatDuration, slotMinutes, toMinutes } from "../utils/time";

export function navigateTimeFields(event) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  const view = event.currentTarget.closest(".daily-day-view");
  if (!view) return;
  const inputs = [...view.querySelectorAll(
    'input[type="time"][data-time-navigation]:not(:disabled)',
  )];
  const currentIndex = inputs.indexOf(event.currentTarget);
  const nextInput = inputs[currentIndex + (event.key === "ArrowRight" ? 1 : -1)];
  if (!nextInput) return;
  event.preventDefault();
  nextInput.focus({ preventScroll: true });
}

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
        <input
          type="time"
          value={slot.start}
          disabled={disabled}
          onChange={(event) => onChange(index, "start", event.target.value)}
          onKeyDown={navigateTimeFields}
          data-time-navigation
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
          onKeyDown={navigateTimeFields}
          data-time-navigation
          aria-label={`${activityName} slot ${index + 1} end time`}
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
