# Momentum

**A personal progress workspace for turning consistent effort into visible
progress.**

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
  previous entries in the paginated Full Log.
- **Understand progress.** Review completion totals, streaks, activity
  history, and sleep/study visualizations.
- **Share selectively.** Find profiles by username and share a curated
  progress view with other signed-in users; private sheet content and account
  details stay private.
- **Keep ownership of your data.** Export progress and restore it to a
  matching learning track.

## Engineering highlights

- Feature-oriented React modules separate authentication, learning tracks,
  problem progress, Daily Log, profiles, and analytics.
- Supabase Auth and PostgreSQL row-level security scope account data to the
  signed-in user. Public profile reads use purpose-specific database
  functions that return curated fields.
- Optimistic progress updates and account-scoped browser caches keep the
  interface responsive while server data remains authoritative.
- Daily Log state, editing, persistence, history, and timer behavior are
  separated into focused hooks.
- Vite builds the SPA; Vercel hosts the application and authenticated
  username-search endpoint.

## Technology

| Area | Stack |
| --- | --- |
| UI | React 18, JavaScript, Tailwind CSS, component-scoped CSS |
| Build and development | Vite 5 |
| Authentication and data | Supabase Auth, PostgreSQL, PostgREST, RLS, SQL functions |
| Hosting and API | Vercel |
| Tests | Vitest |
| Icons | Lucide React |

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
  shared/
    components/       Reusable interface components
    lib/              Supabase client and browser data cache
    utils/            Shared date and time logic
  styles/             Global theme, layout, and responsive styles
api/                  Vercel username-search endpoint
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
instructions, see [Local development and deployment](./architecture.md#local-development-and-deployment).

Use `npx vercel dev` instead of `npm run dev` when you need to exercise
`/api/search` locally.

## Useful commands

```bash
npm test                 # Run unit tests
npm run build            # Create the production bundle
npm run preview          # Preview the production bundle locally
npm run convert-sheet    # Regenerate bundled JSON from source/ text files
```

## Documentation

- [Architecture and operations](./architecture.md) — system boundaries,
  source ownership, data flows, security model, migrations, and deployment.
- [Learning-track sources](./source/) — editable text sources for bundled
  templates.
