function normalizeActivityName(name) {
  const normalized = String(name || "Activity")
    .trim()
    .toLowerCase();
  return normalized === "dsa" ? "dsa sheet" : normalized;
}

function hashName(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const COLOR_VARIABLES = [
  "--daily-task-1",
  "--daily-task-2",
  "--daily-task-3",
  "--daily-task-4",
  "--daily-task-5",
  "--daily-activity-black",
  "--daily-activity-white",
];

const KNOWN_ACTIVITY_COLORS = {
  "dsa sheet": 0,
  reading: 1,
  project: 2,
  "system design": 3,
  exercise: 4,
  writing: 5,
  planning: 6,
  sleep: 4,
};

export function getActivityColor(name) {
  const normalized = normalizeActivityName(name);
  const index = KNOWN_ACTIVITY_COLORS[normalized] ?? hashName(normalized) % COLOR_VARIABLES.length;
  return `var(${COLOR_VARIABLES[index]})`;
}
