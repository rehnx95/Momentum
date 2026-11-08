import { useEffect, useRef, useState } from "react";
import { Clock3, Ellipsis, Plus, Trash2 } from "lucide-react";
import { formatDuration } from "../utils/time";
import SlotRow from "./SlotRow";

export default function ActivityCard({
  activityId,
  activityName,
  color,
  slots,
  totalMinutes = 0,
  disabled,
  onAddSlot,
  onChangeSlot,
  onRemoveSlot,
  onRemoveActivity,
  onRename,
  onColorChange,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(activityName);
  const menuRef = useRef(null);
  const pendingSlotFocus = useRef(false);
  const previousSlotCount = useRef(slots.length);

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
    <section className="activity-card" style={{ "--activity-color": color }}>
      <header className="activity-card-heading">
        <Clock3 size={15} aria-hidden="true" />
        <strong className="activity-card-name">{activityName}</strong>
        <span className="activity-total">{formatDuration(totalMinutes)}</span>
        <div className="activity-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="activity-menu-trigger"
            aria-label={`More ${activityName} actions`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Ellipsis size={17} />
          </button>
          {menuOpen && (
            <div className="activity-menu">
              <label className="activity-menu-label">
                Rename
                <input
                  value={renameValue}
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
              <label className="activity-menu-label">
                Color
                <input
                  type="color"
                  value={color}
                  onChange={(event) => onColorChange(event.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={disabled}
                onClick={async () => {
                  await onRemoveActivity();
                  setMenuOpen(false);
                }}
              >
                <Trash2 size={14} />
                Remove activity
              </button>
            </div>
          )}
        </div>
      </header>
      <div className="daily-slot-list">
        {slots.map((slot, index) => (
          <SlotRow
            key={`${activityId}-${index}`}
            activityId={activityId}
            activityName={activityName}
            index={index}
            slot={slot}
            onChange={(slotIndex, field, value) =>
              onChangeSlot(slotIndex, field, value)
            }
            onRemove={onRemoveSlot}
            disabled={disabled}
          />
        ))}
        {!slots.length && <p className="slot-empty">No time recorded yet.</p>}
      </div>
      <button
        type="button"
        className="slot-add"
        onClick={() => {
          pendingSlotFocus.current = true;
          onAddSlot();
        }}
        disabled={disabled}
      >
        <Plus size={14} /> Add time
      </button>
    </section>
  );
}
