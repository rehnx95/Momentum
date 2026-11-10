import { useEffect, useRef } from "react";
import AppHeader from "../../../shared/components/AppHeader";
import Tooltip from "../../../shared/components/Tooltip";
import { ChevronDown, Download, Upload, RefreshCcw, Calendar, Trophy, Target, Link2, Pencil } from "lucide-react";
import StatStrip from "../../../shared/components/StatStrip";
import SleepStudyChart from "../../activity/components/SleepStudyChart";
import ActivityHeatmap from "../../activity/components/ActivityHeatmap";
import ProfileSheetProgress from "../components/ProfileSheetProgress";
import RecentAcceptedProblems from "../components/RecentAcceptedProblems";

export default function ProfilePage({ context }) {
    const {
      activityLog,
      askConfirmation,
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
      setBackupAction,
      setOwnHeatmapYear,
      showNotice,
      todayDateKey,
      user,
      userLocation,
      userName,
      userUsername,
      userWebsite,
      yearlyActiveDays,
    } = context;
    const activityScrollRef = useRef(null);
    useEffect(() => {
      const container = activityScrollRef.current;
      if (container) container.scrollLeft = container.scrollWidth;
    }, []);

    return (
      <div className="profile-shell min-h-screen bg-[#000000] text-[#EDEDED] font-sans transition-colors duration-300">
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
                <div className="profile-avatar">
                  {userName.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="profile-user-details">
                  <div className="profile-identity">
                    <h1 className="text-2xl font-bold text-[#EDEDED]">
                      {userName}
                    </h1>
                    <p className="mt-1 text-sm text-[#A1A1A1]">
                      @{userUsername}
                    </p>
                    {user.email && (
                      <p className="mt-1 break-all text-sm text-[#A1A1A1]">
                        {user.email}
                      </p>
                    )}
                    {userLocation && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-[#A1A1A1]">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        {userLocation}
                      </div>
                    )}
                    {userWebsite && (
                      <a
                        href={userWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block break-all text-sm text-[#A1A1A1] hover:text-white hover:underline"
                      >
                        {userWebsite}
                      </a>
                    )}
                  </div>
                </div>
                <div className="profile-hero-actions flex flex-wrap gap-2">
                  <Tooltip label="Edit profile">
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
                    <Tooltip label="Public view">
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

              <section className="profile-data-legacy surface-card rounded-2xl border border-[#262626] bg-[#0A0A0A] divide-y divide-[#262626]">
                <div className="p-4">
                  <h2 className="mb-4 text-lg font-semibold text-[#EDEDED]">
                    Progress &amp; Data Management
                  </h2>
                  <div className="space-y-3">
                    <button
                      onClick={() => setBackupAction("export")}
                      className="w-full flex items-center justify-between p-3.5 rounded-lg hover:bg-[#1F1F1F] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#1F1F1F] flex items-center justify-center text-[#EDEDED]">
                          <Download size={20} />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-medium text-[#EDEDED]">
                            Export Progress
                          </div>
                          <div className="text-xs text-[#A1A1A1]">
                            Download your progress as JSON
                          </div>
                        </div>
                      </div>
                      <ChevronDown
                        size={16}
                        className="rotate-90 text-[#A1A1A1]"
                      />
                    </button>

                    <button
                      onClick={() => setBackupAction("import")}
                      className="w-full flex items-center justify-between p-3.5 rounded-lg hover:bg-[#1F1F1F] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#1F1F1F] flex items-center justify-center text-[#A1A1A1]">
                          <Upload size={20} />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-medium text-[#EDEDED]">
                            Import Progress
                          </div>
                          <div className="text-xs text-[#A1A1A1]">
                            Restore progress from backup
                          </div>
                        </div>
                      </div>
                      <ChevronDown
                        size={16}
                        className="rotate-90 text-[#A1A1A1]"
                      />
                    </button>

                    <button
                      onClick={async () => {
                        const confirmed = await askConfirmation(
                          "Reset all progress across every sheet? This cannot be undone.",
                          "Reset all progress?",
                        );
                        if (confirmed) await reset();
                      }}
                      className="w-full flex items-center justify-between rounded-lg p-3.5 transition-colors hover:bg-[#1F1F1F]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1F1F1F] text-[#A1A1A1]">
                          <RefreshCcw size={20} />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-medium text-[#EDEDED]">
                            Reset All Sheets
                          </div>
                          <div className="text-xs text-[#A1A1A1]">
                            Clear all progress and activity
                          </div>
                        </div>
                      </div>
                      <ChevronDown
                        size={16}
                        className="rotate-90 text-[#A1A1A1]"
                      />
                    </button>

                  </div>
                </div>
              </section>
            </aside>

            <div className="profile-top">
              <ProfileSheetProgress
                sheets={profileSheetStats}
                onExport={() => setBackupAction("export")}
                onImport={() => setBackupAction("import")}
                onReset={async () => {
                  const confirmed = await askConfirmation(
                    "Reset all progress across every sheet? This cannot be undone.",
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
              <SleepStudyChart userId={user.id} />

              <ActivityHeatmap
                activity={activityLog}
                todayKey={todayDateKey}
                selectedYear={ownHeatmapYear}
                onSelectYear={setOwnHeatmapYear}
              />

              <RecentAcceptedProblems problems={recentAccepted} />
            </div>
          </div>
          {backupAction && (
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setBackupAction("");
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="backup-sheet-title"
                className="w-full max-w-md rounded-2xl border border-[#262626] bg-[#0A0A0A] p-5 shadow-2xl"
              >
                <h2
                  id="backup-sheet-title"
                  className="text-lg font-semibold text-[#EDEDED]"
                >
                  {backupAction === "export"
                    ? "Choose a sheet to export"
                    : "Choose a sheet to import into"}
                </h2>
                <p className="mb-4 mt-1 text-sm text-[#A1A1A1]">
                  {backupAction === "export"
                    ? "Download progress for one sheet."
                    : "Choose the sheet you want to restore, then select its progress backup file. This dialog stays open if you cancel the file picker."}
                </p>
                {backupAction === "import" && (
                  <div className="mb-4 rounded-lg border border-[#262626] bg-[#0A0A0A] p-3 text-sm text-[#EDEDED]">
                    <p className="font-medium">How to import</p>
                    <ol className="mt-1 list-inside list-decimal space-y-1 text-xs leading-relaxed text-[#A1A1A1]">
                      <li>Select the destination sheet below.</li>
                      <li>Choose the matching progress backup JSON file.</li>
                      <li>
                        Matching problem names or IDs will be imported.
                      </li>
                    </ol>
                    <p className="mt-2 text-xs text-[#A1A1A1]">
                      Create a backup with Profile → Export Progress if you
                      don’t have one yet.
                    </p>
                  </div>
                )}
                <div className="max-h-72 space-y-1 overflow-y-auto">
                  {availableSheets.map((sheet) => (
                    <button
                      key={sheet.id}
                      type="button"
                      onClick={() => {
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
                      className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm text-[#EDEDED] transition-colors hover:bg-[#262626]"
                    >
                      <span>{sheet.title}</span>
                      <span className="text-xs text-[#A1A1A1]">
                        {sheet.problemCount} problems
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setBackupAction("")}
                  className="mt-4 w-full rounded-lg border border-[#383838] px-4 py-2 text-sm text-[#A1A1A1] hover:bg-[#1F1F1F] hover:text-white"
                >
                  Cancel
                </button>
              </section>
            </div>
          )}
        </main>
      </div>
    );
  }
