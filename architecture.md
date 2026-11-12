# Momentum — Architecture and Operations

This document is a guided map of the Momentum codebase and its runtime.
It explains what each major part does, how a user action travels through the
browser and backend, where data is stored, and how to develop and operate the
application.

It is intended for someone new to the project: start with the system overview
and startup flow, then use the source map and feature flows to find the code
that owns a behavior.

## 1. Product and system at a glance

Momentum is a multi-user personal progress workspace. It brings learning
plans, daily routines, and progress reflection together. Coding practice is
one supported use case: users can work through the included DSA and Backend
problem sheets or upload private TXT learning tracks, save completion states,
review activity and streaks, record sleep and study time, and share a curated
profile. The feature structure is organized around these reusable progress
tools rather than one specific subject or built-in sheet.

```text
┌────────────────────────────── Browser ────────────────────────────────┐
│ React 18 + Vite SPA                                                   │
│                                                                       │
│  Screens and feature hooks                                            │
│       ├── Supabase Auth: Google sign-in and session                    │
│       ├── Supabase JS: owner-scoped table queries and SQL RPCs         │
│       ├── localStorage: selected sheet, filters, theme, caches         │
│       └── /api/search: authenticated username-prefix search            │
└──────────────────────────┬───────────────────┬────────────────────────┘
                           │                   │
                 Vercel static hosting         │ Supabase HTTPS APIs
                 and serverless function       │
                           │                   ▼
                           │         ┌──── Supabase project ─────────┐
                           └────────►│ Auth                         │
                                     │ PostgreSQL                    │
                                     │ RLS policies and SQL functions│
                                     └───────────────────────────────┘
```

### Responsibilities

| System part | What it owns |
| --- | --- |
| React application | Screens, interaction state, client-side validation, visualizations, and requests to backend services. |
| Supabase Auth | Google OAuth, signed-in identity, and session restoration/refresh. |
| Supabase data API | HTTPS access to PostgreSQL tables and functions under the current session. |
| PostgreSQL | Account profiles, problem states, activity counts, personal sheets, and daily logs. |
| RLS and SQL functions | Owner isolation and narrowly scoped cross-user profile operations. |
| Vercel | Static application hosting, SPA route fallback, and `api/search.js`. |
| `localStorage` | Browser-specific preferences and short-lived caches; not the cross-device source of truth. |

The browser does **not** make a direct PostgreSQL connection. It uses the
public Supabase anon/publishable key and the signed-in user's access token.
PostgreSQL policies and function permissions decide which rows and operations
are allowed.

## 2. Technology and repository entry points

### Runtime and build

- React 18 renders the single-page application.
- Vite 5 serves development builds and creates the production assets.
- JavaScript modules use ES module syntax.
- Tailwind CSS provides utility classes; regular CSS files define shared
  tokens and focused feature/page layouts.
- `lucide-react` supplies interface icons.
- Vitest runs the existing unit tests.
- Vercel serves the static build and the username-search serverless function.
- Supabase provides identity, PostgreSQL, PostgREST, row-level security, and
  SQL RPCs.

### Root files

| Path | Purpose |
| --- | --- |
| `index.html` | Browser document Vite uses as the SPA entry. |
| `src/main.jsx` | Imports styles, creates the React root, exposes the configured Supabase client for legacy checks, and wraps the app in an error boundary. |
| `src/App.jsx` | Chooses sign-in, onboarding, loading, or authenticated Momentum experience. |
| `vite.config.js` | Vite React plugin and local development port (`5173`). |
| `tailwind.config.js` | Tailwind content scanning, dark-mode configuration, and app color/font tokens. |
| `postcss.config.js` | CSS processing configuration for Tailwind/PostCSS. |
| `vercel.json` | SPA route rewrite to `index.html`; `/api/search` is implemented as a Vercel function. |
| `package.json` | Dependencies and the `dev`, `build`, `test`, `preview`, and `convert-sheet` commands. |
| `api/search.js` | Authenticated username-prefix search endpoint. |
| `scripts/convert-sheet.cjs` | Converts maintained TXT sheet sources into bundled JSON. |
| `scripts/patch-light-theme.cjs`, `scripts/patch-heatmap.cjs` | Repository maintenance/patch utilities; they are not app runtime entry points. |

