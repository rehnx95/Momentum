# Momentum — Commit History Report

**Repository:** `rehnx95/Momentum` (originally `Track-Sheet`)
**Range analysed:** `0596fbe` ("add separate page for daily log") → `4ddf36f` (HEAD, "update the link")
**Method:** Cloned the repository and read the actual diffs (with rename detection), not just commit messages. Also installed dependencies, ran the test suite and built the project at HEAD, and scanned the range for committed secrets.

---

## 1. Executive summary

In **four calendar days** (Nov 8, 9, 10 and 12, 2026) the project went from a single-file React app with ad-hoc headers to a structured, documented, deployed product with caching, charts, a public-profile system and unit tests.

The real story is in three moments:

1. **Nov 8, afternoon: the daily-log rebuild** (`1c02d20`). An 872-line `DailyTracker.jsx` and an ~900-line hook were split into focused components, with the first unit tests and a database migration.
2. **Nov 10, afternoon: performance caching** (`09af667`, `cc5a880`, `cefa697`). Layered local caches make screens render instantly while data refreshes in the background.
3. **Nov 10, evening: the whole-codebase refactor** (`d17317e`). `App.jsx` shrank from **3,469 lines to 64**, and the code moved into a feature-based folder structure. The same evening, the project was rebranded from **Track-Sheet to Momentum** and documented.

Nearly half of the commits (60 of 129) are "fix …" and 23 are "improve …". Most are UI/CSS iteration, and the commit messages frequently do not describe what the diff actually does (see §9).

---

## 2. Snapshot

| Metric | Value |
|---|---|
| Commits in range | 129 (128 by `rehnx95`, 1 under the author name `Rehan`) |
| Active days | 4 (Nov 8: 49 commits, Nov 9: 17, Nov 10: 58, Nov 12: 5) |
| Files changed (range total) | 97 |
| Lines added / removed | +13,027 / −7,687 (net **+5,340**) |
| Refactor commit `d17317e` alone | 86 files, +8,946 / −8,076 (net only +870, mostly code relocated) |
| Source files at HEAD (`src/`) | 78 |
| Test files / test cases at HEAD | 4 / 15 (all passing) |
| Production build at HEAD | Succeeds (1,626 modules; main JS chunk 490 kB, 139 kB gzipped) |
| Secrets in committed history (range) | None found |
| Distinct commit subjects | 106 of 129 (23 are repeats) |
| Reverts | 3 (2 full, 1 partial) |

**Most-touched files (commits touching each):**

| File | Commits |
|---|---|
| `DailyTracker.css` | 49 |
| `App.jsx` | 44 |
| `index.css` | 36 |
| `layout.css` | 32 |
| `FullLog.jsx` | 30 |
| `DayView.jsx` | 21 |
| `useDailyLog.js` | 18 |
| `SleepStudyChart.jsx` | 18 |

---

## 3. Timeline

Timestamps are as recorded by git in the author's local time.

| Day | Commits | Window | What happened |
|---|---|---|---|
| **Nov 8** | 49 | 11:06–21:19 | Navigation/header unification, then site redesign and a full rebuild of the Daily Log |
| **Nov 9** | 17 | 20:04–23:53 | Profile, heatmap and layout tuning; Full Log rework begins |
| **Nov 10** | 58 | 00:00–20:56 | Late-night log tuning, charts, performance caching, tooltips, public profile, custom components, refactor, rebrand, docs |
| **Nov 12** | 5 | 12:34–12:49 | Env-var rename, README and architecture link updates, merge |

The busiest hours were Nov 8 at 12:00 (10 commits), Nov 8 at 13:00 and Nov 10 at 15:00 (9 each). On Nov 10 there was also a post-midnight session (8 commits at 00:00) and one reaching 03:29.

---

## 4. Phase-by-phase breakdown (from the diffs)

### Phase 1 — Navigation and header unification (Nov 8, 11:06–13:52, 25 commits)

