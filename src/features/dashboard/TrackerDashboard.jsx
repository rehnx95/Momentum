import { RefreshCcw, Search, X } from "lucide-react";
import AppHeader from "../../shared/components/AppHeader";
import SheetSwitcher from "../sheets/components/SheetSwitcher";
import { StepRow } from "../problem-tracker/components/ProblemTree";

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

  return (
    <>
      <div
        className="dashboard-shell tracker-dashboard-shell min-h-screen bg-[#000000] text-[#EDEDED] font-sans transition-colors duration-300"
        data-theme={theme === "light" ? "light" : undefined}
      >
        <AppHeader active="tracker" {...headerProps} />
        <main className="dashboard-main app-page min-h-0">
          {progressError && (
            <div
              role="alert"
              className="fixed bottom-4 right-4 z-[60] max-w-md rounded-lg border border-[#383838] bg-[#0A0A0A] p-4 text-sm text-[#A1A1A1] shadow-xl"
            >
              <div className="flex items-start gap-3">
                <p>{progressError}</p>
                <button
                  onClick={() => setProgressError("")}
                  aria-label="Dismiss sync error"
                  className="text-[#A1A1A1] hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
          {authError && (
            <div
              role="alert"
              className="fixed bottom-4 right-4 z-[60] max-w-md rounded-lg border border-[#383838] bg-[#0A0A0A] p-4 text-sm text-[#A1A1A1] shadow-xl"
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
              <span className="text-sm text-[#A1A1A1]">
                {totalProblems} problems
              </span>
              <span className="page-head-spacer" />
              <div className="relative w-full sm:w-72">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1A1]"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search problems"
                  placeholder="Search problems…"
                  className="h-10 w-full rounded-lg border border-[#262626] bg-[#0A0A0A] pl-9 pr-9 text-sm text-[#EDEDED] placeholder-[#A1A1A1] outline-none transition-colors focus:border-[#EDEDED] focus:outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear problem search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A1A1A1] hover:text-white"
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
            <div className="tracker-controls">
              {["all", "done", "skipped", "todo"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActiveFilter(type)}
                  aria-pressed={activeFilter === type}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${chipActive(type)}`}
                >
                  {type === "all"
                    ? "All"
                    : type === "done"
                      ? "Done"
                      : type === "skipped"
                        ? "Skipped"
                        : "To do"}
                </button>
              ))}
              <label className="ml-2 flex cursor-pointer select-none items-center gap-1.5 text-xs text-[#A1A1A1]">
                <input
                  type="checkbox"
                  checked={hideSkipped}
                  onChange={(event) => setHideSkipped(event.target.checked)}
                  className="h-3.5 w-3.5 rounded border-[#262626] bg-[#0A0A0A] accent-[#EDEDED]"
                />
                Hide skipped
              </label>
              <span className="page-head-spacer" />
              <div className="flex items-center gap-2 text-xs text-[#A1A1A1]">
                <button
                  type="button"
                  onClick={expandAll}
                  className="transition-colors hover:text-white"
                >
                  Expand all
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="transition-colors hover:text-white"
                >
                  Collapse all
                </button>
              </div>
            </div>
            <section
              className="mobile-progress-summary surface-card mb-4 rounded-xl border border-[#262626] bg-[#0A0A0A] p-4 lg:hidden"
              aria-label="Overall progress"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xs font-medium uppercase tracking-wide text-[#A1A1A1]">
                    Overall progress
                  </h2>
                  <p className="mt-1 text-sm text-[#A1A1A1]">
                    {doneCount} of {totalProblems} problems solved
                  </p>
                </div>
                <span className="text-2xl font-bold tabular-nums text-[#EDEDED]">
                  {totalProblems > 0
                    ? Math.round((doneCount / totalProblems) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#262626]"
                role="progressbar"
                aria-label="Overall problem completion"
                aria-valuemin={0}
                aria-valuemax={totalProblems}
                aria-valuenow={doneCount}
              >
                <div
                  className="h-full rounded-full bg-[#EDEDED] transition-all"
                  style={{
                    width: `${totalProblems > 0 ? (doneCount / totalProblems) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="mt-3 flex justify-between gap-2 text-xs text-[#A1A1A1]">
                <span>{doneCount} done</span>
                <span>{skippedCount} skipped</span>
                <span>{todoCount} to do</span>
              </div>
            </section>
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
                  />
                ))
              ) : (
                <p className="py-10 text-center text-sm text-[#A1A1A1]">
                  No problems match your current filters.
                </p>
              )}
            </div>
          </section>
          <aside className="tracker-side hidden lg:block space-y-3">
            <div className="surface-card bg-[#0A0A0A] rounded-2xl border border-[#262626] p-6 relative">
              <div className="mb-4">
                <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                  {selectedSheet?.title || "Sheet"} progress
                </h3>
              </div>
              <div className="mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-white tabular-nums">
                    {totalProblems > 0
                      ? Math.round((doneCount / totalProblems) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {doneCount} / {totalProblems} problems solved
                </p>
              </div>
              <div className="relative mt-4">
                <div className="h-2 bg-zinc-800 rounded-full overflow-visible relative">
                  <div
                    className="h-full bg-[#EDEDED] rounded-full transition-all duration-500 ease-out relative"
                    style={{
                      width: `${totalProblems > 0 ? (doneCount / totalProblems) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-zinc-800/50">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white tabular-nums">
                      {doneCount}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                      Done
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-muted tabular-nums">
                      {skippedCount}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                      Skipped
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white tabular-nums">
                      {todoCount}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                      To Do
                    </div>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const confirmed = await askConfirmation(
                      `Reset progress for ${selectedSheet?.title || "this sheet"} only? Other sheets will not be affected.`,
                      "Reset this sheet?",
                    );
                    if (confirmed)
                      await reset(sheetProblems.map((problem) => problem.id));
                  }}
                  className="w-full text-xs py-1.5 bg-[#1F1F1F] hover:bg-[#262626] text-[#A1A1A1] hover:text-[#EDEDED] rounded-md transition-colors flex items-center justify-center gap-1"
                >
                  <RefreshCcw size={12} /> Reset This Sheet
                </button>
              </div>
            </div>
          </aside>
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
