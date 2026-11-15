# Momentum

**A personal progress workspace for turning consistent effort into visible
progress.**

[![CI](https://github.com/rehnx95/Track-Sheet/actions/workflows/ci.yml/badge.svg)](https://github.com/rehnx95/Track-Sheet/actions/workflows/ci.yml)

Momentum brings structured learning, daily routines, and personal analytics
into one account-based workspace. People can build a learning track for any
subject, record daily activity and sleep, and review how their habits develop
over time. Coding practice is one use case, supported by included DSA and
Backend tracks.

**Live application:** [Open Momentum](https://momentum-rehnx.vercel.app/)

## Product capabilities

- **Organize learning.** Work through a built-in track or create a private
  track from a text file. Search, filter, expand, and update problem states.
- **Record daily activity.** Log sleep and activity intervals, then revisit
  previous entries in the paginated Full Log, with expandable day details and
  filters for recorded activities, sleep, and unlogged time.
- **Understand progress.** Review completion totals, streaks, activity
  history, and sleep/study visualizations.
- **Share selectively.** Find profiles by username and share a curated
  progress view with other signed-in users; private sheet content and account
  details stay private.
- **Keep ownership of your data.** Export progress and restore it to a
  matching learning track.

## Engineering highlights

- **Account isolation:** Supabase Auth identifies users; PostgreSQL row-level
  security enforces ownership. Public profile data is returned through
  purpose-built functions rather than broad table access.
- **Consistent analytics:** Solved progress is the source for active-day
  metrics. A database trigger updates persisted activity counts in the same
  transaction as progress changes.
- **Reliable time tracking:** Daily Log validates intervals, serializes
  autosaves, detects changes made elsewhere before overwriting a saved day,
  and splits running timers at local midnight. Full Log derives unlogged time
  from the parts of each day not covered by recorded activity or sleep.
- **Account-safe browser state:** Momentum-scoped local caches are cleared on
  sign-out and when switching accounts, while caches remain a performance
  layer rather than a cross-device source of truth.
- **Responsive workspace:** Tracker controls, Daily Log, Full Log, and the
  application header adapt to smaller screens.
- **Extensible learning tracks:** Built-in text sources compile to JSON;
  uploaded tracks are parsed, validated, and assigned namespaced problem IDs.
- **Production checks:** GitHub Actions runs lint, tests, and a production
  build on pushes and pull requests.

## Technology

| Area                    | Stack                                                    |
| ----------------------- | -------------------------------------------------------- |
| UI                      | React 18, JavaScript, Tailwind CSS, component-scoped CSS |
| Build and development   | Vite 5                                                   |
| Authentication and data | Supabase Auth, PostgreSQL, PostgREST, RLS, SQL functions |
| Hosting and API         | Vercel                                                   |
| Tests and CI            | Vitest, Testing Library, GitHub Actions                  |
| Icons                   | Lucide React                                             |

## Repository map

```text
src/
  features/
    activity/         Heatmap and sleep/study charts
    auth/             Sign-in, onboarding, and auth state
    daily-log/        Day and Full Log UI, hooks, and data model
    dashboard/        Signed-in composition and tracker controls
    people/           People search and public profiles
    problem-tracker/  Problem tree, progress, and filtering
    profile/          Profile views, metrics, and backup
    sheets/           Track library, templates, and TXT parsing
    testing/          Test-mode-only sample data tools
  shared/
    components/       Reusable interface components
    lib/              Supabase client and browser data cache
    utils/            Shared date and time logic
  styles/             Global theme, layout, and responsive styles
api/                  Vercel username-search endpoint
docs/
  architecture.md     System design, data flows, and deployment guide
  screenshots/        Product previews
  archive/            Supporting engineering history
source/               Editable text sources for bundled tracks
supabase/migrations/  Database schema, policies, and SQL functions
```

Feature-specific behavior stays with its feature. Component styles live
beside their components; shared UI and cross-feature utilities live under
`src/shared/`.

## Run locally

**Prerequisites:** Node.js, npm, and a Supabase project.

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`, then
open the local Vite URL (port `5173`). Configure Google sign-in and apply the
Supabase migrations before testing authenticated workflows. For complete
instructions, see [Local development and deployment](./docs/architecture.md#local-development-and-deployment).

Use `npx vercel dev` instead of `npm run dev` when you need to exercise
`/api/search` locally.

## Test with sample data

Use your existing Supabase project with a **dedicated second Google account**.
The seeder writes only for the currently signed-in user through Supabase RLS;
verify the displayed email before confirming. Allow `http://localhost:5174`
in Supabase Auth's redirect URLs. The local test mode inherits the existing
project URL and publishable key from `.env`:

```powershell
Copy-Item .env.test.example .env.test.local
npm run dev:test
```

Create or sign in with the second account on the live site, then sign in with
that same account at `http://localhost:5174`. The **Generate sample data** and
**Remove sample data** buttons appear beside the theme control in the local header.
Generated history then appears for that account on both the local app and the
live site. It includes irregular Daily Log entries across the last 365 days
and solved/skipped problem history across 2025 and the current year. Removing
data clears all Daily Log, problem-progress, and activity-history records for
the signed-in account; profile details and learning sheets remain. These
controls are available only in the test-mode development server and use the
signed-in session, not a service-role key.

## Useful commands

```bash
npm test                 # Run unit tests
npm run lint             # Check JavaScript and JSX
npm run build            # Create the production bundle
npm run preview          # Preview the production bundle locally
npm run convert-sheet    # Regenerate bundled JSON from source/ text files
```

## Documentation

- [Architecture and operations](./docs/architecture.md) — system boundaries,
  source ownership, data flows, security model, migrations, and deployment.
- [Development history](./docs/archive/commit-history.md) — project evolution
  and notable engineering changes.
- [Learning-track sources](./source/) — editable text sources for bundled
  templates.

### Product screenshots

#### Dark theme

- [Tracker dashboard](./docs/screenshots/tracker-dashboard.png)
- [Expanded tracker category](./docs/screenshots/tracker-expanded-category.png)
- [Daily Log](./docs/screenshots/daily-log.png)
- [Full Log](./docs/screenshots/full-log.png)
- [Expanded Full Log day](./docs/screenshots/full-log-expanded-day.png)
- [Trends](./docs/screenshots/trends.png)
- [People search](./docs/screenshots/people-search.png)
- [Profile](./docs/screenshots/profile.png)

#### Light theme

- [Tracker dashboard](./docs/screenshots/tracker-dashboard-light.png)
- [Expanded tracker category](./docs/screenshots/tracker-expanded-category-light.png)
- [Daily Log](./docs/screenshots/daily-log-light.png)
- [Full Log](./docs/screenshots/full-log-light.png)
- [Expanded Full Log day](./docs/screenshots/full-log-expanded-day-light.png)
- [Trends](./docs/screenshots/trends-light.png)
- [People search](./docs/screenshots/people-search-light.png)
- [Profile](./docs/screenshots/profile-light.png)
