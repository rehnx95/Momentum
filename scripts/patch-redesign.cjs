/*
 * Momentum redesign patch: Daily Log
 *
 * Usage (from the repo root):
 *   node scripts/patch-redesign.cjs               apply the Daily Log restyle
 *   node scripts/patch-redesign.cjs --sleep-overlap   also change sleep overlap checking
 *   node scripts/patch-redesign.cjs --dry-run     show what would change, write nothing
 *
 * What it does
 *   1. Adds src/features/daily-log/components/DailyLogRedesign.css and imports
 *      it from DailyTracker.jsx, after DailyTracker.css so it wins the cascade.
 *      Styling only: "From sheet" and "N slots" become plain muted text, the
 *      "+" and trash buttons sit together at the right of each activity, and
 *      slot rows get a hover state and always-visible remove buttons.
 *   2. ActivityCard.jsx: show the slot count on every activity ("1 slot",
 *      "2 slots"), not only when there is more than one.
 *   3. (--sleep-overlap only) shared/utils/time.js: a sleep that wraps past
 *      midnight (for example 21:49 to 07:19) is checked against the day only
 *      for the part after midnight (00:00 to wake time). The evening part
 *      belongs to the previous night, so it no longer flags evening slots as
 *      "overlaps Sleep". Total sleep minutes are unchanged.
 *
 * Like the other patch scripts here, it is safe to run twice and it writes
 * nothing if any anchor is missing. Commit or stash first so you can review
 * with git diff.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const withSleepOverlap = args.has("--sleep-overlap");

const dailyDir = path.join(root, "src", "features", "daily-log", "components");
const files = {
  tracker: path.join(dailyDir, "DailyTracker.jsx"),
  card: path.join(dailyDir, "ActivityCard.jsx"),
  css: path.join(dailyDir, "DailyLogRedesign.css"),
  time: path.join(root, "src", "shared", "utils", "time.js"),
};

function fail(msg) {
  console.error("\nPatch aborted, nothing was written:\n  " + msg);
  process.exit(1);
}

function read(file) {
  if (!fs.existsSync(file)) fail("Missing file: " + path.relative(root, file));
  return fs.readFileSync(file, "utf8");
}

const css = `/* Daily Log redesign. Added by scripts/patch-redesign.cjs.
   Scoped to .daily-tracker so it overrides DailyTracker.css without !important. */

/* Heading: name, meta, then the action buttons grouped at the right. */
.daily-tracker .activity-card-identity {
  flex-wrap: nowrap;
  gap: 0.5rem;
}

.daily-tracker .activity-card-inline-controls {
  order: 99;
  margin-left: auto;
  gap: 0.2rem;
}

.daily-tracker .activity-card-inline-controls .activity-add-slot,
.daily-tracker .activity-card-inline-controls .activity-delete {
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 0.5rem;
  opacity: 1;
}

/* "From sheet" and "N slots": plain muted text instead of pills. */
.daily-tracker .activity-from-sheet,
.daily-tracker .activity-slot-count {
  margin: 0;
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 400;
  white-space: nowrap;
}

.daily-tracker .activity-from-sheet::before,
.daily-tracker .activity-slot-count::before {
  content: "\\00b7";
  margin-right: 0.5rem;
}

/* Slot rows. */
.daily-tracker .daily-slot-row {
  border-radius: 0.5rem;
  transition: background-color 120ms ease;
}

.daily-tracker .daily-slot-row:hover,
.daily-tracker .daily-slot-row:focus-within {
  background: var(--surface-hover);
}

.daily-tracker .daily-slot-row .slot-remove {
  opacity: 1;
}

.daily-tracker .slot-remove:hover,
.daily-tracker .activity-delete:hover:not(:disabled) {
  color: var(--danger);
}

/* Warnings read as warnings. */
.daily-tracker .daily-warnings {
  color: var(--warning);
}
`;

// ---- Collect all edits first, so nothing is written unless all of them apply.
const edits = [];

// 1. CSS file + import
const tracker = read(files.tracker);
if (!tracker.includes("DailyLogRedesign.css")) {
  const importRe = /import\s+["']\.\/DailyTracker\.css["'];?/;
  if (!importRe.test(tracker))
    fail("Could not find the DailyTracker.css import in DailyTracker.jsx.");
  edits.push({
    file: files.tracker,
    text: tracker.replace(importRe, (m) => m + '\nimport "./DailyLogRedesign.css";'),
    note: "DailyTracker.jsx: import DailyLogRedesign.css",
  });
}
if (!fs.existsSync(files.css) || fs.readFileSync(files.css, "utf8") !== css) {
  edits.push({ file: files.css, text: css, note: "DailyLogRedesign.css: write styles" });
}

// 2. Slot count on every activity
const card = read(files.card);
if (!card.includes("slots.length === 1 ?")) {
  const countRe =
    /\{slots\.length > 1 && \(\s*<span className="activity-slot-count">\{slots\.length\} slots<\/span>\s*\)\}/;
  if (!countRe.test(card)) fail("Could not find the slot-count badge in ActivityCard.jsx.");
  edits.push({
    file: files.card,
    text: card.replace(
      countRe,
      `{slots.length > 0 && (
            <span className="activity-slot-count">
              {slots.length} {slots.length === 1 ? "slot" : "slots"}
            </span>
          )}`,
    ),
    note: 'ActivityCard.jsx: show "1 slot" as well as "N slots"',
  });
}

// 3. Optional: sleep overlap check
if (withSleepOverlap) {
  const time = read(files.time);
  if (!time.includes("sleepStart < wakeEnd ?")) {
    const sleepRe = /sleepSlots\.push\(sleep\);/;
    if (!sleepRe.test(time)) fail("Could not find sleepSlots.push(sleep) in time.js.");
    edits.push({
      file: files.time,
      text: time.replace(
        sleepRe,
        `// A sleep that wraps past midnight belongs to the previous night; only the
      // part after midnight (00:00 to wake time) can clash with today's slots.
      sleepSlots.push(
        sleepStart < wakeEnd ? sleep : { start: "00:00", end: log.wake_time },
      );`,
      ),
      note: "time.js: check only the after-midnight part of a wrapping sleep",
    });
  }
}

if (edits.length === 0) {
  console.log("Already patched.");
  process.exit(0);
}

for (const edit of edits) {
  console.log((dryRun ? "Would change: " : "Changed: ") + edit.note);
  if (!dryRun) fs.writeFileSync(edit.file, edit.text);
}
console.log(
  dryRun
    ? "\nDry run only, nothing written."
    : "\nDone. Review with git diff, then run npm test and npm run build.",
);
if (!withSleepOverlap) {
  console.log('Tip: add --sleep-overlap to also fix the false "overlaps Sleep" warnings.');
}
