import { X } from "lucide-react";
import { formatDuration, getSlotDurationMinutes } from "../../../shared/utils/time";
import Tooltip from "../../../shared/components/Tooltip";
import TimeInput from "./TimeInput";

export default function SlotRow({
  activityName,
  index,
  slot,
  slotDescription = "",
  startInputRef,
  onSaveNow,
  onChange,
  onRemove,
  allowRemove = true,
  disabled,
}) {
  const durationMinutes = getSlotDurationMinutes(slot);

  return (
    <div className="daily-slot-row" data-slot-index={index}>
      <div className="slot-time-controls">
        <div className="slot-time-range">
          <TimeInput
            value={slot.start}
            disabled={disabled}
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
  );
}
