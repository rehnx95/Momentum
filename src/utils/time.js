export function toMinutes(value) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    return null;
  }
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function slotMinutes(slot, { wrap = false } = {}) {
  const start = toMinutes(slot?.start);
  const end = toMinutes(slot?.end);
  if (start === null || end === null) return null;
  let duration = end - start;
  if (duration <= 0) {
    if (!wrap) return null;
    duration += 24 * 60;
  }
  return duration;
}

export function getSleepMinutes(log) {
  if (!log?.sleep_time || !log?.wake_time) return 0;
  const sleepTime = String(log.sleep_time).slice(0, 5);
  const wakeTime = String(log.wake_time).slice(0, 5);
  return slotMinutes(
    { start: sleepTime, end: wakeTime },
    { wrap: true },
  ) || 0;
}

export function getStudyMinutes(log) {
  const tasks = Array.isArray(log?.custom_tasks) ? log.custom_tasks : [];
  return tasks.reduce((total, task) => {
    const slots = Array.isArray(task?.slots) ? task.slots : [];
    const taskMinutes = slots.reduce((taskTotal, slot) => {
      const start = toMinutes(slot?.start);
      const duration =
        slot?.endDayOffset === 1 && slot?.end === "00:00" && start !== null
          ? 1440 - start
          : slotMinutes(slot);
      return taskTotal + (duration || 0);
    }, 0);
    return total + taskMinutes;
  }, 0);
}

export function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes < 0) return "0m";
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  if (hours && remainder) return `${hours}h ${remainder}m`;
  if (hours) return `${hours}h`;
  return `${remainder}m`;
}

export function splitIntervalByDay(startedAt, endedAt) {
  let cursor = new Date(startedAt);
  const end = new Date(endedAt);
  if (!Number.isFinite(cursor.getTime()) || !Number.isFinite(end.getTime())) return [];
  cursor.setSeconds(0, 0);
  if (end.getSeconds() || end.getMilliseconds()) end.setMinutes(end.getMinutes() + 1);
  end.setSeconds(0, 0);
  if (cursor >= end) return [];

  const segments = [];
  const dateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const time = (date) =>
    `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes(),
    ).padStart(2, "0")}`;

  while (cursor < end) {
    const midnight = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + 1,
    );
    const segmentEnd = end < midnight ? end : midnight;
    const endAtMidnight = segmentEnd.getTime() === midnight.getTime();
    segments.push({
      date: dateKey(cursor),
      slot: {
        start: time(cursor),
        end: endAtMidnight ? "00:00" : time(segmentEnd),
        ...(endAtMidnight ? { endDayOffset: 1 } : {}),
      },
    });
    cursor = segmentEnd;
  }
  return segments;
}

function intervalsFor(slot, wraps) {
  const start = toMinutes(slot?.start);
  const end = toMinutes(slot?.end);
  if (start === null || end === null) return [];
  if (slot?.endDayOffset === 1 && end === 0) return [[start, 1440]];
  if (start === end) return [];
  if (end > start) return [[start, end]];
  if (!wraps) return [];
  return [[start, 1440], [0, end]];
}

export function findOverlaps(slotsByActivity) {
  const slots = [];
  Object.entries(slotsByActivity || {}).forEach(([activity, entries]) => {
    (Array.isArray(entries) ? entries : []).forEach((slot, slotIndex) => {
      const intervals = intervalsFor(slot, Boolean(slot?.wrap));
      intervals.forEach(([start, end]) => {
        slots.push({ activity, slot, slotIndex, start, end });
      });
    });
  });

  const overlaps = [];
  for (let i = 0; i < slots.length; i += 1) {
    for (let j = i + 1; j < slots.length; j += 1) {
      const first = slots[i];
      const second = slots[j];
      if (first.slot === second.slot && first.activity === second.activity) continue;
      if (first.start < second.end && second.start < first.end) {
        const duplicate = overlaps.some(
          (overlap) =>
            overlap.slotA === first.slot &&
            overlap.slotB === second.slot &&
            overlap.activityA === first.activity &&
            overlap.activityB === second.activity,
        );
        if (!duplicate) {
          overlaps.push({
            activityA: first.activity,
            slotA: first.slot,
            slotIndexA: first.slotIndex,
            activityB: second.activity,
            slotB: second.slot,
            slotIndexB: second.slotIndex,
          });
        }
      }
    }
  }
  return overlaps;
}

