import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import AppDialog from "../../shared/components/AppDialog";
import { getLocalDateKey } from "../../shared/utils/date";
import { useProgress } from "../problem-tracker/hooks/useProgress";
import useProfileMetrics from "../profile/hooks/useProfileMetrics";
import useProgressBackup from "../profile/hooks/useProgressBackup";
import usePeopleSearch from "../people/hooks/usePeopleSearch";
import usePublicProfile from "../people/hooks/usePublicProfile";
import useSheetLibrary from "../sheets/hooks/useSheetLibrary";
import useProblemTree from "../problem-tracker/hooks/useProblemTree";
import { isTestDataToolsEnabled } from "../testing/lib/testDataMode";
import AuthenticatedScreens from "./AuthenticatedScreens";
import useAuthenticatedNavigation from "./hooks/useAuthenticatedNavigation";

const SampleDataTools = lazy(() => import("../testing/components/SampleDataTools"));

export default function AuthenticatedApp({
  user,
  profile,
  authError,
  onProfileUpdated,
  onSignOut,
}) {
  const [dialog, setDialog] = useState(null);
  const dialogResolver = useRef(null);
  const showNotice = useCallback((message, title = "Momentum") => {
    setDialog({ type: "notice", title, message });
  }, []);
  const askConfirmation = useCallback(
    (message, title = "Are you sure?") =>
      new Promise((resolve) => {
        dialogResolver.current = resolve;
        setDialog({ type: "confirm", title, message });
      }),
    [],
  );
  const closeDialog = useCallback((confirmed = false) => {
    const resolve = dialogResolver.current;
    dialogResolver.current = null;
    setDialog(null);
    resolve?.(confirmed);
  }, []);
  const {
    availableSheets,
    selectedSheet,
    setSelectedSheetId,
    uploadingSheet,
    deletingSheetId,
    sheetError,
    uploadSheetInput,
    data,
    handleUploadSheet,
    handleRemoveSheet: removeSheet,
    downloadSampleFormat,
  } = useSheetLibrary(user, askConfirmation);
  const {
    progress,
    activityLog,
    completedOn,
    completedAt,
    error: progressError,
    setError: setProgressError,
    update,
    bulkUpdate,
    getState,
    theme,
    setTheme,
    reset,
  } = useProgress(user);
  const {
    dailyLogPage,
    navigateTo,
    peopleSearchPage,
    openPublicProfile: navigateToPublicProfile,
    publicProfileReturnPath,
    returnFromPublicProfile,
    selectedPublicUsername,
    showProfile,
    showSettings,
  } = useAuthenticatedNavigation();
  const {
    search,
    setSearch,
    expandedSteps,
    expandedSubs,
    hideSkipped,
    setHideSkipped,
    activeFilter,
    setActiveFilter,
    totalProblems,
    sheetProblems,
    doneCount,
    skippedCount,
    todoCount,
    progressState,
    handleToggle,
    handleSkip,
    toggleStep,
    toggleSub,
    expandAll,
    collapseAll,
    filteredSteps,
    chipActive,
  } = useProblemTree({
    data,
    progress,
    getState,
    update,
    enabled: !dailyLogPage && !peopleSearchPage && !selectedPublicUsername && !showProfile,
  });
  const handleRemoveSheet = (sheet) => removeSheet(sheet, reset);
  const [todayDateKey, setTodayDateKey] = useState(() => getLocalDateKey(new Date()));
  const {
    clearSearch,
    error: peopleSearchError,
    loading: peopleSearchLoading,
    query: peopleSearchQuery,
    results: peopleSearchResults,
    setQuery: setPeopleSearchQuery,
  } = usePeopleSearch(peopleSearchPage);
  const {
    copiedProfileLink,
    copyProfileLink: copyPublicProfileLink,
    error: publicProfileError,
    heatmap: publicHeatmap,
    heatmapYear: publicHeatmapYear,
    loading: publicProfileLoading,
    profile: publicProfile,
    setHeatmapYear: setPublicHeatmapYear,
  } = usePublicProfile(selectedPublicUsername);
  const openPublicProfile = useCallback(
    (username) => {
      clearSearch();
      navigateToPublicProfile(username);
    },
    [clearSearch, navigateToPublicProfile],
  );
  const [ownHeatmapYear, setOwnHeatmapYear] = useState(null);

  const [backupAction, setBackupAction] = useState("");
  const { exportProgress, importFileInput, importProgress, importSheetId } = useProgressBackup({
    availableSheets,
    progress,
    bulkUpdate,
    showNotice,
    setBackupAction,
  });

  const renderDialog = () =>
    dialog && (
      <AppDialog
        dialog={dialog}
        onClose={() => closeDialog(false)}
        onConfirm={() => closeDialog(true)}
      />
    );

  useEffect(() => {
    const refreshToday = () => {
      setTodayDateKey((current) => {
        const today = getLocalDateKey(new Date());
        return current === today ? current : today;
      });
    };
    const timer = window.setInterval(refreshToday, 60_000);
    window.addEventListener("focus", refreshToday);
    document.addEventListener("visibilitychange", refreshToday);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshToday);
      document.removeEventListener("visibilitychange", refreshToday);
    };
  }, []);

  const userName =
    profile?.name || user.user_metadata?.full_name || user.user_metadata?.name || "User";
  const userUsername = profile?.username || "";
  const testDataTools = isTestDataToolsEnabled ? (
    <Suspense fallback={null}>
      <SampleDataTools userId={user.id} userEmail={user.email} sheets={availableSheets} />
    </Suspense>
  ) : null;
  const headerProps = {
    onNavigate: navigateTo,
    theme,
    setTheme,
    onSignOut,
    testDataTools,
  };

  const openProfileSettings = () => {
    navigateTo("/profile/edit");
  };

  const {
    profileSheetStats,
    profileProblemsTotal,
    profileProblemsSolved,
    recentAccepted,
    dailyStreak,
    longestStreak,
    yearlyActiveDays,
  } = useProfileMetrics({
    availableSheets,
    activityLog,
    progress,
    completedOn,
    completedAt,
    todayDateKey,
    enabled: showProfile,
  });

  const screenContext = {
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
    setPeopleSearchQuery,
    setProgressError,
    setPublicHeatmapYear,
    setSearch,
    setSelectedSheetId,
    sheetError,
    sheetProblems,
    sheets: availableSheets,
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
  };

  return <AuthenticatedScreens context={screenContext} />;
}
