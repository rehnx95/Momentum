const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const cssPath = path.join(root, "src", "index.css");
const appPath = path.join(root, "src", "App.jsx");
let css = fs.readFileSync(cssPath, "utf8").replace(/\r\n/g, "\n");
let app = fs.readFileSync(appPath, "utf8");

if (css.includes("/* ===== Light theme ===== */")) {
  console.log("Already patched.");
  process.exit(0);
}

// 1. Heatmap variables in dark :root
css = css.replace(
  "--font-sans: 'Geist', system-ui, sans-serif;\n}",
  `--font-sans: 'Geist', system-ui, sans-serif;
  --heat-0: #171717;
  --heat-1: #0e4429;
  --heat-2: #006d32;
  --heat-3: #26a641;
  --heat-4: #39d353;
}`,
);

// 2. New light variable block (first light block in file)
const lightVars = `:root[data-theme="light"] {
  color-scheme: light;
  --page: #f5f5f5;
  --surface: #ffffff;
  --surface-raised: #fafafa;
  --surface-hover: #f0f0f0;
  --border: #e5e5e5;
  --border-strong: #cfcfcf;
  --text: #171717;
  --muted: #5f5f5f;
  --page-overlay: rgba(245, 245, 245, 0.92);
  --shadow: rgba(0, 0, 0, 0.08);
  --accent: #171717;
  --accent-hover: #000000;
  --positive: #2f8a43;
  --warning: #b45309;
  --heat-0: #ebedf0;
  --heat-1: #9be9a8;
  --heat-2: #40c463;
  --heat-3: #30a14e;
  --heat-4: #216e39;
}`;
css = css.replace(/:root\[data-theme="light"\] \{[\s\S]*?\n\}/, lightVars);

// 3. Replace legacy light overrides
const legacyStart = css.indexOf(':root[data-theme="light"] [class*="bg-[#0B0B0F]"]');
const legacyEnd = css.indexOf("\n.auth-shell {", legacyStart);
if (legacyStart === -1 || legacyEnd === -1) {
  console.error("Could not find the legacy light block. Nothing written.");
  process.exit(1);
}

