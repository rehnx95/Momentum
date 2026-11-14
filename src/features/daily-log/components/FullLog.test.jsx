// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getLocalDateKey } from "../../../shared/utils/date";
import FullLog from "./FullLog";

afterEach(cleanup);

describe("FullLog", () => {
  it("omits activities without a recorded time slot from its filters and timeline", () => {
    const daily = {
      allLogs: [{
        date: getLocalDateKey(),
        sleep_time: "",
        wake_time: "",
        custom_tasks: [{
          id: "reading",
          name: "Reading",
          slots: [{ start: "", end: "" }],
        }],
      }],
      problemCounts: {},
      hasOlderLogs: false,
      allLogsLoading: false,
      olderLogsLoading: false,
      loading: false,
    };
    const { container } = render(<FullLog daily={daily} askConfirmation={vi.fn()} />);

    const activityFilter = screen.getByRole("combobox", { name: "Filter full log" });
    fireEvent.click(activityFilter);
    expect(within(screen.getByRole("listbox", { name: "Filter full log" }))
      .queryByRole("option", { name: "Reading" })).toBeNull();
    expect(container.querySelector(".full-log-timeline-segment")).toBeNull();
  });

  it("offers each timed activity and sleep in the full log dropdown", () => {
    const daily = {
      allLogs: [{
        date: getLocalDateKey(),
        sleep_time: "23:00",
        wake_time: "06:00",
        custom_tasks: [{
          id: "reading",
          name: "Reading",
          slots: [{ start: "09:00", end: "10:00" }],
        }],
      }],
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
    expect(within(screen.getByRole("group", { name: "Activity colors" }))
      .getByText("Sleep")).toBeTruthy();
    expect(within(screen.getByRole("group", { name: "Activity colors" }))
      .getByText("Reading")).toBeTruthy();
    expect(container.querySelector(".full-log-day-weekday")).toBeTruthy();
  });

  it("opens the selected date in the daily log", async () => {
    const date = getLocalDateKey();
    const daily = {
      date: "2024-01-01",
      allLogs: [{
        date,
        sleep_time: "",
        wake_time: "",
        custom_tasks: [],
      }],
      problemCounts: {},
      hasOlderLogs: false,
      allLogsLoading: false,
      olderLogsLoading: false,
      loading: false,
      changeDate: vi.fn(async () => true),
      changeViewMode: vi.fn(),
    };
    render(<FullLog daily={daily} askConfirmation={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", {
      name: `Open daily log for ${new Date(`${date}T00:00:00`).toLocaleDateString()}`,
    }));

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

    render(
      <FullLog
        daily={daily}
        askConfirmation={vi.fn()}
        toolbarContainer={toolbarContainer}
      />,
    );

    expect(within(toolbarContainer).getByRole("button", { name: "Clear log" }).textContent).toBe("");
    expect(within(toolbarContainer).getByRole("button", { name: "Load 10 older days" })).toBeTruthy();
    expect(within(toolbarContainer).getByRole("button", { name: "Show all days" })).toBeTruthy();
    toolbarContainer.remove();
  });
});