- `0596fbe` adds a separate `/daily-log` page. It does this with a `pathname` check inside `App.jsx`, so each page re-implemented its own header (Tracker / Daily Log / People buttons, brand, tooltips).
- `befef55` ("unified navigation system") replaces three duplicated header blocks with a shared `unified-header-inner` / `unified-header-actions` structure and a `MainPageNavigation` component.
- `e14cdf2` extracts a `ThemeToggle` component and puts it in every header; `cbe7aba` **partially reverts** this (4 files, +45/−90) and goes back to inline buttons.
- `5a79842` moves the sidebar to the left; `2c834b2` makes the second nav bar responsive.
- About ten commits ("fix the left allignment" and variants) are 1–16-line CSS nudges to one file.

### Phase 2 — Redesign and Daily Log rebuild (Nov 8, 14:47–21:19, 24 commits)

- `375633a` ("started to redesign") is the first structural change: `App.jsx` loses ~610 lines, and new `AppHeader.jsx`, `SheetSwitcher.jsx` and a 492-line `layout.css` appear.
- `1c02d20` ("complete redesign of daily log") is the most important commit of day one: 22 files, +3,547/−2,248.
  - `DailyTracker.jsx` drops from 872 lines to a thin shell.
  - New components: `DayView`, `FullLog`, `ActivityCard`, `SlotRow`, `DayTimeline`.
  - New `useDailyLog` hook (898 lines), which handles loading, saving, a localStorage-backed running timer, per-day validation, streaks and older-log paging.
  - New `utils/time.js` (256 lines) plus `time.test.js` (98 lines). `vitest` is added to `package.json`.
  - New migration `20261108150000_daily_log_sanity.sql`: a `CHECK` constraint capping DSA + backend hours at 24 per day (`NOT VALID`, so existing rows are unaffected), and drops `profiles.daily_log_visible`.
  - Dead files removed: `Onboarding.jsx` (319 lines) and `useSupabaseProgress.js` (268 lines), neither of which was imported anywhere.
- `e5547b4` ("add day specific activities") is mostly deletions (+31/−152). It **removes** the profile-level activity-template syncing, including the `preferencesLoading`, `preferencesFailed` and retry machinery, so activities now live in each day's own log.
- `3d680fd` ("implement the fast daily tracker") adds a 1,099-line experiment (inline slot editing, timer quick-activity chips, a quick-time form). `bf5599f` **fully reverts** it three minutes later (a diff against the pre-experiment commit is empty).
- `e861024` ("improve the sleep card") removes the 24-hour `DayTimeline` view (131 lines) and `AppHeader.jsx` (53 lines), simplifying the day view.

### Phase 3 — Profile, heatmap and Full Log (Nov 9 – early Nov 10, 29 commits)

- Six commits are named "fix the layout of profile", which is iterative CSS/JSX adjustment (typically 10–120 lines each).
- `3d20de9` / `f16ef9a` rewrite `FullLog.jsx` around week-based grouping (`weekLabel()`, 466 lines replaced).
- A run of "fixing the full log / daily log" commits (12 commits between 00:00 and 01:36 on Nov 10) each change roughly 10–150 lines.
- At HEAD, the Full Log is about 220 lines and uses "Load 10 older days" pagination.

### Phase 4 — Charts, styling and graph view (Nov 10, 02:06–03:29, 10 commits)

- `77d3751`, titled "improving the styling of website", is where the **first `SleepStudyChart` component (218 lines) and its CSS (129 lines)** are introduced.
- `e67b61e` / `1c4a518` add a graph view: hand-written SVG `<polyline>` charts with a 30-day axis, a responsive width via refs and no chart library.
- `1013afd`, `1544930` and `6033a9a` adjust colour gradients and fix a chart colour mismatch.
- `6f6b566` removes 51 lines of experimental graph CSS and JSX.

### Phase 5 — Performance, heatmap and tooltips (Nov 10, 13:48–15:20, 12 commits)

See §6 and §7 for detail.

### Phase 6 — Full Log, Daily Log and public profile polish (Nov 10, 15:28–17:51, 13 commits)

- `ce99671` ("fix the public profile layout") actually **introduces a new `TimeInput` component** (segmented hour and minute fields with arrow-key navigation, up/down wrap-around) plus tests, and reworks `SlotRow`.
- `7074172` makes daily-log changes; `980d4b4` **fully reverts** them (6 files, +70/−165).
- `b697190` restructures the public-profile layout (App.jsx, ActivityCard, FullLog, CSS).

