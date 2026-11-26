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

export function mergeIntervals(intervals = []) {
  const sorted = intervals
    .map(([start, end]) => [Math.max(0, start), Math.min(1440, end)])
    .filter(([start, end]) => end > start)
    .sort(
      ([firstStart, firstEnd], [secondStart, secondEnd]) =>
        firstStart - secondStart || firstEnd - secondEnd,
    );
  const merged = [];
  for (const [start, end] of sorted) {
    const previous = merged[merged.length - 1];
    if (previous && start <= previous[1]) previous[1] = Math.max(previous[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

export function intervalMinutes(intervals = []) {
  return mergeIntervals(intervals).reduce((total, [start, end]) => total + end - start, 0);
}

function subtractIntervals(intervals, exclusions) {
  const excluded = mergeIntervals(exclusions);
  return mergeIntervals(intervals).flatMap(([start, end]) => {
    let remainingStart = start;
    const pieces = [];
    excluded.forEach(([excludedStart, excludedEnd]) => {
      if (excludedEnd <= remainingStart || excludedStart >= end) return;
      if (excludedStart > remainingStart) pieces.push([remainingStart, excludedStart]);
      remainingStart = Math.max(remainingStart, excludedEnd);
    });
    if (remainingStart < end) pieces.push([remainingStart, end]);
    return pieces;
  });
}

export function getSlotDurationMinutes(slot) {
  return intervalMinutes(intervalsFor(slot)) || null;
}

export function getSlotsDurationMinutes(slots = []) {
  return intervalMinutes(slots.flatMap((slot) => intervalsFor(slot)));
}

export function getSleepPeriods(log) {
  if (
    Array.isArray(log?.sleep_periods) &&
    (log.sleep_periods.length > 0 || (!log.sleep_time && !log.wake_time))
  ) {
    return log.sleep_periods;
  }
  if (!log?.sleep_time && !log?.wake_time) return [];
  return [
    {
      id: "legacy-sleep",
      start: String(log.sleep_time || "").slice(0, 5),
      end: String(log.wake_time || "").slice(0, 5),
    },
  ];
}

function sleepPeriodIntervals(period) {
  const start = toMinutes(period?.start);
  const end = toMinutes(period?.end);
  if (start === null || end === null || start === end) return [];
  if (start < end) return [[start, end]];
  return end > 0 ? [[0, end]] : [];
}

export function getSleepIntervals(log) {
  return mergeIntervals(getSleepPeriods(log).flatMap(sleepPeriodIntervals));
}

export function getSleepMinutes(log) {
  return intervalMinutes(subtractIntervals(getSleepIntervals(log), studyIntervals(log)));
}

function studyActivities(log) {
  const customTasks = Array.isArray(log?.custom_tasks) ? log.custom_tasks : [];
  return customTasks.map((task, index) => {
    const id = task?.id ?? index;
    return {
      id: task?.id ?? `custom-${index}`,
      key: `custom:${id}`,
      label: task?.name || "Custom activity",
      name: task?.name || "Custom activity",
      slots: Array.isArray(task?.slots) ? task.slots : [],
    };
  });
}

function studyIntervals(log) {
  return studyActivities(log).flatMap((activity) =>
    activity.slots.flatMap((slot) =>
      intervalsFor(slot),
    ),
  );
}

export function getStudyMinutes(log) {
  return intervalMinutes(studyIntervals(log));
}

export function getStudyActivityBreakdown(log) {
  const activities = studyActivities(log).map((activity) => ({
    ...activity,
    intervals: activity.slots.flatMap((slot) =>
      intervalsFor(slot),
    ),
    minutes: 0,
  }));
  const boundaries = [
    ...new Set(activities.flatMap((activity) => activity.intervals.flatMap((range) => range))),
  ].sort((first, second) => first - second);

  for (let index = 1; index < boundaries.length; index += 1) {
    const start = boundaries[index - 1];
    const end = boundaries[index];
    const owner = activities.find((activity) =>
      activity.intervals.some(([rangeStart, rangeEnd]) => rangeStart <= start && rangeEnd >= end),
    );
    if (owner) owner.minutes += end - start;
  }

  return activities.filter((activity) => activity.minutes > 0);
}

export function getUntrackedMinutes(log) {
  const logged = mergeIntervals([...studyIntervals(log), ...getSleepIntervals(log)]);
  return 1440 - intervalMinutes(logged);
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
  const cursor = new Date(startedAt);
  const end = new Date(endedAt);
  if (!Number.isFinite(cursor.getTime()) || !Number.isFinite(end.getTime())) return [];
  const roundToMinute = (date) => {
    const rounded = new Date(date);
    if (rounded.getSeconds() >= 30) rounded.setMinutes(rounded.getMinutes() + 1);
    rounded.setSeconds(0, 0);
    return rounded;
  };
  let roundedStart = roundToMinute(cursor);
  const roundedEnd = roundToMinute(end);
  if (roundedStart >= roundedEnd) return [];

  const segments = [];
  const dateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const time = (date) =>
    `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  while (roundedStart < roundedEnd) {
    const midnight = new Date(
      roundedStart.getFullYear(),
      roundedStart.getMonth(),
      roundedStart.getDate() + 1,
    );
    const segmentEnd = roundedEnd < midnight ? roundedEnd : midnight;
    const endAtMidnight = segmentEnd.getTime() === midnight.getTime();
    segments.push({
      date: dateKey(roundedStart),
      slot: {
        start: time(roundedStart),
        end: endAtMidnight ? "00:00" : time(segmentEnd),
        ...(endAtMidnight ? { endDayOffset: 1 } : {}),
      },
    });
    roundedStart = segmentEnd;
  }
  return segments;
}

export function intervalsFor(slot) {
  const start = toMinutes(slot?.start);
  const end = toMinutes(slot?.end);
  if (start === null || end === null) return [];
  if (start === end) {
    return slot?.endDayOffset === 1 && slot?.timerId ? [[0, 1440]] : [];
  }
  if (slot?.endDayOffset === 1) {
    if (end === 0) return [[start, 1440]];
    return mergeIntervals([
      [start, 1440],
      [0, end],
    ]);
  }
  if (end > start) return [[start, end]];
  return mergeIntervals([
    [start, 1440],
    [0, end],
  ]);
}

export function sleepIntervalsFor(sleepTime, wakeTime) {
  if (Array.isArray(sleepTime)) {
    return mergeIntervals(sleepTime.flatMap(sleepPeriodIntervals));
  }
  return mergeIntervals(sleepPeriodIntervals({ start: sleepTime, end: wakeTime }));
}

export function findOverlaps(slotsByActivity) {
  const slots = [];
  Object.entries(slotsByActivity || {}).forEach(([activity, entries]) => {
    (Array.isArray(entries) ? entries : []).forEach((slot, slotIndex) => {
      const intervals = intervalsFor(slot);
      if (intervals.length) slots.push({ activity, slot, slotIndex, intervals });
    });
  });

  const overlaps = [];
  for (let i = 0; i < slots.length; i += 1) {
    for (let j = i + 1; j < slots.length; j += 1) {
      const first = slots[i];
      const second = slots[j];
      const overlapRanges = first.intervals.flatMap(([firstStart, firstEnd]) =>
        second.intervals
          .map(([secondStart, secondEnd]) => [
            Math.max(firstStart, secondStart),
            Math.min(firstEnd, secondEnd),
          ])
          .filter(([start, end]) => start < end),
      );
      if (!overlapRanges.length) continue;

      overlaps.push({
        activityA: first.activity,
        slotA: first.slot,
        slotIndexA: first.slotIndex,
        activityB: second.activity,
        slotB: second.slot,
        slotIndexB: second.slotIndex,
        overlapRanges,
      });
    }
  }
  return overlaps;
}

function collectStudyActivities(log) {
  return studyActivities(log);
}

export function validateDay(log) {
  const errors = [];
  const warnings = [];
  const activities = collectStudyActivities(log);

  activities.forEach(({ key, id, label: activity, slots }) => {
    slots.forEach((slot, slotIndex) => {
      const start = toMinutes(slot?.start);
      const end = toMinutes(slot?.end);
      if (start === null || end === null) {
        if (slot?.start || slot?.end) {
          errors.push({
            code: "invalid-time",
            activity,
            activityKey: key,
            activityId: id,
            slotIndex,
            message: `Enter a valid start and end time for ${activity} slot ${slotIndex + 1}.`,
          });
        }
        return;
      }

      const timerFullDay = start === end && slot?.endDayOffset === 1 && Boolean(slot?.timerId);
      if (
        (end === start && !timerFullDay)
      ) {
        errors.push({
          code: "invalid-slot-order",
          activity,
          activityKey: key,
          activityId: id,
          slotIndex,
          message: `${activity} slot ${slotIndex + 1} must end after it starts.`,
        });
      }
    });
  });

  const sleepPeriods = getSleepPeriods(log);
  const sleepSlots = [];
  sleepPeriods.forEach((period, index) => {
    const hasStart = Boolean(period?.start);
    const hasEnd = Boolean(period?.end);
    if (!hasStart && !hasEnd) return;
    const start = toMinutes(period?.start);
    const end = toMinutes(period?.end);
    if (!hasStart || !hasEnd) {
      errors.push({
        code: "incomplete-sleep",
        activityKey: "sleep",
        slotIndex: index,
        message: "Enter both sleep and wake times for each sleep period.",
      });
      return;
    }
    if (start === null || end === null || start === end) {
      errors.push({
        code: "invalid-sleep",
        activityKey: "sleep",
        slotIndex: index,
        message: "Enter valid sleep and wake times that differ.",
      });
      return;
    }
    sleepSlots.push({
      start: start < end ? period.start : "00:00",
      end: period.end,
      sleepPeriodIndex: index,
    });
  });

  const overlapActivities = Object.fromEntries(activities.map(({ key, slots }) => [key, slots]));
  const overlapLabels = new Map(activities.map(({ key, label }) => [key, label]));
  if (sleepSlots.length) {
    overlapActivities.sleep = sleepSlots;
    overlapLabels.set("sleep", "Sleep");
  }
  findOverlaps(overlapActivities).forEach((overlap) => {
    const activityA = overlapLabels.get(overlap.activityA) || overlap.activityA;
    const activityB = overlapLabels.get(overlap.activityB) || overlap.activityB;
    const slotLabel = (activity, slotIndex) => `${activity} slot ${slotIndex + 1}`;
    warnings.push({
      code: "overlap",
      ...overlap,
      activityKeyA: overlap.activityA,
      activityKeyB: overlap.activityB,
      activityA,
      activityB,
      slots: [
        {
          activityKey: overlap.activityA,
          activity: activityA,
          slotIndex: overlap.slotIndexA,
        },
        {
          activityKey: overlap.activityB,
          activity: activityB,
          slotIndex: overlap.slotIndexB,
        },
      ],
      message: `${slotLabel(activityA, overlap.slotIndexA)} overlaps ${slotLabel(activityB, overlap.slotIndexB)}.`,
    });
  });

  const allLoggedIntervals = [...studyIntervals(log), ...getSleepIntervals(log)];
  return { errors, warnings, totalMinutes: intervalMinutes(allLoggedIntervals) };
}
