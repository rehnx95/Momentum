import { describe, expect, it } from "vitest";
import {
  findOverlaps,
  formatDuration,
  getSlotDurationMinutes,
  getSleepMinutes,
  getStudyMinutes,
  getStudyActivityBreakdown,
  getUntrackedMinutes,
  intervalsFor,
  sleepIntervalsFor,
  slotMinutes,
  splitIntervalByDay,
  toMinutes,
  validateDay,
} from "./time";

describe("time helpers", () => {
  it("parses times and rejects malformed values", () => {
    expect(toMinutes("00:00")).toBe(0);
    expect(toMinutes("23:59")).toBe(1439);
    expect(toMinutes("24:00")).toBeNull();
    expect(toMinutes("1:00")).toBeNull();
    expect(toMinutes(null)).toBeNull();
  });

  it("computes overnight durations", () => {
    expect(slotMinutes({ start: "23:00", end: "01:00" })).toBeNull();
    expect(slotMinutes({ start: "23:00", end: "01:00" }, { wrap: true })).toBe(120);
    expect(slotMinutes({ start: "12:00", end: "12:00" }, { wrap: true })).toBe(1440);
    expect(getSlotDurationMinutes({ start: "23:00", end: "01:00" })).toBe(120);
  });

  it("calculates slots that end at midnight", () => {
    expect(
      getSlotDurationMinutes({
        start: "23:30",
        end: "00:00",
        endDayOffset: 1,
      }),
    ).toBe(30);
    expect(getSlotDurationMinutes({ start: "09:00", end: "09:45" })).toBe(45);
    expect(
      getSlotDurationMinutes({
        start: "invalid",
        end: "00:00",
        endDayOffset: 1,
      }),
    ).toBeNull();
  });

  it("formats durations without decimal-hour rounding", () => {
    expect(formatDuration(157)).toBe("2h 37m");
    expect(formatDuration(120)).toBe("2h");
    expect(formatDuration(37)).toBe("37m");
    expect(formatDuration(-5)).toBe("0m");
  });

  it("calculates sleep and study minutes from daily log entries", () => {
    expect(getSleepMinutes({ sleep_time: "22:30", wake_time: "06:30" })).toBe(390);
    expect(
      getSleepMinutes({
        sleep_time: "22:30:00",
        wake_time: "06:30:00",
      }),
    ).toBe(390);
    expect(getSleepMinutes({ sleep_time: "", wake_time: "" })).toBe(0);
    expect(
      getStudyMinutes({
        custom_tasks: [
          {
            slots: [
              { start: "09:00", end: "09:45" },
              { start: "23:30", end: "00:00", endDayOffset: 1 },
              { start: "invalid", end: "00:00", endDayOffset: 1 },
            ],
          },
        ],
      }),
    ).toBe(75);
  });

  it("splits timer intervals at midnight without losing minutes", () => {
    const segments = splitIntervalByDay(
      new Date(2026, 10, 8, 23, 30, 15),
      new Date(2026, 10, 9, 0, 29, 10),
    );
    expect(segments).toEqual([
      {
        date: "2026-11-08",
        slot: { start: "23:30", end: "00:00", endDayOffset: 1 },
      },
      {
        date: "2026-11-09",
        slot: { start: "00:00", end: "00:29" },
      },
    ]);
  });

  it("builds minute intervals for regular, midnight-offset, wrapping, and sleep slots", () => {
    expect(intervalsFor({ start: "23:30", end: "00:00" })).toEqual([
      [1410, 1440],
    ]);
    expect(intervalsFor({ start: "23:00", end: "01:00" })).toEqual([
      [0, 60],
      [1380, 1440],
    ]);
    expect(sleepIntervalsFor("23:00", "06:30")).toEqual([[0, 390]]);
    expect(sleepIntervalsFor("01:00", "07:00")).toEqual([[60, 420]]);
  });

  it("infers overnight slots and rejects equal start and end times", () => {
    const overnight = validateDay({
      custom_tasks: [
        { id: "dsa", name: "DSA", slots: [{ start: "23:30", end: "00:00" }] },
      ],
    });
    expect(overnight.errors).toEqual([]);
    expect(overnight.totalMinutes).toBe(30);

    const result = validateDay({
      custom_tasks: [
        { id: "dsa", name: "DSA", slots: [{ start: "00:00", end: "00:00", endDayOffset: 1 }] },
      ],
    });
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: "invalid-slot-order",
        activityKey: "custom:dsa",
        slotIndex: 0,
      }),
    ]);
    expect(result.totalMinutes).toBe(0);
  });

  it("detects overlaps within and across activities", () => {
    const overlaps = findOverlaps({
      DSA: [
        { start: "10:00", end: "12:00" },
        { start: "11:30", end: "13:00" },
      ],
      Backend: [{ start: "12:30", end: "14:00" }],
    });
    expect(overlaps).toHaveLength(2);
    expect(overlaps.map(({ slotIndexA, slotIndexB }) => [slotIndexA, slotIndexB])).toEqual([
      [0, 1],
      [1, 0],
    ]);
  });

  it("reports one overlap per slot pair across midnight", () => {
    const overlaps = findOverlaps({
      Overnight: [{ start: "23:00", end: "01:00", wrap: true }],
      Early: [{ start: "00:30", end: "02:00", wrap: true }],
    });
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].overlapRanges).toEqual([[30, 60]]);
  });

  it("flags invalid ordering and malformed sleep without double-counting overlaps", () => {
    const invalid = validateDay({
      custom_tasks: [{ id: "dsa", name: "DSA", slots: [{ start: "12:34", end: "12:34" }] }],
    });
    expect(invalid.errors.some((error) => error.code === "invalid-slot-order")).toBe(true);
    expect(invalid.totalMinutes).toBe(0);
    expect(invalid.errors[0]).toMatchObject({
      activity: "DSA",
      activityKey: "custom:dsa",
      activityId: "dsa",
      slotIndex: 0,
      message: "DSA slot 1 must end after it starts.",
    });

    const missingWake = validateDay({ sleep_time: "22:00", wake_time: "" });
    expect(missingWake.errors).toContainEqual({
      code: "incomplete-sleep",
      activityKey: "sleep",
      slotIndex: 0,
      message: "Enter both sleep and wake times for each sleep period.",
    });

    const sameSleepWake = validateDay({ sleep_time: "06:00", wake_time: "06:00" });
    expect(sameSleepWake.errors).toContainEqual({
      code: "invalid-sleep",
      activityKey: "sleep",
      slotIndex: 0,
      message: "Enter valid sleep and wake times that differ.",
    });

    const tooLong = validateDay({
      sleep_time: "22:00",
      wake_time: "06:00",
      custom_tasks: [
        { id: "dsa", name: "DSA", slots: [{ start: "06:00", end: "18:00" }] },
        { id: "backend", name: "Backend", slots: [{ start: "18:00", end: "22:30" }] },
      ],
    });
    expect(tooLong.errors.some((error) => error.code === "day-over-24-hours")).toBe(false);
    expect(tooLong.totalMinutes).toBe(1350);
  });

  it("explains incomplete or malformed time slots", () => {
    const result = validateDay({
      custom_tasks: [{ id: "dsa", name: "DSA", slots: [{ start: "9:00", end: "" }] }],
    });
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: "invalid-time",
        activity: "DSA",
        activityKey: "custom:dsa",
        slotIndex: 0,
        message: "Enter a valid start and end time for DSA slot 1.",
      }),
    ]);
  });

  it("unions overlapping study slots and consistently attributes overnight sleep", () => {
    const result = validateDay({
      sleep_time: "23:00",
      wake_time: "06:00",
      custom_tasks: [
        { id: "dsa", name: "DSA", slots: [{ start: "06:00", end: "15:00" }] },
        { id: "backend", name: "Backend", slots: [{ start: "14:00", end: "22:00" }] },
      ],
    });
    expect(result.errors).toHaveLength(0);
    expect(result.totalMinutes).toBe(1320);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({
      code: "overlap",
      activityKeyA: "custom:dsa",
      activityKeyB: "custom:backend",
      activityA: "DSA",
      activityB: "Backend",
      slots: [
        { activityKey: "custom:dsa", activity: "DSA", slotIndex: 0 },
        { activityKey: "custom:backend", activity: "Backend", slotIndex: 0 },
      ],
      message: "DSA slot 1 overlaps Backend slot 1.",
    });

    const sleepClash = validateDay({
      sleep_time: "23:00",
      wake_time: "07:00",
      custom_tasks: [
        { id: "dsa", name: "DSA", slots: [{ start: "06:30", end: "08:00" }] },
        { id: "backend", name: "Backend", slots: [{ start: "23:15", end: "23:45" }] },
      ],
    });
    expect(sleepClash.warnings).toHaveLength(1);
    expect(sleepClash.warnings[0]).toMatchObject({
      code: "overlap",
      activityKeyA: "custom:dsa",
      activityKeyB: "sleep",
      message: "DSA slot 1 overlaps Sleep slot 1.",
    });
  });

  it("counts overlapping activity only once and derives untracked time from interval coverage", () => {
    const log = {
      sleep_periods: [{ id: "main", start: "22:00", end: "06:00" }],
      custom_tasks: [
        { id: "dsa", name: "DSA", slots: [{ start: "06:00", end: "15:00" }] },
        { id: "backend", name: "Backend", slots: [{ start: "14:00", end: "23:00" }] },
      ],
    };
    expect(getStudyMinutes(log)).toBe(1020);
    expect(getStudyActivityBreakdown(log).map(({ name, minutes }) => [name, minutes])).toEqual([
      ["DSA", 540],
      ["Backend", 480],
    ]);
    expect(getSleepMinutes(log)).toBe(360);
    expect(getUntrackedMinutes(log)).toBe(60);
    expect(validateDay(log).totalMinutes).toBe(1380);
  });
});
