import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import AppDialog from "../../shared/components/AppDialog";
import { getLocalDateKey } from "../../shared/utils/date";
import { useProgress } from "../problem-tracker/hooks/useProgress";
import useProfileMetrics from "../profile/hooks/useProfileMetrics";
import useProgressBackup from "../profile/hooks/useProgressBackup";
import useSheetLibrary from "../sheets/hooks/useSheetLibrary";
import useProblemTree from "../problem-tracker/hooks/useProblemTree";
import AuthenticatedScreens from "./AuthenticatedScreens";
import usePeopleNavigation from "./usePeopleNavigation";

export default function AuthenticatedApp({
  user,
  profile,
  authError,
  onProfileUpdated,
  onSignOut,
}) {
  const [dialog, setDialog] = useState(null);
  const dialogResolver = useRef(null);
  const showNotice = useCallback((message, title = "Track Sheet") => {
    setDialog({ type: "notice", title, message });
  }, []);
  const askConfirmation = useCallback((message, title = "Are you sure?") => (
    new Promise((resolve) => {
      dialogResolver.current = resolve;
      setDialog({ type: "confirm", title, message });
    })
  ), []);
  const closeDialog = useCallback((confirmed = false) => {
    const resolve = dialogResolver.current;
    dialogResolver.current = null;
    setDialog(null);
    resolve?.(confirmed);
  }, []);
  const {
    availableSheets,
    selectedSheet,
    selectedSheetId,
    setSelectedSheetId,
    sheetBootstrapComplete,
    uploadingSheet,
    deletingSheetId,
    sheetError,
    setSheetError,
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
  } = useProgress(sheetBootstrapComplete ? user : null);
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
  });
  const handleRemoveSheet = (sheet) => removeSheet(sheet, reset);
  const [todayDateKey, setTodayDateKey] = useState(() =>
    getLocalDateKey(new Date()),
  );
  const {
    copiedProfileLink,
    copyPublicProfileLink,
    dailyLogPage,
    navigateTo,
    openPublicProfile,
    peopleSearchError,
    peopleSearchLoading,
    peopleSearchPage,
    peopleSearchQuery,
    peopleSearchResults,
    setPeopleSearchQuery,
    publicHeatmap,
    publicHeatmapYear,
    publicProfile,
    publicProfileError,
    publicProfileLoading,
    publicProfileReturnPath,
    returnFromPublicProfile,
    selectedPublicUsername,
    setPublicHeatmapYear,
    showProfile,
    showSettings,
  } = usePeopleNavigation();
  const [ownHeatmapYear, setOwnHeatmapYear] = useState(null);

  useEffect(() => {
    void import("../daily-log/components/DailyTracker").catch((error) => {
      console.warn("Could not preload the Daily Log page:", error);
    });
  }, []);

  const [backupAction, setBackupAction] = useState("");
  const {
    exportProgress,
    importFileInput,
    importProgress,
    importSheetId,
  } = useProgressBackup({
    availableSheets,
    progress,
    bulkUpdate,
    showNotice,
    setBackupAction,
  });

  const renderDialog = () => dialog && (
    <AppDialog
      dialog={dialog}
      onClose={() => closeDialog(false)}
      onConfirm={() => closeDialog(true)}
    />
  );

  useEffect(() => {
    const refreshToday = () => {
      setTodayDateKey(current => {
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
    profile?.name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    "User";
  const userUsername = profile?.username || "";
  const userLocation = profile?.location || "";
  const userWebsite = profile?.website || "";
  const headerProps = { onNavigate: navigateTo, theme, setTheme, onSignOut };

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
    progress,
    completedOn,
    completedAt,
    activityLog,
    todayDateKey,
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
    userLocation,
    userName,
    userUsername,
    userWebsite,
    yearlyActiveDays,
  };

  return <AuthenticatedScreens context={screenContext} />;
}