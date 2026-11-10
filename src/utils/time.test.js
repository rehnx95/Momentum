import { describe, expect, it } from "vitest";
import {
  findOverlaps,
  formatDuration,
  getSlotDurationMinutes,
  getSleepMinutes,
  getStudyMinutes,
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
  });

  it("computes overnight durations only when wrapping is enabled", () => {
    expect(slotMinutes({ start: "23:00", end: "01:00" })).toBeNull();
    expect(slotMinutes({ start: "23:00", end: "01:00" }, { wrap: true })).toBe(120);
    expect(slotMinutes({ start: "12:00", end: "12:00" }, { wrap: true })).toBe(1440);
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
    ).toBe(1);
  });

  it("formats durations without decimal-hour rounding", () => {
    expect(formatDuration(157)).toBe("2h 37m");
    expect(formatDuration(120)).toBe("2h");
    expect(formatDuration(37)).toBe("37m");
  });

  it("calculates sleep and study minutes from daily log entries", () => {
    expect(getSleepMinutes({ sleep_time: "22:30", wake_time: "06:30" })).toBe(480);
    expect(getSleepMinutes({
      sleep_time: "22:30:00",
      wake_time: "06:30:00",
    })).toBe(480);
    expect(getSleepMinutes({ sleep_time: "", wake_time: "" })).toBe(0);
    expect(getStudyMinutes({
      custom_tasks: [
        { slots: [
          { start: "09:00", end: "09:45" },
          { start: "23:30", end: "00:00", endDayOffset: 1 },
          { start: "invalid", end: "00:00", endDayOffset: 1 },
        ] },
      ],
    })).toBe(75);
  });

  it("splits timer intervals at midnight without losing minutes", () => {
    const segments = splitIntervalByDay(
      new Date(2026, 10, 8, 23, 30),
      new Date(2026, 10, 9, 0, 30),
    );
    expect(segments).toEqual([
      {
        date: "2026-11-08",
        slot: { start: "23:30", end: "00:00", endDayOffset: 1 },
      },
      {
        date: "2026-11-09",
        slot: { start: "00:00", end: "00:30" },
      },
    ]);
  });

  it("accepts a timer slot that spans a full midnight-to-midnight day", () => {
    const result = validateDay({
      dsa_slots: [{ start: "00:00", end: "00:00", endDayOffset: 1 }],
      backend_slots: [],
      custom_tasks: [],
    });
    expect(result.errors).toHaveLength(0);
    expect(result.totalMinutes).toBe(1440);
  });

  it("detects overlaps within and across activities", () => {
    const overlaps = findOverlaps({
      DSA: [{ start: "10:00", end: "12:00" }, { start: "11:30", end: "13:00" }],
      Backend: [{ start: "12:30", end: "14:00" }],
    });
    expect(overlaps).toHaveLength(2);
  });

  it("flags invalid ordering and totals beyond one day", () => {
    const invalid = validateDay({
      dsa_slots: [{ start: "12:34", end: "01:11" }],
      backend_slots: [],
      custom_tasks: [],
    });
    expect(invalid.errors.some((error) => error.code === "invalid-slot-order")).toBe(true);
    expect(invalid.totalMinutes).toBe(0);

    const tooLong = validateDay({
      sleep_time: "22:00",
      wake_time: "06:00",
      dsa_slots: [{ start: "06:00", end: "18:00" }],
      backend_slots: [{ start: "18:00", end: "22:30" }],
      custom_tasks: [],
    });
    expect(tooLong.errors.some((error) => error.code === "day-over-24-hours")).toBe(true);
  });

  it("allows exactly 24 hours and reports long or overlapping study slots", () => {
    const result = validateDay({
      sleep_time: "23:00",
      wake_time: "06:00",
      dsa_slots: [{ start: "06:00", end: "15:00" }],
      backend_slots: [{ start: "14:00", end: "22:00" }],
      custom_tasks: [],
    });
    expect(result.errors).toHaveLength(0);
    expect(result.totalMinutes).toBe(1440);
    expect(result.warnings.some((warning) => warning.code === "long-slot")).toBe(true);
    expect(result.warnings.some((warning) => warning.code === "overlap")).toBe(true);
  });
});
