import { describe, expect, it } from "vitest";
import { intervalsFor } from "./FullLogTimeline";

describe("Full Log timeline intervals", () => {
  it("maps a daytime slot to its position in the day", () => {
    expect(intervalsFor({ start: "09:00", end: "13:00" })).toEqual([[540, 780]]);
  });

  it("splits overnight sleep at midnight", () => {
    expect(
      intervalsFor({ start: "22:00", end: "06:00" }, true),
    ).toEqual([[1320, 1440], [0, 360]]);
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
    expect(intervalsFor({ start: "08:00", end: "08:00" }, true)).toEqual([]);
  });
});