### Useful npm commands

```bash
npm install
npm run dev
npm test
npm run build
npm run preview
npm run convert-sheet
npm run convert-sheet -- backend.txt
```

`package.json` does not currently define a lint command.

## 3. Application startup and authentication

### Startup sequence

1. `src/main.jsx` imports global styles and mounts `App` inside
   `AppErrorBoundary`. A render exception is logged and shows a reload
   fallback.
2. `src/shared/lib/supabase.js` reads `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY`. Without these values, it reports that
   Supabase is not configured instead of creating a working client.
3. `useAuthentication` checks for a locally cached account/profile to render
   a previously authenticated screen immediately, then asks Supabase Auth to
   restore the current session and subscribes to auth changes.
4. If a signed-in user exists, the hook fetches that user's profile row.
5. The onboarding flag selects the onboarding or signed-in experience.
6. `AuthenticatedApp` loads the user's sheet records. Once sheet bootstrap is
   complete, progress and activity are fetched and the authenticated screens
   are rendered.

The top-level states are `LOADING`, `UNAUTHENTICATED`, `ONBOARDING`, and
`AUTHENTICATED` (`src/features/auth/useAuthentication.js`). People search,
public-profile, daily-log, and settings screens are routes within the signed-in
application; they do not bypass authentication.

### Authentication and account profile

Google OAuth is initiated with Supabase Auth. Supabase exchanges the OAuth
response and returns the browser to the app origin. Provider credentials
belong in Supabase's provider configuration, not frontend source or Vite
variables.

An Auth database trigger creates the initial profile record. Onboarding
collects a display name and username; location and website are optional.
`onboarding_completed` controls whether the account proceeds to the tracker.
Username uniqueness is enforced in the database, and the client also checks
availability through `is_username_available`.

The browser stores a small account/profile cache under
`momentum:account-cache` for quick restoration. Supabase remains the
authority: session restoration and profile refresh still happen. Signing out
clears this cache.

## 4. Routes and navigation

The SPA uses the History API and a `popstate` listener rather than React
Router. Route state and people-search/public-profile loading are grouped in
`src/features/dashboard/usePeopleNavigation.js`; screen selection is in
`AuthenticatedScreens.jsx`.

| URL | Experience | Access |
| --- | --- | --- |
| `/` | Sign-in, onboarding, or personal progress workspace according to account state | Workspace requires sign-in |
| `/profile` | Signed-in profile, metrics, and progress management | Sign-in required |
| `/profile/edit` | Edit name, username, location, and website | Sign-in required |
| `/daily-log` | Daily time tracking and paginated Full Log | Sign-in required |
| `/people` | Search for profiles by username prefix | Sign-in required |
| `/user/:username` | View a curated profile | Sign-in required |
| `/u/:username` | Supported profile URL alias | Sign-in required |
| `/api/search?q=<prefix>` | Username-prefix search API | Valid bearer token required |

`vercel.json` rewrites application routes to `index.html` so the SPA can
interpret a deep link after refresh. The API endpoint is separate from the
client-side screen routes.

## 5. Source tree and ownership map

The code is arranged by feature: behavior used by one product area lives in
that feature; generic UI, shared data access, and cross-feature helpers live
under `shared/`.

```text
src/
  App.jsx
  main.jsx
  features/
    activity/
      components/       ActivityHeatmap, SleepStudyChart and their CSS
      utils/            Heatmap aggregation and date labels
    auth/
      SignInPage.jsx
      OnboardingPage.jsx
      useAuthentication.js
    daily-log/
      components/       DailyTracker, DayView, FullLog, ActivityCard,
                        SlotRow, CustomDatePicker, TimeInput and styles
      hooks/            useDailyLog, activity editing, persistence,
                        history pagination, and timer behavior
      lib/              Daily-log normalization and history caches
    dashboard/
      AuthenticatedApp.jsx
      AuthenticatedScreens.jsx
      TrackerDashboard.jsx
      usePeopleNavigation.js
    people/
      PeopleSearchPage.jsx
      PublicProfilePage.jsx
    problem-tracker/
      components/       ProblemTree.jsx
      hooks/            useProblemTree.js, useProgress.js
    profile/
      components/       ProfileSheetProgress, RecentAcceptedProblems
      hooks/            Profile metrics and progress backup
      pages/            Owner profile and profile settings
    sheets/
      components/       SheetSwitcher and menu
      data/             DSA/Backend JSON templates and bootstrap logic
      hooks/            useSheetLibrary.js
      utils/            TXT parser and sample format
  shared/
    components/         AppHeader, branding, stat strip, tooltip, dialog
    lib/                Supabase client and generic browser data cache
    utils/              Date and time calculations/validation
  styles/                Global tokens and separated layout/theme styles
api/
  search.js
scripts/
source/
supabase/
  migrations/
```

