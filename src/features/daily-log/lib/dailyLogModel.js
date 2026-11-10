const TIMER_STORAGE = (userId) => `track-sheet-running-timer:${userId}`;

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
    dsa_slots: [],
    backend_slots: [],
    custom_tasks: [],
  };
}

export function normalizeLog(data, date) {
  const row = data || emptyLog(date);
  const savedTasks = Array.isArray(row.custom_tasks) ? row.custom_tasks : [];
  return {
    ...emptyLog(date),
    ...row,
    sleep_time: formatTime(row.sleep_time),
    wake_time: formatTime(row.wake_time),
    dsa_slots: [],
    backend_slots: [],
    dsa_hours: null,
    backend_hours: null,
    custom_tasks: savedTasks.map((task) => ({
      ...task,
      slots: normalizeSlots(task.slots),
    })),
  };
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
