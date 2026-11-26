import { describe, expect, it } from "vitest";
import { getSleepMinutes, getStudyMinutes, validateDay } from "../../../shared/utils/time";
import { buildSampleData } from "./sampleData";

function makeSheets(problemCount) {
  return [
    {
      id: "custom-test-sheet",
      sheet: {
        steps: [
          {
            subsections: [
              {
                problems: Array.from({ length: problemCount }, (_, index) => ({
                  id: `problem-${index + 1}`,
                })),
              },
            ],
          },
        ],
      },
    },
  ];
}

describe("test sample data", () => {
  it("creates a complete, dense Daily Log for every day since January 2025", () => {
    const sample = buildSampleData({
      userId: "test-user",
      sheets: makeSheets(500),
      today: "2026-11-12",
    });

    const dates = sample.dailyLogs.map((entry) => entry.date);
    const expectedDays =
      (Date.UTC(2026, 10, 12) - Date.UTC(2025, 0, 1)) / (24 * 60 * 60 * 1000) + 1;
    expect(dates[0]).toBe("2025-01-01");
    expect(dates[dates.length - 1]).toBe("2026-11-12");
    expect(dates).toHaveLength(expectedDays);
    expect(sample.summary.dailyLogDays).toBe(expectedDays);

    sample.dailyLogs.forEach((entry, index) => {
      expect(entry.date).toBe(new Date(Date.UTC(2025, 0, 1 + index)).toISOString().slice(0, 10));
      expect(entry.sleep_time).toBeTruthy();
      expect(entry.wake_time).toBeTruthy();
      expect(entry.custom_tasks).toHaveLength(5);
      entry.custom_tasks.forEach((activity) => {
        expect(activity.slots).toHaveLength(4);
        activity.slots.forEach((slot) => {
          expect(slot.start).toMatch(/^\d{2}:\d{2}$/);
          expect(slot.end).toMatch(/^\d{2}:\d{2}$/);
        });
      });

      const validation = validateDay(entry);
      expect(validation.errors).toEqual([]);
      expect(validation.warnings).toEqual([]);
      expect(getStudyMinutes(entry)).toBeGreaterThanOrEqual(20 * 24);
      expect(getSleepMinutes(entry) + getStudyMinutes(entry)).toBeLessThanOrEqual(24 * 60);
    });
  });

  it("creates dense solved history in 2025 and the current year", () => {
    const sample = buildSampleData({
      userId: "test-user",
      sheets: makeSheets(500),
      today: "2026-11-12",
    });

    const solved = sample.progress.filter((item) => item.state === "done");
    const solvedYears = new Set(solved.map((item) => Number(item.completed_on.slice(0, 4))));
    const countedSolves = sample.activityLog.reduce((total, entry) => total + entry.count, 0);

    expect(solved.length).toBeGreaterThan(300);
    expect(solvedYears.has(2025)).toBe(true);
    expect(solvedYears.has(2026)).toBe(true);
    expect(countedSolves).toBe(solved.length);
    expect(sample.summary.skippedProblems).toBeGreaterThan(0);
  });
});
