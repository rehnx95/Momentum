export function getSleepStudySummary(days) {
  const loggedDays = days.filter((day) => day.logged);
  const recentLoggedDays = days.slice(-7).filter((day) => day.logged);
  const average = (key) =>
    recentLoggedDays.length
      ? Math.round(
          recentLoggedDays.reduce((total, day) => total + day[key], 0) /
            recentLoggedDays.length,
        )
      : null;

  return {
    averageStudy: average("study"),
    averageSleep: average("sleep"),
    bestStudyDay: loggedDays.reduce(
      (best, day) => (!best || day.study > best.study ? day : best),
      null,
    ),
    daysLogged: loggedDays.length,
    daysTotal: days.length,
  };
}
