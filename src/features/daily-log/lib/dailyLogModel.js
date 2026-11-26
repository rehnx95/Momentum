const TIMER_STORAGE = (userId) => `momentum:running-timer:${userId}`;
const DRAFT_STORAGE = (userId, date) => `momentum:daily-log-draft:${userId}:${date}`;
const VIEW_MODE_STORAGE = (userId) => `momentum:daily-log-view:${userId}`;
const DAILY_LOG_VIEW_MODES = new Set(["daily", "full", "trends"]);

export function getDailyLogViewMode(userId) {
  try {
    const storedMode = localStorage.getItem(VIEW_MODE_STORAGE(userId));
    return DAILY_LOG_VIEW_MODES.has(storedMode) ? storedMode : "daily";
  } catch (error) {
    console.warn("Could not read the Daily Log view preference:", error);
    return "daily";
  }
}

export function setDailyLogViewMode(userId, mode) {
  if (!DAILY_LOG_VIEW_MODES.has(mode)) return false;
  try {
    localStorage.setItem(VIEW_MODE_STORAGE(userId), mode);
    return true;
  } catch (error) {
    console.warn("Could not save the Daily Log view preference:", error);
    return false;
  }
}

export function formatTime(value) {
  return value ? String(value).slice(0, 5) : "";
}

function normalizeSlots(slots) {
  if (!Array.isArray(slots)) return [];
  return slots.map((slot) => ({
    ...slot,
    start: formatTime(slot.start),
    end: formatTime(slot.end),
  }));
}

export function emptyLog(date) {
  return {
    date,
    sleep_time: "",
    wake_time: "",
    sleep_periods: [],
    custom_tasks: [],
  };
}

export function normalizeLog(data, date) {
  const row = data || emptyLog(date);
  const savedTasks = Array.isArray(row.custom_tasks) ? row.custom_tasks : [];
  const savedSleepPeriods =
    Array.isArray(row.sleep_periods) &&
    (row.sleep_periods.length > 0 || (!row.sleep_time && !row.wake_time))
      ? row.sleep_periods
      : row.sleep_time || row.wake_time
        ? [
            {
              id: "legacy-sleep",
              start: formatTime(row.sleep_time),
              end: formatTime(row.wake_time),
            },
          ]
        : [];
  const sleepPeriods = savedSleepPeriods.map((period, index) => ({
    ...period,
    id: period.id ?? `sleep-${index}`,
    start: formatTime(period.start),
    end: formatTime(period.end),
  }));
  const firstSleepPeriod = sleepPeriods[0];
  return {
    ...emptyLog(date),
    ...row,
    sleep_periods: sleepPeriods,
    sleep_time: firstSleepPeriod?.start || "",
    wake_time: firstSleepPeriod?.end || "",
    custom_tasks: savedTasks.map((task) => ({
      ...task,
      slots: normalizeSlots(task.slots),
    })),
  };
}

export function getDailyLogDraft(userId, date) {
  try {
    const stored = localStorage.getItem(DRAFT_STORAGE(userId, date));
    if (!stored) return null;
    const draft = JSON.parse(stored);
    if (!draft || draft.date !== date || !Array.isArray(draft.custom_tasks)) return null;
    return normalizeLog(draft, date);
  } catch (error) {
    console.warn("Could not read the Daily Log draft:", error);
    return null;
  }
}

export function setDailyLogDraft(userId, date, draft) {
  try {
    localStorage.setItem(DRAFT_STORAGE(userId, date), JSON.stringify(draft));
    return true;
  } catch (error) {
    console.warn("Could not save the Daily Log draft:", error);
    return false;
  }
}

export function removeDailyLogDraft(userId, date) {
  try {
    localStorage.removeItem(DRAFT_STORAGE(userId, date));
  } catch (error) {
    console.warn("Could not remove the Daily Log draft:", error);
  }
}

export function timerStorageGet(userId) {
  try {
    const value = localStorage.getItem(TIMER_STORAGE(userId));
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error("Could not read the running timer:", error);
    return null;
  }
}

export function timerStorageKey(userId) {
  return TIMER_STORAGE(userId);
}
