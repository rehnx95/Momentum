// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getLocalDateKey } from "../../../shared/utils/date";
import FullLog from "./FullLog";

afterEach(cleanup);

describe("FullLog", () => {
  it("omits untimed activities and shows all of a blank day as unlogged", () => {
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
    expect(container.querySelector(".full-log-timeline-gap").getAttribute("aria-label")).toContain(
      "Unlogged 24h",
    );
    expect(
      Number.parseFloat(container.querySelector(".full-log-timeline-gap").style.width),
    ).toBeCloseTo(100, 1);
    const unloggedTotal = container.querySelector(".full-log-unlogged-total");
    expect(unloggedTotal.getAttribute("aria-label")).toBe("Unlogged 24h");
    expect(unloggedTotal.textContent).toContain("24h");
    expect(unloggedTotal.textContent).not.toContain("%");
  });

  it("filters by activities and includes sleep and unlogged options", () => {
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
              id: "writing",
              name: "Writing",
              slots: [{ start: "10:00", end: "11:00" }],
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
    expect(filterOptions.getByRole("option", { name: "Unlogged" })).toBeTruthy();
    fireEvent.click(filterOptions.getByRole("option", { name: "Reading" }));
    expect(activityFilter.textContent).toContain("Reading");
    expect(screen.getByRole("group", { name: "Activity colors" })).toBeTruthy();
    expect(
      within(screen.getByRole("group", { name: "Activity colors" })).getByText("Sleep"),
    ).toBeTruthy();
    expect(
      within(screen.getByRole("group", { name: "Activity colors" })).getByText("Reading"),
    ).toBeTruthy();
    expect(
      within(screen.getByRole("group", { name: "Activity colors" })).getByText("Unlogged"),
    ).toBeTruthy();
    expect(container.querySelector(".full-log-timeline-gap")).toBeNull();
    expect(container.querySelector(".full-log-timeline-segment.is-sleep")).toBeNull();
    const shareSegments = [...container.querySelectorAll(".full-log-timeline-track > span")];
    expect(shareSegments).toHaveLength(1);
    expect(shareSegments[0].getAttribute("aria-label")).toMatch(/^Reading /);
    expect(Number.parseFloat(shareSegments[0].style.left)).toBe(0);
    expect(Number.parseFloat(shareSegments[0].style.width)).toBeCloseTo((60 / 1440) * 100, 1);
    expect(screen.getByLabelText("Unlogged 15h")).toBeTruthy();
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

  it("labels the date, share bar, active time, sleep, unlogged time, and solved columns", () => {
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

    const headers = [...container.querySelectorAll(".full-log-table-header > span")];
    expect(headers[0].textContent.trim()).toBe("Date");
    expect(headers[1].getAttribute("aria-label")).toBe("Share of time");
    expect(headers.slice(2).map((item) => item.textContent.trim())).toEqual([
      "Active",
      "Sleep",
      "Unlogged",
      "Solved",
    ]);
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

  it("filters days by sleep and unlogged time", () => {
    const daily = {
      allLogs: [
        {
          date: "2025-01-02",
          sleep_time: "23:00",
          wake_time: "06:00",
          custom_tasks: [
            {
              id: "work",
              name: "Work",
              slots: [{ start: "06:00", end: "23:00" }],
            },
          ],
        },
        {
          date: "2025-01-01",
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
    const activityFilter = screen.getByRole("combobox", { name: "Filter full log" });

    fireEvent.click(activityFilter);
    fireEvent.click(
      within(screen.getByRole("listbox", { name: "Filter full log" })).getByRole("option", {
        name: "Sleep",
      }),
    );
    expect(container.querySelectorAll(".full-log-day")).toHaveLength(1);
    expect(container.querySelector(".full-log-sleep-total").textContent).toContain("7h");
    fireEvent.click(container.querySelector(".full-log-expand-button"));
    expect(container.querySelector(".full-log-day-details").textContent).not.toContain("Sleep");

    fireEvent.click(activityFilter);
    fireEvent.click(
      within(screen.getByRole("listbox", { name: "Filter full log" })).getByRole("option", {
        name: "Unlogged",
      }),
    );
    expect(container.querySelectorAll(".full-log-day")).toHaveLength(1);
    expect(container.querySelector(".full-log-unlogged-total").textContent).toContain("24h");
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

  it("omits sleep from expanded details while keeping activity rows", () => {
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
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("Reading");
    expect(rows[0].textContent).toContain("09:00");
    expect(rows[0].textContent).toContain("1h 30m");
    expect(rows[0].textContent).not.toContain("Sleep");
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

  it("keeps activity shares and adds sleep and unlogged shares to the same bar", () => {
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
    const breakdown = container.querySelector(".full-log-activity-breakdown");

    expect(breakdown.textContent).toContain("Reading 1h · 4%");
    expect(breakdown.textContent).toContain("Project 2h · 8%");
    expect(segments).toHaveLength(2);
    expect(segments[0].getAttribute("aria-label")).toBe("Project 2h · 8%");
    expect(segments[0].hasAttribute("title")).toBe(false);
    expect(Number.parseFloat(segments[0].style.width)).toBeCloseTo(8.33, 1);
    expect(segments[1].getAttribute("aria-label")).toBe("Reading 1h · 4%");
    expect(Number.parseFloat(segments[1].style.left)).toBeCloseTo(8.33, 1);
    expect(Number.parseFloat(segments[1].style.width)).toBeCloseTo(4.17, 1);
    expect(container.querySelector(".full-log-timeline-segment.is-sleep")).toBeNull();
    expect(container.querySelector(".full-log-timeline-gap").getAttribute("aria-label")).toBe(
      "Unlogged 21h · 88%",
    );
    segments[0].getBoundingClientRect = () => ({
      left: 100,
      top: 80,
      right: 140,
      bottom: 92,
      width: 40,
      height: 12,
    });

    fireEvent.mouseEnter(segments[0]);
    const activityTooltip = screen.getByRole("tooltip");
    expect(activityTooltip.textContent).toContain("Project 2h · 8%");
    expect(activityTooltip.parentElement).toBe(document.body);
    expect(activityTooltip.style.left).toBe("120px");
    fireEvent.mouseLeave(container.querySelector(".full-log-timeline"));
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(container.querySelectorAll(".full-log-timeline-gap")).toHaveLength(1);

    fireEvent.mouseEnter(container.querySelector(".full-log-timeline-gap"));
    const unloggedTooltip = screen.getByRole("tooltip");
    const tooltipContent = within(unloggedTooltip);
    expect(tooltipContent.getByText("Unlogged 21h · 88%")).toBeTruthy();
    expect(tooltipContent.queryByText(/24h - .*active - .*sleep/)).toBeNull();
    expect(tooltipContent.getByText("00:00–09:00")).toBeTruthy();
    expect(tooltipContent.getByText("12:00–24:00")).toBeTruthy();
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
