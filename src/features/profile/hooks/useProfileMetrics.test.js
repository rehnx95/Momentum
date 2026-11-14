import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it } from "vitest";
import useProfileMetrics from "./useProfileMetrics";

describe("useProfileMetrics", () => {
  it("counts active days from the same saved activity data as the heatmap", () => {
    const activityLog = {
      "2025-11-13": 1,
      "2025-11-14": 1,
      "2026-11-13": 1,
      "2026-11-14": 3,
    };
    let metrics;

    function HookHarness() {
      metrics = useProfileMetrics({
        availableSheets: [],
        activityLog,
        progress: { outside: "done", today: "done" },
        completedOn: {
          outside: "2025-11-13",
          today: "2026-11-14",
        },
        completedAt: {},
        todayDateKey: "2026-11-14",
      });
      return null;
    }

    let renderer;
    act(() => {
      renderer = TestRenderer.create(React.createElement(HookHarness));
    });

    expect(metrics.yearlyActiveDays).toBe(2);
    act(() => renderer.unmount());
  });
});
