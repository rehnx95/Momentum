# Momentum: Final Audit and Target Design

## 2. Scorecard

| Area | Grade | Reason |
| --- | --- | --- |
| Visual consistency | C+ | Good tokens and a real activity palette; still 47 hard-coded `#A1A1A1` and 46 `#EDEDED` in JSX, 64 `!important` |
| Layout and responsiveness | B- | Consistent shell; page left edges differ by up to 16 px; 19 distinct breakpoints in my count; no footer |
| Components and UX states | B- | Solid parts and better skeletons; no toasts, no focus trap *(not re-checked)* |
| Accessibility | B | Strong basics from the first audit *(not re-run)*; charts still lack text alternatives *(verify)* |
| Security (DB/API) | A- | RLS on all tables; no security headers |
| Performance and dependencies | B | Smaller bundle; 7 audit findings in dev tooling |
| Code quality and tests | B- | Lint clean and 83 tests, but 8 fail so CI is red; no tests for people or sheets |

## 3. What polished apps do (Linear, Vercel, Notion, Toggl, Todoist)

1. **Three text levels.** Bold page title, medium primary text, regular muted secondary text.
2. **One accent for the main action; color only for meaning.** Everything else neutral.
3. **Same pieces everywhere.** One card style, three button heights, one radius per component, 4 or 8 px spacing.
4. **Fewer boxes.** Related items share one surface with hairline dividers.
5. **Every screen covers its states:** main action, empty, loading, error, saved.
6. **Charts follow conventions.** Same category, same color on every screen; legend, tooltip, text alternative.

Momentum's black shell and white-pill nav already match Vercel and Linear. The gap is discipline: too many values for the same role, and weight used everywhere (page titles, activity names, totals and table values are all bold in the screenshots).

## 4. The design system to settle first

| Thing | Target | Today (my count) |
| --- | --- | --- |
| Text sizes | 12, 14, 16, 18, 22, 30 px | 57 distinct `font-size` values in CSS |
| Weights | 400, 500, 600 | More than 3, including unloaded 550, 650, 750 *(from the first audit)* |
| Corner radii | 8, 12, 24 px plus fully round | 27 distinct `border-radius` values |
| Button heights | 32, 36, 40 px | Not measured |
| Spacing | 4 px grid | Not measured |
| Breakpoints | 3 or 4, for example 640, 768, 1024, 1280 | 19 distinct widths (360 to 1200 px, with 760, 767, 768 together) |
| z-index | A named scale | 12 values up to 1000 *(first audit)* |
| Greys | 6, all via tokens (`--text`, `--muted`, surfaces, border) | Tokens exist; JSX still hard-codes `#A1A1A1` (47 times) and `#EDEDED` (46 times) |
| Numbers | `font-variant-numeric: tabular-nums` on every duration and count | Not verified |

**Why it still looks inconsistent.** The tokens are good (`--muted #b8b8b8`, `--text #fff`, status colors for both themes), but JSX hard-codes other greys for the same roles, so a theme change reaches only part of the site. `DailyTracker.css` is 1,576 lines.

### Color: one decision for you

Activities now use a named palette (sand, slate blue, sky, olive, rose, dusty red, teal, lavender, mint, deep teal, peach, salmon) with a per-activity picker. This fixes the earlier problem that the Full log looked like two activities instead of six, and each activity keeps one color across screens. It also departs from a near black-and-white direction with a few earth tones. Decide which you want:

- **Keep the distinct hues.** Clearer data. Keep green, amber and red for status only, and give every legend dot a text label.
- **Constrain the default palette** to a few earth tones and let the picker add the rest. Calmer look, but check that six activities stay distinguishable.

Either way, two things need fixing: the Trends line is a bright green that appears nowhere else except the heatmap, and the Trends average line is orange. Use a neutral line (white or muted) and reserve green for the heatmap and success states.

## 5. Screen by screen: today and target

### Header and navigation

**Today.** Sticky bar, logo tile, white pill for the current page, theme toggle and sign-out together. Content left edges in the screenshots: Tracker at 235 px (same as the logo), Profile card at 231 px, Daily log title at 247 px, and People centered in a narrower column (title at 507 px). **Target.** One `max-width` and one left padding token shared by bar and every page. Account menu (profile, theme, sign out) instead of loose sign-out text. Page title also set in the browser tab.

### Daily log

**Today.**

- Title, activity names and totals are all bold; nothing leads.
- each activity has palette, `+` and trash icons grouped. This is a clear improvement.
- Quick log's "Add" button still looks disabled (grey on grey) even though it is the main way to add an activity.
- No "Saved" text near the title in the screenshot, although the code can render one.
- The right column (Quick log, Sleep) ends early and leaves empty space beside a long Activities list.
- Adding a slot is still a small `+` icon with no label.