### Main modules

| Module | Responsibility |
| --- | --- |
| `src/App.jsx` | Routes by authentication state and connects the auth hook to the signed-in app. |
| `src/features/auth/useAuthentication.js` | Restores and observes Auth sessions, caches account profile data, fetches profile state, and handles sign-in/out. |
| `src/features/dashboard/AuthenticatedApp.jsx` | Connects sheet, progress, profile-metric, backup, navigation, and dialog hooks. |
| `src/features/dashboard/AuthenticatedScreens.jsx` | Selects people search, public profile, settings, daily log, owner profile, or tracker screen. |
| `src/features/dashboard/TrackerDashboard.jsx` | Presents the learning-track workspace, sheet controls, progress indicators, and dashboard layout. |
| `src/features/dashboard/usePeopleNavigation.js` | Parses routes, handles browser history, debounces search, and loads/caches public profile/activity data. |
| `src/features/problem-tracker/hooks/useProblemTree.js` | Computes sheet counts and filtered problem groups; manages search, filter, skipped visibility, and expansion preferences. |
| `src/features/problem-tracker/hooks/useProgress.js` | Loads and caches saved progress/activity, applies optimistic changes, serializes writes, and manages theme. |
| `src/features/sheets/hooks/useSheetLibrary.js` | Bootstraps and fetches personal sheet copies, selects a sheet, and handles upload and deletion. |
| `src/features/sheets/utils/parseSheet.js` | Validates and parses uploaded TXT sheets; exports a sample format. |
| `src/features/sheets/data/bootstrapBuiltInSheets.js` | Calls the database function that provisions personal copies of bundled templates. |
| `src/features/daily-log/hooks/useDailyLog.js` | Coordinates date/log state, derived values, editing actions, timers, and history. |
| `src/features/daily-log/hooks/useDailyLogActivities.js` | Adds, renames, and removes activities and time slots. |
| `src/features/daily-log/hooks/useDailyLogPersistence.js` | Fetches a day's record, validates edits, queues saves, autosaves, and flushes pending edits. |
| `src/features/daily-log/hooks/useDailyLogHistory.js` | Loads Full Log pages, caches history, and clears account history. |
| `src/features/daily-log/hooks/useDailyLogTimer.js` | Stores active timer state and appends timer/quick-add intervals to the correct day or days. |
| `src/features/daily-log/lib/dailyLogModel.js` | Normalizes records, creates empty daily models, and manages timer storage keys. |
| `src/features/daily-log/lib/dailyLogHistoryCache.js` | Short-lived in-memory/browser cache helpers for daily and full log data. |
| `src/features/profile/hooks/useProfileMetrics.js` | Derives owner profile statistics and recent accepted problems from progress/sheet data. |
| `src/features/profile/hooks/useProgressBackup.js` | Exports explicit done/skipped states and matches imported entries to a target sheet. |
| `src/features/activity/components/ActivityHeatmap.jsx` | Renders activity by date and selected year. |
| `src/features/activity/components/SleepStudyChart.jsx` | Reads owner-only daily logs and visualizes sleep, study, or combined time. |
| `src/shared/lib/supabase.js` | Creates the browser Supabase client from public Vite configuration. |
| `src/shared/lib/userDataCache.js` | Generic user-scoped browser data cache used to render cached state before refresh. |
| `src/shared/utils/time.js` | Time parsing, interval math, duration formatting, and daily validation. |
| `api/search.js` | Validates request shape and caller token, then invokes profile prefix search. |

### Style files

