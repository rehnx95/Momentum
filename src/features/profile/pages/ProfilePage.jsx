import AppHeader from "../../../shared/components/AppHeader";
import Tooltip from "../../../shared/components/Tooltip";
import { Calendar, Trophy, Target, Link2, Pencil } from "lucide-react";
import StatStrip from "../../../shared/components/StatStrip";
import ActivityHeatmap from "../../activity/components/ActivityHeatmap";
import ProfileSheetProgress from "../components/ProfileSheetProgress";
import RecentAcceptedProblems from "../components/RecentAcceptedProblems";
import "../../../styles/profile.css";
import "../../../styles/profile-layout.css";
import "../../../styles/own-profile-layout.css";
import "../../../styles/responsive/profile.css";

export default function ProfilePage({ context }) {
  const {
    activityLog,
    authError,
    availableSheets,
    backupAction,
    dailyStreak,
    exportProgress,
    headerProps,
    importFileInput,
    importProgress,
    importSheetId,
    longestStreak,
    navigateTo,
    openProfileSettings,
    ownHeatmapYear,
    profileProblemsSolved,
    profileProblemsTotal,
    profileSheetStats,
    progressError,
    publicProfileReturnPath,
    recentAccepted,
    reset,
    builtInSheetOptions = [],
    restoreBuiltinSheet,
    restoringBuiltinSheetId,
    customSheetsLoading,
    progressLoading,
    setBackupAction,
    setOwnHeatmapYear,
    showNotice,
    todayDateKey,
    user,
    userName,
    userUsername,
    yearlyActiveDays,
  } = context;
  const { askConfirmation } = context;
  const actionSheets = backupAction === "restore" ? builtInSheetOptions : availableSheets;

  return (
    <div className="profile-shell min-h-screen bg-page text-text font-sans transition-colors duration-300">
      <AppHeader active="profile" {...headerProps} />

      <main className="app-page">
        {(authError || progressError) && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-border-strong bg-rowHover p-3 text-sm text-muted"
          >
            {authError || progressError}
          </div>
        )}
        <div className="profile-layout own-profile-layout">
          <div className="profile-left-column">
            <aside className="profile-sidebar">
              <section className="profile-hero">
                <div className="profile-avatar">{userName.charAt(0).toUpperCase() || "U"}</div>
                <div className="profile-user-details">
                  <div className="profile-identity">
                    <h1 className="text-xl font-semibold text-text">{userName}</h1>
                    <p className="mt-1 text-sm text-muted">@{userUsername}</p>
                    {user.email && (
                      <p className="mt-1 break-all text-sm text-muted">{user.email}</p>
                    )}
                  </div>
                </div>
                <div className="profile-hero-actions flex flex-wrap gap-2">
                  <Tooltip label="Edit profile" portal>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={openProfileSettings}
                      aria-label="Edit profile"
                    >
                      <Pencil size={16} />
                    </button>
                  </Tooltip>
                  {userUsername && (
                    <Tooltip label="Public view" portal>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          publicProfileReturnPath.current = "/profile";
                          navigateTo(`/u/${encodeURIComponent(userUsername)}`);
                        }}
                        aria-label="Public view"
                      >
                        <Link2 size={16} />
                      </button>
                    </Tooltip>
                  )}
                </div>
                <StatStrip
                  className="profile-overview-stats"
                  items={[
                    {
                      label: "Current streak",
                      value: dailyStreak,
                      unit: dailyStreak === 1 ? "day" : "days",
                      icon: Calendar,
                    },
                    {
                      label: "Best streak",
                      value: longestStreak,
                      unit: longestStreak === 1 ? "day" : "days",
                      icon: Trophy,
                    },
                    {
                      label: "Problems solved",
                      value: profileProblemsSolved,
                      unit: `/ ${profileProblemsTotal}`,
                      icon: Target,
                    },
                    {
                      label: "Active days",
                      value: yearlyActiveDays,
                      icon: Calendar,
                    },
                  ]}
                />
              </section>
            </aside>

            <div className="profile-top">
              <ProfileSheetProgress
                sheets={profileSheetStats}
                onExport={() => setBackupAction("export")}
                onImport={() => setBackupAction("import")}
                onRestoreBuiltin={() => setBackupAction("restore")}
                restoringBuiltinSheetId={restoringBuiltinSheetId}
                restoreDisabled={customSheetsLoading || progressLoading}
                onReset={async () => {
                  const confirmed = await askConfirmation(
                    "Reset progress for ALL sheets? This cannot be undone.",
                    "Reset all progress?",
                  );
                  if (confirmed) await reset();
                }}
                importFileInput={importFileInput}
                importProgress={importProgress}
              />
            </div>
          </div>

          <div className="profile-main">
            <ActivityHeatmap
              activity={activityLog}
              todayKey={todayDateKey}
              selectedYear={ownHeatmapYear}
              onSelectYear={setOwnHeatmapYear}
              fillWidth
            />

            <RecentAcceptedProblems problems={recentAccepted} />
          </div>
        </div>
        {backupAction && (
          <div
            className="app-dialog-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setBackupAction("");
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="backup-sheet-title"
              aria-describedby="backup-sheet-description"
              className="app-dialog"
              tabIndex={-1}
            >
              <h2 id="backup-sheet-title" className="text-lg font-semibold text-text">
                {backupAction === "export"
                  ? "Choose a sheet to export"
                  : backupAction === "restore"
                    ? "Choose a built-in sheet to restore"
                    : "Choose a sheet to import into"}
              </h2>
              <p id="backup-sheet-description">
                {backupAction === "export"
                  ? "Download progress for one sheet."
                  : backupAction === "restore"
                    ? "Select DSA or Backend. Progress for the selected sheet will be reset."
                    : "Choose the sheet you want to restore, then select its progress backup file."}
              </p>
              {backupAction === "import" && (
                <div className="mt-4 rounded-lg border border-subtle bg-panel p-3 text-sm text-text">
                  <div className="font-medium">How to import</div>
                  <ol className="mt-1 list-inside list-decimal space-y-1 text-xs leading-relaxed text-muted">
                    <li>Select the destination sheet below.</li>
                    <li>Choose the matching progress backup JSON file.</li>
                    <li>Matching problem names or IDs will be imported.</li>
                  </ol>
                  <div className="mt-2 text-xs text-muted">
                    Create a backup with Profile → Export Progress if you don’t have one yet.
                  </div>
                </div>
              )}
              <div
                className="mt-4 max-h-72 space-y-1 overflow-y-auto"
                role="group"
                aria-label={backupAction === "restore" ? "Built-in sheets" : "Available sheets"}
              >
                {actionSheets.map((sheet) => (
                  <button
                    key={sheet.id}
                    type="button"
                    aria-label={
                      backupAction === "restore" ? `Restore ${sheet.title} sheet` : undefined
                    }
                    onClick={async () => {
                      if (backupAction === "restore") {
                        setBackupAction("");
                        const confirmed = await askConfirmation(
                          `Restore the original ${sheet.title} sheet? Your ${sheet.title} progress will be reset. Other sheets will not be affected.`,
                          `Restore ${sheet.title}?`,
                        );
                        if (!confirmed) return;
                        try {
                          await restoreBuiltinSheet(sheet.id);
                          showNotice(
                            `The original ${sheet.title} sheet was restored and its progress was reset.`,
                            `${sheet.title} restored`,
                          );
                        } catch (error) {
                          console.error(`Failed to restore ${sheet.title} sheet:`, error);
                          showNotice(
                            error.message ||
                              `Could not restore the ${sheet.title} sheet. Please try again.`,
                            "Restore failed",
                          );
                        }
                        return;
                      }
                      if (backupAction === "export") {
                        exportProgress(sheet);
                        return;
                      }
                      importSheetId.current = sheet.id;
                      const input = importFileInput.current;
                      if (!input) {
                        showNotice(
                          "Could not open the file picker. Please try Import again.",
                          "Could not open file picker",
                        );
                        return;
                      }
                      input.click();
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm text-text transition-colors hover:bg-rowHover"
                  >
                    <span>{sheet.title}</span>
                    <span className="text-xs text-muted tabular-nums">
                      {backupAction === "restore" ? "Built-in" : `${sheet.problemCount} problems`}
                    </span>
                  </button>
                ))}
              </div>
              <div className="app-dialog-actions">
                <button
                  type="button"
                  className="app-dialog-cancel"
                  onClick={() => setBackupAction("")}
                >
                  Cancel
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