const newBlock = String.raw`/* ===== Light theme ===== */
:root[data-theme="light"] .bg-\[\#000000\] { background-color: var(--page); }
:root[data-theme="light"] .bg-\[\#000000\]\/80 { background-color: var(--page-overlay); }
:root[data-theme="light"] .bg-\[\#0A0A0A\] { background-color: var(--surface); }
:root[data-theme="light"] .bg-\[\#0A0A0A\]\/40,
:root[data-theme="light"] .bg-\[\#1F1F1F\] { background-color: var(--surface-hover); }
:root[data-theme="light"] .bg-\[\#262626\],
:root[data-theme="light"] .bg-zinc-800 { background-color: var(--border); }
:root[data-theme="light"] .bg-\[\#EDEDED\] { background-color: var(--accent); }
:root[data-theme="light"] .bg-zinc-300 { background-color: #a3a3a3; }

:root[data-theme="light"] .hover\:bg-\[\#1F1F1F\]:hover,
:root[data-theme="light"] .hover\:bg-\[\#262626\]:hover { background-color: var(--surface-hover); }
:root[data-theme="light"] .hover\:bg-white:hover { background-color: var(--accent-hover); }

:root[data-theme="light"] .text-\[\#EDEDED\],
:root[data-theme="light"] :is(div, span, p, h1, h2, h3, button, a).text-white,
:root[data-theme="light"] .hover\:text-white:hover,
:root[data-theme="light"] .hover\:text-\[\#EDEDED\]:hover { color: var(--text); }
:root[data-theme="light"] .text-\[\#A1A1A1\],
:root[data-theme="light"] .text-\[\#858585\],
:root[data-theme="light"] .text-zinc-400,
:root[data-theme="light"] .text-zinc-500 { color: var(--muted); }
:root[data-theme="light"] .text-black { color: #ffffff; }
:root[data-theme="light"] .text-red-300,
:root[data-theme="light"] .text-red-400 { color: #b91c1c; }
:root[data-theme="light"] .text-green-300,
:root[data-theme="light"] .text-green-400 { color: #15803d; }
:root[data-theme="light"] .text-violet-300 { color: #6d28d9; }
:root[data-theme="light"] .text-\[\#46A758\] { color: var(--positive); }
:root[data-theme="light"] .text-\[\#F5A623\] { color: var(--warning); }

:root[data-theme="light"] .border-\[\#262626\],
:root[data-theme="light"] .border-zinc-800\/50 { border-color: var(--border); }
:root[data-theme="light"] .divide-\[\#262626\] > :not([hidden]) ~ :not([hidden]) { border-color: var(--border); }
:root[data-theme="light"] .border-\[\#383838\],
:root[data-theme="light"] .border-\[\#EDEDED\]\/60 { border-color: var(--border-strong); }
:root[data-theme="light"] .border-white\/\[0\.04\],
:root[data-theme="light"] .border-white\/5 { border-color: rgba(0, 0, 0, 0.06); }
:root[data-theme="light"] .hover\:border-\[\#EDEDED\]:hover,
:root[data-theme="light"] .focus\:border-\[\#EDEDED\]:focus { border-color: var(--text); }
:root[data-theme="light"] .focus\:ring-\[\#EDEDED\]:focus { --tw-ring-color: var(--text); }
:root[data-theme="light"] .disabled\:bg-\[\#262626\]:disabled { background-color: var(--border); }

:root[data-theme="light"] .section-kicker,
:root[data-theme="light"] .auth-showcase-eyebrow,
:root[data-theme="light"] .auth-showcase-copy h1 span { color: var(--muted); }
:root[data-theme="light"] .auth-preview-icon { color: var(--muted); }
:root[data-theme="light"] .dashboard-header { box-shadow: 0 1px 0 var(--border); }
:root[data-theme="light"] .dashboard-header .profile-trigger {
  border-color: var(--border-strong);
  background: var(--surface);
  color: var(--text);
}
:root[data-theme="light"] .dashboard-header .profile-trigger:hover {
  background: var(--surface-hover);
  color: var(--text);
}
:root[data-theme="light"] .dashboard-header .profile-trigger svg { color: var(--text); }
:root[data-theme="light"] .sheet-nav-item[aria-current="page"] { color: var(--text); }
:root[data-theme="light"] .dashboard-content .tracker-toolbar button[aria-pressed="true"] { color: #ffffff; }
:root[data-theme="light"] .google-signin-button,
:root[data-theme="light"] .auth-panel h2 { color: var(--text); }
:root[data-theme="light"] .google-signin-button:hover:not(:disabled) { border-color: #a3a3a3; }
:root[data-theme="light"] .settings-form button[type="submit"],
:root[data-theme="light"] .settings-form button[type="submit"]:hover { color: #ffffff; }
:root[data-theme="light"] .recent-ac-check { color: #17834c; }
:root[data-theme="light"] .activity-day { border-color: rgba(0, 0, 0, 0.06) !important; }
:root[data-theme="light"] ::-webkit-scrollbar-thumb,
:root[data-theme="light"] .activity-scroll::-webkit-scrollbar-thumb { background: #c4c6cf; }
:root[data-theme="light"] ::-webkit-scrollbar-thumb:hover { background: #a8aab5; }
`;
css = css.slice(0, legacyStart) + newBlock + css.slice(legacyEnd);

// 4. Theme-aware heatmap colors in App.jsx
const heat = /"#171717",\s*"#0e4429",\s*"#006d32",\s*"#26a641",\s*"#39d353"/g;
const count = (app.match(heat) || []).length;
app = app.replace(
  heat,
  '"var(--heat-0)", "var(--heat-1)", "var(--heat-2)", "var(--heat-3)", "var(--heat-4)"',
);

fs.writeFileSync(cssPath, css);
fs.writeFileSync(appPath, app);
console.log(`Done. Heatmap arrays updated: ${count} (expected 4).`);