`src/main.jsx` imports shared/global styles in cascade order. `src/styles/`
contains global tokens, auth, dashboard, shared components, theme/status,
tracker, profile, and responsive-layout modules. Daily-log component styles
live beside their components and are imported by `DailyTracker.jsx`.

When moving or splitting CSS, preserve source order: duplicate selectors and
theme overrides can depend on later rules winning the cascade.

## 6. Problem sheets and identifiers

### Template format

Built-in sheets are JSON bundled into the application:

- `src/features/sheets/data/dsa.json`
- `src/features/sheets/data/backend.json`

Each sheet contains ordered steps, subsections, and problems:

```text
sheet
└── steps[]
    ├── id
    ├── title
    └── subsections[]
        ├── id
        ├── title
        └── problems[]
            ├── id
            ├── title
            ├── lc?           optional external problem number
            └── defaultSkip?  optional initial skip state
```

The file name is the template ID (`dsa.json` becomes `dsa`). Bundled templates
are source material, not the live per-user sheet rows.

### Per-user copies and problem IDs

After sign-in, bootstrap code sends template IDs, titles, and JSON to
`ensure_builtin_sheet_copies(requested_sheets)`. The SQL function creates
personal copies for the signed-in user. Existing copies are not overwritten
when the bundled JSON changes, protecting saved content and progress.

Every database-backed sheet copy has a UUID and a frontend sheet ID:

```text
custom-<user_sheets UUID>
```

Problem identifiers are prefixed with that sheet ID to prevent collisions
between sheets that contain the same local problem ID:

```text
custom-<user_sheets UUID>::<local problem ID>
```

The personal-copy bootstrap migrates legacy built-in problem identifiers on
initial provisioning where necessary. Deleted built-in copies get a per-user
tombstone so a later bootstrap does not recreate them.

### Upload format

The browser accepts `.txt` files up to 2 MB. `parseSheet` recognizes numbered
step headings, optional subsection headings, numbered problem lines, and
optional `(LC N)` and `(Skip)` markers. It normalizes line endings, handles
common joined-line formatting cases, validates IDs/titles, and returns the
same JSON shape used by bundled sheets.

The upload flow is:

1. Validate extension and size in `useSheetLibrary`.
2. Read and parse the text in the browser.
3. Derive a display title from the filename.
4. Insert `{ user_id, title, source_name, sheet_data }` into `user_sheets`.
5. Add the returned user-owned sheet to the in-memory list and select it.

For built-in changes, edit the source TXT in `source/`, run
`npm run convert-sheet`, review the generated JSON, and keep source and
generated output together in the change.

### Deletion

The client calls `delete_user_sheet(UUID)`, not a broad direct delete. The
function verifies ownership, removes the sheet's progress, applies matching
activity-count deltas, removes the sheet row, and writes a built-in deletion
tombstone when applicable. Other accounts and shared template files are not
affected.

## 7. Progress, activity, and persistence

### Problem state model

Progress is stored by `(user_id, problem_id)` with the values:

- `todo`
- `done`
- `skipped`

An absent progress row is treated as `todo`, unless the sheet's
`defaultSkip` flag indicates a default skipped problem and the user has not
saved an override.

`useProgress` loads non-default progress rows and the user's `activity_log`.
It checks the local user-data cache first so the interface can render cached
state while cloud data refreshes. When a user changes a problem, it updates
React state immediately, then appends the database operation to a per-hook
promise queue. This preserves order for rapid sequential writes in one browser
session. A failed operation is logged and reported through a visible sync
error.

This is optimistic synchronization, not a durable offline queue. Changes
still pending when the browser is closed are not guaranteed to reach the
database.

### Completion and streak dates

When a problem becomes done, the frontend records:

- `completed_on`: the current local date as `YYYY-MM-DD`;
- `updated_at`: an ISO timestamp.

It updates `activity_log` counts for the affected completion date. Removing
done status subtracts from the original completion date; skipped states do
not add activity. Bulk backup imports use the same progress persistence path.

The signed-in owner's heatmap and streaks read `activity_log`. Public profile
activity is derived by SQL from completed progress records, preferring
`completed_on` and falling back to the UTC date of `updated_at` for older
records. These are separate read paths, so drift in activity counts can make
owner and public heatmaps differ.

### Browser caches and preferences

