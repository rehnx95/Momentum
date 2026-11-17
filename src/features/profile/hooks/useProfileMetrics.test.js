import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it } from "vitest";
import useProfileMetrics from "./useProfileMetrics";

describe("useProfileMetrics", () => {
  it("counts explicit skips without applying legacy default-skip metadata", () => {
    let metrics;

    function HookHarness() {
      metrics = useProfileMetrics({
        availableSheets: [
          {
            id: "sheet",
            title: "Algorithms",
            sheet: {
              steps: [
                {
                  subsections: [
                    {
                      problems: [
                        { id: "legacy", title: "Legacy", defaultSkip: true },
                        { id: "manual", title: "Manual" },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        ],
        activityLog: {},
        progress: { "sheet::manual": "skipped" },
        completedOn: {},
        completedAt: {},
        todayDateKey: "2026-11-17",
      });
      return null;
    }

    let renderer;
    act(() => {
      renderer = TestRenderer.create(React.createElement(HookHarness));
    });

    expect(metrics.profileSheetStats[0].skipped).toBe(1);
    act(() => renderer.unmount());
  });

  it("defers profile calculations while the profile screen is inactive", () => {
    let metrics;

    function HookHarness() {
      metrics = useProfileMetrics({
        availableSheets: [
          {
            id: "sheet",
            title: "Algorithms",
            sheet: {
              steps: [{ subsections: [{ problems: [{ id: "problem", title: "Problem" }] }] }],
            },
          },
        ],
        activityLog: { "2026-11-14": 1 },
        progress: { "sheet::problem": "done" },
        completedOn: { "sheet::problem": "2026-11-14" },
        completedAt: {},
        todayDateKey: "2026-11-14",
        enabled: false,
      });
      return null;
    }

    let renderer;
    act(() => {
      renderer = TestRenderer.create(React.createElement(HookHarness));
    });

    expect(metrics.profileSheetStats).toEqual([]);
    expect(metrics.recentAccepted).toEqual([]);
    expect(metrics.yearlyActiveDays).toBe(0);
    act(() => renderer.unmount());
  });

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
