// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getLocalDateKey } from "../../../shared/utils/date";
import TrendsView from "./TrendsView";

afterEach(cleanup);

function dateOffsetKey(offset) {
  const date = new Date(`${getLocalDateKey()}T00:00:00`);
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

describe("TrendsView", () => {
  it("uses the original chart modes and only offers timed activities", () => {
    const daily = {
      allLogs: [
        {
          date: getLocalDateKey(),
          sleep_time: "23:00",
          wake_time: "06:00",
          custom_tasks: [
            {
              id: "reading",
              name: "Reading",
              slots: [{ start: "09:00", end: "10:00" }],
            },
            {
              id: "sheet:1",
              sheetId: "1",
              name: "DSA Sheet",
              slots: [{ start: "10:00", end: "11:00" }],
            },
            {
              id: "writing",
              name: "Writing",
              slots: [{ start: "", end: "" }],
            },
          ],
        },
      ],
      currentStreak: 1,
      allLogsLoading: false,
      olderLogsLoading: false,
      hasOlderLogs: false,
      loadOlderLogs: vi.fn(),
    };
    const { container } = render(<TrendsView daily={daily} />);
    const chartSelect = screen.getByRole("combobox", { name: "Chart activity" });

    fireEvent.click(chartSelect);
    const chartOptions = within(screen.getByRole("listbox", { name: "Chart activity" }));
    expect(chartOptions.getByRole("option", { name: "Sleep" })).toBeTruthy();
    expect(chartOptions.getByRole("option", { name: "Active" })).toBeTruthy();
    expect(chartOptions.getByRole("option", { name: "Sleep + Active" })).toBeTruthy();
    expect(chartOptions.getByRole("option", { name: "Reading" })).toBeTruthy();
    expect(chartOptions.getByRole("option", { name: "DSA Sheet" })).toBeTruthy();
    expect(chartOptions.queryByRole("option", { name: "Writing" })).toBeNull();
    fireEvent.click(chartOptions.getByRole("option", { name: "Sleep" }));
    expect(
      screen.getByText("Reading", { selector: ".trends-time-label span:last-child" }),
    ).toBeTruthy();
    expect(
      screen.getByText("DSA Sheet", { selector: ".trends-time-label span:last-child" }),
    ).toBeTruthy();

    expect(screen.getByRole("img", { name: /Sleep hours over the last 30 days/ })).toBeTruthy();
    const chooseChart = (label) => {
      fireEvent.click(chartSelect);
      fireEvent.click(screen.getByRole("option", { name: label }));
    };
    chooseChart("Active");
    expect(screen.getByRole("img", { name: /Active hours over the last 30 days/ })).toBeTruthy();
    expect(container.querySelector(".study-average").getAttribute("data-average")).toBe("120");
    chooseChart("Sleep + Active");
    expect(
      screen.getByRole("img", { name: /Sleep \+ active hours over the last 30 days/ }),
    ).toBeTruthy();
    expect(container.querySelectorAll(".sleep-study-average-line")).toHaveLength(2);
    expect(screen.getByText("Active", { selector: ".sleep-study-legend span" })).toBeTruthy();

    chooseChart("Reading");
    expect(screen.getByRole("img", { name: /Reading hours over the last 30 days/ })).toBeTruthy();
    expect(container.querySelector(".study-average").getAttribute("data-average")).toBe("60");
    expect(screen.getByText("Average Reading")).toBeTruthy();

    const chartRange = container.querySelector(
      ".trends-month-navigation .trends-range-label",
    ).textContent;
    const weekRange = container.querySelector(
      ".trends-week-navigation .trends-range-label",
    ).textContent;
    const weekNavigation = container.querySelector(".trends-week-navigation");
    expect(weekNavigation.parentElement.classList.contains("trends-time-header")).toBe(true);
    expect(container.querySelector(".trends-panel-grid")).toBeNull();
    expect(container.querySelector(".trends-summary-grid")).toBeNull();
    expect(container.querySelector(".trends-chart-summary").textContent).toContain("days logged");
    expect(container.querySelector(".trends-chart-summary").textContent).toContain("avg sleep");
    expect(container.querySelector(".trends-chart-summary").textContent).toContain("avg active");
    expect(container.querySelector(".trends-time-total").textContent).toMatch(/total$/);
    expect(container.querySelector(".trends-time-percentage").textContent).toMatch(/%$/);
    expect(container.querySelector(".sleep-study-legend")).toBeTruthy();
    expect(container.textContent).not.toContain("Current streak");
    expect(container.textContent).not.toContain("Daily totals");

    fireEvent.click(screen.getByRole("button", { name: "Previous 30 days" }));
    expect(
      container.querySelector(".trends-month-navigation .trends-range-label").textContent,
    ).not.toBe(chartRange);
    expect(container.querySelector(".trends-week-navigation .trends-range-label").textContent).toBe(
      weekRange,
    );
    expect(screen.getByRole("img", { name: /Reading hours over the last 30 days/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Previous 7 days" }));
    expect(
      container.querySelector(".trends-week-navigation .trends-range-label").textContent,
    ).not.toBe(weekRange);
    expect(screen.getByRole("button", { name: "Next 7 days" }).disabled).toBe(false);
  });

  it("excludes days without recorded sleep from the sleep average line", () => {
    const daily = {
      allLogs: [
        {
          date: getLocalDateKey(),
          sleep_time: "23:00",
          wake_time: "06:00",
          custom_tasks: [],
        },
        {
          date: dateOffsetKey(-1),
          sleep_time: "",
          wake_time: "",
          custom_tasks: [],
        },
      ],
      allLogsLoading: false,
      olderLogsLoading: false,
      hasOlderLogs: false,
      loadOlderLogs: vi.fn(),
    };
    const { container } = render(<TrendsView daily={daily} />);
    const chartSelect = screen.getByRole("combobox", { name: "Chart activity" });

    fireEvent.click(chartSelect);
    fireEvent.click(screen.getByRole("option", { name: "Sleep" }));

    expect(container.querySelector(".sleep-average").getAttribute("data-average")).toBe("420");
  });

  it("limits the chart to the latest seven days on narrow screens", () => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return this.classList?.contains("sleep-study-chart-wrap") ||
          this.classList?.contains("trends-chart-panel-card")
          ? 360
          : 0;
      },
    });

    try {
      const { container } = render(
        <TrendsView
          daily={{
            allLogs: [
              {
                date: dateOffsetKey(-20),
                sleep_time: "23:00",
                wake_time: "06:00",
                custom_tasks: [
                  {
                    id: "reading",
                    name: "Reading",
                    slots: [{ start: "09:00", end: "11:00" }],
                  },
                ],
              },
            ],
            allLogsLoading: false,
            olderLogsLoading: false,
            hasOlderLogs: false,
            loadOlderLogs: vi.fn(),
          }}
        />,
      );
      expect(screen.getByRole("img", { name: /Active hours over the last 7 days/ })).toBeTruthy();
      const chartNavigation = within(
        screen.getByRole("group", { name: "Select chart period" }),
      );
      expect(chartNavigation.getByRole("button", { name: "Previous 7 days" })).toBeTruthy();
      expect(
        [...container.querySelectorAll(".trends-chart-summary strong")].map(
          (metric) => metric.textContent,
        ),
      ).toEqual(["0 / 7", "—", "—"]);

      const rangeLabel = document.querySelector(
        ".trends-month-navigation .trends-range-label",
      ).textContent;
      fireEvent.click(chartNavigation.getByRole("button", { name: "Previous 7 days" }));
      expect(
        document.querySelector(".trends-month-navigation .trends-range-label").textContent,
      ).not.toBe(rangeLabel);
      expect(chartNavigation.getByRole("button", { name: "Next 7 days" }).disabled).toBe(false);
    } finally {
      if (descriptor) {
        Object.defineProperty(HTMLElement.prototype, "clientWidth", descriptor);
      } else {
        delete HTMLElement.prototype.clientWidth;
      }
    }
  });

  it("omits the activity heatmap", () => {
    const daily = {
      allLogs: [],
      currentStreak: 1,
      allLogsLoading: false,
      olderLogsLoading: false,
      hasOlderLogs: false,
      loadOlderLogs: vi.fn(),
    };
    render(<TrendsView daily={daily} />);

    expect(screen.queryByText(/Activity heatmap/)).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Heatmap activity" })).toBeNull();
  });
});