| Key/data | Purpose | Scope |
| --- | --- | --- |
| `momentum:account-cache` | Cached user identity and profile for faster account-screen restoration | Browser |
| `theme` | Dark/light theme choice | Browser |
| `momentum:learning-active-sheet` | Selected learning track ID | Browser |
| `momentum:learning-search` | Learning-track search text | Browser |
| `momentum:learning-filter` | Learning-track progress filter | Browser |
| `momentum:learning-hide-skipped` | Skipped-item visibility | Browser |
| `momentum:learning-expanded-steps`, `momentum:learning-expanded-subs` | Expanded learning-track tree items | Browser |
| `momentum:user-data:*` | Cached sheets and progress | Browser, keyed by account and section |
| `momentum:log-history:*`, `momentum:day-log:*`, `momentum:full-log:*` | Cached Daily Log entries and history | Browser, keyed by account |
| `momentum:running-timer:*` | Running timer details | Browser, keyed by account |
| `momentum:builtins:*` | Built-in learning-track setup version | Browser, keyed by account |

Browser caches improve initial rendering; Supabase remains the persistent
source of truth for account data. Preferences do not automatically migrate
between devices.

## 8. Daily Log and chart flows

### Daily editing

The Daily Log route lazy-loads `DailyTracker.jsx`. `useDailyLog` composes
focused hooks for activity editing, persistence, history, and timers. A daily
record includes sleep/wake times and a JSON array of custom activities; each
activity can contain time slots. The `daily_logs` table retains some legacy
columns for compatibility, but current writes store activity data in
`custom_tasks` and write empty legacy slot/hour fields.

The daily edit/save flow:

1. Initialize the selected date and normalized log from the account-scoped
   cache when available.
2. Fetch that user's `daily_logs` row for the date.
3. Let activity/slot callbacks update the React log and its synchronous ref.
4. Validate sleep and activity intervals with `shared/utils/time.js`.
5. Autosave valid edits after a short debounce; explicit navigation/date
   changes flush pending saves first.
6. Serialize saves, upsert the date row, refresh caches, and surface errors
   instead of discarding edits.

### Timers and quick-add

Starting a timer stores its activity ID/name/color and start timestamp in
`localStorage`, so a reload can restore its state. Stopping a timer splits the
elapsed interval at midnight. Segments for the selected date are merged into
the current draft; segments for other dates are fetched and saved to their
respective daily-log rows. Quick-add uses the same cross-midnight split model.
If validation or a write fails, the operation reports the failure and keeps
the timer available for retry.

### Full Log

Full Log data is loaded only when selected. The history hook:

- uses a one-minute cache;
- fetches ten rows per page plus one extra row to detect more history;
- orders rows newest first;
- supports loading one older page or all older pages;
- coordinates history clearing with pending daily saves and invalidates
  affected caches.

### Sleep/study charts

The owner-only chart reads the latest 30 days of `daily_logs` under the
owner's RLS policy, computes sleep and study durations, and renders SVG line
charts for sleep, study, or both. It uses a `ResizeObserver` to size the graph
to its container. These detailed daily logs are not returned by the public
profile SQL functions.

## 9. Profiles, activity heatmaps, and backup

### Owner profile

The signed-in profile combines:

- Auth email and profile fields;
- per-sheet solved/skipped totals and progress bars;
- current and longest streak, active-day count, and recent accepted problems;
- year-selectable activity heatmap;
- sleep, study, and combined 30-day charts;
- progress export/import and reset actions.

`useProfileMetrics` derives summary data from the currently available sheets,
progress, and completion timestamps. Profile backup actions are kept in
`useProgressBackup`.

### Public profile

The public profile route uses `get_public_profile` for a selected subset of
profile and progress summary fields and `get_public_activity` for the
year-selectable activity data. Public data is cached in memory by username
and refreshed while the page is open/on focus. The return shape is limited:
email, Auth IDs, pending work, user settings, and raw uploaded sheet JSON must
not be exposed.

Profile URLs require a signed-in caller; “public” means visible to other
authenticated Momentum users, not anonymous internet access.

### Progress backups

Export creates a JSON object of explicit `done` and `skipped` problem states
for one selected sheet. Import validates the file and matches problems by
direct namespaced ID, then local ID/title, then unambiguous normalized title.
This lets a backup work with a matching sheet copy whose UUID changed.
Unmatched or ambiguous items are not imported. Successful changes go through
the normal queued progress-save path.