**Target.**

- A persistent **"Saved 2:41 pm"** beside the title that stays visible after saving.
- A visible **"Add activity"** primary button; Quick log's Add becomes a white button when enabled.
- matched case-insensitively and trimmed
- Overlap shown on the row: orange outline on the slot plus a short "Overlaps sleep" line under the name.
- Name in 500 weight, totals in 600 only where they matter.
- **Done when** a new user adds a first slot unaided and sees every warning without scrolling.

### Full log

**Today.** Each day is a stacked bar of share of active time with a text legend ("System Design 2h 42m · 22%") and Active, Sleep and Solved columns. Expanding a day lists every slot with its time range, dot, name and duration, and the sleep row. Zero solved shows "0". Legend colors are distinct. Still wrong:

- The bar shows share, not when. You only see start and stop times after expanding a day, and you cannot see gaps at all.
- The top legend includes Sleep, but no bar includes it.
- Every collapsed row repeats a five-item text legend, which is heavy across 10 days.
- The trash ("Clear log") icon still sits beside the sort and list icons.

**Target.** Keep the list and expansion. and shorten the collapsed text legend to the top two activities. **Done when** a stranger can say when you started and stopped on any day within 3 seconds.

### Trends

**Today.** The stat trio is now large numbers with small labels (30 / 30 days logged, 8h 9m avg sleep, 11h 55m avg active). A dashed average line is present. Still wrong:

- The "Active" dropdown repeats the "Active" legend entry.
- The y-axis runs 0 to 24 h while the data sits between about 10 and 13 h, so the line looks flat and hides the variation.
- The line is bright green and the average is orange, both outside the rest of the palette.
- "DSA Sheet" here versus "DSA" on Daily log and Full log.
- No visible text alternative for the chart *(verify)*.

**Target.** Auto-scale the y-axis to the data range with a floor of zero only for totals, neutral line plus muted dashed average, one name per activity everywhere, and a visually hidden data table behind the chart. **Done when** every number is readable at 100% zoom and a screen reader can read the chart.

### Tracker

**Today.** The progress card now shows 78%, 404 / 518 solved, and Done, Skipped and To do counts, and bars are filled. Still wrong:

- Done, Skipped and To do counts and all bars are white; nothing uses a status color.
- The filter row (All, Done, Skipped, To do, Hide skip) mixes status filters with a "Hide skip" toggle in the same pill style.
- "Expand all" and "Collapse all" are small, low-contrast text.

**Target.** status icon plus label (check, dash, circle) with success, neutral and warning meanings, "Hide skip" separated from the status filters, larger Expand/Collapse controls, sticky progress card. **Done when** the list alone tells you which sections are done, partial and untouched.

### Profile

**Today.** The Sheet progress card now renders in full, with Export, Import and Reset all, and per-sheet bars, counts and percentages. Still wrong:

- "Reset all" sits beside Export and Import in the same style although it is destructive;
- The Sheet column in Recent AC is about 5 px out of line (DSA starts at different x on the last rows).

**Target.**  fixed widths for Problem, Sheet and Date,  **Done when** every column lines up

### People

**Today.** A clear empty state (dashed card, "Start typing a username", a 3-character hint). The column is narrower than other pages and the title sits well to the right of the logo. **Target.** Same container width and left edge as the other pages.

### Onboarding

**Today.** Not in the new screenshots. From the first audit: "Taken" and "Available" share a grey dot, and the error repeats the badge. The onboarding test now fails because it cannot find the label "Username (Handle)", so the label text has changed since the test was written. **Target.** Icon plus word plus color for each state; the error shown once under the field with `role="alert"`; suggestion chips for taken names; a black disabled button with a thin outline. **Done when** a color-blind user can tell the states apart and a screen reader announces the error.

### Dialogs, menus, tooltips

**Today.** `AppDialog` supports type-to-confirm and a custom Tooltip exists. Focus trap and focus return were missing in the first audit and were not re-checked. **Target.** One dialog primitive that traps focus, returns it to the trigger, closes on Escape and outside click, and has an accessible name; tooltips on hover and focus.

## 6. State matrix: what every screen must handle

| State | Today | Target |
| --- | --- | --- |
| Main action | Quick log Add looks disabled | One visible primary button per screen |
| Empty | Daily log and People | Also Full log, Trends, Tracker search |
| Loading | Skeleton markup in 4 files after the latest commit | Skeleton rows and cards on every screen *(verify)* |
| Error | `console.error`, error boundary only | Inline message plus retry; monitoring (Sentry or similar) |
| Saved | Code renders "Saving…" / "Saved"; not visible in screenshots | Persistent "Saved 2:41 pm" beside the title |
| Undo | In 3 files, no toast | Toast with Undo after delete or edit |
| Not found | None (hand-written routing, no 404) | 404 screen |

