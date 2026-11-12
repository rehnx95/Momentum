import { describe, expect, it } from "vitest";
import { getSleepStudySummary } from "./sleepStudySummary";

describe("sleep and study summary", () => {
  it("averages only saved entries in the latest seven days", () => {
    const days = [
      { logged: true, study: 120, sleep: 420 },
      ...Array.from({ length: 7 }, (_, index) => ({
        logged: index === 1 || index === 5,
        study: index === 1 ? 180 : 300,
        sleep: index === 1 ? 420 : 480,
      })),
    ];

    expect(getSleepStudySummary(days)).toEqual({
      averageStudy: 240,
      averageSleep: 450,
      bestStudyDay: days[6],
      daysLogged: 3,
      daysTotal: 8,
    });
  });

  it("returns empty averages and best day when no entries are saved", () => {
    expect(
      getSleepStudySummary([
        { logged: false, study: 0, sleep: 0 },
      ]),
    ).toEqual({
      averageStudy: null,
      averageSleep: null,
      bestStudyDay: null,
      daysLogged: 0,
      daysTotal: 1,
    });
  });
});
