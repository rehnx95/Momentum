import { useEffect, useRef, useState } from "react";
import { Clock3, Ellipsis, Plus, Square, Trash2 } from "lucide-react";
import { formatDuration } from "../../../shared/utils/time";
import Tooltip from "../../../shared/components/Tooltip";
import SlotRow from "./SlotRow";

export default function ActivityCard({
  activityId,
  activityName,
  slots,
  totalMinutes = 0,
  disabled,
  runningTimer,
  timerNow,
  onAddSlot,
  onStartTimer,
  onStopTimer,
  onChangeSlot,
  onRemoveSlot,
  onRemoveActivity,
  onRename,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(activityName);
  const [pendingEmptySlotIndex, setPendingEmptySlotIndex] = useState(null);
  const menuRef = useRef(null);
  const pendingSlotFocus = useRef(false);
  const previousSlotCount = useRef(slots.length);
  const visibleSlots = slots
    .map((slot, index) => ({ slot, index }))
    .filter(
      ({ slot, index }) =>
        Boolean(String(slot.start || "").trim() || String(slot.end || "").trim()) ||
        index === pendingEmptySlotIndex,
    );
  const timerRunningHere = runningTimer?.activityId === activityId;
  const elapsedMinutes = timerRunningHere
    ? Math.max(0, Math.floor((timerNow - Date.parse(runningTimer.startedAt)) / 60_000))
    : 0;

  useEffect(() => {
    setRenameValue(activityName);
  }, [activityName]);

  useEffect(() => {
    if (pendingSlotFocus.current && slots.length > previousSlotCount.current) {
      document
        .getElementById(`slot-${activityId}-${slots.length - 1}`)
        ?.querySelector("input")
        ?.focus({ preventScroll: true });
      pendingSlotFocus.current = false;
    }
    previousSlotCount.current = slots.length;
  }, [activityId, slots.length]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <section className="activity-card">
      <header className="activity-card-heading">
        <div className="activity-card-identity">
          <Clock3 size={15} aria-hidden="true" />
          <strong className="activity-card-name">{activityName}</strong>
        </div>
        <span className="activity-total">{formatDuration(totalMinutes + elapsedMinutes)}</span>
        <div className="activity-menu-wrap" ref={menuRef}>
          <Tooltip label={`Options for ${activityName}`}>
            <button
              type="button"
              className="activity-menu-trigger"
              aria-label={`Options for ${activityName}`}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              disabled={disabled}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Ellipsis size={17} aria-hidden="true" />
            </button>
          </Tooltip>
          {menuOpen && (
            <div className="activity-menu" role="menu">
              <label className="activity-menu-label">
                Rename
                <input
                  value={renameValue}
                  disabled={disabled}
                  onChange={(event) => setRenameValue(event.target.value)}
                  onBlur={(event) => {
                    const name = event.currentTarget.value.trim();
                    if (name && name !== activityName) onRename(name);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                />
              </label>
              <button
                type="button"
                role="menuitem"
                disabled={disabled || timerRunningHere}
                onClick={async () => {
                  await onRemoveActivity();
                  setMenuOpen(false);
                }}
              >
                <Trash2 size={14} aria-hidden="true" />
                Remove activity
              </button>
            </div>
          )}
        </div>
      </header>
      <div className="daily-slot-list">
        {visibleSlots.map(({ slot, index }) => (
          <SlotRow
            key={`${activityId}-${index}`}
            activityId={activityId}
            activityName={activityName}
            index={index}
            slot={slot}
            onChange={(slotIndex, field, value) => {
              if (slotIndex === pendingEmptySlotIndex) {
                setPendingEmptySlotIndex(null);
              }
              onChangeSlot(slotIndex, field, value);
            }}
            onRemove={(slotIndex) => {
              setPendingEmptySlotIndex((pendingIndex) =>
                pendingIndex === slotIndex
                  ? null
                  : pendingIndex !== null && pendingIndex > slotIndex
                    ? pendingIndex - 1
                    : pendingIndex,
              );
              onRemoveSlot(slotIndex);
            }}
            disabled={disabled}
          />
        ))}
        {!visibleSlots.length && <p className="slot-empty">No time recorded yet.</p>}
      </div>
      <div className="activity-card-actions">
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
        <button
          type="button"
          className="slot-add"
          onClick={() => {
            pendingSlotFocus.current = true;
            setPendingEmptySlotIndex(slots.length);
            onAddSlot();
          }}
          disabled={disabled}
        >
          <Plus size={14} /> Add time
        </button>
      </div>
    </section>
  );
}
