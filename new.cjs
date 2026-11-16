const fs = require("fs");
const path = require("path");

const root = __dirname;
const results = [];

function edit(file, label, transform) {
  const full = path.join(root, file);
  const raw = fs.readFileSync(full, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const after = transform(raw.replace(/\r\n/g, "\n"));
  if (after === null) return results.push(`skip   ${file}: ${label} (already applied)`);
  if (after === undefined) return results.push(`FAILED ${file}: ${label} (anchor not found)`);
  fs.writeFileSync(full, after.replace(/\n/g, eol), "utf8");
  results.push(`ok     ${file}: ${label}`);
}

function replaceOnce(text, from, to) {
  return text.includes(from) ? text.replace(from, () => to) : undefined;
}

// 1. People/settings pages share the left edge of the other pages
edit("src/styles/layout.css", "left-align narrow pages", (t) => {
  const from = ".app-page-narrow {\n  max-width: 42rem;\n  margin-inline: auto;\n}";
  if (t.includes(".app-page-narrow {\n  max-width: 42rem;\n  margin-inline: 0;")) return null;
  return replaceOnce(t, from, ".app-page-narrow {\n  max-width: 42rem;\n  margin-inline: 0;\n}");
});

// 2. Trends chart: y-axis fits the data instead of always 12 or 24 h
edit("src/features/activity/components/SleepStudyChart.jsx", "fit y-axis to data", (t) => {
  if (t.includes("Math.ceil(maxMinutes / 60 / 4)")) return null;
  let out = replaceOnce(
    t,
    "const maxHours = maxMinutes > 12 * 60 ? 24 : 12;",
    "const maxHours = Math.min(24, Math.max(4, Math.ceil(maxMinutes / 60 / 4) * 4));",
  );
  if (!out) return undefined;
  return replaceOnce(
    out,
    "(Math.min(minutes / 60, 24) / maxHours) * plotHeight;",
    "(Math.min(minutes / 60, maxHours) / maxHours) * plotHeight;",
  );
});

// 3. Dialog: focus trap and focus return
edit("src/shared/components/AppDialog.jsx", "focus trap and focus return", (t) => {
  if (t.includes("dialogRef")) return null;
  let out = replaceOnce(
    t,
    'import { useEffect, useMemo, useState } from "react";',
    'import { useEffect, useMemo, useRef, useState } from "react";',
  );
  if (!out) return undefined;
  out = replaceOnce(
    out,
    'const [typedValue, setTypedValue] = useState("");',
    [
      'const [typedValue, setTypedValue] = useState("");',
      "  const dialogRef = useRef(null);",
      "",
      "  useEffect(() => {",
      "    const previous = document.activeElement;",
      "    return () => previous?.focus?.();",
      "  }, []);",
    ].join("\n"),
  );
  if (!out) return undefined;
  out = replaceOnce(
    out,
    '      if (event.key === "Escape") onClose();',
    [
      '      if (event.key === "Escape") {',
      "        onClose();",
      "        return;",
      "      }",
      '      if (event.key !== "Tab") return;',
      "      const focusable = dialogRef.current?.querySelectorAll(",
      "        'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex=\"-1\"])',",
      "      );",
      "      if (!focusable?.length) return;",
      "      const first = focusable[0];",
      "      const last = focusable[focusable.length - 1];",
      "      if (event.shiftKey && document.activeElement === first) {",
      "        event.preventDefault();",
      "        last.focus();",
      "      } else if (!event.shiftKey && document.activeElement === last) {",
      "        event.preventDefault();",
      "        first.focus();",
      "      }",
    ].join("\n"),
  );
  if (!out) return undefined;
  return replaceOnce(out, 'role="alertdialog"', 'role="alertdialog"\n        ref={dialogRef}');
});

// 4. Browser tab title follows the page
edit("src/features/dashboard/AuthenticatedScreens.jsx", "page titles", (t) => {
  if (t.includes("| Momentum`")) return null;
  let out = replaceOnce(
    t,
    'import { lazy, Suspense } from "react";',
    'import { lazy, Suspense, useEffect } from "react";',
  );
  if (!out) return undefined;
  return replaceOnce(
    out,
    "  } = context;\n\n  if (peopleSearchPage) {",
    [
      "  } = context;",
      "",
      "  useEffect(() => {",
      "    const label = peopleSearchPage",
      '      ? "People"',
      "      : selectedPublicUsername",
      "        ? `@${selectedPublicUsername}`",
      "        : showSettings",
      '          ? "Edit profile"',
      "          : dailyLogPage",
      '            ? "Activity Log"',
      "            : showProfile",
      '              ? "Profile"',
      '              : "Tracker";',
      "    document.title = `${label} | Momentum`;",
      "  }, [dailyLogPage, peopleSearchPage, selectedPublicUsername, showProfile, showSettings]);",
      "",
      "  if (peopleSearchPage) {",
    ].join("\n"),
  );
});

// 5. index.html: remove the duplicated theme script
edit("index.html", "remove duplicate theme script", (t) => {
  const block =
    '    <script>\n      try {\n        if (localStorage.getItem("theme") === "light")\n          document.documentElement.setAttribute("data-theme", "light");\n      } catch (e) {}\n    </script>';
  const doubled = block + "\n" + block;
  if (!t.includes(doubled)) return null;
  return t.replace(doubled, block);
});

// 6. Daily log: sticky side panel and lighter weights
const polishCss = `/* Keep Quick log and Sleep in view beside a long Activities list. */
@media (min-width: 981px) {
  .daily-log-page-shell .daily-side-panel {
    position: sticky;
    top: calc(var(--header-h) + 1rem);
    align-self: start;
  }
}

.daily-log-page-shell .activity-card-name {
  font-weight: 500;
}

.daily-log-page-shell .daily-entry-heading h3 {
  font-weight: 600;
}

.daily-log-page-shell .activity-total,
.daily-log-page-shell .daily-sleep-total {
  font-variant-numeric: tabular-nums;
}
`;
const cssPath = path.join(root, "src/features/daily-log/components/DailyLogPolish.css");
if (fs.existsSync(cssPath)) results.push("skip   DailyLogPolish.css (exists)");
else {
  fs.writeFileSync(cssPath, polishCss, "utf8");
  results.push("ok     DailyLogPolish.css created");
}
edit("src/features/daily-log/components/DailyTracker.jsx", "import polish css", (t) => {
  if (t.includes("DailyLogPolish.css")) return null;
  return replaceOnce(
    t,
    'import "./DailyLogPage.css";',
    'import "./DailyLogPage.css";\nimport "./DailyLogPolish.css";',
  );
});

// 7. Optional: hard-coded greys -> theme tokens
if (process.argv.includes("--greys")) {
  edit("tailwind.config.js", "colors follow theme tokens", (t) => {
    if (t.includes('text: "var(--text)"')) return null;
    let out = replaceOnce(t, 'text: "#EDEDED"', 'text: "var(--text)"');
    if (!out) return undefined;
    return replaceOnce(out, 'muted: "#A1A1A1"', 'muted: "var(--muted)"');
  });
  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      return e.isDirectory() ? walk(p) : p.endsWith(".jsx") ? [p] : [];
    });
  for (const full of walk(path.join(root, "src"))) {
    const rel = path.relative(root, full);
    edit(rel, "grey classes -> tokens", (t) => {
      const next = t
        .replace(/text-\[#A1A1A1\]/g, "text-muted")
        .replace(/text-\[#EDEDED\]/g, "text-text");
      return next === t ? null : next;
    });
  }
}

console.log(results.filter((r) => !r.includes("already applied") || process.argv.includes("-v")).join("\n"));