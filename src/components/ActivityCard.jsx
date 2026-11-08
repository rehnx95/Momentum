import { useState } from "react";
import { Clock3, Ellipsis, Plus, Trash2 } from "lucide-react";
import { formatDuration } from "../utils/time";
import SlotRow from "./SlotRow";

export default function ActivityCard({
  activityId,
  activityName,
  color,
  slots,
  totalMinutes = 0,
  builtIn = false,
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

  return (
    <section className="activity-card" style={{ "--activity-color": color }}>
      <header className="activity-card-heading">
        <Clock3 size={15} aria-hidden="true" />
        {builtIn ? (
          <strong>{activityName}</strong>
        ) : (
          <strong className="activity-card-name">{activityName}</strong>
        )}
        <span className="activity-total">{formatDuration(totalMinutes)}</span>
        <details
          className="activity-menu-wrap"
          open={menuOpen}
          onToggle={(event) => setMenuOpen(event.currentTarget.open)}
        >
          <summary aria-label={`More ${activityName} actions`}>
            <Ellipsis size={17} />
          </summary>
          <div className="activity-menu">
            {!builtIn && (
              <>
                <label className="activity-menu-label">
                  Rename
                  <input
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    onBlur={() => {
                      if (renameValue.trim() !== activityName) onRename(renameValue);
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
              </>
            )}
            <button type="button" disabled={disabled} onClick={onRemoveActivity}>
              <Trash2 size={14} />
              {builtIn ? `Hide ${activityName}` : "Remove activity"}
            </button>
          </div>
        </details>
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
      <button type="button" className="slot-add" onClick={onAddSlot} disabled={disabled}>
        <Plus size={14} /> Add time
      </button>
    </section>
  );
}
