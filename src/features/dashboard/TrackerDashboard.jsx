import { Check, RefreshCcw, Search, X } from "lucide-react";
import AppHeader from "../../shared/components/AppHeader";
import Tooltip from "../../shared/components/Tooltip";
import TrackerControls from "./components/TrackerControls";
import SheetSwitcher from "../sheets/components/SheetSwitcher";
import { StepRow } from "../problem-tracker/components/ProblemTree";
import { getProblemDifficulty } from "../problem-tracker/utils/problemDifficulty";
import { isBuiltInSheet } from "../sheets/utils/builtinSheet";

const BUILTIN_GAUGE_FILL_TRANSITION = "stroke-dasharray 900ms cubic-bezier(0.16, 1, 0.3, 1)";
const SHEET_STATUS_COLORS = {
  done: "hsl(160 70% 45%)",
  todo: "hsl(43 100% 50%)",
};
const BUILTIN_DIFFICULTIES = [
  { name: "Easy", label: "Easy", color: "#34D399" },
  { name: "Medium", label: "Med.", color: "#FFA116" },
  { name: "Hard", label: "Hard", color: "#FB7185" },
];

function getBuiltinDifficultyStats(sheetProblems, progressState) {
  const stats = Object.fromEntries(
    BUILTIN_DIFFICULTIES.map(({ name }) => [name, { done: 0, total: 0 }]),
  );
  sheetProblems.forEach((problem) => {
    const difficulty = getProblemDifficulty(problem);
    if (!stats[difficulty]) return;
    stats[difficulty].total += 1;
    if (progressState(problem.id) === "done") stats[difficulty].done += 1;
  });
  return stats;
}

function ProgressGauge({ done, total, skipped, centerLabel, ariaLabel, segments }) {
  const circumference = 2 * Math.PI * 42;
  return (
    <div className="relative flex h-full flex-1 items-center justify-center overflow-hidden rounded-lg bg-[var(--surface-raised)]">
      <div
        className="relative aspect-square w-full max-w-[160px] overflow-hidden"
        role="img"
        aria-label={ariaLabel}
      >
        <div className="absolute left-1/2 top-1/2 h-[113%] w-[113%] translate-x-[-50%] translate-y-[-44%]">
          <svg
            viewBox="0 0 100 100"
            className="absolute left-0 top-0 h-full w-full fill-transparent"
            aria-hidden="true"
          >
            <defs>
              <clipPath id="progress-gauge-arc-mask">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M21.3622 21.3622C5.54592 37.1784 5.54592 62.8216 21.3622 78.6378C21.9479 79.2236 21.9479 80.1734 21.3622 80.7591C20.7764 81.3449 19.8266 81.3449 19.2408 80.7591C2.25303 63.7713 2.25303 36.2287 19.2408 19.2409C36.2286 2.25305 63.7713 2.25305 80.7591 19.2409C97.7469 36.2287 97.7469 63.7713 80.7591 80.7591C80.1733 81.3449 79.2236 81.3449 78.6378 80.7591C78.052 80.1734 78.052 79.2236 78.6378 78.6378C94.454 62.8216 94.454 37.1784 78.6378 21.3622C62.8216 5.54594 37.1784 5.54594 21.3622 21.3622Z"
                />
              </clipPath>
            </defs>
            <g clipPath="url(#progress-gauge-arc-mask)">
              {segments.map(({ name, color, rotation, trackLength, solvedLength }) => (
                <g key={name} transform={`rotate(${rotation} 50 50)`}>
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="transparent"
                    stroke={color}
                    strokeOpacity="0.2"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${trackLength} ${circumference - trackLength}`}
                    strokeDashoffset="66"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="transparent"
                    stroke={color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${solvedLength} ${circumference - solvedLength}`}
                    strokeDashoffset="66"
                    style={{ transition: BUILTIN_GAUGE_FILL_TRANSITION }}
                  />
                </g>
              ))}
            </g>
          </svg>
        </div>
        <div className="absolute inset-0">
          <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 whitespace-nowrap text-sm text-[var(--text)]">
            <div className="tabular-nums">
              <span className="text-3xl font-semibold leading-[32px]">{done}</span>
              <span>/{total}</span>
            </div>
            <div className="relative">
              <Check
                size={12}
                className="absolute right-[calc(100%+2px)] top-1/2 -translate-y-1/2 text-emerald-400"
                aria-hidden="true"
              />
              {centerLabel}
            </div>
          </div>
          <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-[var(--muted)]">
            <span className="font-semibold">{skipped}</span> Skipped
          </div>
        </div>
      </div>
    </div>
  );
}

