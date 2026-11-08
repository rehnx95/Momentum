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
  const [editingSlot, setEditingSlot] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    setRenameValue(activityName);
  }, [activityName]);

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
            editing={editingSlot === index || !slot.start || !slot.end}
            onToggleEdit={() =>
              setEditingSlot((current) => current === index ? null : index)
            }
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
          setEditingSlot(null);
          onAddSlot();
        }}
        disabled={disabled}
      >
        <Plus size={14} /> Log time
      </button>
    </section>
  );
}
