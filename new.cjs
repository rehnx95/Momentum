const fs = require("fs");
const path = require("path");

// new.cjs sits in the project root, so no ".." here.
const file = path.join(__dirname, "src/features/dashboard/TrackerDashboard.jsx");
let src = fs.readFileSync(file, "utf8");

const before =
  'className="flex w-full flex-1 flex-col items-center justify-center gap-0.5 rounded-lg bg-[var(--surface-hover)] text-center leading-tight"';
const after =
  'className="flex w-full flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--page)] text-center leading-tight"';

if (src.includes(after)) {
  console.log("Already applied.");
} else if (!src.includes(before)) {
  console.error("Target class string not found. The file may have changed.");
  process.exit(1);
} else {
  src = src.replace(before, after);
  fs.writeFileSync(file, src, "utf8");
  console.log("Easy / Medium / Hard boxes updated.");
}