function BuiltInProgressGauge({ done, total, skipped, difficultyStats }) {
  const circumference = 2 * Math.PI * 42;
  const trackLength = (circumference * 254) / 360;
  const difficultyTotal = BUILTIN_DIFFICULTIES.reduce(
    (sum, { name }) => sum + difficultyStats[name].total,
    0,
  );
  let rotation = 225;
  const segments = BUILTIN_DIFFICULTIES.map(({ name, color }) => {
    const stats = difficultyStats[name];
    const segmentLength = difficultyTotal > 0 ? (trackLength * stats.total) / difficultyTotal : 0;
    const segment = {
      name,
      color,
      rotation,
      trackLength: segmentLength,
      solvedLength: stats.total > 0 ? (segmentLength * stats.done) / stats.total : 0,
    };
    rotation += (segmentLength / circumference) * 360 + 8;
    return segment;
  });

  return (
    <ProgressGauge
      done={done}
      total={total}
      skipped={skipped}
      centerLabel="Solved"
      ariaLabel={`${done} of ${total} problems solved, ${skipped} skipped`}
      segments={segments}
    />
  );
}

function BuiltInDifficultyProgress({ stats }) {
  return (
    <div className="flex h-full w-[90px] flex-none flex-col gap-2">
      {BUILTIN_DIFFICULTIES.map(({ name, label, color }) => {
        const { done, total } = stats[name];
        return (
          <div
            key={name}
            className="flex w-full flex-1 flex-col items-center justify-center gap-1 rounded border border-[var(--border)] bg-page text-center leading-tight"
            role="group"
            aria-label={`${name}: ${done} solved out of ${total}`}
          >
            <span className="text-xs font-medium" style={{ color }}>
              {label}
            </span>
            <span className="text-xs font-medium tabular-nums text-[var(--text)]">
              {done}/{total}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SheetProgressGauge({ done, total, todo, skipped }) {
  const circumference = 2 * Math.PI * 42;
  const trackLength = (circumference * 254) / 360;
  const activeTotal = done + todo;
  const categories = [
    { name: "Done", count: done, color: SHEET_STATUS_COLORS.done },
    { name: "To Do", count: todo, color: SHEET_STATUS_COLORS.todo },
  ].filter(({ count }) => count > 0);
  const gapLength = (circumference * 8) / 360;
  const segmentLengthBudget =
    trackLength + (BUILTIN_DIFFICULTIES.length - categories.length) * gapLength;
  let rotation = 225;
  const segments = categories.map(({ name, count, color }) => {
    const segmentLength = (segmentLengthBudget * count) / activeTotal;
    const segment = {
      name,
      color,
      rotation,
      trackLength: segmentLength,
      solvedLength: segmentLength,
    };
    rotation += (segmentLength / circumference) * 360 + 8;
    return segment;
  });

  return (
    <ProgressGauge
      done={done}
      total={total}
      skipped={skipped}
      centerLabel="Done"
      ariaLabel={`${done} done, ${todo} to do, ${skipped} skipped`}
      segments={segments}
    />
  );
}

function SheetStatusProgress({ done, todo }) {
  return (
    <div className="flex h-full w-[90px] flex-none flex-col items-center justify-start gap-2">
      {[
        { label: "Done", value: done, color: SHEET_STATUS_COLORS.done },
        { label: "To Do", value: todo, color: SHEET_STATUS_COLORS.todo },
      ].map(({ label, value, color }) => (
        <div
          key={label}
          className="flex h-[44px] w-full flex-none flex-col items-center justify-center gap-1 rounded border border-[var(--border)] bg-page text-center leading-tight"
          role="group"
          aria-label={`${label}: ${value}`}
        >
          <span className="text-xs font-medium" style={{ color }}>
            {label}
          </span>
          <span className="text-xs font-medium tabular-nums text-[var(--text)]">{value}</span>
        </div>
      ))}
    </div>
  );
}

export default function TrackerDashboard({ context }) {
  const {
    activeFilter,
    askConfirmation,
    authError,
    chipActive,
    collapseAll,
    deletingSheetId,
    doneCount,
    downloadSampleFormat,
    expandAll,
    expandedSteps,
    expandedSubs,
    filteredSteps,
    handleRemoveSheet,
    handleSkip,
    handleToggle,
    handleUploadSheet,
    headerProps,
    hideSkipped,
    importProgress,
    progressError,
    progressState,
    renderDialog,
    reset,
    search,
    selectedSheet,
    setActiveFilter,
    setHideSkipped,
    setProgressError,
    setSearch,
    setSelectedSheetId,
    sheetError,
    sheetProblems,
    sheets,
    skippedCount,
    theme,
    todoCount,
    totalProblems,
    toggleStep,
    toggleSub,
    uploadSheetInput,
    uploadingSheet,
  } = context;
  const isBuiltIn = isBuiltInSheet(selectedSheet);
  const isCompactProgressCard = !isBuiltIn && Boolean(selectedSheet?.customId);
  const canResetSheetProgress = isBuiltIn || Boolean(selectedSheet?.customId);
  const builtInDifficultyStats = isBuiltIn
    ? getBuiltinDifficultyStats(sheetProblems, progressState)
    : null;

  return (
    <>
      <div
        className="dashboard-shell tracker-dashboard-shell min-h-screen bg-page text-text font-sans transition-colors duration-300"
        data-theme={theme === "light" ? "light" : undefined}
      >
        <AppHeader active="tracker" {...headerProps} />
        <main
          className={`dashboard-main app-page min-h-0${selectedSheet ? "" : " tracker-no-sheet"}`}
        >
          {progressError && (
            <div
              role="alert"
              className="fixed bottom-4 right-4 z-[60] max-w-md rounded-lg border border-mid bg-panel p-4 text-sm text-muted shadow-xl"
            >
              <div className="flex items-start gap-3">
                <p>{progressError}</p>
                <button
                  onClick={() => setProgressError("")}
                  aria-label="Dismiss sync error"
                  className="text-muted hover:text-text"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
          {authError && (
            <div
              role="alert"
              className="fixed bottom-4 right-4 z-[60] max-w-md rounded-lg border border-mid bg-panel p-4 text-sm text-muted shadow-xl"
            >
              <div className="flex items-start gap-3">
                <p>{authError}</p>
              </div>
            </div>
          )}
          <section className="dashboard-content min-w-0">
            <div className="page-head">
              <SheetSwitcher
                sheets={sheets}
                selected={selectedSheet}
                onSelect={setSelectedSheetId}
                onUpload={() => uploadSheetInput.current?.click()}
                uploading={uploadingSheet}
                onSample={downloadSampleFormat}
                onDelete={handleRemoveSheet}
                deletingId={deletingSheetId}
              />
              <span className="text-sm text-muted tabular-nums">{totalProblems} problems</span>
              <span className="page-head-spacer" />
              <div className="relative w-full sm:w-72">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search problems"
                  placeholder="Search problems…"
                  className="h-10 w-full rounded-lg border border-subtle bg-panel pl-9 pr-9 text-sm text-text placeholder:text-muted outline-none transition-colors focus:border-accent focus:outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear problem search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            <input
              ref={uploadSheetInput}
              type="file"
              accept=".txt,text/plain"
              aria-label="Upload a problem sheet TXT file"
              className="hidden"
              onChange={handleUploadSheet}
            />
            {sheetError && (
              <p
                role="alert"
                className="mb-4 rounded-lg border border-border-strong bg-rowHover p-3 text-sm text-muted"
              >
                {sheetError}
              </p>
            )}
            <TrackerControls
              activeFilter={activeFilter}
              chipActive={chipActive}
              collapseAll={collapseAll}
              expandAll={expandAll}
              hideSkipped={hideSkipped}
              setActiveFilter={setActiveFilter}
              setHideSkipped={setHideSkipped}
            />
            <div>
              {filteredSteps.length > 0 ? (
                filteredSteps.map((step) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    progressState={progressState}
                    expandedSteps={expandedSteps}
                    onToggleStep={toggleStep}
                    expandedSubs={expandedSubs}
                    onToggleSub={toggleSub}
                    onToggleProb={handleToggle}
                    onSkipProb={handleSkip}
                    hideSkipped={hideSkipped}
                    filter={activeFilter}
                    showBuiltinMetadata={isBuiltIn}
                  />
                ))
              ) : (
                <p className="py-10 text-center text-sm text-muted">
                  No problems match your current filters.
                </p>
              )}
            </div>
          </section>
          {selectedSheet && (
            <aside className="tracker-side block space-y-3">
              <div className="tracker-sheet-progress surface-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 relative">
                <div
                  className={`mb-2 ${canResetSheetProgress ? "flex items-center justify-between" : ""}`}
                >
                  <h3
                    className={`text-xs font-medium text-muted uppercase tracking-wide ${
                      canResetSheetProgress ? "leading-5" : ""
                    }`}
                  >
                    {selectedSheet?.title || "Sheet"} progress
                  </h3>
                  {canResetSheetProgress && (
                    <Tooltip label="Reset" className="ml-2 shrink-0" portal>
                      <button
                        type="button"
                        aria-label={`Reset ${selectedSheet?.title || "sheet"} progress`}
                        className="grid h-5 w-5 min-h-0 place-items-center rounded text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                        onClick={async () => {
                          const sheetName = selectedSheet?.title || "this sheet";
                          const confirmationMessage = `Reset progress for ${sheetName} only? Other sheets will not be affected.`;
                          const confirmed = await askConfirmation(
                            confirmationMessage,
                            `Reset ${sheetName} progress?`,
                          );
                          if (confirmed) await reset(sheetProblems.map((problem) => problem.id));
                        }}
                      >
                        <RefreshCcw size={14} aria-hidden="true" />
                      </button>
                    </Tooltip>
                  )}
                </div>
                {isBuiltIn ? (
                  <div className="flex h-[148px] w-full gap-2">
                    <BuiltInProgressGauge
                      done={doneCount}
                      total={totalProblems}
                      skipped={skippedCount}
                      difficultyStats={builtInDifficultyStats}
                    />
                    <BuiltInDifficultyProgress stats={builtInDifficultyStats} />
                  </div>
                ) : isCompactProgressCard ? (
                  <div className="flex h-[148px] w-full gap-2">
                    <SheetProgressGauge
                      done={doneCount}
                      total={totalProblems}
                      todo={todoCount}
                      skipped={skippedCount}
                    />
                    <SheetStatusProgress done={doneCount} todo={todoCount} />
                  </div>
                ) : (
                  <>
                    <div className="mb-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-semibold text-[var(--text)] tabular-nums">
                          {totalProblems > 0 ? Math.round((doneCount / totalProblems) * 100) : 0}%
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-1">
                        {doneCount} / {totalProblems} problems solved
                      </p>
                    </div>
                    <div className="relative mt-3">
                      <div className="h-2 bg-[var(--surface-hover)] rounded-full overflow-visible relative">
                        <div
                          className="h-full bg-[var(--progress-fill)] rounded-full transition-all duration-500 ease-out relative"
                          style={{
                            width: `${totalProblems > 0 ? (doneCount / totalProblems) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-[var(--border)]">
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-[var(--text)] tabular-nums">
                            {doneCount}
                          </div>
                          <div className="text-xs text-muted uppercase tracking-wide">Done</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-[var(--muted)] tabular-nums">
                            {skippedCount}
                          </div>
                          <div className="text-xs text-muted uppercase tracking-wide">Skipped</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-[var(--text)] tabular-nums">
                            {todoCount}
                          </div>
                          <div className="text-xs text-muted uppercase tracking-wide">To Do</div>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const confirmed = await askConfirmation(
                            `Reset progress for ${selectedSheet?.title || "this sheet"} only? Other sheets will not be affected.`,
                            "Reset this sheet?",
                          );
                          if (confirmed) await reset(sheetProblems.map((problem) => problem.id));
                        }}
                        className="w-full border border-[var(--border)] text-xs py-2 bg-[var(--surface-hover)] hover:bg-[var(--surface-raised)] text-[var(--muted)] hover:text-[var(--text)] rounded-md transition-colors flex items-center justify-center gap-1"
                      >
                        <RefreshCcw size={12} /> Reset This Sheet
                      </button>
                    </div>
                  </>
                )}
              </div>
            </aside>
          )}
        </main>
        <input
          id="import-file"
          type="file"
          accept=".json"
          className="hidden"
          onChange={importProgress}
        />
      </div>
      {renderDialog()}
    </>
  );
}
