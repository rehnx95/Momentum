import { toMinutes } from "../../../shared/utils/time";

const TICKS = [
  { minute: 0, label: "12am" },
  { minute: 360, label: "6am" },
  { minute: 720, label: "12pm" },
  { minute: 1080, label: "6pm" },
];

export function intervalsFor(slot, wrapMidnight = false) {
  const start = toMinutes(String(slot?.start || "").slice(0, 5));
  const end = toMinutes(String(slot?.end || "").slice(0, 5));
  if (start === null || end === null) return [];
  if (slot?.endDayOffset === 1 && end === 0) return [[start, 1440]];
  if (start === end) return [];
  if (end > start) return [[start, end]];
  return wrapMidnight ? [[start, 1440], [0, end]] : [];
}

function timeLabel(value) {
  if (!value) return "--:--";
  return String(value).slice(0, 5);
}

export default function FullLogTimeline({ row, activities }) {
  const segments = [];
  const sleepSlot = { start: row.sleep_time, end: row.wake_time };

  intervalsFor(sleepSlot, true).forEach(([start, end], index) => {
    segments.push({
      key: `sleep-${index}`,
      kind: "sleep",
      start,
      end,
      label: `Sleep ${timeLabel(row.sleep_time)} to ${timeLabel(row.wake_time)}`,
    });
  });

  activities.forEach((activity, activityIndex) => {
    activity.slots.forEach((slot, slotIndex) => {
      intervalsFor(slot).forEach(([start, end], intervalIndex) => {
        segments.push({
          key: `${activityIndex}-${slotIndex}-${intervalIndex}`,
          kind: "study",
          start,
          end,
          label: `${activity.name} ${timeLabel(slot.start)} to ${timeLabel(slot.end)}`,
        });
      });
    });
  });

  const description = segments.length
    ? segments.map((segment) => segment.label).join("; ")
    : "No sleep or study periods recorded";

  return (
    <div className="full-log-timeline">
      <div className="full-log-timeline-axis" aria-hidden="true">
        {TICKS.map(({ minute, label }) => (
          <span
            key={label}
            className={minute === 0 ? "first" : ""}
            style={{ left: `${(minute / 1440) * 100}%` }}
          >
            {label}
          </span>
        ))}
      </div>
      <div
        className="full-log-timeline-track"
        role="img"
        aria-label={description}
      >
        {segments.map((segment) => (
          <span
            key={segment.key}
            className={`full-log-timeline-segment ${segment.kind}`}
            style={{
              left: `${(segment.start / 1440) * 100}%`,
              width: `${((segment.end - segment.start) / 1440) * 100}%`,
            }}
            title={segment.label}
          />
        ))}
      </div>
    </div>
  );
}