### Phase 7 — Custom components and the refactor (Nov 10, 18:04–19:43, 5 commits)

- `5bfb455` builds `CustomDatePicker` (251 lines): month navigation, a `max` date, Escape-to-close, and `aria-label`, `aria-expanded` and `aria-live` attributes.
- `0b1274f` replaces native `title=` attributes with a custom `Tooltip` component across the header, profile and activity lists.
- `1f5367b` ("clean up the code") removes ~130 net lines of dead CSS and code.
- `d17317e`, the whole-codebase refactor, is covered in §5.

### Phase 8 — Polish, rebrand and docs (Nov 10, 19:50–20:56, 6 commits)

- `ff8ff07`, `5a37609` and `f45bc61` increase font sizes, enlarge the brand and logo, and fix a tooltip.
- `810e53e` ("add readme and architecture docs") does much more than docs. It **renames the product from Track-Sheet to Momentum**: `TrackSheetBrand.jsx` becomes `MomentumBrand.jsx`, and `package.json`, `index.html` and several UI strings are updated. It also rewrites `architecture.md` (~1,100 lines) and `README.md`.
- `9641640` and `b9de7f7` refine the README and add `.env.example`.

### Phase 9 — Config and release (Nov 12, 5 commits)

- `7df1576` ("update the readme and add supabase auth") **does not add auth.** Authentication, profiles and the related database migrations already existed from October. This commit renames the environment variable `VITE_SUPABASE_ANON_KEY` to `VITE_SUPABASE_PUBLISHABLE_KEY` across `supabase.js`, `api/search.js`, `.env.example` and the docs, and updates `.gitignore` and the README setup steps.
- `17b2845`, `f20e59d` and `4ddf36f` update the live URL (`momentum-rehnx.vercel.app`). `ac2b49e` merges the remote commit.

---

## 5. The refactor (`d17317e`)

| | Before | After |
|---|---|---|
| `App.jsx` | 3,469 lines | **64 lines** |
| `useDailyLog.js` | 800 lines | 210 lines, split into `useDailyLogActivities` (102), `useDailyLogHistory` (143), `useDailyLogPersistence` (232), `useDailyLogTimer` (249), and `lib/dailyLogModel.js` (58) |
| `index.css` + `layout.css` | 1,594 + 1,035 lines | `styles/` with 15 files (about 2,730 lines in total) |
| Layout | Flat `components/`, `hooks/`, `utils/`, `lib/` | Feature slices plus `shared/` |

**New structure at HEAD:**

```
src/
├── App.jsx                         (64 lines: router shell)
├── features/
│   ├── activity/        heatmap, sleep/study charts
│   ├── auth/            SignInPage, OnboardingPage, useAuthentication
│   ├── daily-log/       components, 5 hooks, history cache, model
│   ├── dashboard/       TrackerDashboard, AuthenticatedApp/Screens, usePeopleNavigation
│   ├── people/          PeopleSearchPage, PublicProfilePage
│   ├── problem-tracker/ ProblemTree, useProblemTree, useProgress
│   ├── profile/         ProfilePage, ProfileSettings, metrics, backup
│   └── sheets/          SheetSwitcher, useSheetLibrary, built-in sheet data
├── shared/              AppHeader, MomentumBrand, Tooltip, AppDialog, supabase client, caches, utils
└── styles/              auth, dashboard, layout, profile, theme CSS split by concern
```

The net change in this commit was only about +870 lines over 86 files, so it was mainly a relocation and split of existing behaviour rather than new functionality.

---

## 6. Performance work (Nov 10, 13:48–14:13)

The title "improving the performance of website" (`d650b9a`) was mostly CSS tuning. The actual performance work is in three later commits:

| Commit | Change |
|---|---|
| `cc5a880` | **Account cache:** `track-sheet-account-cache` in `localStorage` stores the user and profile, so the app starts in the right state (authenticated or onboarding) without a loading screen. It is cleared on sign-out or when the profile no longer matches the session. |
| `09af667` | **Daily-log history cache** (`dailyLogHistoryCache.js` plus tests) and an in-memory **public-profile cache** (60-second freshness window, 20-entry cap with oldest-first eviction). |
| `cefa697` | **User data cache** (`userDataCache.js` plus tests) for the sheet library, **per-day log cache**, `normalizeLog` on cached data, and cache invalidation helpers. |

