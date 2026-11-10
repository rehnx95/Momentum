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

## Project documentation

- [Architecture and operations](./architecture.md): implementation guide for
  code ownership, runtime/data flows, database and access control, migrations,
  development, and deployment.
- [Learning-track sources](./source/): editable source files for the bundled
  templates.

## Getting started

To run Momentum locally, you need Node.js, npm, and a Supabase project. Follow
the [local setup guide](./architecture.md#14-local-development-and-deployment)
for environment configuration, database migrations, and commands.
