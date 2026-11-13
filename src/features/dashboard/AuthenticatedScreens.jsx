import { lazy, Suspense } from "react";
import AppHeader from "../../shared/components/AppHeader";
import PeopleSearchPage from "../people/PeopleSearchPage";
import PublicProfilePage from "../people/PublicProfilePage";
import ProfilePage from "../profile/pages/ProfilePage";
import TrackerDashboard from "./TrackerDashboard";

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
    userLocation,
    userName,
    userUsername,
    userWebsite,
    yearlyActiveDays,
  } = context;

  if (peopleSearchPage) {
    return (
      <>
        <PeopleSearchPage
          context={{ headerProps }}
          query={peopleSearchQuery}
          onQueryChange={setPeopleSearchQuery}
          results={peopleSearchResults}
          loading={peopleSearchLoading}
          error={peopleSearchError}
          onSelectProfile={openPublicProfile}
          onBack={() => navigateTo("/")}
        />
        {renderDialog()}
      </>
    );
  }

  if (selectedPublicUsername) {
    return (
      <>
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
        {renderDialog()}
      </>
    );
  }

  if (showSettings) {
    return (
      <>
        <Suspense
          fallback={
            <div className="app-page app-page-narrow" aria-hidden="true" />
          }
        >
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
          className="dashboard-shell min-h-screen bg-[#000000] text-[#EDEDED] font-sans transition-colors duration-300"
          data-theme={theme === "dark" ? undefined : theme}
        >
          <AppHeader active="daily-log" {...headerProps} />
          <main className="app-page">
            <Suspense
              fallback={
                <div className="daily-tracker surface-card" aria-hidden="true" />
              }
            >
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
            userLocation,
            userName,
            userUsername,
            userWebsite,
            yearlyActiveDays,
          }}
        />
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