## 10. Database model

Timestamped SQL in `supabase/migrations/` is the authoritative schema and
policy history. Apply migrations in timestamp order to a new project; for an
existing project, apply only migrations not already recorded as applied.

### Tables

| Table | Contents and key |
| --- | --- |
| `profiles` | One account profile per Auth user. Display name, unique username, optional location/website, onboarding state, and related profile settings. ID is linked to the Auth user. |
| `progress` | Explicit problem states and completion timestamps. Composite identity is `(user_id, problem_id)`. |
| `activity_log` | Per-user solved counts by date. Composite identity is `(user_id, date)`. |
| `user_sheets` | A user's sheet title, source name, JSON data, created time, and optional built-in template ID. |
| `user_deleted_builtin_sheets` | Tombstones keyed by `(user_id, sheet_id)` to prevent deleted built-in copies from being bootstrapped again. |
| `daily_logs` | Per-user day keyed by `(user_id, date)`, sleep/wake times, and JSON activity slots/tasks. Contains legacy fields retained by migrations for compatibility. |
| `user_settings` | Legacy owner-scoped settings table. Active tracker preferences are currently stored in browser localStorage. |
| `user_hidden_sheets` | Legacy table created by an earlier migration; its entries are copied into deletion tombstones and the table is removed by the personal-sheet migration. |

Foreign keys cascade account-owned rows when the owning identity is removed.
Indexes support per-user history retrieval, progress lookup, unique built-in
copies, and username prefix search.

### Access control

RLS is enabled on account-owned data. Direct table operations use the signed-in
user identity (`auth.uid()`) to restrict access to the caller's own records.
Cross-user discovery does not grant broad profile-table reads; it uses
purpose-specific SQL functions with constrained return fields.

Sensitive SQL functions use `SECURITY DEFINER`, a fixed `search_path`, and
restricted execution grants. Do not widen these grants or returned data
without reviewing the privacy implications.

### Important SQL functions

| Function | Role |
| --- | --- |
| `is_username_available(candidate_username)` | Checks a candidate username while excluding the caller's own profile. |
| `search_public_profiles(search_term)` | Returns a small set of onboarding-complete username-prefix matches. |
| `get_public_profile(requested_username, requested_today)` | Returns selected profile fields, safe sheet summaries, streak/activity summary, and recent accepted items. |
| `get_public_activity(requested_username, requested_today, requested_year)` | Returns public activity counts and available activity years. |
| `ensure_builtin_sheet_copies(requested_sheets)` | Creates missing personal copies and performs supported initial legacy progress migration. |
| `delete_user_sheet(requested_sheet_id)` | Verifies ownership and deletes sheet-specific data and activity effects. |

The exact signatures and grants are defined by the latest migrations. If the
client calls a signature not installed in the target project, profile or
sheet loading will fail with a visible error.

## 11. People search API

`GET /api/search?q=<prefix>` is implemented in `api/search.js`. It:

1. sets `private, no-store` cache policy and varies on `Authorization`;
2. accepts GET only;
3. validates a 3–48 character alphanumeric/hyphen prefix;
4. extracts a bearer token and rejects missing tokens;
5. creates a Supabase client using the publishable key and caller token;
6. validates the caller with Supabase Auth `getUser(token)`;
7. invokes `search_public_profiles` as that authenticated caller;
8. returns at most five `{ username, name }` matches.

