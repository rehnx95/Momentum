import { useMemo } from "react";
import { getLocalDateKey } from "../../../shared/utils/date";

export default function useProfileMetrics({
  availableSheets,
  progress,
  completedOn,
  completedAt,
  activityLog,
  todayDateKey,
}) {
  const profileSheetStats = useMemo(
    () =>
      availableSheets.map((sheet) => {
        const idPrefix = `${sheet.id}::`;
        const problems = sheet.sheet.steps.flatMap((step) =>
          step.subsections.flatMap((subsection) => subsection.problems),
        );
        const solved = problems.filter(
          (problem) => progress[`${idPrefix}${problem.id}`] === "done",
        ).length;
        const skipped = problems.filter(
          (problem) =>
            progress[`${idPrefix}${problem.id}`] === "skipped" ||
            (!progress[`${idPrefix}${problem.id}`] && problem.defaultSkip),
        ).length;
        return {
          id: sheet.id,
          title: sheet.title,
          solved,
          skipped,
          total: problems.length,
        };
      }),
    [availableSheets, progress],
  );
  const profileProblemsTotal = profileSheetStats.reduce(
    (total, sheet) => total + sheet.total,
    0,
  );
  const profileProblemsSolved = profileSheetStats.reduce(
    (total, sheet) => total + sheet.solved,
    0,
  );
  const recentAccepted = useMemo(
    () =>
      availableSheets
        .flatMap((sheet) => {
          const idPrefix = `${sheet.id}::`;
          return sheet.sheet.steps.flatMap((step) =>
            step.subsections.flatMap((subsection) =>
              subsection.problems.flatMap((problem) => {
                const id = `${idPrefix}${problem.id}`;
                const acceptedOn = completedOn[id];
                if (progress[id] !== "done") return [];
                return [
                  {
                    id,
                    title: problem.title,
                    sheetTitle: sheet.title,
                    acceptedOn: acceptedOn || null,
                    completedAt: completedAt[id] || null,
                  },
                ];
              }),
            ),
          );
        })
        .sort((first, second) => {
          if (first.completedAt && second.completedAt) {
            return second.completedAt.localeCompare(first.completedAt);
          }
          if (first.completedAt) return -1;
          if (second.completedAt) return 1;
          if (!first.acceptedOn && !second.acceptedOn) return 0;
          if (!first.acceptedOn) return 1;
          if (!second.acceptedOn) return -1;
          return second.acceptedOn.localeCompare(first.acceptedOn);
        })
        .slice(0, 8),
    [availableSheets, completedAt, completedOn, progress],
  );

  const activeDates = useMemo(() => {
    const uniqueDates = new Set();
    for (const [problemId, day] of Object.entries(completedOn || {})) {
      if (!day || progress[problemId] !== "done") continue;
      uniqueDates.add(String(day).slice(0, 10));
    }
    return [...uniqueDates].sort();
  }, [completedOn, progress]);

  const dailyStreak = useMemo(() => {
    let streak = 0;
    const [year, month, day] = todayDateKey.split("-").map(Number);
    let currentDate = new Date(year, month - 1, day);
    currentDate.setHours(0, 0, 0, 0);
    const dateKey = getLocalDateKey(currentDate);
    if (!activeDates.includes(dateKey)) {
      currentDate.setDate(currentDate.getDate() - 1);
    }
    while (activeDates.includes(getLocalDateKey(currentDate))) {
      streak += 1;
      currentDate.setDate(currentDate.getDate() - 1);
    }
    return streak;
  }, [activeDates, todayDateKey]);

  const longestStreak = useMemo(() => {
    let longest = 0;
    let current = 0;
    let previousDate = null;

    for (const dateKey of activeDates) {
      const [year, month, day] = dateKey.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      if (previousDate) {
        const expected = new Date(previousDate);
        expected.setDate(expected.getDate() + 1);
        if (getLocalDateKey(expected) === dateKey) current++;
        else current = 1;
      } else {
        current = 1;
      }
      previousDate = date;
      longest = Math.max(longest, current);
    }
    return longest;
  }, [activeDates]);

  const yearlyActiveDays = useMemo(() => {
    const [year, month, day] = todayDateKey.split("-").map(Number);
    const today = new Date(year, month - 1, day);
    today.setHours(0, 0, 0, 0);
    const firstDate = new Date(today);
    firstDate.setDate(firstDate.getDate() - 364);
    const startKey = getLocalDateKey(firstDate);
    const endKey = getLocalDateKey(today);
    return activeDates.filter((date) => date >= startKey && date <= endKey).length;
  }, [activeDates, todayDateKey]);

  return {
    profileSheetStats,
    profileProblemsTotal,
    profileProblemsSolved,
    recentAccepted,
    dailyStreak,
    longestStreak,
    yearlyActiveDays,
  };
}