function collectStudyActivities(log) {
  return [
    {
      key: "dsa",
      label: "DSA",
      slots: Array.isArray(log?.dsa_slots) ? log.dsa_slots : [],
    },
    {
      key: "backend",
      label: "Backend",
      slots: Array.isArray(log?.backend_slots) ? log.backend_slots : [],
    },
    ...(Array.isArray(log?.custom_tasks) ? log.custom_tasks : []).map(
      (task, index) => ({
        key: `custom:${task.id || index}`,
        label: task.name || "Custom activity",
        slots: Array.isArray(task.slots) ? task.slots : [],
      }),
    ),
  ];
}

export function validateDay(log) {
  const errors = [];
  const warnings = [];
  const activities = collectStudyActivities(log);
  let totalMinutes = 0;

  activities.forEach(({ label: activity, slots }) => {
    slots.forEach((slot, slotIndex) => {
      const start = toMinutes(slot?.start);
      const end = toMinutes(slot?.end);
      if (start === null || end === null) {
        if (slot?.start || slot?.end) {
          errors.push({
            code: "invalid-time",
            activity,
            slotIndex,
            message: `${activity} slot ${slotIndex + 1} needs valid start and end times.`,
          });
        }
        return;
      }
      if (slot?.endDayOffset === 1 && end === 0) {
        const duration = 1440 - start;
        totalMinutes += duration;
        if (duration > 8 * 60) {
          warnings.push({
            code: "long-slot",
            activity,
            slotIndex,
            message: `${activity} slot ${slotIndex + 1} is longer than 8 hours.`,
          });
        }
        return;
      }
      if (end <= start) {
        errors.push({
          code: "invalid-slot-order",
          activity,
          slotIndex,
          message: `${activity} slot ${slotIndex + 1} must end after it starts.`,
        });
        return;
      }
      const duration = end - start;
      totalMinutes += duration;
      if (duration > 8 * 60) {
        warnings.push({
          code: "long-slot",
          activity,
          slotIndex,
          message: `${activity} slot ${slotIndex + 1} is longer than 8 hours.`,
        });
      }
    });
  });

  const sleepStart = toMinutes(log?.sleep_time);
  const wakeEnd = toMinutes(log?.wake_time);
  const sleepSlots = [];
  if ((log?.sleep_time && !log?.wake_time) || (!log?.sleep_time && log?.wake_time)) {
    errors.push({
      code: "incomplete-sleep",
      message: "Enter both sleep and wake times.",
    });
  } else if (sleepStart !== null && wakeEnd !== null) {
    if (sleepStart === wakeEnd) {
      errors.push({ code: "invalid-sleep", message: "Sleep and wake times must differ." });
    } else {
      const sleep = { start: log.sleep_time, end: log.wake_time, wrap: true };
      sleepSlots.push(sleep);
      totalMinutes += slotMinutes(sleep, { wrap: true });
    }
  } else if (log?.sleep_time || log?.wake_time) {
    errors.push({
      code: "invalid-sleep",
      message: "Enter valid sleep and wake times.",
    });
  }

  if (totalMinutes > 24 * 60) {
    errors.push({
      code: "day-over-24-hours",
      message: "Study and sleep time cannot total more than 24 hours.",
    });
  }

  const overlapActivities = Object.fromEntries(
    activities.map(({ key, slots }) => [key, slots]),
  );
  const overlapLabels = new Map(
    activities.map(({ key, label }) => [key, label]),
  );
  if (sleepSlots.length) {
    overlapActivities.sleep = sleepSlots;
    overlapLabels.set("sleep", "Sleep");
  }
  findOverlaps(overlapActivities).forEach((overlap) => {
    const activityA = overlapLabels.get(overlap.activityA) || overlap.activityA;
    const activityB = overlapLabels.get(overlap.activityB) || overlap.activityB;
    warnings.push({
      code: "overlap",
      ...overlap,
      activityA,
      activityB,
      message: `${activityA} overlaps ${activityB}.`,
    });
  });

  return { errors, warnings, totalMinutes };
}
