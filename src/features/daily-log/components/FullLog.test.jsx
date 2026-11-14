// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getLocalDateKey } from "../../../shared/utils/date";
import FullLog from "./FullLog";

afterEach(cleanup);

describe("FullLog", () => {
  it("omits activities without a recorded time slot from its filters and timeline", () => {
    const daily = {
      allLogs: [
        {
          date: getLocalDateKey(),
          sleep_time: "",
          wake_time: "",
          custom_tasks: [
            {
              id: "reading",
              name: "Reading",
              slots: [{ start: "", end: "" }],
            },
          ],
        },
      ],
      problemCounts: {},
      hasOlderLogs: false,
      allLogsLoading: false,
      olderLogsLoading: false,
      loading: false,
    };
    const { container } = render(<FullLog daily={daily} askConfirmation={vi.fn()} />);

    const activityFilter = screen.getByRole("combobox", { name: "Filter full log" });
    fireEvent.click(activityFilter);
    expect(
      within(screen.getByRole("listbox", { name: "Filter full log" })).queryByRole("option", {
        name: "Reading",
      }),
    ).toBeNull();
    expect(container.querySelector(".full-log-timeline-segment")).toBeNull();
  });

  it("offers each timed activity and sleep in the full log dropdown", () => {
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
          ],
        },
      ],
      problemCounts: {},
      hasOlderLogs: false,
      allLogsLoading: false,
      olderLogsLoading: false,
      loading: false,
    };
    const { container } = render(<FullLog daily={daily} askConfirmation={vi.fn()} />);

    const activityFilter = screen.getByRole("combobox", { name: "Filter full log" });
    fireEvent.click(activityFilter);
    const filterOptions = within(screen.getByRole("listbox", { name: "Filter full log" }));
    expect(filterOptions.getByRole("option", { name: "All activities" })).toBeTruthy();
    expect(filterOptions.getByRole("option", { name: "Sleep" })).toBeTruthy();
    fireEvent.click(filterOptions.getByRole("option", { name: "Reading" }));
    expect(activityFilter.textContent).toContain("Reading");
    expect(screen.getByRole("group", { name: "Activity colors" })).toBeTruthy();
    expect(
      within(screen.getByRole("group", { name: "Activity colors" })).getByText("Sleep"),
    ).toBeTruthy();
    expect(
      within(screen.getByRole("group", { name: "Activity colors" })).getByText("Reading"),
    ).toBeTruthy();
    expect(container.querySelector(".full-log-date-button")).toBeTruthy();
  });

  it("shows the saved number of problems solved for each day", () => {
    const date = getLocalDateKey();
    const daily = {
      allLogs: [
        {
          date,
          sleep_time: "",
          wake_time: "",
          custom_tasks: [],
        },
      ],
      problemCounts: { [date]: 3 },
      hasOlderLogs: false,
      allLogsLoading: false,
      olderLogsLoading: false,
      loading: false,
    };
    render(<FullLog daily={daily} askConfirmation={vi.fn()} />);

    expect(screen.getByLabelText("3 problems solved")).toBeTruthy();
  });

  it("labels the date, activity share, active time, sleep, and solved columns", () => {
    const daily = {
      allLogs: [
        {
          date: getLocalDateKey(),
          sleep_time: "",
          wake_time: "",
          custom_tasks: [],
        },
      ],
      problemCounts: {},
      hasOlderLogs: false,
      allLogsLoading: false,
      olderLogsLoading: false,
      loading: false,
    };
    const { container } = render(<FullLog daily={daily} askConfirmation={vi.fn()} />);

    expect(
      [...container.querySelectorAll(".full-log-table-header > span")].map((item) =>
        item.textContent.trim(),
      ),
    ).toEqual(["Date", "Share of active time", "Active", "Sleep", "Solved"]);
  });

  it("keeps dates collapsed until they are explicitly expanded", () => {
    const date = getLocalDateKey();
    const daily = {
      allLogs: [
        {
          date,
          sleep_time: "",
          wake_time: "",
          custom_tasks: [
            {
              id: "reading",
              name: "Reading",
              slots: [{ start: "09:00", end: "10:00" }],
            },
          ],
        },
      ],
      problemCounts: {},
      hasOlderLogs: false,
      allLogsLoading: false,
      olderLogsLoading: false,
      loading: false,
    };
    const { container } = render(<FullLog daily={daily} askConfirmation={vi.fn()} />);
    const toggle = container.querySelector(".full-log-expand-button");

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector(".full-log-day-details")).toBeNull();

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector(".full-log-day-details")).toBeTruthy();
  });

  it("includes a solved date even when no daily log was saved", () => {
    const date = getLocalDateKey();
    const daily = {
      allLogs: [],
      problemCounts: { [date]: 2 },
      hasOlderLogs: false,
      allLogsLoading: false,
      olderLogsLoading: false,
      loading: false,
    };
    render(<FullLog daily={daily} askConfirmation={vi.fn()} />);

    expect(screen.getByLabelText("2 problems solved")).toBeTruthy();
    expect(screen.queryByText("No saved daily logs yet.")).toBeNull();
  });

  it("shows activity and overnight sleep ranges with durations in expanded day details", () => {
    const date = getLocalDateKey();
    const daily = {
      allLogs: [
        {
          date,
          sleep_time: "23:00",
          wake_time: "06:00",
          custom_tasks: [
            {
              id: "reading",
              name: "Reading",
              slots: [{ start: "09:00", end: "10:30" }],
            },
          ],
        },
      ],
      problemCounts: { [date]: 2 },
      hasOlderLogs: false,
      allLogsLoading: false,
      olderLogsLoading: false,
      loading: false,
    };
    const { container } = render(<FullLog daily={daily} askConfirmation={vi.fn()} />);

    fireEvent.click(container.querySelector(".full-log-expand-button"));
    const rows = [...container.querySelectorAll(".full-log-entry")];
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain("Reading");
    expect(rows[0].textContent).toContain("09:00");
    expect(rows[0].textContent).toContain("1h 30m");
    expect(rows[1].textContent).toContain("Sleep");
    expect(rows[1].textContent).toContain("23:00");
    expect(rows[1].textContent).toContain("06:00");
    expect(rows[1].textContent).toContain("7h");
    expect(screen.getByLabelText("2 problems solved")).toBeTruthy();
  });

  it("sorts expanded activity times from midnight through the end of day", () => {
    const date = getLocalDateKey();
    const daily = {
      allLogs: [
        {
          date,
          sleep_time: "",
          wake_time: "",
          custom_tasks: [
            {
              id: "reading",
              name: "Reading",
              slots: [
                { start: "23:00", end: "23:59" },
                { start: "12:00", end: "12:30" },
                { start: "00:00", end: "00:30" },
              ],
            },
          ],
        },
      ],
      problemCounts: {},
      hasOlderLogs: false,
      allLogsLoading: false,
      olderLogsLoading: false,
      loading: false,
    };
    const { container } = render(<FullLog daily={daily} askConfirmation={vi.fn()} />);

    fireEvent.click(container.querySelector(".full-log-expand-button"));
    expect(
      [...container.querySelectorAll(".full-log-entry-time")].map((item) =>
        item.textContent.trim().slice(0, 5),
      ),
    ).toEqual(["00:00", "12:00", "23:00"]);
  });

  it("shows active-time shares as a stacked bar in descending activity duration order", () => {
    const date = getLocalDateKey();
    const daily = {
      allLogs: [
        {
          date,
          sleep_time: "",
          wake_time: "",
          custom_tasks: [
            { id: "reading", name: "Reading", slots: [{ start: "09:00", end: "10:00" }] },
            { id: "project", name: "Project", slots: [{ start: "10:00", end: "12:00" }] },
          ],
        },
      ],
      problemCounts: {},
      hasOlderLogs: false,
      allLogsLoading: false,
      olderLogsLoading: false,
      loading: false,
    };
    const { container } = render(<FullLog daily={daily} askConfirmation={vi.fn()} />);
    const segments = [...container.querySelectorAll(".full-log-timeline-segment")];

    expect(segments).toHaveLength(2);
    expect(segments[0].getAttribute("aria-label")).toContain("Project 2h · 67%");
    expect(segments[0].hasAttribute("title")).toBe(false);
    expect(Number.parseFloat(segments[0].style.width)).toBeCloseTo(66.67, 1);
    expect(segments[1].getAttribute("aria-label")).toContain("Reading 1h · 33%");

    fireEvent.mouseEnter(segments[0]);
    expect(screen.getByRole("tooltip").textContent).toContain("Project 2h · 67%");
    fireEvent.mouseLeave(container.querySelector(".full-log-timeline"));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("reveals more than ten activity entries for an expanded day", () => {
    const date = getLocalDateKey();
    const slots = Array.from({ length: 11 }, (_, index) => ({
      start: `${String(index + 1).padStart(2, "0")}:00`,
      end: `${String(index + 1).padStart(2, "0")}:30`,
    }));
    const daily = {
      allLogs: [
        {
          date,
          sleep_time: "",
          wake_time: "",
          custom_tasks: [{ id: "reading", name: "Reading", slots }],
        },
      ],
      problemCounts: {},
      hasOlderLogs: false,
      allLogsLoading: false,
      olderLogsLoading: false,
      loading: false,
    };
    const { container } = render(<FullLog daily={daily} askConfirmation={vi.fn()} />);

    fireEvent.click(container.querySelector(".full-log-expand-button"));
    expect(container.querySelectorAll(".full-log-entry")).toHaveLength(10);
    fireEvent.click(screen.getByRole("button", { name: "Show 10 more entries" }));
    expect(container.querySelectorAll(".full-log-entry")).toHaveLength(11);
  });

  it("opens the selected date in the daily log", async () => {
    const date = getLocalDateKey();
    const daily = {
      date: "2024-01-01",
      allLogs: [
        {
          date,
          sleep_time: "",
          wake_time: "",
          custom_tasks: [],
        },
      ],
      problemCounts: {},
      hasOlderLogs: false,
      allLogsLoading: false,
      olderLogsLoading: false,
      loading: false,
      changeDate: vi.fn(async () => true),
      changeViewMode: vi.fn(),
    };
    render(<FullLog daily={daily} askConfirmation={vi.fn()} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: `Open daily log for ${new Date(`${date}T00:00:00`).toLocaleDateString()}`,
      }),
    );

    expect(daily.changeDate).toHaveBeenCalledWith(date);
    await waitFor(() => {
      expect(daily.changeViewMode).toHaveBeenCalledWith("daily");
    });
  });

  it("renders icon-only history actions in the supplied toolbar target", () => {
    const toolbarContainer = document.createElement("div");
    document.body.appendChild(toolbarContainer);
    const daily = {
      allLogs: [],
      problemCounts: {},
      hasOlderLogs: true,
      allLogsLoading: false,
      olderLogsLoading: false,
      loading: false,
      loadOlderLogs: vi.fn(),
      clearAllLogs: vi.fn(),
    };

    render(<FullLog daily={daily} askConfirmation={vi.fn()} toolbarContainer={toolbarContainer} />);

    expect(within(toolbarContainer).getByRole("button", { name: "Clear log" }).textContent).toBe(
      "",
    );
    expect(
      within(toolbarContainer).getByRole("button", { name: "Load 10 older days" }),
    ).toBeTruthy();
    expect(within(toolbarContainer).getByRole("button", { name: "Show all days" })).toBeTruthy();
    toolbarContainer.remove();
  });
});
