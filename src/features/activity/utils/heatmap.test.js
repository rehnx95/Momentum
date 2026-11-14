import { describe, expect, it } from "vitest";
import { buildHeatmap } from "./heatmap";

describe("buildHeatmap", () => {
  it("shows 365 complete rolling days through yesterday", () => {
    const heatmap = buildHeatmap({ todayKey: "2026-11-14" });
    const days = heatmap.weeks.flat().filter((day) => day.inRange);

    expect(days).toHaveLength(365);
    expect(days[0].key).toBe("2025-11-14");
    expect(days[days.length - 1].key).toBe("2026-11-13");
  });

  it("counts only active dates within the completed-day range", () => {
    const heatmap = buildHeatmap({
      todayKey: "2026-11-14",
      activity: {
        "2025-11-13": 1,
        "2025-11-14": 1,
        "2026-11-13": 2,
        "2026-11-14": 3,
      },
    });

    expect(heatmap.activeDays).toBe(2);
    expect(heatmap.total).toBe(3);
  });
});
