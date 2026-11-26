import { useEffect, useRef, useState } from "react";
import { Palette, Plus, Square, Trash2 } from "lucide-react";
import Tooltip from "../../../shared/components/Tooltip";
import { formatDuration, getSlotsDurationMinutes } from "../../../shared/utils/time";
import SlotRow from "./SlotRow";
import { ACTIVITY_COLOR_PALETTE, isActivityColorValue } from "../lib/activityColor";

function getPickerColor(activityColor) {
  if (/^#[0-9a-f]{6}$/i.test(activityColor || "")) return activityColor;
  return (
    ACTIVITY_COLOR_PALETTE.find(
      ({ id }) => activityColor === `var(--activity-color-${id.replace(/_/g, "-")})`,
    )?.hex || ACTIVITY_COLOR_PALETTE[0].hex
  );
}

export default function ActivityCard({
  activityId,
  activityName,
  activityDescription = "",
  slots,
  disabled,
  runningTimer,
  onSaveNow,
  onStopTimer,
  onAddSlot,
  onChangeSlot,
  onRemoveSlot,
  onRemoveActivity,
  onDiscardEmptySlot,
  activityColor,
  slotFeedback = {},
  onSetActivityColor,
  fromSheet = false,
  allowAddSlot = true,
  allowRemoveActivity = true,
  allowRemoveSlot = true,
  startInputRef,
  quickAddRequest = 0,
}) {
  const cardRef = useRef(null);
  const colorToggleRef = useRef(null);
  const colorPickerRef = useRef(null);
  const pendingSlotFocus = useRef(false);
  const previousSlotCount = useRef(slots.length);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [customColor, setCustomColor] = useState("");
  const visibleSlots = slots.map((slot, index) => ({ slot, index }));
  const totalSlotMinutes = getSlotsDurationMinutes(slots);
  const totalSlotDuration = totalSlotMinutes > 0 ? formatDuration(totalSlotMinutes) : "";
  const timerRunningHere = runningTimer?.activityId === activityId;

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
    if (quickAddRequest) {
      cardRef.current?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    }
  }, [quickAddRequest]);

  useEffect(() => {
    if (!colorPickerOpen) return undefined;

    const closeColorPickerOnOutsidePointer = (event) => {
      if (
        colorPickerRef.current?.contains(event.target) ||
        colorToggleRef.current?.contains(event.target)
      ) {
        return;
      }
      setColorPickerOpen(false);
    };

    document.addEventListener("pointerdown", closeColorPickerOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeColorPickerOnOutsidePointer);
  }, [colorPickerOpen]);

  useEffect(() => {
    const discardUnfilledSlots = (event) => {
      if (event.target?.closest?.(".quick-log-card")) return;

      const clickedAction = event.target?.closest?.(
        ".activity-add-slot, .activity-delete, .activity-color-toggle, .activity-color-picker",
      );
      if (clickedAction && cardRef.current?.contains(clickedAction)) return;

      const clickedRow = event.target?.closest?.(".daily-slot-row");
      const clickedIndex =
        clickedRow && cardRef.current?.contains(clickedRow)
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

    document.addEventListener("click", discardUnfilledSlots);
    return () => document.removeEventListener("click", discardUnfilledSlots);
  }, [onDiscardEmptySlot, slots]);

  const addSlot = () => {
    pendingSlotFocus.current = true;
    onAddSlot();
  };

  const chooseColor = async (color) => {
    await onSetActivityColor?.(color);
    setColorPickerOpen(false);
  };

  const applyCustomColor = (event) => {
    event.preventDefault();
    if (!/^#[0-9a-f]{6}$/i.test(customColor) || !isActivityColorValue(customColor)) return;
    void chooseColor(customColor);
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
          {fromSheet && <span className="activity-from-sheet"></span>}
          {activityDescription && (
            <span className="activity-card-description">{activityDescription}</span>
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
              issues={slotFeedback[index] || []}
              startInputRef={index === 0 ? startInputRef : undefined}
              onSaveNow={onSaveNow}
              slotDescription={
                [slot.description, slot.title, slot.label].find(
                  (value) => typeof value === "string" && value.trim(),
                ) || ""
              }
              onChange={(slotIndex, field, value) => onChangeSlot(slotIndex, field, value)}
              onRemove={(slotIndex) => onRemoveSlot(slotIndex)}
              allowRemove={allowRemoveSlot}
              disabled={disabled || timerRunningHere}
            />
          ))}
        </div>
      )}
      {(allowAddSlot || allowRemoveActivity || timerRunningHere || totalSlotDuration) && (
        <div className="activity-card-actions">
          {totalSlotDuration && (
            <span
              className="activity-total-duration"
              aria-label={`${activityName} total time: ${totalSlotDuration}`}
            >
              {totalSlotDuration}
            </span>
          )}
          {onSetActivityColor && (
            <Tooltip label="Choose activity color">
              <button
                ref={colorToggleRef}
                type="button"
                className="activity-color-toggle"
                aria-label={`Choose color for ${activityName}`}
                aria-expanded={colorPickerOpen}
                onClick={() => {
                  setCustomColor(getPickerColor(activityColor));
                  setColorPickerOpen((open) => !open);
                }}
                disabled={disabled}
              >
                <Palette size={14} aria-hidden="true" />
              </button>
            </Tooltip>
          )}
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
      {colorPickerOpen && (
        <div
          ref={colorPickerRef}
          className="activity-color-picker"
          role="group"
          aria-label={`${activityName} color`}
        >
          <div className="activity-color-swatches">
            {ACTIVITY_COLOR_PALETTE.map(({ id, name, hex }) => (
              <button
                key={id}
                type="button"
                aria-label={`Use ${name} color`}
                aria-pressed={activityColor === `var(--activity-color-${id.replace(/_/g, "-")})`}
                title={name}
                style={{ backgroundColor: `var(--activity-color-${id.replace(/_/g, "-")})` }}
                onClick={() => void chooseColor(id)}
                disabled={disabled}
              >
                <span className="sr-only">{hex}</span>
              </button>
            ))}
          </div>
          <label className="activity-native-color-picker">
            Pick a custom color
            <input
              type="color"
              aria-label={`Pick custom color for ${activityName}`}
              value={
                /^#[0-9a-f]{6}$/i.test(customColor) ? customColor : getPickerColor(activityColor)
              }
              onChange={(event) => setCustomColor(event.target.value)}
              disabled={disabled}
            />
          </label>
          <form className="activity-custom-color" onSubmit={applyCustomColor}>
            <label htmlFor={`activity-color-hex-${activityId}`}>Custom hex</label>
            <input
              id={`activity-color-hex-${activityId}`}
              type="text"
              inputMode="text"
              autoComplete="off"
              maxLength={7}
              placeholder="#c9a96e"
              value={customColor}
              onChange={(event) => setCustomColor(event.target.value)}
              disabled={disabled}
            />
            <button type="submit" disabled={disabled || !/^#[0-9a-f]{6}$/i.test(customColor)}>
              Apply
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
