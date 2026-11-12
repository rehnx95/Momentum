import { describe, expect, it } from "vitest";
import { buildSampleData } from "./sampleData";

function makeSheets(problemCount) {
  return [{
    id: "custom-test-sheet",
    sheet: {
      steps: [{
        subsections: [{
          problems: Array.from({ length: problemCount }, (_, index) => ({
            id: `problem-${index + 1}`,
          })),
        }],
      }],
    },
  }];
}

describe("test sample data", () => {
  it("creates irregular Daily Log history spanning 365 days", () => {
    const sample = buildSampleData({
      userId: "test-user",
      sheets: makeSheets(500),
      today: "2026-11-12",
    });

    const dates = sample.dailyLogs.map((entry) => entry.date);
    expect(dates[0]).toBe("2025-11-13");
    expect(dates[dates.length - 1]).toBe("2026-11-12");
    expect(dates.length).toBeGreaterThan(250);
    expect(dates.length).toBeLessThan(365);
  });

  it("creates dense solved history in 2025 and the current year", () => {
    const sample = buildSampleData({
      userId: "test-user",
      sheets: makeSheets(500),
      today: "2026-11-12",
    });

    const solved = sample.progress.filter((item) => item.state === "done");
    const solvedYears = new Set(
      solved.map((item) => Number(item.completed_on.slice(0, 4))),
    );
    const countedSolves = sample.activityLog.reduce(
      (total, entry) => total + entry.count,
      0,
    );

    expect(solved.length).toBeGreaterThan(300);
    expect(solvedYears.has(2025)).toBe(true);
    expect(solvedYears.has(2026)).toBe(true);
    expect(countedSolves).toBe(solved.length);
    expect(sample.summary.skippedProblems).toBeGreaterThan(0);
  });
});
