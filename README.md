# Momentum

**A personal progress workspace for the things you want to keep moving.**

Momentum brings learning tracks, daily routines, and personal progress into
one place. Organize a learning plan, log daily activities and sleep, and use
progress summaries to understand your consistency over time. Coding practice
is supported alongside personal tracks for other subjects. Profiles let you
share a curated view of your learning journey.

**Live application:** [tracksheet-rehnx.vercel.app](https://tracksheet-rehnx.vercel.app/)

## Why Momentum

Progress is easier to sustain when plans, daily effort, and reflection live
together. Momentum turns a learning goal into a track of manageable tasks,
lets you record time spent on activities and sleep, and makes consistency
visible through summaries and history.

The product is designed to work beyond a single curriculum. It includes DSA
and Backend learning tracks, while personal tracks can represent another
subject or plan. The same workspace connects task progress with daily logs
and profile-level views of progress.

## What you can do

- **Build a learning plan.** Use a built-in track or create a private track
  from a text file. Break work into steps and problems, then search, filter,
  and mark items as you go.
- **Capture daily effort.** Record sleep and activity intervals, use timers or
  quick-add entries, and review previous days in the Full Log.
- **See progress in context.** Follow completion totals and streaks, revisit
  recent activity, and explore activity and sleep/study visualizations.
- **Keep control of your data.** Your personal tracks and progress belong to
  your account. Export progress and restore it to a matching track when
  needed.
- **Share a curated profile.** Find profiles by username and let other signed
  in users view selected learning progress without exposing private track
  contents or account details.

## Built with

Momentum is a full-stack web application built with React 18 and Vite. Supabase
provides sign-in, PostgreSQL storage, and database access controls; Vercel
hosts the application and its username-search endpoint. The interface uses
Tailwind CSS, focused CSS modules, and Lucide icons.

The project also includes focused unit tests and a production build check.
Core engineering considerations include account-scoped data, optimistic
progress updates, local caching for responsive screens, and careful handling
of public profile data.

## Run locally

You need Node.js, npm, and a Supabase project. In PowerShell, from the project
folder:

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Open `.env` and replace its two example values with the Supabase project
URL and publishable key. Configure Google sign-in and apply the database
migrations once; the
[setup guide](./architecture.md#14-local-development-and-deployment) has the
step-by-step Supabase, Google, and Vercel setup. Use `npx vercel dev` instead
of `npm run dev` only when testing `/api/search` locally.

## Deploy

1. Import the GitHub repository into Vercel and deploy with the Vite preset.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel's
   Environment Variables.
3. Add the new Vercel URL to Supabase Auth's allowed redirect URLs.
4. Deploy again if you added the environment variables after the first build.

For a first-time launch—including database setup and Google sign-in—follow
the [deployment checklist](./architecture.md#14-local-development-and-deployment).

## Project documentation

- [Architecture and operations](./architecture.md): implementation guide for
  code ownership, runtime/data flows, database and access control, migrations,
  Google OAuth, environment configuration, development, and deployment.
- [Learning-track sources](./source/): editable source files for the bundled
  templates.
