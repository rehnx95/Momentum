export function getSleepStudySummary(days) {
  const loggedDays = days.filter((day) => day.logged);
  const recentLoggedDays = days.slice(-7).filter((day) => day.logged);
  const recentSleepDays = recentLoggedDays.filter((day) => day.sleepRecorded);
  const average = (entries, key) =>
    entries.length
      ? Math.round(
          entries.reduce((total, day) => total + day[key], 0) / entries.length,
        )
      : null;

  return {
    averageStudy: average(recentLoggedDays, "study"),
    averageSleep: average(recentSleepDays, "sleep"),
    bestStudyDay: loggedDays.reduce(
      (best, day) => (!best || day.study > best.study ? day : best),
      null,
    ),
    daysLogged: loggedDays.length,
    daysTotal: days.length,
  };
}
