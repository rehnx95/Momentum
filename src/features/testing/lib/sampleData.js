const DAILY_LOG_START = "2025-01-01";

const ACTIVITY_TEMPLATES = [
  { id: "sample-dsa", name: "DSA" },
  { id: "sample-backend", name: "Backend" },
  { id: "sample-design", name: "System Design" },
  { id: "sample-project", name: "Project" },
  { id: "sample-reading", name: "Reading" },
];

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed) {
  let state = hashString(seed);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

function dateFromKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function dateKeyFromDate(date) {
  return date.toISOString().slice(0, 10);
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateKey, amount) {
  const date = dateFromKey(dateKey);
  date.setUTCDate(date.getUTCDate() + amount);
  return dateKeyFromDate(date);
}

function dateKeysBetween(start, end) {
  const dates = [];
  for (let current = start; current <= end; current = addDays(current, 1)) {
    dates.push(current);
  }
  return dates;
}

function formatTime(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = String(Math.floor(normalized / 60)).padStart(2, "0");
  const minutes = String(normalized % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function shuffle(items, random) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function buildDailyLogs(userId, today) {
  return dateKeysBetween(DAILY_LOG_START, today).map((date) => {
    const random = createRandom(`${userId}:daily-log:${date}`);
    const weekday = dateFromKey(date).getUTCDay();
    const weekendAdjustment = weekday === 0 || weekday === 6 ? 10 : 0;
    const untrackedMinutes = randomInt(random, 180, 290) + weekendAdjustment;
    const wakeTime = randomInt(random, 6 * 60, 7 * 60 + 45);
    const sleepDuration = randomInt(random, 7 * 60 + 30, 8 * 60 + 30);
    const sleepStart = wakeTime - sleepDuration + 24 * 60;
    const firstActivityDelay = randomInt(random, 5, 15);
    const studyMinutes = 1440 - wakeTime - untrackedMinutes;
    const sessionCount = Math.max(15, Math.min(20, Math.round(studyMinutes / 45)));
    let slotStart = wakeTime + firstActivityDelay;
    let remainingMinutes = studyMinutes;
    let remainingIdleMinutes = untrackedMinutes - firstActivityDelay;
    const customTasks = ACTIVITY_TEMPLATES.map((activity) => ({
      id: activity.id,
      name: activity.name,
      slots: [],
    }));

    for (let index = 0; index < sessionCount; index += 1) {
      const sessionsRemaining = sessionCount - index - 1;
      const minimumDuration = Math.max(20, remainingMinutes - sessionsRemaining * 100);
      const maximumDuration = Math.min(100, remainingMinutes - sessionsRemaining * 20);
      const duration = randomInt(random, minimumDuration, maximumDuration);
      const activity = customTasks[randomInt(random, 0, customTasks.length - 1)];
      activity.slots.push({
        start: formatTime(slotStart),
        end: formatTime(slotStart + duration),
      });
      remainingMinutes -= duration;
      slotStart += duration;
      const gapsRemaining = sessionCount - index;
      const maximumGap = Math.min(12, remainingIdleMinutes - gapsRemaining + 1);
      const gapMinutes = randomInt(random, 1, maximumGap);
      slotStart += gapMinutes;
      remainingIdleMinutes -= gapMinutes;
    }

    return {
      user_id: userId,
      date,
      sleep_time: formatTime(sleepStart),
      wake_time: formatTime(wakeTime),
      sleep_periods: [
        {
          id: "sleep-1",
          start: formatTime(sleepStart),
          end: formatTime(wakeTime),
        },
      ],
      custom_tasks: customTasks,
    };
  });
}

function listProblems(sheets) {
  const problemsById = new Map();
  for (const sheet of sheets) {
    if (!sheet?.id || !Array.isArray(sheet.sheet?.steps)) continue;
    for (const step of sheet.sheet.steps) {
      for (const subsection of step.subsections || []) {
        for (const problem of subsection.problems || []) {
          if (problem?.id === undefined || problem?.id === null) continue;
          const id = `${sheet.id}::${problem.id}`;
          problemsById.set(id, id);
        }
      }
    }
  }
  return [...problemsById.keys()];
}

function activeDates(start, end, random) {
  return dateKeysBetween(start, end).filter((date) => {
    const weekday = dateFromKey(date).getUTCDay();
    const activityChance = [0.48, 0.78, 0.82, 0.8, 0.83, 0.74, 0.52][weekday];
    return random() < activityChance;
  });
}

function buildProgress(userId, problemIds, today) {
  const random = createRandom(`${userId}:problem-progress`);
  const shuffled = shuffle(problemIds, random);
  const total = shuffled.length;
  const solvedCount = Math.min(total, Math.max(1, Math.round(total * 0.78)));
  const skippedCount = Math.min(total - solvedCount, Math.round(total * 0.1));
  const currentYear = Number(today.slice(0, 4));
  const solveDatesByYear = new Map();

  if (currentYear > 2025) {
    solveDatesByYear.set(2025, activeDates("2025-01-01", "2025-12-31", random));
  }
  solveDatesByYear.set(currentYear, activeDates(`${currentYear}-01-01`, today, random));

  const solvedIn2025 =
    currentYear > 2025 && solvedCount > 1
      ? Math.min(solvedCount - 1, Math.max(1, Math.round(solvedCount * 0.45)))
      : 0;
  const activityCounts = new Map();
  const progress = shuffled.slice(0, solvedCount).map((problemId, index) => {
    const year = index < solvedIn2025 ? 2025 : currentYear;
    const dates = solveDatesByYear.get(year);
    const completedOn = dates?.length ? dates[Math.floor(random() * dates.length)] : today;
    const hour = String(randomInt(random, 8, 22)).padStart(2, "0");
    const minute = String(randomInt(random, 0, 59)).padStart(2, "0");
    activityCounts.set(completedOn, (activityCounts.get(completedOn) || 0) + 1);

    return {
      user_id: userId,
      problem_id: problemId,
      state: "done",
      completed_on: completedOn,
      updated_at: `${completedOn}T${hour}:${minute}:00.000Z`,
    };
  });

  for (const problemId of shuffled.slice(solvedCount, solvedCount + skippedCount)) {
    progress.push({
      user_id: userId,
      problem_id: problemId,
      state: "skipped",
      completed_on: null,
      updated_at: `${today}T12:00:00.000Z`,
    });
  }

  const activityLog = [...activityCounts.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([date, count]) => ({ user_id: userId, date, count }));

  return { progress, activityLog };
}

export function buildSampleData({ userId, sheets, today }) {
  if (!userId) throw new Error("A signed-in test user is required.");
  if (!Array.isArray(sheets)) {
    throw new Error("Learning tracks have not loaded. Open Tracker and try again.");
  }

  const todayKey = today || localDateKey(new Date());
  const problemIds = listProblems(sheets);
  if (!problemIds.length) {
    throw new Error("No track problems were found. Open Tracker and try again.");
  }

  const { progress, activityLog } = buildProgress(userId, problemIds, todayKey);
  const dailyLogs = buildDailyLogs(userId, todayKey);
  return {
    dailyLogs,
    progress,
    activityLog,
    summary: {
      dailyLogDays: dailyLogs.length,
      solvedProblems: progress.filter((item) => item.state === "done").length,
      skippedProblems: progress.filter((item) => item.state === "skipped").length,
      activeSolveDays: activityLog.length,
    },
  };
}