The endpoint does not use a service-role key. It reads the same
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` variables as the
browser client. In Vercel, configure these variables for both the build and
serverless function runtime.

## 12. Migration history

Migrations should be applied in filename/timestamp order. These descriptions
summarize the purpose of each committed file; inspect the SQL before changing
or replaying it.

| Migration | Main change |
| --- | --- |
| `20261020165100_multi_user_auth_profiles.sql` | Adds profiles, progress, activity, legacy settings, signup profile trigger, username availability, owner RLS, and supporting indexes. |
| `20261020170900_activity_calendar_streaks.sql` | Adds completion-date support and backfills/rebuilds activity history. |
| `20261020174800_decouple_auth_signup_from_user_settings.sql` | Removes the signup trigger's dependency on a legacy settings row. |
| `20261020175400_remove_bio_signup_dependency.sql` | Removes the signup trigger's dependency on a legacy bio field. |
| `20261021003000_user_uploaded_sheets.sql` | Adds private uploaded-sheet storage, owner policies, and per-user lookup index. |
| `20261021012200_public_profile_search.sql` | Introduces authenticated profile search and public-profile functions. |
| `20261021013500_public_profile_search_long_usernames.sql` | Expands supported generated/long username behavior. |
| `20261021025300_indexed_user_search_limit.sql` | Adds case-insensitive username prefix index and limits results. |
| `20261021031600_public_profile_full_data.sql` | Expands the curated profile summary fields needed by profile views. |
| `20261021035000_public_profile_activity_dates.sql` | Uses the local-date-aware profile-function signature and completion-date logic. |
| `20261021120000_delete_uploaded_sheets.sql` | Adds ownership-checked sheet deletion with progress/activity cleanup. |
| `20261021133000_user_hidden_sheets.sql` | Adds the previous hidden-sheet tracking model. |
| `20261021180000_personal_sheet_copies.sql` | Adds per-user built-in copies, deletion tombstones, legacy ID migration, and current bootstrap/deletion RPCs; migrates and removes the old hidden-sheet table. |
| `20261025000000_public_activity_by_year.sql` | Adds year-selectable public activity RPC. |
| `20261103000000_daily_logs.sql` | Creates daily-log storage, migrates old interval fields, enables owner RLS, and adds a user/date index. |
| `20261103000001_daily_log_preferences.sql` | Adds profile-level daily-log preference columns. |
| `20261108150000_daily_log_sanity.sql` | Adds a study-total database constraint and removes an obsolete profile column. |

Migrations are not an application-startup task. They must be applied through
the Supabase SQL editor or the project's migration workflow before features
that depend on them are deployed.

## 13. Environment and configuration

### Shared Supabase environment

| Variable | Required for | Value |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser and `/api/search` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser and `/api/search` | Supabase publishable key |

Vite only exposes `VITE_`-prefixed variables to browser code. These two values
are public client configuration, so the browser and Vercel function use the
same names. The publishable key does not bypass database access policies.
Never use a Supabase secret or service-role key in either variable.

## 14. Local development and deployment

### Start locally

For the normal frontend development loop:

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Then edit `.env` and replace the two example values with the Supabase
project URL and publishable key. Vite uses port `5173` by default. Keep the
file local; it is ignored by Git. Vite reads both `.env` and `.env.local`;
these instructions use `.env` because it is the simplest filename.

`npm run dev` serves the browser app. To also test Vercel serverless functions
such as `/api/search`, run `npx vercel dev` instead. The first time, Vercel CLI
may ask you to log in and link the local folder to a Vercel project.
Use the normal Vite command unless you specifically need to test `/api/search`.

### Validate changes

```bash
npm test
npm run build
npm run preview
```

Tests currently cover time utilities, user-data caching, daily-log history
caching, and the time-input component. There is no configured lint script or
end-to-end test command in `package.json`.

### Deploy to Vercel

Follow this once for a new Supabase project, then use the short redeploy steps
for future code changes.

#### 1. Prepare Supabase

1. Reuse the existing Supabase project if you want to keep current accounts
   and data. Create a new project only if you intend to start with a separate,
   empty database.
2. Copy the **Project URL** and **Publishable key** from the project's API
   settings.
3. For a brand-new Supabase project, run every `.sql` file from
   `supabase/migrations/` in **SQL Editor**, in filename order, one at a time.
   Do not rerun migrations that are already applied.
4. Never use a Supabase secret or service-role key in the website.

#### 2. Deploy the app to Vercel

1. In Vercel, choose **Add New → Project** and import this GitHub repository.
2. Choose **Framework Preset: Vite** and keep the defaults:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`
3. Before deploying, add these under **Project Settings → Environment
   Variables** for Production and Preview:

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | Supabase Project URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase Publishable key |

4. Click **Deploy**. Copy the resulting production URL and make sure it exactly
   matches the production URL you will add to Supabase and Google.

#### 3. Configure Google sign-in

