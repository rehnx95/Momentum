const DAY = 86400000;
const pad = (n) => String(n).padStart(2, '0');

export const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);

export function getLevel(count) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function formatTooltipDate(date, currentYear) {
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const base = `${month} ${ordinal(date.getDate())}`;
  return date.getFullYear() === currentYear ? base : `${base}, ${date.getFullYear()}`;
}

// year = null -> rolling last year ending today. year = 2025 -> Jan 1 to Dec 31 of 2025.
// The grid always starts on a Sunday, like GitHub.
export function buildHeatmap({
  activity = {},
  todayKey,
  year = null,
  levelFn = getLevel,
}) {
  const today = fromKey(todayKey);
  let start;
  let end;
  if (year == null) {
    end = today;
    start = addDays(today, -364);
  } else {
    start = new Date(year, 0, 1);
    end = new Date(year, 11, 31);
  }

  const gridStart = addDays(start, -start.getDay());
  const columns = Math.floor(Math.round((end - gridStart) / DAY) / 7) + 1;
  const visibleFrom = start;

  const weeks = [];
  let total = 0;
  let activeDays = 0;
  for (let c = 0; c < columns; c++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(gridStart, c * 7 + d);
      const inRange = date >= visibleFrom && date <= end;
      const key = toKey(date);
      const count = inRange ? Number(activity[key] || 0) : 0;
      if (count > 0) {
        total += count;
        activeDays += 1;
      }
      week.push({ date, key, count, inRange, future: date > today, level: levelFn(count) });
    }
    weeks.push(week);
  }

  const monthName = (d) => d.toLocaleDateString(undefined, { month: 'short' });
  const labels = new Array(columns).fill('');
  weeks.forEach((week, c) => {
    const first = week.find((x) => x.inRange && x.date.getDate() === 1);
    if (first) labels[c] = monthName(first.date);
  });
  const firstLabeled = labels.findIndex(Boolean);
  if (!labels[0] && (firstLabeled === -1 || firstLabeled >= 2)) {
    const firstVisible = weeks[0].find((x) => x.inRange);
    if (firstVisible) labels[0] = monthName(firstVisible.date);
  }

  return { weeks, labels, columns, total, activeDays };
}