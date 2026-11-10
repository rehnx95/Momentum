import { Download, RefreshCcw, Upload } from "lucide-react";

export default function ProfileSheetProgress({
  sheets,
  onExport,
  onImport,
  onReset,
  importFileInput,
  importProgress,
}) {
  return (
    <section
      className="profile-sheet-progress surface-card rounded-2xl border border-[#262626] bg-[#0A0A0A] p-6"
      aria-labelledby="profile-sheet-progress"
    >
      <header className="profile-progress-heading">
        <h2
          id="profile-sheet-progress"
          className="text-lg font-semibold text-[#EDEDED]"
        >
          Sheet progress
        </h2>
        <div className="profile-progress-actions">
          <button type="button" className="btn-secondary" onClick={onExport}>
            <Download size={14} /> Export
          </button>
          <button type="button" className="btn-secondary" onClick={onImport}>
            <Upload size={14} /> Import
          </button>
          <button
            type="button"
            className="btn-secondary btn-danger"
            onClick={onReset}
          >
            <RefreshCcw size={14} /> Reset all
          </button>
        </div>
      </header>
      <div className="profile-sheet-grid">
        {sheets.map((sheet) => {
          const percentage = sheet.total
            ? Math.round((sheet.solved / sheet.total) * 100)
            : 0;
          return (
            <div className="profile-sheet-tile" key={sheet.id}>
              <div className="profile-sheet-tile-heading">
                <span className="truncate font-medium text-[#EDEDED]">
                  {sheet.title}
                </span>
                <span className="profile-sheet-percent">{percentage}%</span>
              </div>
              <div
                className="profile-sheet-progress-track"
                role="progressbar"
                aria-label={`${sheet.title} progress`}
                aria-valuemin={0}
                aria-valuemax={sheet.total}
                aria-valuenow={sheet.solved}
              >
                <div
                  className="profile-sheet-progress-fill"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="profile-sheet-counts">
                {sheet.solved} / {sheet.total} solved
                <span aria-hidden="true"> · </span>
                {sheet.skipped} skipped
              </span>
            </div>
          );
        })}
      </div>
      <input
        ref={importFileInput}
        id="import-file"
        type="file"
        accept=".json,application/json"
        aria-label="Choose a progress backup JSON file"
        className="fixed left-0 top-0 h-px w-px opacity-0"
        onChange={importProgress}
      />
    </section>
  );
}
