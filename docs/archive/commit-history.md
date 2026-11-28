# Momentum — Complete Development History

**Repository:** [rehnx95/Momentum](https://github.com/rehnx95/Momentum)

**History covered:** `8f28602` (initial app baseline, Oct 19, 2026) through `7911e51` (Nov 29, 2026)

**Commits:** 318, including the initial baseline
**How to read this:** This is a product and engineering history based on the committed code, migrations, tests, and documentation. Related commits are grouped where they are iterative refinements; the descriptions explain the resulting work rather than restating commit subjects or reproducing patches.

The local Git remote has historically used the name `Track-Sheet`; the product was later rebranded to **Momentum**.

## Executive summary

The work grew a small React tracker into an account-based learning and personal-progress application. The main changes fall into seven connected arcs:

1. **Learning tracker foundation:** Supabase-backed sign-in, user profiles, saved problem progress, multiple learning tracks, import/export, and uploaded custom tracks.
2. **Sharing and personalization:** searchable public profiles, progress/activity summaries, theme choices, responsive navigation, and reusable UI.
3. **Daily activity tracking:** a separate Daily Log with sleep and timed activities, then a substantial redesign into an autosaving editor, Full Log history, and Trends.
4. **Insights and performance:** activity heatmaps, sleep/study charts, cache layers, lazy loading, and more deliberate loading states.
5. **Architecture and reliability:** a move from a large app component into feature-based modules, SQL migrations for evolving data ownership and reporting, and focused tests around time, persistence, caches, and UI behavior.
6. **Production readiness and performance:** safer signup confirmation, private public-profile responses, reliable built-in track updates, and route-specific CSS loading.
7. **Product polish:** mobile layouts, profile and sign-in refinements, activity colors, clearer save/error feedback, and updated documentation and screenshots.

The most important turning points were the October account/track foundation, the Nov 3–10 creation and redesign of Daily Log, the Nov 10 feature-based refactor, and the Nov 18–22 authentication, reliability, and performance work.

## Activity by day

The history has work on 24 dates. Commit dates and counts follow GitHub's UTC timestamps. The number of commits reflects the scale of iteration as well as feature count: several dense runs are visual tuning and bug-fix passes rather than separate features.

| Date | Commits | Main focus |
| --- | ---: | --- |
| Oct 19 | 2 | React/Vite tracker baseline and project notes |
| Oct 20 | 12 | Supabase identity, profiles, progress, and multiple tracks |
| Oct 21 | 27 | Track upload/removal, public search, branding, and themes |
| Oct 22 | 6 | Sidebar and responsive-layout iteration |
| Oct 23 | 12 | Mobile UI, tooltips, dialogs, and profile presentation |
| Oct 25 | 7 | Heatmap accuracy, year range, and hover detail |
| Nov 1 | 1 | Remove unused source content |
| Nov 3 | 11 | First persisted Daily Log and its controls |
| Nov 8 | 49 | Shared navigation and major Daily Log decomposition |
| Nov 9 | 17 | Profile/heatmap layout and Full Log rework |
| Nov 10 | 58 | Charts, caches, UI controls, architecture refactor, and branding |
| Nov 11 | 1 | History/documentation |
| Nov 12 | 11 | Responsive work, chart placement, sample-data mode, and docs |
| Nov 13 | 8 | Skip-state, storage, heatmap, and redesign iterations |
| Nov 14 | 7 | Daily Log/Full Log/Trends cleanup and refactoring |
| Nov 15 | 22 | Trends, activity colors, profile, mobile UI, screenshots, and tests |
| Nov 16 | 12 | Startup/loading, sign-in, accessibility, save recovery, and history docs |
| Nov 17 | 16 | Built-in track sync, startup reliability, PWA assets, and documentation |
| Nov 18 | 18 | Password authentication, performance, save reliability, and profile fixes |
| Nov 22 | 7 | Production fixes, source updates, route-specific CSS, and log refinements |
| Nov 23 | 3 | Consistent track handling, progress layout fixes, and DSA video resources |
| Nov 26 | 7 | Offline behavior, Daily Log integrity, profiles, and testing data |
| Nov 28 | 1 | Integrated tracker resources and shared feedback entry point |
| Nov 29 | 3 | Responsive tracker behavior and render-performance refinement |

## Product evolution

### 1. Initial app, identity, and progress model — Oct 19–20

The first commit, `8f28602`, establishes a React/Vite application, styles, a bundled DSA problem dataset, and scripts to convert source text and verify item counts; `350d8f0` adds the project overview and dependency/build setup. The first implementation concentrates most tracker UI and behavior in `src/App.jsx`, with the problem catalog bundled into the frontend.

The next set of changes establishes the account-backed product:

- `c547871`, `ed29956`, and `340372c` add and refine Google sign-in and onboarding, connect the app to Supabase, and evolve the profile schema so account creation and profile settings can be handled independently.
- `381c8e6` adds activity-calendar/streak support used to derive progress history from completed work.
- `41847a0` introduces profile/settings interaction; subsequent changes refine profile editing and signup fields.
- `afbf008` makes the text-to-track conversion and count verification part of the track data workflow.

This shifts the app from a local-only tracker toward user-owned progress, with the database and migrations becoming part of the product rather than an optional storage detail. It also introduces a recurring separation of responsibilities: authentication identifies the owner, progress rows record problem state, and profile/activity views derive summaries from that saved state.

### 2. Multiple tracks, backup, custom sheets, and discovery — Oct 20–21

Track management expands from one built-in list into a library:

- `35b7766`, `d91f30a`, and `d2baf7d` introduce multiple built-in tracks and their source data.
- `65cb4ce`, `52b668a`, and `d22e496` add and refine progress import/export, allowing a user to preserve or move their problem states. Follow-up fixes focus on making import/export selection and state mapping reliable.
- `6b668d1` adds the ability to mark problems as skipped and display that state in the profile/progress view.
- `51dc482` adds uploadable text-based tracks, parsing/validation, and database support to keep uploaded content associated with its owner. The parser normalizes the uploaded structure before it becomes a selectable track rather than treating arbitrary text as trusted application data.
- `e6013e8` and `b4bc85b` add sheet removal and distinguish removing an uploaded sheet from hiding a built-in one. The related migrations establish safe ownership checks and per-user built-in copies so one user's choices do not affect another's tracks.

The app also gains a social/discovery layer:

- `cb08177`, `d13f4e4`, and `a88d542` build username search and public profile loading, then improve long-username handling, result limits, and the data exposed for a profile.
- `de0c38e` configures deployment routing for the application/API boundary.
- `d13f4e4` adds the server-side search endpoint, with matching SQL functions and migrations; search is no longer only a client-side filtering feature. Later database changes add indexing and constrained result selection to keep lookup behavior bounded.
- `413d99b`, `29cfd55`, and `3ae583c` establish product naming/branding and project documentation. The product identity evolves from Track-Sheet to Momentum during this period.

### 3. Themes, responsive UI, and heatmap maturity — Oct 21–Nov 1

The interface is repeatedly tuned as the product grows beyond the original single-screen layout:

- `393cd36` and `d84af2d` establish dark and light theme treatments; later commits refine the controls and remove an experimental third theme.
- `d495ae6`, `b3391b5`, `5ac12ca`, `05a59a7`, `b47236b`, `2491487`, `20035ce`, and `9e3f8f7` iterate on responsive layouts, sidebar behavior, and mobile navigation. Some mobile experiments are rolled back before a simpler layout is retained.
- `091a829`, `c26122b`, `d507fe8`, and `8a1ae94` improve interaction guidance, branding, reusable tooltips, and custom dialogs in place of generic browser prompts.
- `36af9fc` fixes light-theme behavior; `0419f32` makes sheet errors dismiss automatically.
- `9891a4b`, `54d0e42`, `c789115`, `440aa57`, and `390d3ff` improve the activity heatmap: a one-year calendar range, corrected activity data, clearer cells, immediate hover details, and sizing fixes. `20261025000000_public_activity_by_year.sql` adds the database support for year-bounded public activity.
- `a43f199` removes an unused source file as the built-in track content settles.

The heatmap's work has two sides: the UI must map daily totals to a stable visual scale, while the data layer must return the right activity dates for the displayed window. These are not just visual changes: the heatmap becomes a cross-feature view of completed activity, and the profile/search database work supplies the data it needs.

### 4. Daily Log is introduced — Nov 3

`f170c3c` and `3e33d1f` add the first persisted Daily Log and integrate it into the app. A new table stores day-specific sleep/activity records, and the first tracker UI lets users record daily progress outside the problem checklist.

The follow-up work (`6ad2c3c`, `63969f9`, `7f7677e`, `05831d7`, and `3645dfb`) improves editing and styling, adds show/hide behavior, and introduces a user preference migration for that visibility setting. Theme experiments in `5b5ca71`, `8c4f7cc`, and `19a97a7` are subsequently removed in `29ff9c8`; the application returns to its simpler theme model.

### 5. Separate navigation and the first major Daily Log rebuild — Nov 8

`0596fbe` gives Daily Log its own page. Navigation/header layout is then unified across the tracker, log, and people screens (`befef55` and adjacent header changes), with many small alignment fixes as the shared navigation is made to work at different viewport sizes.

The Nov 8 redesign (`375633a`, `40f7347`, and related changes) begins separating layout and app-header responsibilities. Profile presentation is also refined (`44aaa93`).

The largest functional change of the day is `1c02d20`: the monolithic daily tracker is decomposed into day, activity, slot, and Full Log components, with shared time logic and tests. The supporting logic covers daily data loading/saving, validation, timers, history calculations, and paging. The database receives a sanity constraint for daily time totals.

Follow-up commits make activities belong to individual dates instead of synchronizing a profile-wide activity template (`e5547b4`), improve deleting activities and saving/history behavior, and reshape Full Log. The design settles on a day editor plus a separate historical view: current-day editing remains direct, while older records are reviewed in a list and loaded in pages. A brief “fast tracker” experiment is reverted (`3d680fd` followed by `bf5599f`), and the day view is simplified after removing an earlier 24-hour timeline experiment (`e861024`).

### 6. Profile, charts, caching, and code organization — Nov 9–12

Nov 9 is largely profile/heatmap layout work, together with a further Full Log restructure. The commit `306e9c0` changes the heatmap/profile presentation; its message mentions a future delete-day feature, but the code in this history does not add that feature.

On Nov 10, the Daily Log evolves into a broader review experience:

- A hand-built SVG sleep/study graph and its date-based summaries are introduced and tuned (`77d3751`, `e67b61e`, and follow-up chart work).
- Heatmap rendering and chart point tooltips are refined, including active-point identification and readable hover details.
- Full Log changes toward grouped, paginated history, and time-entry/date-picker controls are made more consistent.
- Account, profile, sheet, and Daily Log history caches are added or improved (`cc5a880`, `09af667`, `cefa697`). Account state can render before a fresh session check finishes; history/profile reads can reuse recent results; writes invalidate or refresh those results. These caches are a presentation/performance layer, not a durable offline-write queue.
- `d17317e` moves the application from a large, flat component organization to feature-oriented modules under `src/features/`, with shared components/utilities under `src/shared/` and CSS split into purpose-specific stylesheets. At this point `App.jsx` drops from 3,469 lines to a 64-line app shell, while the roughly 800-line Daily Log hook is divided among focused activity, history, persistence, timer, and model modules. The 86-file change is primarily a structural rewrite that makes later changes easier to isolate.
- `810e53e`, `9641640`, and `b9de7f7` document the product and local setup, and add an environment-variable example. The product naming is consolidated around Momentum.

Between Nov 11 and 12, the environment variable used for the Supabase public key is updated, the deployment link/docs are corrected, and a responsive pass touches the chart, tracker, and date/time controls (`7df1576`, `17b2845`, `f20e59d`, `4ddf36f`, `8b47015`, and `248bd46`). Nov 12 also moves the sleep/study chart into the Daily Log/Trends experience and adds a local test-mode sample-data workflow (`182f19e`), with seed/cleanup helpers, sample records, tests, styles, and documentation. The workflow is explicitly restricted to a local test-mode server and warns users to use a dedicated test account.

### 7. Data safety, redesign iterations, and maintainability — Nov 13–14

The heatmap and skip-state controls receive behavior and presentation fixes (`d5b87d2`, `6fa7c1d`, and `878a73e`). `b11868d` is a broad pass over browser storage and account-sensitive state; a subsequent redesign/rollback sequence (`8a227c6`, `7bca7ed`, and nearby CSS work) shows that parts of that experiment were intentionally backed out rather than retained unchanged.

The Nov 14 work is a consolidation phase:

- `aef0ef7` reorganizes the Daily Log, Full Log, and Trends presentation.
- `71a9c70` and `935f013` further split and clarify the code around those experiences.
- `34438af`, `374c5e9`, `745fb2b`, and `6562342` clean up, format, and refine the frontend without changing the product's core data model.

### 8. Trends, activity colors, profile changes, and shipping polish — Nov 15–16

Nov 15 adds capability as well as visual refinement:

- `f104f03` adds average sleep duration to Trends; `e4edf67` adds denser sample records for exercising history and visualizations.
- `c7d595e` fixes heatmap behavior. `e9fe2d3` addresses a time-handling bug in Daily Log.
- `849ca82` removes profile location and website fields, with a matching database migration. `1680bf2` simplifies the onboarding username label.
- `b1a4925` adds user-selectable activity colors. The accompanying SQL changes assign colors consistently and resolve activity-name/key ambiguity; `20261115003400_sync_activity_log_with_progress.sql` also aligns activity history with progress changes.
- `54abb55`, `a323d0f`, `304f9fd`, and `5bfda0a` refine Full Log and Daily Log, including a signed-out view and improved history presentation.
- `b27639d`, `68787eb`, and `9e7c697` improve mobile layouts and make the app header responsive.
- `87c0bbe`, `1aac991`, and `571c44b` iterate on initial/refresh loading states. `6636618` and `49e4b34` update screenshots and product/architecture documentation.
- `916224e` resolves overlap between validation feedback and activity slots and adds/updates tests across Daily Log and chart interactions.

The Nov 16 commits focus on reliability and finish:

- `ff787ae` improves startup behavior through authentication/session and problem-tree loading changes, adds focused problem-tree tests, and removes obsolete preload behavior.
- `034f7ce` restores the sign-in presentation, while `e4204f3` polishes activity-log and profile layouts.
- `16b7426` removes redundant accessibility attributes/text while preserving status/error semantics and updates the related tests.
- `1786f2b` shortens the edit-profile back control; `8f19d08` updates the README and architecture to match the current product.
- `074ef14` separates save feedback from validation alerts and adds an explicit **Save now / Retry save** action when a save is pending or fails. The change includes focused component tests.
- `afe6597` updates this archive through the Nov 16 endpoint.

### 9. Built-in track sync and reliability polish — Nov 17

- `7ed2be1` adds LeetCode links to tracker problems, and `0fd3cb0` aligns the LeetCode icon with its official mark.
- `bc9fd68` adds title synchronization for existing built-in sheets through a migration and bootstrap RPC.
- `3d2f71e` updates DSA source/generated content and LeetCode mappings, then adds a migration and bootstrap RPC to synchronize LeetCode IDs on existing built-in copies by stable problem ID without resetting progress.
- `bc39956` improves sign-in persistence and startup; `0d3e8e7` addresses stale application chunks after deployment.
- `893cc76`, `5c18d71`, `fab0b05`, `483c4ac`, `d459cc7`, and `1b00004` refine the heatmap scrollbar, profile progress/restore controls, Daily Log alignment, UI behavior, and loading presentation.
- `99822e7`, `27a50f0`, and `0ca93fd` refresh screenshots and continue code consistency cleanup.

### 10. Integrated tracker and product refinement — Nov 22–29

- `be4f685` and `b8c7642` update documentation and hide empty dates in Full Log.
- `c9051df`, `3e74fac`, and `be38da6` align DSA and Backend sheet handling, correct empty-sheet/progress layouts, and include YouTube resources in the DSA tracker.
- `a001cf6`, `9e30597`, `b2b2da0`, `f9e659c`, `47f10b2`, `1868c00`, and `3150c8f` refine offline behavior, Daily Log integrity, sample data, profile layout, and related tests.
- `d33537c`, `81cbb89`, and `75165c6` align tracker resources and progress controls, refine mobile behavior and feedback placement; `7911e51` avoids rerendering unchanged tracker rows.

## Chronological change ledger

This ledger accounts for every commit in the stated range. Commits are grouped by the code area they changed; several adjacent commits are small visual or bug-fix iterations on the same implementation, so the summary describes their combined effect rather than inventing a separate feature for each one.

### Oct 19 — application baseline

- `8f28602`, `350d8f0`: create the React/Vite project, bundle the initial DSA problem list, add source-to-JSON conversion and count-check scripts, establish the first page styles, and add project notes.

### Oct 20 — identity, progress, and first track workflows

- `c547871`, `ed29956`, `340372c`, `41847a0`: introduce Google sign-in/onboarding, connect app profile state to Supabase, fix sign-in and profile initialization, and separate profile settings from account creation.
- `381c8e6`: add the database-backed activity-calendar/streak support used to reflect completed progress over time.
- `afbf008`, `35b7766`, `d91f30a`: improve the track conversion/source data and move from one learning list toward multiple selectable built-in sheets.
- `65cb4ce`, `52b668a`, `d22e496`: build and correct progress export/import selection and state mapping.
- `6b668d1`: surface skipped problems as a distinct progress state in the profile area.

### Oct 21 — uploads, search, product identity, and mobile layouts

- `5802562`, `9a17978`, `7ddc51c`: refine the main tracker and profile-settings UI, including component/layout changes as the new features are integrated.
- `51dc482`: add the upload parser and persist private, user-owned sheet JSON under Supabase row-level security.
- `393cd36`, `d84af2d`: introduce dark and light visual modes and update the main screen styles to support them.
- `cb08177`, `de0c38e`, `d13f4e4`, `a88d542`, `a704e58`: add username search/public-profile loading, wire deployment routing for the API, add query/index constraints and public profile/activity data, and fix integration/route behavior.
- `d2baf7d`: add the built-in backend track source and generated data.
- `413d99b`, `7699551`, `29cfd55`, `d9080cb`, `3594700`: iterate on the app's name, page metadata, and initial README/architecture material; a branding variant is rolled back before the Momentum identity settles.
- `e6013e8`, `b4bc85b`: implement uploaded-sheet deletion and built-in-sheet hiding/copy semantics with matching SQL changes.
- `d495ae6`, `b3391b5`, `5ac12ca`, `05a59a7`, `b47236b`, `2491487`, `20035ce`, `51872df`: make the tracker/sidebar work on smaller screens, adjust menu behavior and spacing, then remove an unsatisfactory mobile-layout iteration.

### Oct 22–23 — interaction cleanup and responsive behavior

- Oct 22 — `9e3f8f7`, `05f9c90`, `1a66c01`, `7f1fada`, `c505e79`, `57c216b`: continue sidebar and UI tuning, back out two experiments, and correct bugs/styles introduced during the iteration.
- Oct 23 — `091a829`, `c26122b`, `d507fe8`, `3a161ac`: improve presentation and in-product instructions, consolidate brand/tooltip behavior, and fix hover guidance.
- Oct 23 — `5dea74b`, `ac0c00a`, `3173120`, `39135af`: adapt page and sidebar behavior for mobile widths and correct the mobile navigation edge cases.
- Oct 23 — `9e78e4e`, `8a1ae94`: refine heatmap presentation and replace generic browser prompts with an application-styled dialog.
- Oct 23 — `44039ac`, `3ae583c`: add/refresh the project docs and establish the Momentum product name and description in app metadata and UI.

### Oct 25–Nov 3 — heatmap data and first daily records

- Oct 25 — `36af9fc`, `0419f32`: correct light-theme behavior and make sheet errors self-dismiss.
- Oct 25 — `9891a4b`, `54d0e42`, `c789115`, `440aa57`, `390d3ff`: extend the heatmap to a full-year view, adjust its database query and rendering, correct activity levels, add immediate date/count hover details, and tune cell sizing.
- Nov 1 — `a43f199`: remove an unused source track file.
- Nov 3 — `f170c3c`, `3e33d1f`, `6ad2c3c`, `63969f9`, `7f7677e`, `05831d7`, `3645dfb`: add the daily-log table and first tracker page, connect its UI to persistence, add show/hide preference behavior, and fix interaction and layout issues.
- Nov 3 — `5b5ca71`, `8c4f7cc`, `19a97a7`, `29ff9c8`: experiment with a third theme and theme controls, then remove that theme and return to the simpler two-mode design.

### Nov 8 — unified navigation and Daily Log decomposition

- Navigation sequence — `0596fbe`, `400d264`, `2ad0f5b`, `3e76840`, `befef55`, `1b26403`, `76397b2`, `7096015`, `5a79842`, `bf7ff81`, `e14cdf2`, `84729f7`, `194c127`, `cbe7aba`, `a65dda1`, `b741165`, `2c834b2`, `74e6747`, `f28e89c`, `bf1ade3`, `c16c2a9`, `170d2a5`, `1ca53d7`, `f0e2ac8`, `17247be`: add a separate Daily Log route, consolidate headers/navigation, tune the sidebar and theme control, and work through alignment/responsive issues. One shared theme/header extraction is partially reverted; later fixes retain the working navigation layout.
- App/profile redesign — `375633a`, `82700b5`, `0e4cb07`, `40f7347`, `44aaa93`: start the broader layout redesign, adjust sign-out/profile controls, split header/layout responsibilities, and revise the owner profile view.
- Daily Log rebuild — `1c02d20`, `a7441a7`, `998e191`, `e875e3f`, `1217621`: decompose the day editor, introduce shared time handling and tests, then fix save/history/deletion behavior.
- Daily data model and Full Log — `e5547b4`, `4bd2c54`, `4f6d941`: move activity templates to date-specific records and improve how activities are shown in historical views.
- Tracker experiments and simplification — `3d680fd`, `bf5599f`, `0bffcd4`, `625546d`, `b462157`, `e861024`, `7e687e4`, `30b20f5`, `71d863f`, `69281fd`, `e97ce26`: try and revert inline fast-entry behavior, then compact the editor and refine sleep/activity cards, colors, and spacing.

### Nov 9 — profile and historical-log refinements

- `a7c7956`, `d8add37`, `3425499`, `306e9c0`, `80d7954`, `aae58ef`, `a7566b5`, `b1c0ad8`, `6ddd447`, `6be5650`, `cf26354`, `168a08b`, `cf555e7`, `3899097`, `927b80b`: adjust profile summaries and heatmap placement, align the Daily Log/profile layouts, and iterate on responsive sizing and spacing.
- `3d20de9`, `f16ef9a`: substantially rework Full Log grouping and its date/week presentation.

### Nov 10 — charting, caches, UI controls, and major refactor

- Early log fixes — `c5a8723`, `27ef3c1`, `941e321`, `7be7a41`, `ef82a8a`, `49cb609`, `9975310`, `3c8e548`, `ebf2626`, `6f4c963`, `85525b4`, `4575d2b`: resolve successive Daily Log and Full Log display/state issues before adding the larger chart and cache work.
- Chart foundations — `77d3751`, `d650b9a`, `04020f5`, `7467567`, `1013afd`, `1544930`, `6033a9a`, `e67b61e`, `1c4a518`, `6f6b566`: introduce the sleep/study graph, tune its visual hierarchy and colors, add the graph view, and remove an unsatisfactory graph iteration.
- Performance and heatmap — `09af667`, `cc5a880`, `cefa697`, `e7d5494`: add profile/history/per-day caching, improve rendering and data reuse, and optimize heatmap drawing.
- Tooltip correctness — `409ea67`, `d9bdccb`, `2582e36`, `d9c06ab`, `67c10dd`, `d840f34`, `aa9c9fa`, `3c2ffc5`: iterate on SVG point-to-tooltip mapping and styling, then improve chart marker visibility.
- Full Log, profile, and controls — `32cbacd`, `feb1c35`, `94834d8`, `3c193f0`, `aaadebb`, `25fc801`, `0020000`, `ce99671`, `7074172`, `980d4b4`, `72441fb`, `b697190`, `e7911f6`, `5bfb455`, `0b1274f`, `b819af4`, `1f5367b`: make historical records easier to scan, restructure the public profile and slot UI, add a keyboard-friendly time input and custom date picker/tooltips, and clean up styles/code. A daily-log experiment in this run is explicitly reverted.
- Architecture and docs — `d17317e`, `ff8ff07`, `5a37609`, `f45bc61`, `810e53e`, `9641640`, `b9de7f7`: move from the large app component to feature modules, polish typography/branding/tooltips, document setup/architecture, and add environment placeholders.

### Nov 11–12 — documentation, responsive pass, and sample mode

- Nov 11 — `7efdf47`: add a development-history document.
- Nov 12 — `7df1576`, `17b2845`, `f20e59d`, `ac2b49e`, `4ddf36f`: rename the Supabase public-key environment variable, update deployed-app links, and merge the documentation/link correction.
- Nov 12 — `8b47015`, `248bd46`, `10bede5`, `ea5e6e3`, `d32873a`: refine mobile styling across activity charts and Daily Log controls, then bring README/architecture documentation and the affected styles into line with the app.
- Nov 12 — `182f19e`: move sleep/study chart use into the Daily Log review experience and add a local test-mode sample-data path with generation, cleanup, and tests.

### Nov 13–17 — robustness, metric refinements, and release polish

- Nov 13 — `d5b87d2`, `6fa7c1d`, `878a73e`: fix heatmap layout and clarify skip-state controls.
- Nov 13 — `b11868d`, `8a227c6`, `7bca7ed`, `36ebd15`, `fdb2974`: make a broad storage/theme/profile pass, begin another redesign, back out some of it, and refine the retained visual changes.
- Nov 14 — `aef0ef7`, `34438af`, `71a9c70`, `745fb2b`, `374c5e9`, `935f013`, `6562342`: consolidate Daily Log, Full Log, and Trends styling/structure, clean up and format the implementation, and finish a frontend refinement pass.
- Nov 15 — `c7d595e`, `e4edf67`, `f104f03`, `849ca82`, `1680bf2`, `e9fe2d3`: fix heatmap data, create dense test history, add average sleep duration, remove unused profile fields, simplify the username label, and correct time behavior.
- Nov 15 — `67c94d3`, `b1a4925`, `54abb55`, `a323d0f`, `b27639d`, `68787eb`, `09e0ee8`: update docs, add account-specific activity-color selection, redesign Full Log and Daily Log elements, and continue responsiveness/robustness work.
- Nov 15 — `87c0bbe`, `1aac991`, `9dbc3ce`, `9e7c697`: refine startup/refresh loading and correct onboarding/cache behavior while making the app header responsive.
- Nov 15 — `49e4b34`, `5bfda0a`, `304f9fd`, `6636618`, `916224e`: update screenshots, improve signed-out and historical-log views, refine Daily Log interactions, and fix validation-message overlap with activity slots while extending tests.
- Nov 16 — `70926a8`, `571c44b`, `297a2cf`, `ddfec59`, `034f7ce`, `e4204f3`, `ff787ae`, `16b7426`, `1786f2b`, `8f19d08`, `074ef14`, `afe6597`: improve save feedback and loading states, restore/significantly polish sign-in, harden startup behavior, refine activity/profile visuals and accessibility semantics, simplify profile navigation copy, update product docs/history, and add a manual save/retry action.
- Nov 17 — `7ed2be1`, `0fd3cb0`, `bc9fd68`, `bc39956`, `0d3e8e7`, `893cc76`, `5c18d71`, `fab0b05`, `483c4ac`, `d459cc7`, `1b00004`, `99822e7`, `27a50f0`, `0ca93fd`, `3d2f71e`: add tracker LeetCode links and built-in title/link sync for existing accounts, improve sign-in and deployment loading reliability, refine profile and Daily Log UI, and clean up code/screenshots.
- Nov 17 — `fa5fd1d`, `364c21e`, `9dc649d`: document built-in track synchronization, add PWA icons and manifest details, and publish the Android asset-links file.
- Nov 18 — `992d7b2`, `68f17cf`, `dfb3e10`, `1815b89`, `90f284f`, `0600058`, `e862403`, `5f69745`: refine UI and add email/password sign-in with signup validation, confirmation/error feedback, and loading behavior.
- Nov 18 — `d45be6e`, `8fa8e84`, `cf089eb`, `e1cd8e4`: improve startup and offline/persistence performance, reduce repetitive errors, and speed up Daily Log saves.
- Nov 18 — `88c840f`, `66bac26`, `91d7562`, `4982a1f`: remove an unused script, update README and architecture, and fix profile settings.
- Nov 22 — `f0396f9`, `cf1859a`: update the editable source and generated DSA/Backend track data.
- Nov 22 — `91ba032`, `15c6d7f`, `852a509`: update track sources, fix production-readiness issues (including timer midnight saves, signup confirmation, public-profile privacy, and full built-in data sync), then defer feature CSS into lazy screen chunks.
- Nov 22 — `be4f685`, `b8c7642`: update the product documentation and hide empty dates in Full Log.
- Nov 23 — `c9051df`, `3e74fac`, `be38da6`: align DSA and Backend sheet handling, correct empty-sheet/progress layouts, and include YouTube resources in the DSA tracker.
- Nov 26 — `a001cf6`, `9e30597`, `b2b2da0`, `f9e659c`, `47f10b2`, `1868c00`, `3150c8f`: refine offline behavior, Daily Log integrity, sample data, profile layout, and related tests.
- Nov 28–29 — `d33537c`, `81cbb89`, `75165c6`, `7911e51`: align tracker resources and progress controls, refine mobile behavior and feedback placement, and avoid rerendering unchanged tracker rows.

## Technical deep dives

### Authentication, profiles, and public discovery

The October authentication work changes the app's ownership model. Google OAuth supplies the signed-in identity; onboarding/settings collect the app-specific profile identity; progress, tracks, and daily records then belong to that account. The profile schema changes around signup so optional profile details do not have to block account creation.

The people feature develops from a username lookup into a routed profile experience. Search logic is split between the React UI, a Vercel `/api/search` endpoint, and Supabase functions/migrations. The endpoint validates the caller's bearer token and makes the database request in that user's context instead of relying on a service-role key. Follow-up schema changes handle long usernames, indexing/result limits, activity dates, and the fields needed by the profile screen. Public profiles are visible to signed-in Momentum users but do not expose email addresses; the Nov 22 migration removes the earlier email-returning RPC. Profile simplification also removes location and website rather than continuing to collect them.

The result is a deliberate distinction between **identity** (the authenticated account), **profile** (the app-facing username and presentation), and **activity/progress** (the records used for charts and summaries). Profile and search work across October and November refines that distinction rather than treating a public profile as a copy of the owner's private application state.

### Learning-track lifecycle

The track feature moves through a complete content lifecycle:

1. DSA begins as checked-in text and generated JSON, with conversion and count-verification scripts.
2. Additional built-in tracks are added using the same editable-source approach.
3. Upload support accepts text files up to 2 MB and parses/validates their sections, problem names, external problem numbers, and default-skip markers before saving them as account-owned sheets.
4. Built-in tracks are provisioned as per-user copies, allowing user-specific visibility or removal without mutating the shared source.
5. Problem progress is namespaced to a selected track, and backup/import/export lets a user carry those states between sessions or copies.
6. `todo`, `done`, and `skipped` states feed the tracker UI and profile summaries; an absent saved completion remains distinct from an explicitly skipped item. Progress changes are applied optimistically in the UI and writes are serialized so quick successive state changes do not race.
7. The converter preserves problem IDs by LeetCode number or unlinked title. Built-in track updates synchronize the full bundled sheet to existing per-user copies by stable problem ID while preserving saved progress; new copies use the current template.

The sheet-management migrations matter because they encode the distinction between deleting a user's uploaded content, hiding a built-in option, and keeping a personal copy. The UI iterations on the switcher and removal controls are therefore tied to database ownership semantics, not just dropdown styling.

### Daily Log write and history lifecycle

The Daily Log's evolution is the most substantial feature arc in the repository. Its record is keyed to a user and local calendar date and contains sleep/wake times plus activity entries with timed slots. The editor validates interval input and provides feedback before saving. Later work makes the save path explicit and resilient:

1. An edit updates the visible day and its account/date cache.
2. Settled edits are autosaved; pending writes are serialized so successive edits do not race each other.
3. Before replacing a saved day, the persistence layer checks the stored version (`updated_at`) against the version originally loaded. A concurrent change is surfaced as a conflict rather than silently overwritten.
4. The UI exposes save state separately from validation messages. Nov 16 adds a direct save/retry action when a user needs to recover from a pending or failed save.
5. Running timers are account-scoped and split at local midnight so a single active timer does not place all elapsed time on the wrong calendar day.

Full Log and Trends broaden the same data model without changing the editor's purpose. Full Log pages older records and groups them for scanning; its untracked-time summary is derived from the unused part of a 24-hour day rather than persisted as a separate task. Trends uses a bounded recent history for sleep/study charts and derived statistics such as average sleep duration. Sleep spanning midnight is treated according to the wake date. Timer segments split at local midnight and now correctly accept a segment ending at midnight.

### Heatmap, charts, and activity colors

The activity heatmap turns date-level activity into a year-scale visual. Work on its date range, data retrieval, drawing size, cell intensity, and hover tooltip appears across Oct 25, Nov 9–10, and Nov 13–15. The later progress/activity synchronization migration ensures changes to completed problem progress are reflected in the activity history, not only direct Daily Log entries.

Sleep/study trends are drawn as SVG rather than adding a charting dependency. The graph work adds axes/points, date-aware summaries, hover targeting, tooltip placement, active-point styling, and responsive sizing. Repeated tooltip commits are successive attempts to ensure that hovering a point shows the data for that point instead of a neighboring value or stale selection. Tests added around the summary and chart exercise the date/value mapping so a visual interaction change does not silently show a different day's data.

Activity colors begin as a UI customization and become shared data behavior. The color picker added in `b1a4925` is backed by per-user assignments normalized by activity name. Database functions/triggers allocate and update colors as log rows change and remove an assignment when it is no longer used. Two same-day follow-ups fix ambiguous SQL key references. The shared mapping keeps an activity's color aligned across the day editor, Full Log, and Trends rather than allowing each screen to choose independently.

### Loading, caching, and account boundaries

The performance work is layered rather than one general-purpose cache:

- An account/profile cache allows the shell to begin with the last known account state while the authentication session is checked.
- User-data caches reduce repeated reads for the user's sheet library and related data.
- Daily Log history and per-day data are cached to avoid immediately repeating recent queries.
- Public-profile results have a bounded, short-lived cache; the earlier implementation uses a 60-second freshness window and a 20-entry cap.
- Cache invalidation follows writes and account changes; sign-out/account switching clears app-owned cached state.
- Route-based code splitting and preload adjustments reduce the amount of feature code needed at initial startup.

These are responsiveness techniques, not an offline database. The source of truth remains Supabase, and the save/conflict path is designed separately from read caching. Nov 15–17 loading commits also improve the visual fallback and refresh state, preserve sign-in during session checks, and handle stale deployed chunks so a fast cache hit, session validation, and an actual load failure do not all look like the same indefinite spinner. The Nov 18–22 performance work includes offline/save-path refinements and moves auth, dashboard, and profile CSS into the lazy screen chunks that need it, reducing the initial stylesheet without changing screen behavior.

### Migration ledger

Database migrations track the product's functional milestones. Related files are grouped below; the filenames are included so the history can be cross-checked against the schema.

| Period | Migration files | Product change |
| --- | --- | --- |
| Oct 20 | `20261020165100_multi_user_auth_profiles.sql`, `20261020170900_activity_calendar_streaks.sql`, `20261020174800_decouple_auth_signup_from_user_settings.sql`, `20261020175400_remove_bio_signup_dependency.sql` | Account-owned profile/progress foundation, activity-calendar support, and a less coupled onboarding/profile setup |
| Oct 21 | `20261021003000_user_uploaded_sheets.sql`, `20261021012200_public_profile_search.sql`, `20261021013500_public_profile_search_long_usernames.sql`, `20261021025300_indexed_user_search_limit.sql`, `20261021031600_public_profile_full_data.sql`, `20261021035000_public_profile_activity_dates.sql`, `20261021120000_delete_uploaded_sheets.sql`, `20261021133000_user_hidden_sheets.sql`, `20261021180000_personal_sheet_copies.sql` | User uploads, searchable profiles, bounded/indexed lookup, public activity data, and safe per-user sheet lifecycle |
| Oct 25 | `20261025000000_public_activity_by_year.sql` | Year-bounded activity data for the heatmap/profile |
| Nov 3–8 | `20261103000000_daily_logs.sql`, `20261103000001_daily_log_preferences.sql`, `20261108150000_daily_log_sanity.sql` | Persisted daily sleep/activity records, display preference, and daily time sanity checks |
| Nov 14–15 | `20261114223500_add_public_profile_email.sql`, `20261115001600_remove_profile_location_website.sql`, `20261115003400_sync_activity_log_with_progress.sql`, `20261115010000_activity_color_assignments.sql`, `20261115020000_fix_activity_color_key_ambiguity.sql`, `20261115024000_fix_activity_color_key_ambiguity.sql` | Public profile field changes, progress/activity consistency, and per-account activity color assignment/fixes |
| Nov 17 | `20261117130500_sync_builtin_sheet_problem_titles.sql`, `20261117150000_sync_builtin_sheet_problem_links.sql` | Synchronize supported titles and LeetCode IDs for existing built-in copies by stable problem ID while preserving progress |
| Nov 22 | `20261122150000_remove_public_profile_email.sql`, `20261122160000_sync_builtin_sheet_data.sql` | Remove email from public profile responses and synchronize complete built-in sheet data for existing users while preserving progress |

## Cross-cutting engineering outcomes

### Data and ownership

The product's data model expands in step with its features: authenticated profiles and progress; per-user sheet copies and uploads; public profile/search functions; daily records and user preferences; and activity-color assignments. Timestamped Supabase migrations capture these changes. The implementation uses database policies/functions and owner-scoped operations so the UI's sharing features can coexist with private user data. The history repeatedly revisits this boundary when features move from local prototypes to account-backed behavior.

### Learning tracks and progress

Track content evolves from bundled source files into multiple built-in tracks plus user-uploaded text tracks. Conversion, parsing, validation, per-user copies, removal/hiding, and progress backup make the feature usable beyond the original built-in dataset. Progress states include todo, done, and skipped; profile summaries and activity history derive from those states.

### Daily tracking and insights

The Daily Log grows from a basic activity form into a date-oriented system for timed activities and sleep, with autosaving, explicit save/error feedback, timers, historical review, and Trends. Full Log and charts reuse common time/date calculations. Heatmaps and sleep/study summaries provide complementary long-range views of activity.

### Architecture and user experience

The app moves from a large `App.jsx` toward distinct auth, dashboard, sheet, problem-tracker, daily-log, activity, profile, people, and testing features. Shared UI, storage/cache helpers, and styling live in `src/shared/` and `src/styles/`; route-specific styles load with lazy screens instead of the initial stylesheet. Iterative commits add responsive behavior, custom dialogs/tooltips/date/time inputs, loading states, and clear save feedback as feature complexity grows.

### Tests and development support

Tests are introduced alongside core time helpers and later cover UI components, hooks, persistence conflicts, caches, charts, profile settings, and sample-data behavior. Local sample-data tooling supports realistic testing without embedding sample records in production flows. README and architecture documentation are updated as setup, features, deployment, and data flows change.

## Notable experiments and reversals

- The alternative theme was tried and then removed; the final interface retains the simpler theme choices.
- The inline “fast tracker” experiment was fully reverted, and the earlier day timeline was removed in favor of the date-focused tracker.
- Mobile/sidebar and global redesign work was iterated and partially rolled back before later responsive improvements were added more selectively.
- Repeated tooltip, chart, profile, and Daily Log commits represent iterative correction after trying the behavior in the interface; they are not all separate product features.
- The delete-day idea appears in a commit subject, but this history does not show it implemented.

## Repository state represented by this report

The endpoint is `7911e51` on Nov 29, 2026. At this point the product includes account-backed learning tracks, upload/import/export workflows, searchable public profiles without email disclosure, activity history, Daily Log/Full Log/Trends, sleep/study charts, sample-data tooling, and a feature-based React structure. The tracker presents available learning resources alongside separate progress controls, adapts those controls to mobile layouts, and avoids rerendering unchanged rows. Built-in track updates reach existing accounts without replacing their saved progress, and route-specific CSS is loaded with its lazy screen. The report describes the changes accumulated in the recorded history; it does not claim that every intermediate experiment remained in the final application.
