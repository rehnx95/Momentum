// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PublicProfilePage from "./PublicProfilePage";

vi.mock("../../shared/components/AppHeader", () => ({ default: () => null }));
vi.mock("../activity/components/ActivityHeatmap", () => ({ default: () => null }));
vi.mock("../profile/components/ProfileSheetProgress", () => ({ default: () => null }));

afterEach(cleanup);

describe("PublicProfilePage", () => {
  it("places recent accepted problem and sheet tooltips in their matching grid columns", () => {
    render(
      <PublicProfilePage
        profile={{
          username: "learner",
          custom_recent_accepted: [
            {
              title: "Two Sum",
              sheet_title: "DSA",
              accepted_on: "2026-11-26",
            },
          ],
        }}
        loading={false}
        context={{
          headerProps: {},
          publicHeatmap: { username: "learner", activity: {}, years: [] },
          selectedPublicUsername: "learner",
          publicProfileReturnPath: { current: "/profile" },
          setPublicHeatmapYear: vi.fn(),
          todayDateKey: "2026-11-26",
        }}
      />,
    );

    const problemTooltip = document.querySelector(".recent-ac-problem");
    expect(problemTooltip.classList.contains("recent-ac-problem")).toBe(true);
    expect(problemTooltip.classList.contains("recent-ac-tooltip")).toBe(true);
    expect(document.querySelector(".recent-ac-sheet")).toBeTruthy();
    expect(document.querySelector(".recent-ac-date")).toBeTruthy();
    expect(document.querySelector(".public-profile-layout")).toBeTruthy();
  });
});