The pattern is stale-while-revalidate: render from cache immediately, fetch in the background, and invalidate on writes. The app also code-splits `DailyTracker` and `ProfileSettings` into separate chunks.

---

## 7. Charts, heatmap and the tooltip bug

- **Charts:** hand-built SVG line charts (sleep and study over 30 days). The project has no chart dependency; its only runtime dependencies are React, Supabase and Lucide icons.
- **Heatmap (`e7d5494`):** the heatmap component is now memoised (`memo`), uses `useLayoutEffect` for sizing, guards `setCell` so it doesn't re-render needlessly, and extracts `getHourLevel` (thresholds at 0, 1, 3 and 5 hours).
- **Tooltip bug:** four commits share the identical message "fix the tooltip for the sleep study chart to display the correct data when hovering over the points" (`409ea67`, `d9bdccb`, `2582e36`, `d840f34`), but each tries a different technique:
  1. A CSS-only tweak, adding a tooltip arrow.
  2. SVG coordinate transforms (`createSVGPoint` and `getBoundingClientRect`) to position the tooltip at the point.
  3. A single tooltip state object and `pointer-events: stroke`.
  4. A `data-point="key:dateKey"` attribute identifying the active point, with an `is-active` highlight state.
  
  `67c10dd` then matches the tooltip style to the heatmap's, and `aa9c9fa` and `3c2ffc5` enlarge the data points.

---

## 8. Reverts and abandoned work

| Commit | Reverts | Type | What was abandoned |
|---|---|---|---|
| `cbe7aba` | part of `e14cdf2` and nearby header work | Partial (4 files, +45/−90) | Shared `ThemeToggle` component and header action grouping |
| `bf5599f` | `3d680fd` | **Full** (verified empty diff) | The "fast daily tracker": inline slot editing, timer chips, quick-time form (1,099 lines) |
| `980d4b4` | `7074172` | **Full** (verified empty diff) | A daily-log UI change (6 files, +165) |

Also removed rather than reverted: the 24-hour `DayTimeline` view (`e861024`) and the profile-level activity templates (`e5547b4`).

---

## 9. Where commit messages don't match the diff

| Commit | Message says | Diff actually shows |
|---|---|---|
| `306e9c0` | "still need to add the functionality to delete a day from the log" | Heatmap and profile layout work (4 files, +259/−125). **The delete-day feature was never implemented** (no references to it anywhere at HEAD). |
| `77d3751` | "improving the styling of website" | First `SleepStudyChart` component (218 lines JSX, 129 lines CSS) plus time-util tests |
| `ce99671` | "fix the public profile layout" | New `TimeInput` component and tests; `SlotRow` rework; 261 lines changed in `App.jsx` |
| `0020000` | "improve the layout of public profile" | Adds `SlotRow.test.js`, which is deleted in the very next commit |
| `d650b9a` | "improving the performance of website" | Mostly CSS and docs; the real caching is in `cc5a880`, `09af667` and `cefa697` |
| `810e53e` | "add readme and architecture docs" | Also the **Track-Sheet → Momentum rebrand** across 21 files |
| `7df1576` | "…add supabase auth" | Env-var rename (`ANON_KEY` → `PUBLISHABLE_KEY`) and docs; auth already existed |
| `d17317e` | "Refactor the whole codebbase…" | Accurate, but it is 86 files, so it is worth splitting in future (e.g. move, then edit) |

---

## 10. Commit hygiene

- **Message style:** 60 of 129 begin with "fix/fixing" and 23 with "improve/improving".
- **Repeats:** "fixing the daily log" ×7, "fix the layout of profile" ×6, "fixing the full log" ×5, "improve the daily log" ×4, and the tooltip message ×4.
- **Typos:** "allignment" ×8, "chnages", "haeatmap", "codebbase".
- **Many small commits:** 43 of the 129 commits (a third) touch a single file, and 29 of those change fewer than 30 lines. That pattern usually indicates trial-and-error iteration that could be squashed.
- **Author identity:** one commit (`17b2845`, a README URL update made on the GitHub side and later merged by `ac2b49e`) has the author name "Rehan" while the rest use `rehnx95`.