1. In Google Cloud Console, create/select a project and configure the OAuth
   consent screen. If the app is in Testing mode, add your Google account as a
   test user.
2. Create an OAuth client with application type **Web application**.
3. Add the exact production Momentum origin from Vercel and the local origin
   `http://localhost:5173` to **Authorized JavaScript origins** (origins only,
   with no path).
4. In Supabase **Authentication → Providers → Google**, copy the displayed
   callback URL. It has this form:
   `https://<project-ref>.supabase.co/auth/v1/callback`
5. Add that exact callback URL to Google's **Authorized redirect URIs**. Copy
   Google's Client ID and Client Secret into the Supabase Google provider
   settings and enable the provider.
6. In Supabase **Authentication → URL Configuration**, set **Site URL** to
   the production Momentum URL. Add
   `http://localhost:5173/**` and the production URL with `/**` to
   **Redirect URLs**. Add any Vercel Preview URLs you plan to use as well.

Google sends the OAuth response back to Supabase; Supabase then returns the
user to Momentum. While the Google consent screen is in Testing mode, only
listed test users can sign in. Publish/configure the consent screen before
opening sign-in to other users. Do not put Google's Client Secret in Vercel
or in `.env`.

#### 4. Verify it works

Open the deployed site and test Google sign-in. Then confirm onboarding,
loading sheets, saving progress, Daily Log, and people search. If sign-in
fails, check that the Google callback is the Supabase callback URL and that
the app URL is in Supabase's allowed Redirect URLs.

For later code changes, push to the connected GitHub branch; Vercel builds and
deploys it automatically. Redeploy manually after changing Vercel environment
variables, since changes only apply to new deployments.

The Supabase publishable key is intended for browser use; account access is
restricted by the signed-in session and database policies. Never expose a
Supabase secret or service-role key in Vercel browser variables or the
repository.

## 15. Troubleshooting

| Symptom | Checks |
| --- | --- |
| “Supabase is not configured” | Set both `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; restart the dev server. |
| Google sign-in/callback fails | Check provider setup, Supabase callback, Site URL, and allowed redirects. |
| Owner profile fails to load | Check browser console/network response and confirm profile migrations are applied. |
| Built-in or uploaded sheets fail | Confirm sheet tables/RPC migrations and authenticated owner policies exist. |
| Progress does not sync | Inspect the visible sync error, browser console, network requests, and progress/activity RLS policies. |
| Daily Log cannot load/save | Confirm `daily_logs` migration, owner policy, date row, and request error. |
| People search returns an error | Check Vercel function environment, bearer token, prefix format, and search RPC/grant. |
| Profile summary/activity fails | Check latest public-profile and year-selectable activity migrations and RPC grants. |
| Deep link fails on refresh | Check the Vercel SPA rewrite and ensure the `/api/search` function remains available. |
| Owner and public heatmaps differ | Compare `progress.completed_on`/`updated_at` against `activity_log` for the same dates. |
| Sheet template update is not visible to an existing account | Existing personal copies are intentionally preserved; template bootstrap does not overwrite them. |

## 16. Design boundaries and maintenance notes

- **Authentication is required for profiles.** Profile routes are shareable
  inside the signed-in product but are not anonymous profile pages.
- **Keep public returns curated.** Any expansion of public SQL output is a
  privacy-sensitive change; never include email, Auth IDs, private settings,
  todo rows, or uploaded JSON.
- **Two activity sources exist.** The owner heatmap uses `activity_log`;
  public-profile activity derives from progress completion timestamps.
- **Writes are optimistic, not offline-first.** Queues preserve operation
  order during a live session but do not guarantee durability after closing
  the browser.
- **Preferences are browser-specific.** Current localStorage settings do not
  sync across devices.
- **Personal template copies are durable.** Template JSON changes only affect
  new copies unless a dedicated migration is designed.
- **Preserve route and API separation.** Add client pages through route state
  and keep serverless endpoints available alongside the SPA rewrite.
- **CSS order matters.** Feature CSS is imported in component files; global
  styles are imported from `main.jsx`. Preserve cascade order when splitting
  or moving rules.
- **Keep side effects in the owning feature.** Shared modules should contain
  behavior genuinely reused across features, not become a general dumping
  ground.
