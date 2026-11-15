import { lazy, Suspense } from "react";
import AppHeader from "../../shared/components/AppHeader";
import AppLoadingFallback from "../../shared/components/AppLoadingFallback";
import LegalPage from "./LegalPage";
import TrackerDashboard from "./TrackerDashboard";

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
    legalPage,
    longestStreak,
    navigateTo,
    notFoundPage,
    privacyPage,
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

  if (legalPage) {
    return (
      <>
        <div className="dashboard-shell min-h-screen bg-[#000000] text-[#EDEDED] font-sans">
          <AppHeader active="tracker" {...headerProps} />
          <main id="main-content" className="app-page">
            <LegalPage mode={privacyPage ? "privacy" : "terms"} onBack={() => navigateTo("/")} />
          </main>
        </div>
        {renderDialog()}
      </>
    );
  }

  if (notFoundPage) {
    return (
      <>
        <div className="dashboard-shell min-h-screen bg-[#000000] text-[#EDEDED] font-sans">
          <AppHeader active="tracker" {...headerProps} />
          <main id="main-content" className="app-page">
            <section className="surface-card rounded-2xl border p-8 text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted">404</p>
              <h1 className="mt-2 text-3xl font-bold text-[#EDEDED]">Page not found</h1>
              <p className="mx-auto mt-3 max-w-md text-sm text-[#A1A1A1]">
                The page you’re looking for doesn’t exist or may have moved.
              </p>
              <button
                type="button"
                onClick={() => navigateTo("/")}
                className="mt-6 rounded-lg bg-[#EDEDED] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-white"
              >
                Return to dashboard
              </button>
            </section>
          </main>
        </div>
        {renderDialog()}
      </>
    );
  }

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
          className="dashboard-shell daily-log-page-shell min-h-screen bg-[#000000] text-[#EDEDED] font-sans transition-colors duration-300"
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
