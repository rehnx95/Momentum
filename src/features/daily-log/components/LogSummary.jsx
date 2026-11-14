import TimeInput from "./TimeInput";
import { getSlotDurationMinutes, toMinutes } from "../../../shared/utils/time";
import { getActivityColor } from "../lib/activityColor";

function formatTime(value) {
  if (!value) return "--:--";
  const [hours, minutes] = String(value).slice(0, 5).split(":");
  return `${hours}:${minutes}`;
}

function SummaryTime({ value, label, onChange, disabled }) {
  if (onChange) {
    return (
      <TimeInput
        value={value}
        disabled={disabled}
        onChange={onChange}
        label={label}
        showPlaceholder
      />
    );
  }

  return (
    <span
      className="time-input log-summary-time-value"
      role="group"
      aria-label={`${label}: ${formatTime(value)}`}
    >
      {formatTime(value)}
    </span>
  );
}

export default function LogSummary({
  className,
  ariaLabel,
  sleepTime,
  wakeTime,
  sleepDuration,
  activities = [],
  activityColors = {},
  savedStatus,
  dirty = false,
  onSaveNow,
  onSleepTimeChange,
  onWakeTimeChange,
  disabled = false,
}) {
  const blocks = [];
  const sleepStart = toMinutes(String(sleepTime || "").slice(0, 5));
  const sleepEnd = toMinutes(String(wakeTime || "").slice(0, 5));
  if (sleepStart !== null && sleepEnd !== null) {
    const end = sleepEnd <= sleepStart ? sleepEnd + 1440 : sleepEnd;
    const segments =
      end > 1440
        ? [
            [sleepStart, 1440],
            [0, end - 1440],
          ]
        : [[sleepStart, end]];
    segments.forEach(([start, finish], index) => {
      blocks.push({
        key: `sleep-${index}`,
        label: "Sleep",
        left: (start / 1440) * 100,
        width: ((finish - start) / 1440) * 100,
        color: "var(--activity-color-sleep)",
      });
    });
  }
  const taskNames = new Map();
  activities.forEach((activity) => {
    if (activity.slots.some((slot) => getSlotDurationMinutes(slot) > 0)) {
      taskNames.set(activity.id, {
        label: activity.name,
        color: getActivityColor(activity.name, activityColors),
      });
      activity.slots.forEach((slot, slotIndex) => {
        const start = toMinutes(String(slot.start || "").slice(0, 5));
        const duration = getSlotDurationMinutes(slot);
        if (start === null || !duration) return;
        const finish = Math.min(1440, start + duration);
        blocks.push({
          key: `${activity.id}-${slotIndex}`,
          label: activity.name,
          left: (start / 1440) * 100,
          width: ((finish - start) / 1440) * 100,
          color: getActivityColor(activity.name, activityColors),
        });
      });
    }
  });
  const legend = [
    { label: "Sleep", color: "var(--activity-color-sleep)" },
    ...[...taskNames.values()].map(({ label, color }) => ({ label, color })),
  ];

  return (
    <section className={`log-summary-card ${className}`} aria-label={ariaLabel}>
      <div className="log-summary-header">
        <h3>Your day</h3>
        <div className="log-summary-saved" role="status" aria-live="polite">
          <span>{savedStatus}</span>
          {dirty && onSaveNow && (
            <button type="button" onClick={onSaveNow}>
              Save now
            </button>
          )}
        </div>
      </div>
      <div className="log-summary-axis" aria-hidden="true">
        <span>12am</span>
        <span>6am</span>
        <span>12pm</span>
        <span>6pm</span>
        <span>12am</span>
      </div>
      <div className="log-summary-rail" aria-label="Your day timeline">
        {blocks.map((block) => (
          <span
            key={block.key}
            className="log-summary-segment"
            title={block.label}
            style={{
              left: `${block.left}%`,
              width: `${block.width}%`,
              background: block.color,
            }}
          />
        ))}
      </div>

      <div className="log-summary-labels">
        {legend.map((item) => (
          <span key={item.label}>
            <i style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>

      <div className="log-summary-bottom">
        <div className="log-summary-time-pair" role="group" aria-label="Sleep and wake times">
          <SummaryTime
            value={sleepTime}
            label="Sleep time"
            onChange={onSleepTimeChange}
            disabled={disabled}
          />
          <span className="slot-arrow" aria-hidden="true">
            →
          </span>
          <SummaryTime
            value={wakeTime}
            label="Wake time"
            onChange={onWakeTimeChange}
            disabled={disabled}
          />
        </div>
        {sleepTime && wakeTime && (
          <strong className="log-summary-duration" aria-label={`Sleep duration: ${sleepDuration}`}>
            {sleepDuration}
          </strong>
        )}
      </div>
    </section>
  );
}