## 7. High-priority engineering findings

**H1. CI is red.** `npm test` fails 8 of 83 tests (20 of 22 files pass). Seven are in `FullLogTimeline.test.js`, which imports `intervalsFor` and `sleepIntervalsFor` from `./FullLogTimeline`; the Full log redesign moved that logic, and `intervalsFor` now lives in `src/shared/utils/time.js`. One is in `OnboardingPage.test.jsx`, which cannot find the label "Username (Handle)". The workflow runs install, lint, test and build on every push, so these fail it. Fix: update the tests to the new code, or delete tests for removed code.

**H2. Sign-out leaves your data on the device.** `handleSignOut` still removes only `momentum:account-cache`, while progress, daily logs and sheets are cached in localStorage (`userDataCache.js`, `dailyLogHistoryCache.js`, `useProblemTree.js`, `useSheetLibrary.js`). The README describes caches as account-scoped, so check what actually remains after sign-out *(verify)*. Fix: delete every app-prefixed key on sign-out and when the signed-in user id changes.

**H3. Autosave can overwrite another device.** The daily log upserts the whole row on `user_id,date` after a debounce, with no `updated_at` check and no cross-tab sync. Last write wins silently. Fix: send the loaded `updated_at`, reject if changed, show "this day changed elsewhere, reload".

**H4. "Today" may differ between client and database *(verify)*.** The client uses the local date; the streak functions use `CURRENT_DATE` (server time, normally UTC). In India (UTC+5:30), between midnight and about 5:30 am the two can disagree: a streak of 0 or work on the wrong date. Test by completing a problem at 1 am. Fix: pass the local date to the functions or store a timezone on the profile.

**H5. No privacy policy, terms, footer or delete-account.** You store emails, names, locations and public progress. All foreign keys use `ON DELETE CASCADE`, so deletion is mostly an API call and a confirmed button.

**H6. `npm audit` reports 7 findings (4 moderate, 1 high, 2 critical).** The packages listed are dev tooling (`vitest`, `@vitest/mocker`, `esbuild`, `tinypool`, `postcss-selector-parser`); the production dependencies (React, Supabase, Lucide) are not named. The fix `npm audit fix --force` installs vitest 5, a breaking upgrade, so do it on a branch after H1. The first audit found 0.

*Resolved since the first audit: empty favicon, and false sleep-overlap warnings (the Sleep card now counts a sleep toward the night you wake up).*

## 8. Medium findings

- **M1 Head and titles.** No `document.title` anywhere, so every tab reads "Momentum — Make progress…" (visible in your tab strip); no `theme-color`, Open Graph, `robots.txt` or sitemap. `get_public_profile` requires a signed-in user, so profile link previews cannot work (also a privacy plus), but a site-wide preview image still helps. `index.html` hard-codes a black body background, so light-theme users may see a dark flash *(verify)*.
- **M2 No 404.** Hand-written routing compares `window.location.pathname`; try `/xyz` on the live site *(verify)*. A router library would also give titles, back-button handling and lazy routes.
- **M3 Security headers.** `vercel.json` still has only the SPA rewrite. Add Content-Security-Policy, X-Content-Type-Options, Referrer-Policy, frame-ancestors, Permissions-Policy. The CSP must allow Google Fonts, or self-host Geist and drop that dependency.
- **M4 Tests miss the risky parts.** 22 test files and 83 tests. Coverage by feature: auth 1 file, dashboard 1, profile 2, people 0, sheets 0. Sheets (uploads, personal copies) and backup/restore in `useProgressBackup.js` are where a bug loses data. Add round-trip and import-validation tests after H1.
- **M5 Database edges** *(not re-checked)*. `custom_tasks`, `dsa_slots`, `backend_slots` are JSONB with no size or shape check; legacy `dsa_*` and `backend_*` columns coexist with the slot JSON; `height_cm` sits in the daily log table (health data); `daily_logs_study_total_check` is `NOT VALID`. The repo now has 23 migrations (the first audit read 17).
- **M6 `SampleDataTools` ships in the build** as its own chunk. The README says it is test-mode only, and the header icons in your screenshots come from the test server; confirm they are gated off in production *(verify)*.
- **M7 No error monitoring.** Errors only reach the browser console.
- **M8 Google-only sign-in.** One OAuth or redirect-URL problem locks everyone out. Check the Supabase redirect allow-list *(verify)*; consider email magic link as a backup.

## 9. Accessibility, performance, repo

