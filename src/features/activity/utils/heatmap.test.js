import { describe, expect, it } from "vitest";
import { buildHeatmap } from "./heatmap";

describe("buildHeatmap", () => {
  it("shows 365 rolling days through today", () => {
    const heatmap = buildHeatmap({ todayKey: "2026-11-14" });
    const days = heatmap.weeks.flat().filter((day) => day.inRange);

    expect(days).toHaveLength(365);
    expect(days[0].key).toBe("2025-11-15");
    expect(days[days.length - 1].key).toBe("2026-11-14");
  });

  it("counts active dates within the rolling range, including today", () => {
    const heatmap = buildHeatmap({
      todayKey: "2026-11-14",
      activity: {
        "2025-11-13": 1,
        "2025-11-15": 1,
        "2026-11-13": 2,
        "2026-11-14": 3,
      },
    });

    expect(heatmap.activeDays).toBe(3);
    expect(heatmap.total).toBe(6);
  });
});
