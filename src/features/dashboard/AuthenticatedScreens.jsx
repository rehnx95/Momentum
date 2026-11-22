import { lazy, Suspense, useEffect } from "react";
import AppHeader from "../../shared/components/AppHeader";
import AppLoadingFallback from "../../shared/components/AppLoadingFallback";
import TrackerDashboard from "./TrackerDashboard";
import "../../styles/dashboard.css";
import "../../styles/tracker-layout.css";
import "../../styles/responsive/dashboard.css";
import "../../styles/responsive/tracker.css";

const PeopleSearchPage = lazy(() => import("../people/PeopleSearchPage"));
const PublicProfilePage = lazy(() => import("../people/PublicProfilePage"));
const ProfilePage = lazy(() => import("../profile/pages/ProfilePage"));
const ProfileSettings = lazy(() => import("../profile/pages/ProfileSettings"));
const DailyTracker = lazy(() => import("../daily-log/components/DailyTracker"));

export default function AuthenticatedScreens({ context }) {
  const {
    activeFilter,
    activityLog,
    askConfirmation,
    authError,
    availableSheets,
    backupAction,
    chipActive,
    collapseAll,
    copiedProfileLink,
    copyPublicProfileLink,
    dailyLogPage,
    dailyStreak,
    deletingSheetId,
    doneCount,
    downloadSampleFormat,
    expandAll,
    expandedSteps,
    expandedSubs,
    exportProgress,
    filteredSteps,
    handleRemoveSheet,
    handleSkip,
    handleToggle,
    handleUploadSheet,
    headerProps,
    hideSkipped,
    importFileInput,
    importProgress,
    importSheetId,
    longestStreak,
    navigateTo,
    onProfileUpdated,
    openProfileSettings,
    openPublicProfile,
    ownHeatmapYear,
    peopleSearchError,
    peopleSearchLoading,
    peopleSearchPage,
    peopleSearchQuery,
    peopleSearchResults,
    profile,
    profileProblemsSolved,
    profileProblemsTotal,
    profileSheetStats,
    progressError,
    progressState,
    publicHeatmap,
    publicHeatmapYear,
    publicProfile,
    publicProfileError,
    publicProfileLoading,
    publicProfileReturnPath,
    recentAccepted,
    renderDialog,
    reset,
    restoreDsaSheet,
    restoringDsaSheet,
    customSheetsLoading,
    progressLoading,
    returnFromPublicProfile,
    search,
    selectedPublicUsername,
    selectedSheet,
    setActiveFilter,
    setBackupAction,
    setHideSkipped,
    setOwnHeatmapYear,
    setProgressError,
    setPublicHeatmapYear,
    setSearch,
    setSelectedSheetId,
    setPeopleSearchQuery,
    sheetError,
    sheetProblems,
    sheets,
    showNotice,
    showProfile,
    showSettings,
    skippedCount,
    theme,
    todayDateKey,
    todoCount,
    totalProblems,
    toggleStep,
    toggleSub,
    uploadSheetInput,
    uploadingSheet,
    user,
    userName,
    userUsername,
    yearlyActiveDays,
  } = context;

  useEffect(() => {
    const label = peopleSearchPage
      ? "People"
      : selectedPublicUsername
        ? `@${selectedPublicUsername}`
        : showSettings
          ? "Edit profile"
          : dailyLogPage
            ? "Activity Log"
            : showProfile
              ? "Profile"
              : "Tracker";
    document.title = `${label} | Momentum`;
  }, [dailyLogPage, peopleSearchPage, selectedPublicUsername, showProfile, showSettings]);

  if (peopleSearchPage) {
    return (
      <>
        <Suspense fallback={<AppLoadingFallback />}>
          <PeopleSearchPage
            context={{ headerProps }}
            query={peopleSearchQuery}
            onQueryChange={setPeopleSearchQuery}
            results={peopleSearchResults}
            loading={peopleSearchLoading}
            error={peopleSearchError}
            onSelectProfile={openPublicProfile}
          />
        </Suspense>
        {renderDialog()}
      </>
    );
  }

  if (selectedPublicUsername) {
    return (
      <>
        <Suspense fallback={<AppLoadingFallback />}>
          <PublicProfilePage
            context={{
              headerProps,
              publicHeatmap,
              publicHeatmapYear,
              publicProfileReturnPath,
              selectedPublicUsername,
              setPublicHeatmapYear,
              todayDateKey,
            }}
            profile={publicProfile}
            loading={publicProfileLoading}
            error={publicProfileError}
            copied={copiedProfileLink}
            onCopyLink={copyPublicProfileLink}
            onBack={returnFromPublicProfile}
          />
        </Suspense>
        {renderDialog()}
      </>
    );
  }

  if (showSettings) {
    return (
      <>
        <Suspense fallback={<AppLoadingFallback />}>
          <ProfileSettings
            userId={user.id}
            profile={profile}
            onBack={() => navigateTo("/profile")}
            onSaved={onProfileUpdated}
            header={<AppHeader active="profile" {...headerProps} />}
          />
        </Suspense>
        {renderDialog()}
      </>
    );
  }

  if (dailyLogPage) {
    return (
      <>
        <div
          className="dashboard-shell daily-log-page-shell min-h-screen bg-page text-text font-sans transition-colors duration-300"
          data-theme={theme === "dark" ? undefined : theme}
        >
          <AppHeader active="daily-log" {...headerProps} />
          <main className="app-page">
            <Suspense fallback={<AppLoadingFallback fullScreen={false} />}>
              <DailyTracker
                user={user}
                sheets={availableSheets}
                activityLog={activityLog}
                askConfirmation={askConfirmation}
              />
            </Suspense>
          </main>
        </div>
        {renderDialog()}
      </>
    );
  }

  if (showProfile) {
    return (
      <>
        <Suspense fallback={<AppLoadingFallback />}>
          <ProfilePage
            context={{
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
              restoreDsaSheet,
              restoringDsaSheet,
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
            }}
          />
        </Suspense>
        {renderDialog()}
      </>
    );
  }

  return (
    <TrackerDashboard
      context={{
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
      }}
    />
  );
}
