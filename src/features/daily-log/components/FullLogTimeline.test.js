import { describe, expect, it } from "vitest";
import {
  intervalsFor,
  sleepIntervalsFor,
  unloggedIntervalsFor,
  unloggedMinutesFor,
} from "./FullLogTimeline";

describe("Full Log timeline intervals", () => {
  it("maps a daytime slot to its position in the day", () => {
    expect(intervalsFor({ start: "09:00", end: "13:00" })).toEqual([[540, 780]]);
  });

  it("clips overnight sleep to the wake date", () => {
    expect(sleepIntervalsFor("22:00", "06:00")).toEqual([[0, 360]]);
  });

  it("keeps same-day sleep within its recorded date", () => {
    expect(sleepIntervalsFor("01:00", "07:00")).toEqual([[60, 420]]);
  });

  it("does not create an empty wake-date interval at midnight", () => {
    expect(sleepIntervalsFor("22:00", "00:00")).toEqual([]);
  });

  it("splits generic overnight intervals at midnight", () => {
    expect(intervalsFor({ start: "22:00", end: "06:00" })).toEqual([
      [0, 360],
      [1320, 1440],
    ]);
  });

  it("keeps a slot ending at midnight through the end of the day", () => {
    expect(
      intervalsFor({
        start: "23:00",
        end: "00:00",
        endDayOffset: 1,
      }),
    ).toEqual([[1380, 1440]]);
  });

  it("does not render a zero-length interval", () => {
    expect(intervalsFor({ start: "08:00", end: "08:00" })).toEqual([]);
  });

  it("finds gaps after merging overlapping activity and sleep intervals", () => {
    expect(
      unloggedIntervalsFor(
        [
          {
            slots: [
              { start: "09:00", end: "11:00" },
              { start: "10:00", end: "12:00" },
            ],
          },
        ],
        "22:00",
        "06:00",
      ),
    ).toEqual([
      [360, 540],
      [720, 1440],
    ]);
  });

  it("returns no unlogged intervals when recorded time covers the whole day", () => {
    expect(
      unloggedIntervalsFor([
        {
          slots: [{ start: "00:00", end: "00:00", endDayOffset: 1, timerId: "full-day" }],
        },
      ]),
    ).toEqual([]);
  });

  it("calculates untracked time from interval union instead of summing overlaps", () => {
    expect(
      unloggedMinutesFor({
        sleep_periods: [{ start: "22:00", end: "06:00" }],
        custom_tasks: [
          {
            slots: [
              { start: "09:00", end: "11:00" },
              { start: "10:00", end: "12:00" },
            ],
          },
        ],
      }),
    ).toBe(900);
  });
});