---

## 11. Project health at HEAD

| Check | Result |
|---|---|
| `npm install` | Clean |
| `vitest run` | **4 files, 15 tests, all passing** (time utils: 10, TimeInput: 3, history cache: 1, user-data cache: 1) |
| `vite build` | Succeeds; largest JS chunk `index` 490 kB (139 kB gzip), `DailyTracker` 35.6 kB, `dsa` data 43.9 kB |
| Secret scan (commits in range) | No JWTs, `service_role`, secret keys or cloud keys found |
| `.env` handling | `.gitignore` excludes `.env` and `.env.*` but keeps `.env.example`, which holds placeholders only |
| Lint / type checking | None configured (no ESLint config or `tsconfig`) |
| Migrations | 17 SQL migrations in `supabase/migrations`; only one was added in this range (`20261108150000_daily_log_sanity.sql`) |

---

## 12. Gaps and suggestions

1. **Finish or drop "delete a day."** The only mention is a commit message; nothing exists in the code.
2. **Broaden test coverage.** The 15 tests cover utilities, the caches and `TimeInput`. The hooks that now hold most business logic (`useDailyLogPersistence`, `useDailyLogTimer`) and the cache invalidation paths have no tests.
3. **Add ESLint** (with `react-hooks` rules). The hook-heavy code and manual `useEffect` dependency arrays would benefit.
4. **Watch the main bundle.** 490 kB for the main chunk is acceptable now, but sheet data (`dsa.json`) and chart code could be lazy-loaded further.
5. **Squash before merging.** Rebase the 5–7-commit "fix X" runs into single commits, and use Conventional Commit prefixes such as `perf(cache): add account cache`, so that history matches the diff.
6. **Separate moves from edits** in future refactors (a pure-move commit followed by an edit commit), which makes `git blame` and review far easier.
7. **Set a git identity** (`user.name` and `user.email`) consistently so authorship is uniform.

---

## Appendix A — Corrections to the earlier message-only summary

The first summary was based on commit messages alone. The diffs changed these points:

- **`7df1576` did not add Supabase auth.** It renamed the env var; auth predates this range.
- **`306e9c0` was not a TODO-only commit.** It contained real heatmap and layout changes, and the feature it mentions is still missing.
- **The Track-Sheet vs Momentum mismatch** is an intentional rebrand (`810e53e`), not an inconsistency by accident. The local folder simply kept the old name.
- **Phase sizes** are now exact (25 / 24 / 17 / 58 / 5 commits by day and session) rather than estimated.
- **The "~3 reverts" claim is now verified:** two are exact full reverts and one is partial.
- **The four tooltip commits** are not back-to-back (two other commits sit between them), and each used a different approach.

## Appendix B — Full per-commit table (oldest first)

Hash, local date and time, files changed, lines added/removed, subject. Generated with `git log --reverse -M --shortstat`.

