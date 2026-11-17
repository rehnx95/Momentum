import { Download, RefreshCcw, RotateCcw, Upload } from "lucide-react";
import Tooltip from "../../../shared/components/Tooltip";

export default function ProfileSheetProgress({
  sheets,
  onExport,
  onImport,
  onReset,
  onRestoreDsa,
  restoring = false,
  restoreDisabled = false,
  importFileInput,
  importProgress,
  headingId = "profile-sheet-progress",
}) {
  const showActions = onExport || onImport || onRestoreDsa || onReset;

  return (
    <section
      className="profile-sheet-progress surface-card rounded-2xl border border-subtle bg-panel p-6"
      aria-labelledby={headingId}
    >
      <header className="profile-progress-heading">
        <h2 id={headingId} className="text-lg font-semibold text-text">
          Sheet progress
        </h2>
        {showActions && (
          <div className="profile-progress-actions">
            {onExport && (
              <Tooltip label="Export progress" portal>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onExport}
                  aria-label="Export progress"
                >
                  <Upload size={14} aria-hidden="true" />
                </button>
              </Tooltip>
            )}
            {onImport && (
              <Tooltip label="Import progress" portal>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onImport}
                  aria-label="Import progress"
                >
                  <Download size={14} aria-hidden="true" />
                </button>
              </Tooltip>
            )}
            {onRestoreDsa && (
              <Tooltip label={restoring ? "Restoring DSA..." : "Restore DSA"} portal>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onRestoreDsa}
                  disabled={restoring || restoreDisabled}
                  aria-label="Restore DSA"
                >
                  <RotateCcw size={14} aria-hidden="true" />
                </button>
              </Tooltip>
            )}
            {onReset && (
              <Tooltip label="Reset all progress" portal>
                <button
                  type="button"
                  className="btn-secondary btn-danger"
                  onClick={onReset}
                  aria-label="Reset all progress"
                >
                  <RefreshCcw size={14} aria-hidden="true" />
                </button>
              </Tooltip>
            )}
          </div>
        )}
      </header>
      <div className="profile-sheet-grid">
        {sheets.map((sheet) => {
          const percentage = sheet.total ? Math.round((sheet.solved / sheet.total) * 100) : 0;
          return (
            <div className="profile-sheet-tile" key={sheet.id}>
              <div className="profile-sheet-tile-heading">
                <span className="truncate font-medium text-text">{sheet.title}</span>
                <span className="profile-sheet-counts profile-sheet-count-breakdown">
                  <span>
                    {sheet.solved} / {sheet.total}
                  </span>
                  <span>{sheet.skipped} skipped</span>
                  <span>{percentage}%</span>
                </span>
              </div>
              <div
                className="profile-sheet-progress-track"
                role="progressbar"
                aria-label={`${sheet.title} progress`}
                aria-valuemin={0}
                aria-valuemax={sheet.total}
                aria-valuenow={sheet.solved}
              >
                <div className="profile-sheet-progress-fill" style={{ width: `${percentage}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      {importFileInput && (
        <input
          ref={importFileInput}
          id="import-file"
          type="file"
          accept=".json,application/json"
          aria-label="Choose a progress backup JSON file"
          className="fixed left-0 top-0 h-px w-px opacity-0"
          onChange={importProgress}
        />
      )}
    </section>
  );
}
