import { useEffect, useRef, useState } from "react";
import { Clock3, Pencil, Plus, Trash2 } from "lucide-react";
import { formatDuration } from "../utils/time";
import Tooltip from "./Tooltip";
import SlotRow from "./SlotRow";

export default function ActivityCard({
  activityId,
  activityName,
  slots,
  totalMinutes = 0,
  disabled,
  onAddSlot,
  onChangeSlot,
  onRemoveSlot,
  onRemoveActivity,
  onRename,
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
    <section className="activity-card">
      <header className="activity-card-heading">
        <div className="activity-card-identity">
          <Clock3 size={15} aria-hidden="true" />
          <strong className="activity-card-name">{activityName}</strong>
          <div className="activity-menu-wrap" ref={menuRef}>
            <Tooltip label={`Edit ${activityName}`}>
              <button
                type="button"
                className="activity-menu-trigger"
                aria-label={`Edit ${activityName}`}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((open) => !open)}
              >
                <Pencil size={13} />
              </button>
            </Tooltip>
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
              </div>
            )}
          </div>
        </div>
        <span className="activity-total">{formatDuration(totalMinutes)}</span>
        <span className="activity-remove-wrap">
          <Tooltip label={`Remove ${activityName}`}>
            <button
              type="button"
              className="activity-remove"
              aria-label={`Remove ${activityName}`}
              disabled={disabled}
              onClick={onRemoveActivity}
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </Tooltip>
        </span>
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
