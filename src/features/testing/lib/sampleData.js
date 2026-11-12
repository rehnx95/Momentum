const DAILY_LOG_DAYS = 365;

const ACTIVITY_TEMPLATES = [
  { id: "sample-dsa", name: "DSA", chance: 0.78, start: 465, maxDuration: 125 },
  { id: "sample-backend", name: "Backend", chance: 0.72, start: 650, maxDuration: 125 },
  { id: "sample-design", name: "System Design", chance: 0.54, start: 850, maxDuration: 110 },
  { id: "sample-project", name: "Project", chance: 0.5, start: 1050, maxDuration: 145 },
  { id: "sample-reading", name: "Reading", chance: 0.38, start: 1230, maxDuration: 100 },
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
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

function buildDailyLogs(userId, today) {
  const random = createRandom(`${userId}:daily-log`);
  const start = addDays(today, -(DAILY_LOG_DAYS - 1));

  return dateKeysBetween(start, today).flatMap((date) => {
    const weekday = dateFromKey(date).getUTCDay();
    const dayChance = [0.56, 0.84, 0.82, 0.85, 0.8, 0.76, 0.62][weekday];
    if (random() >= dayChance) return [];

    const activities = ACTIVITY_TEMPLATES.filter(
      (activity) => random() < activity.chance,
    );
    while (activities.length < 2) {
      const activity = ACTIVITY_TEMPLATES[randomInt(
        random,
        0,
        ACTIVITY_TEMPLATES.length - 1,
      )];
      if (!activities.some((selected) => selected.id === activity.id)) {
        activities.push(activity);
      }
    }

    const sleepStart = randomInt(random, 21 * 60, 23 * 60 + 45);
    const wakeTime = randomInt(random, 6 * 60, 8 * 60 + 45);
    return [{
      user_id: userId,
      date,
      sleep_time: random() < 0.05 ? null : formatTime(sleepStart),
      wake_time: random() < 0.05 ? null : formatTime(wakeTime),
      dsa_slots: [],
      backend_slots: [],
      custom_tasks: activities.map((activity) => {
        const startTime = activity.start + randomInt(random, -10, 10);
        const duration = randomInt(random, 35, activity.maxDuration);
        return {
          id: activity.id,
          name: activity.name,
          slots: [{
            start: formatTime(startTime),
            end: formatTime(startTime + duration),
          }],
        };
      }),
    }];
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
  const skippedCount = Math.min(
    total - solvedCount,
    Math.round(total * 0.1),
  );
  const currentYear = Number(today.slice(0, 4));
  const solveDatesByYear = new Map();

  if (currentYear > 2025) {
    solveDatesByYear.set(
      2025,
      activeDates("2025-01-01", "2025-12-31", random),
    );
  }
  solveDatesByYear.set(
    currentYear,
    activeDates(`${currentYear}-01-01`, today, random),
  );

  const solvedIn2025 =
    currentYear > 2025 && solvedCount > 1
      ? Math.min(solvedCount - 1, Math.max(1, Math.round(solvedCount * 0.45)))
      : 0;
  const activityCounts = new Map();
  const progress = shuffled.slice(0, solvedCount).map((problemId, index) => {
    const year = index < solvedIn2025 ? 2025 : currentYear;
    const dates = solveDatesByYear.get(year);
    const completedOn = dates?.length
      ? dates[Math.floor(random() * dates.length)]
      : today;
    const hour = String(randomInt(random, 8, 22)).padStart(2, "0");
    const minute = String(randomInt(random, 0, 59)).padStart(2, "0");
    activityCounts.set(
      completedOn,
      (activityCounts.get(completedOn) || 0) + 1,
    );

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