| Hash | Date/time | Files | +/− | Subject |
|---|---|---|---|---|
| `0596fbe` | 11-08 11:06 | 1 | +80/−2 | add separate page for daily log |
| `400d264` | 11-08 11:20 | 1 | +20/−2 | fix the header |
| `2ad0f5b` | 11-08 11:31 | 2 | +26/−2 | fix the allignment of header |
| `3e76840` | 11-08 11:41 | 2 | +86/−107 | fixing the alignment of navigation bar |
| `befef55` | 11-08 11:54 | 3 | +68/−63 | build a unified navigation system |
| `1b26403` | 11-08 11:58 | 3 | +22/−6 | fix the bug in navigation bar |
| `76397b2` | 11-08 12:02 | 3 | +34/−7 | fix the logo in navigation bar |
| `7096015` | 11-08 12:07 | 2 | +34/−7 | fixing the css file |
| `5a79842` | 11-08 12:10 | 1 | +4/−4 | move the sidebar to the left |
| `bf7ff81` | 11-08 12:14 | 1 | +3/−2 | fix the bug |
| `e14cdf2` | 11-08 12:28 | 3 | +79/−31 | fix the second nav bar |
| `84729f7` | 11-08 12:38 | 3 | +7/−10 | fix the allignment of theme toggle button |
| `194c127` | 11-08 12:43 | 1 | +27/−8 | fix the bug in the styling of the header component |
| `cbe7aba` | 11-08 12:46 | 4 | +45/−90 | revert some changes |
| `a65dda1` | 11-08 12:50 | 1 | +3/−5 | fix the brand name truncation issue in the product card component |
| `b741165` | 11-08 12:55 | 1 | +8/−20 | fix the theme toggle button |
| `2c834b2` | 11-08 13:07 | 2 | +103/−63 | fix the second navigation bar to be responsive… |
| `74e6747` | 11-08 13:08 | 1 | +2/−1 | fix the css |
| `f28e89c` | 11-08 13:13 | 1 | +8/−2 | fix the allignment |
| `bf1ade3` | 11-08 13:18 | 1 | +1/−1 | fix the left allignment |
| `c16c2a9` | 11-08 13:25 | 1 | +2/−2 | still fixing the left allignment |
| `170d2a5` | 11-08 13:32 | 1 | +2/−6 | fix the allignment of the left side of the page |
| `1ca53d7` | 11-08 13:44 | 2 | +16/−10 | fixing the bug while adding left allignment |
| `f0e2ac8` | 11-08 13:49 | 1 | +2/−2 | final fix the left allignment |
| `17247be` | 11-08 13:52 | 1 | +2/−2 | some changes in index.css |
| `375633a` | 11-08 14:47 | 7 | +1094/−434 | started to redesign the website |
| `82700b5` | 11-08 14:52 | 1 | +2/−0 | fix the layout |
| `0e4cb07` | 11-08 15:03 | 3 | +8/−73 | remove the profile icon and replace with signout button |
| `40f7347` | 11-08 15:23 | 6 | +481/−166 | fixing the issue while redesign |
| `44aaa93` | 11-08 15:38 | 3 | +181/−124 | update the profile view |
| `1c02d20` | 11-08 16:38 | 22 | +3547/−2248 | complete redesign of daily log |
| `a7441a7` | 11-08 17:47 | 8 | +504/−374 | fix the daily log |
| `998e191` | 11-08 17:54 | 1 | +34/−2 | fix the save history issue |
| `e875e3f` | 11-08 18:07 | 3 | +22/−8 | fix the bug created in daily log |
| `1217621` | 11-08 18:13 | 1 | +1/−1 | fix the delete activities behavior |
| `e5547b4` | 11-08 18:25 | 2 | +31/−152 | add day specific activities |
| `4bd2c54` | 11-08 18:26 | 1 | +1/−0 | fix the full log activity |
| `4f6d941` | 11-08 18:41 | 5 | +378/−156 | improve the full log view |
| `3d680fd` | 11-08 19:05 | 11 | +1099/−220 | implement the fast daily tracker |
| `bf5599f` | 11-08 19:08 | 11 | +220/−1099 | revert the chnages |
| `0bffcd4` | 11-08 19:14 | 2 | +79/−29 | simplified the daily log |
| `625546d` | 11-08 19:24 | 2 | +53/−49 | compact the daily log |
| `b462157` | 11-08 20:27 | 3 | +80/−53 | making daily log compact and faster |
| `e861024` | 11-08 20:47 | 5 | +83/−533 | improve the sleep card |
| `7e687e4` | 11-08 20:51 | 5 | +48/−89 | improved the styling of the DailyTracker component… |
| `30b20f5` | 11-08 20:57 | 3 | +14/−59 | fix the css color |
| `71d863f` | 11-08 21:00 | 1 | +8/−7 | fix the sleep box |
| `69281fd` | 11-08 21:03 | 1 | +4/−4 | fix the layout and font of sleep box |
| `e97ce26` | 11-08 21:19 | 1 | +14/−12 | improve the UI of the daily tracker and fix some bugs in the activity card |
| `a7c7956` | 11-09 20:04 | 5 | +229/−56 | improving the profile view |
| `d8add37` | 11-09 20:55 | 3 | +271/−100 | improve the layout and styling of the daily tracker and full log |
| `3425499` | 11-09 21:12 | 2 | +78/−80 | improve the color of website |
| `306e9c0` | 11-09 21:35 | 4 | +259/−125 | still need to add the functionality to delete a day… |
| `80d7954` | 11-09 21:50 | 3 | +30/−20 | adjusting the heatmap layout |
| `aae58ef` | 11-09 22:26 | 1 | +36/−5 | update the layout of profile page and add a new component for daily tracker |
| `a7566b5` | 11-09 22:30 | 1 | +14/−24 | adjust the layout |
| `b1c0ad8` | 11-09 22:37 | 1 | +16/−4 | still fixing the layout issues |
| `6ddd447` | 11-09 22:45 | 1 | +6/−2 | fix the layout |
| `6be5650` | 11-09 22:52 | 1 | +31/−4 | fix the layout of profile |
| `cf26354` | 11-09 23:03 | 2 | +18/−47 | fix the layout of profile |
| `168a08b` | 11-09 23:11 | 2 | +30/−0 | fix the layout of profile |
| `cf555e7` | 11-09 23:18 | 1 | +11/−6 | fix the layout of profile |
| `3899097` | 11-09 23:27 | 4 | +83/−73 | fix the layout of profile |
| `927b80b` | 11-09 23:35 | 4 | +124/−28 | fix the layout of profile |
| `3d20de9` | 11-09 23:46 | 2 | +321/−474 | fixing full log |
| `f16ef9a` | 11-09 23:53 | 3 | +153/−362 | fix full log |
| `c5a8723` | 11-10 00:00 | 2 | +47/−31 | fixing the full log |
| `27ef3c1` | 11-10 00:08 | 2 | +46/−25 | fixing the full log |
| `941e321` | 11-10 00:26 | 2 | +157/−60 | fixing the full log |
| `7be7a41` | 11-10 00:33 | 1 | +23/−21 | fixing the daily log |
| `ef82a8a` | 11-10 00:37 | 1 | +24/−26 | fixing the daily log |
| `49cb609` | 11-10 00:41 | 1 | +11/−6 | fixing the daily log |
| `9975310` | 11-10 00:44 | 1 | +22/−16 | fixing the daily log |
| `3c8e548` | 11-10 00:55 | 4 | +106/−91 | fixing the full log |
| `ebf2626` | 11-10 01:01 | 2 | +16/−8 | fixing the full log |
| `6f4c963` | 11-10 01:13 | 2 | +48/−24 | fixing the daily log |
| `85525b4` | 11-10 01:23 | 2 | +55/−101 | fixing the daily log |
| `4575d2b` | 11-10 01:36 | 1 | +13/−7 | fixing the daily log |
| `77d3751` | 11-10 02:06 | 12 | +636/−147 | improving the styling of website |
| `d650b9a` | 11-10 02:20 | 8 | +109/−64 | improving the performance of website |
| `04020f5` | 11-10 02:38 | 7 | +74/−119 | improving the tracker ui |
| `7467567` | 11-10 02:47 | 1 | +2/−2 | fix the ui |
| `1013afd` | 11-10 02:52 | 3 | +12/−11 | improve the color gradient |
| `1544930` | 11-10 02:56 | 4 | +7/−6 | improve the chart color and add a tooltip for better user experience |
| `6033a9a` | 11-10 03:00 | 4 | +36/−10 | fix the chart color mismatch |
| `e67b61e` | 11-10 03:13 | 5 | +223/−160 | add graph view |
| `1c4a518` | 11-10 03:20 | 5 | +112/−26 | update the graph view |
| `6f6b566` | 11-10 03:29 | 3 | +3/−51 | fixed the graph |
| `09af667` | 11-10 13:48 | 6 | +109/−42 | improve the performance of website to load fast |
| `cc5a880` | 11-10 13:58 | 1 | +52/−6 | build cache for daily log history |
| `cefa697` | 11-10 14:13 | 11 | +304/−97 | still improving the speed of website |
| `e7d5494` | 11-10 14:31 | 7 | +187/−153 | improve the heatmap draw |
| `409ea67` | 11-10 14:39 | 2 | +57/−18 | fix the tooltip for the sleep study chart… |
| `d9bdccb` | 11-10 14:46 | 2 | +29/−26 | fix the tooltip for the sleep study chart… |
| `2582e36` | 11-10 14:51 | 2 | +27/−60 | fix the tooltip for the sleep study chart… |
| `d9c06ab` | 11-10 14:53 | 1 | +2/−0 | fix the bug in tooltip |
| `67c10dd` | 11-10 14:58 | 2 | +13/−17 | match the tooltip with heatmap |
| `d840f34` | 11-10 15:13 | 2 | +69/−10 | fix the tooltip for the sleep study chart… |
| `aa9c9fa` | 11-10 15:17 | 2 | +3/−3 | enlarge the size of point in graphs and charts for better visibility |
| `3c2ffc5` | 11-10 15:20 | 2 | +3/−3 | enlarge the point in graph for better visibility |
| `32cbacd` | 11-10 15:28 | 2 | +222/−85 | improve the full log view for better readability and usability |
| `feb1c35` | 11-10 15:35 | 2 | +52/−157 | improve the full log |
| `94834d8` | 11-10 15:37 | 1 | +35/−17 | improve the full log |
| `3c193f0` | 11-10 15:42 | 1 | +23/−20 | improve the daily log |
| `aaadebb` | 11-10 15:47 | 1 | +10/−28 | improve the daily log |
| `25fc801` | 11-10 15:54 | 1 | +1/−1 | improve the daily log |
| `0020000` | 11-10 16:09 | 7 | +118/−33 | improve the layout of public profile |
| `ce99671` | 11-10 16:26 | 8 | +454/−258 | fix the public profile layout |
| `7074172` | 11-10 16:58 | 6 | +165/−70 | improve the daily log |
| `980d4b4` | 11-10 17:04 | 6 | +70/−165 | revert changes |
| `72441fb` | 11-10 17:10 | 3 | +93/−153 | fixing the layout of daily log |
| `b697190` | 11-10 17:34 | 5 | +266/−258 | restructure the public profile layout |
| `e7911f6` | 11-10 17:51 | 3 | +84/−73 | adjust the spacing in full log |
| `5bfb455` | 11-10 18:04 | 6 | +451/−35 | build custom date picker |
| `0b1274f` | 11-10 18:09 | 5 | +101/−82 | built custom hover tooltip |
| `b819af4` | 11-10 18:16 | 3 | +30/−14 | improve the border style |
| `1f5367b` | 11-10 18:30 | 13 | +52/−182 | clean up the code |
| `d17317e` | 11-10 19:43 | 86 | +8946/−8076 | Refactor the whole codebbase for better reading and maintainability |
| `ff8ff07` | 11-10 19:50 | 5 | +24/−8 | increase the font size |
| `5a37609` | 11-10 19:57 | 3 | +63/−10 | enlarge the brand name and logo |
| `f45bc61` | 11-10 20:00 | 1 | +14/−1 | fix the tooltip |
| `810e53e` | 11-10 20:22 | 21 | +724/−847 | add readme and architecture docs |
| `9641640` | 11-10 20:28 | 1 | +50/−27 | update the readme |
| `b9de7f7` | 11-10 20:56 | 2 | +8/−1 | add .env example file to the project |
| `7df1576` | 11-12 12:34 | 7 | +147/−77 | update the readme and add supabase auth |
| `17b2845` | 11-12 12:44 | 1 | +1/−1 | Update live application URL in README |
| `f20e59d` | 11-12 12:46 | 2 | +7/−5 | update the link in readme and architecture files |
| `ac2b49e` | 11-12 12:47 | merge | — | Merge branch 'main' of https://github.com/rehnx95/Track-Sheet |
| `4ddf36f` | 11-12 12:49 | 1 | +1/−1 | update the link |

*`ac2b49e` is a merge commit with no diff of its own. It merges `f20e59d` with the GitHub-side commit `17b2845` (the README URL update made under the author name "Rehan").*