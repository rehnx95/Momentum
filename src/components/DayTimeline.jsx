import { findOverlaps, toMinutes } from "../utils/time";

function makeBlocks(log, tasks, enabled) {
  const blocks = [];
  const byActivity = {};
  const pushSlots = (id, name, color, slots) => {
    byActivity[id] = slots;
    slots.forEach((slot, index) => {
      const start = toMinutes(slot.start);
      const end = toMinutes(slot.end);
      if (
        start === null ||
        end === null ||
        (start === end && !(slot.endDayOffset === 1 && end === 0))
      ) {
        blocks.push({ id, name, color, slot, index, invalid: true, start: start || 0, end: (start || 0) + 10 });
      } else if (slot.endDayOffset === 1 && end === 0) {
        blocks.push({ id, name, color, slot, index, start, end: 1440 });
      } else if (end > start) {
        blocks.push({ id, name, color, slot, index, start, end });
      } else {
        blocks.push({ id, name, color, slot, index, invalid: true, start, end: start + 10 });
      }
    });
  };

  if (enabled.dsa) pushSlots("dsa", "DSA", "var(--activity-dsa)", log.dsa_slots);
  if (enabled.backend) {
    pushSlots("backend", "Backend", "var(--activity-backend)", log.backend_slots);
  }
  tasks.forEach((task) => pushSlots(task.id, task.name, task.color, task.slots || []));

  if (log.sleep_time && log.wake_time) {
    const sleep = { start: log.sleep_time, end: log.wake_time, wrap: true };
    byActivity.sleep = [sleep];
    const start = toMinutes(sleep.start);
    const end = toMinutes(sleep.end);
    if (start !== null && end !== null && start !== end) {
      if (end > start) {
        blocks.push({ id: "sleep", name: "Sleep", color: "var(--activity-sleep)", slot: sleep, index: 0, start, end });
      } else {
        blocks.push({ id: "sleep", name: "Sleep", color: "var(--activity-sleep)", slot: sleep, index: 0, start: 0, end });
        blocks.push({ id: "sleep", name: "Sleep", color: "var(--activity-sleep)", slot: sleep, index: 0, start, end: 1440 });
      }
    }
  }
  return { blocks, byActivity };
}

export default function DayTimeline({
  log,
  tasks,
  enabled,
  date,
  onFocusSlot,
}) {
  const { blocks, byActivity } = makeBlocks(log, tasks, enabled);
  const overlappingSlots = new Set(
    findOverlaps(byActivity).flatMap((overlap) => [
      overlap.slotA,
      overlap.slotB,
    ]),
  );
  const now = new Date();
  const isToday = date === [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const legends = [
    ...(enabled.dsa ? [{ name: "DSA", color: "var(--activity-dsa)" }] : []),
    ...(enabled.backend ? [{ name: "Backend", color: "var(--activity-backend)" }] : []),
    ...tasks.map((task) => ({ name: task.name, color: task.color })),
    ...(log.sleep_time && log.wake_time
      ? [{ name: "Sleep (night before)", color: "var(--activity-sleep)" }]
      : []),
  ];

  return (
    <section className="day-timeline" aria-label="24-hour activity timeline">
      <div className="timeline-hours" aria-hidden="true">
        {[0, 6, 12, 18, 24].map((hour) => (
          <span key={hour} style={{ left: `${(hour / 24) * 100}%` }}>
            {hour === 24 ? "12a" : `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}${hour < 12 ? "a" : "p"}`}
          </span>
        ))}
      </div>
      <div className="timeline-bar">
        {Array.from({ length: 4 }, (_, index) => (
          <span
            key={index}
            className="timeline-gridline"
            style={{ left: `${((index + 1) / 4) * 100}%` }}
            aria-hidden="true"
          />
        ))}
        {blocks.map((block, index) => {
          const overlaps = overlappingSlots.has(block.slot);
          const start = Math.max(0, Math.min(1440, block.start));
          const end = Math.max(start + 2, Math.min(1440, block.end));
          const label = `${block.name} ${block.slot.start} to ${block.slot.end}`;
          return (
            <button
              type="button"
              key={`${block.id}-${block.index}-${index}`}
              className={`timeline-block${overlaps ? " has-overlap" : ""}${block.invalid ? " is-invalid" : ""}`}
              style={{
                left: `${(start / 1440) * 100}%`,
                width: `${Math.max(0.25, ((end - start) / 1440) * 100)}%`,
                "--activity-color": block.color,
              }}
              aria-label={label}
              title={label}
              onClick={() => block.id !== "sleep" && onFocusSlot(block.id, block.index)}
              disabled={block.id === "sleep"}
            />
          );
        })}
        {isToday && (
          <span
            className="timeline-now"
            style={{ left: `${(nowMinutes / 1440) * 100}%` }}
            aria-label="Current time"
          />
        )}
      </div>
      <div className="timeline-legend" aria-label="Activity legend">
        {legends.map((item) => (
          <span key={item.name}>
            <i style={{ backgroundColor: item.color }} aria-hidden="true" />
            {item.name}
          </span>
        ))}
      </div>
    </section>
  );
}
