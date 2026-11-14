import { useEffect, useRef } from "react";
import { Plus, Square, Trash2 } from "lucide-react";
import { formatDuration } from "../../../shared/utils/time";
import Tooltip from "../../../shared/components/Tooltip";
import SlotRow from "./SlotRow";

export default function ActivityCard({
  activityId,
  activityName,
  activityDescription = "",
  slots,
  totalMinutes = 0,
  disabled,
  runningTimer,
  timerNow,
  onSaveNow,
  onStopTimer,
  onAddSlot,
  onChangeSlot,
  onRemoveSlot,
  onRemoveActivity,
  onDiscardEmptySlot,
  activityColor,
  fromSheet = false,
  overlapsSleep = false,
  allowAddSlot = true,
  allowRemoveActivity = true,
  allowRemoveSlot = true,
  startInputRef,
}) {
  const cardRef = useRef(null);
  const pendingSlotFocus = useRef(false);
  const previousSlotCount = useRef(slots.length);
  const visibleSlots = slots.map((slot, index) => ({ slot, index }));
  const timerRunningHere = runningTimer?.activityId === activityId;
  const elapsedMinutes = timerRunningHere
    ? Math.max(0, Math.floor((timerNow - Date.parse(runningTimer.startedAt)) / 60_000))
    : 0;
  const activityDurationMinutes = totalMinutes + elapsedMinutes;

  useEffect(() => {
    if (slots.length > previousSlotCount.current && pendingSlotFocus.current) {
      document
        .getElementById(`slot-${activityId}-${slots.length - 1}`)
        ?.querySelector("input")
        ?.focus({ preventScroll: true });
      pendingSlotFocus.current = false;
    }
    previousSlotCount.current = slots.length;
  }, [activityId, slots.length]);

  useEffect(() => {
    const discardUnfilledSlots = (event) => {
      const clickedAction = event.target?.closest?.(".activity-add-slot, .activity-delete");
      if (clickedAction && cardRef.current?.contains(clickedAction)) return;

      const clickedRow = event.target?.closest?.(".daily-slot-row");
      const clickedIndex = clickedRow && cardRef.current?.contains(clickedRow)
        ? Number(clickedRow.dataset.slotIndex)
        : -1;
      const emptyIndexes = slots.reduce((indexes, slot, index) => {
        if (!String(slot.start || "").trim() && !String(slot.end || "").trim()) {
          indexes.push(index);
        }
        return indexes;
      }, []);

      emptyIndexes.reverse().forEach((index) => {
        if (index !== clickedIndex) onDiscardEmptySlot?.(index);
      });
    };

    document.addEventListener("pointerdown", discardUnfilledSlots);
    return () => document.removeEventListener("pointerdown", discardUnfilledSlots);
  }, [onDiscardEmptySlot, slots]);

  const addSlot = () => {
    pendingSlotFocus.current = true;
    onAddSlot();
  };

  return (
    <section
      className="activity-card activity-card-activity"
      ref={cardRef}
      style={{ "--activity-color": activityColor }}
    >
      <div className="activity-card-identity">
        <div className="activity-card-title-row">
          <span className="activity-row-dot" aria-hidden="true" />
          <strong className="activity-card-name">{activityName}</strong>
        </div>
        <div className="activity-card-meta">
          {fromSheet && (
            <span className="activity-from-sheet">From sheet</span>
          )}
          {activityDescription && (
            <span className="activity-card-description">{activityDescription}</span>
          )}
          {overlapsSleep && (
            <span className="activity-sleep-overlap">Overlaps sleep</span>
          )}
        </div>
      </div>
      {visibleSlots.length > 0 && (
        <div className="daily-slot-list">
          {visibleSlots.map(({ slot, index }) => (
            <SlotRow
              key={`${activityId}-${index}`}
              activityName={activityName}
              index={index}
              slot={slot}
              startInputRef={index === 0 ? startInputRef : undefined}
              onSaveNow={onSaveNow}
              slotDescription={
                [slot.description, slot.title, slot.label].find(
                  (value) => typeof value === "string" && value.trim(),
                ) || ""
              }
              onChange={(slotIndex, field, value) =>
                onChangeSlot(slotIndex, field, value)
              }
              onRemove={(slotIndex) => onRemoveSlot(slotIndex)}
              allowRemove={allowRemoveSlot}
              disabled={disabled || timerRunningHere}
            />
          ))}
        </div>
      )}
      <span className="activity-total">
        {activityDurationMinutes > 0 ? formatDuration(activityDurationMinutes) : "—"}
      </span>
      {(allowAddSlot || allowRemoveActivity || timerRunningHere) && (
        <div className="activity-card-actions">
          {allowAddSlot && (
            <Tooltip label="Add slot" className="activity-add-slot-tooltip">
              <button
                type="button"
                className="activity-add-slot"
                aria-label={`Add slot to ${activityName}`}
                onClick={addSlot}
                disabled={disabled || timerRunningHere}
              >
                <Plus size={14} aria-hidden="true" />
              </button>
            </Tooltip>
          )}
          {allowRemoveActivity && (
            <Tooltip label="Remove activity">
              <button
                type="button"
                className="activity-delete"
                aria-label={`Remove ${activityName} activity`}
                onClick={() => void onRemoveActivity()}
                disabled={disabled || timerRunningHere}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </Tooltip>
          )}
          {timerRunningHere && (
          <button
            type="button"
            className="slot-start is-running"
            onClick={() => void onStopTimer()}
            disabled={disabled}
          >
            <Square size={13} aria-hidden="true" /> Stop
          </button>
          )}
        </div>
      )}
    </section>
  );
}