- **Accessibility** *(from the first audit, not re-run)*. Strong: aria-labels, roles, live regions, `:focus-visible` rules, no `<div onClick>`, reduced motion respected. Fix: three `outline: none/0` rules need a visible replacement; focus trap and focus return in modals; text alternatives for the Trends line, Full log bars and heatmap; labels on colored dots so color is never the only signal.
- **Performance.** Main JS 387 kB (110 kB gzip, was 483 / 137); `DailyTracker` JS 64.5 kB and CSS 70.8 kB; main CSS 78 kB. Check the main bundle with a bundle visualizer before changing anything. The Google Fonts stylesheet still blocks rendering. Few `limit`/`range` calls, so a year of history may load everything *(verify)*.
- **Repo.** Add a `LICENSE`. Lint is clean and the production build succeeds.

## 10. Features real apps have that Momentum doesn't

| Feature | Seen in |
| --- | --- |
| Toast with Undo | Todoist, Linear, Gmail |
| Installable app (manifest, service worker, offline) | Todoist, Notion |
| Reminders and streak notifications | Duolingo, Habitica |
| Delete account and data export (you have JSON backup) | Any app with accounts |
| Privacy, terms, footer | Every site storing personal data |
| Per-page titles and link previews | Every public site |
| Keyboard shortcut hints and quick jump/search | Linear, Notion |

## 11. What is already good (keep)

Dark and light tokens; RLS on all tables with owner-only policies; safe security-definer functions; unique lowercase usernames; `.env` ignored and only a publishable key in the client; lazy-loaded pages; debounced autosave that flushes when the tab is hidden; error boundary; clean lint; a stable 12-color activity palette with a picker; a Full log that expands to exact times; empty states, type-to-confirm dialogs and tooltips.

## 12. What the finished Momentum looks like

Open the site and the tab shows a real icon and a page-specific title. A thin black header carries the logo, white pill nav and an account menu, aligned to the same width as every page. On Daily log, a 30 px title sits next to the Day / Full log / Trends switcher with "Saved 2:41 pm" beside it. Activities are one clean list with a visible "Add activity" button; a warning appears on the exact slot. Full log shows a time-of-day bar per day you can scan in seconds. Tracker is one card with a sticky progress summary, status icons and no empty bars. Trends has a neutral line on an auto-scaled axis. Every list has an empty state, every load a skeleton, every delete an Undo toast. Footer links to Privacy and Terms; profile has Delete account; unknown URLs show a 404.

Under it: green CI; one token scale for color, type, radius, spacing and breakpoints; no hard-coded hex; no `!important`; daily-log saves that detect conflicts; streaks that use the user's local day; sign-out that clears the device; hardened headers; tests on the features that can lose data.

## 13. Combined roadmap

**Phase 0: get CI green (an hour or two).** Update or remove the 8 stale tests (7 in `FullLogTimeline.test.js`, 1 in `OnboardingPage.test.jsx`). Then upgrade vitest on a branch for the 7 audit findings.

**Phase 1: quick and safe (about a day).** Per-page `document.title`; meta description, `theme-color`, Open Graph defaults, `robots.txt`; security headers in `vercel.json`; clear all cached user data on sign-out; add `LICENSE`; make the Quick log Add button look enabled; make the "Saved" status visible and persistent.

**Phase 2: correctness (a few days).** `updated_at` conflict check on daily-log saves; local-date streaks; JSONB size and shape checks; unique activity and sheet names; tests for backup/restore, sheet import and sign-in/out.

**Phase 3: visual consistency (about a week).** Adopt the token scales in section 4; replace hard-coded `#A1A1A1`, `#EDEDED` and Tailwind arbitrary colors; remove `!important`; split `DailyTracker.css`; apply type roles (600 / 500 / 400); one container width and left edge; neutral Trends line; tabular numbers.

**Phase 4: screen rework.** Daily log "Add activity" and row-level warnings; Tracker as one divided card with status icons; Full log time-of-day bars and a More menu for "Clear log"; Trends axis and legend cleanup; Profile alignment and "Reset all" menu; onboarding states.

**Phase 5: product polish.** Privacy and terms pages with footer; delete account; 404; toast and undo system; focus-trapped dialog primitive; chart text alternatives; error monitoring; shortcut hints; installable app; second sign-in method; reminders.

**If you only have time for three things:** (1) Phase 0, because a red CI hides every new bug; (2) the sign-out cache and save-conflict fixes, because they affect data you already trust; (3) the type hierarchy and token cleanup, because they change how every screen feels.

## 14. Still to verify

The items marked *(verify)*: sign-out cache contents, 1 am streak behavior, 404 on `/xyz`, light-theme flash and every screen in light theme, mobile layouts, `SampleDataTools` in production, Supabase redirect URLs, rate limits and backups, long-history load times, whether "Saved" shows after an edit, the "Reset all" confirmation, and keyboard-only testing of every dialog.
