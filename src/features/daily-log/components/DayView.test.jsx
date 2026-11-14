// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DayView from "./DayView";

function createDaily(tasks = []) {
  const log = {
    sleep_time: "",
    wake_time: "",
    custom_tasks: tasks,
  };
  return {
    date: "2026-11-14",
    log,
    activeCustomTasks: tasks,
    loading: false,
    loadFailed: false,
    saving: false,
    dirty: false,
    status: "Saved",
    validation: { errors: [], warnings: [] },
    sleptMinutes: 0,
    studiedMinutes: 0,
    runningTimer: null,
    timerNow: Date.now(),
    shiftDate: vi.fn(),
    changeDate: vi.fn(),
    retryLoad: vi.fn(),
    saveNow: vi.fn(),
    updateField: vi.fn(),
    addCustomTask: vi.fn(),
    addSheetActivity: vi.fn(),
    addSlot: vi.fn(),
    discardEmptySlot: vi.fn(),
    removeSlot: vi.fn(),
    removeCustomTask: vi.fn(),
    renameCustomTask: vi.fn(),
    stopTimer: vi.fn(),
  };
}

afterEach(cleanup);

describe("DayView activity entry", () => {
  it("renders Sleep in its own editable panel below Quick Log", () => {
    const daily = createDaily();
    render(<DayView daily={daily} sheets={[]} askConfirmation={vi.fn()} />);

    const sleepPanel = screen.getByRole("region", { name: "Sleep time" });
    const quickLog = screen.getByRole("heading", { name: "Quick log" }).closest("form");
    expect(sleepPanel).toBeTruthy();
    expect(
      quickLog.compareDocumentPosition(sleepPanel) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sleep" })).toBeNull();
    expect(screen.getByLabelText("Sleep start time hour")).toBeTruthy();
    expect(screen.getByLabelText("Wake time hour")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Remove Sleep/ })).toBeNull();
    expect(daily.updateField).not.toHaveBeenCalled();
  });

  it("keeps the activity header and its add/delete controls visible for one slot", () => {
    const task = {
      id: "reading-1",
      name: "Reading",
      slots: [{ start: "", end: "" }],
    };
    render(<DayView daily={createDaily([task])} sheets={[]} askConfirmation={vi.fn()} />);

    expect(screen.getByText("Reading", { selector: ".activity-card-name" })).toBeTruthy();
    expect(screen.queryByText("1 slot")).toBeNull();
    expect(screen.getByRole("button", { name: "Add slot to Reading" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove Reading activity" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove Reading slot 1" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Add slot to Reading" }).closest(".activity-card-actions"),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Options for Reading/ })).toBeNull();
  });

  it("shows a category count and total alongside the activities heading", () => {
    const task = {
      id: "reading-1",
      name: "Reading",
      slots: [{ start: "09:00", end: "10:00" }],
    };
    render(
      <DayView
        daily={{ ...createDaily([task]), studiedMinutes: 60 }}
        sheets={[]}
        askConfirmation={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Activities" })).toBeTruthy();
    expect(screen.getByText("1 category · 1h")).toBeTruthy();
  });

  it("places sleep overlap warnings on the relevant activity row", () => {
    const daily = createDaily([
      {
        id: "reading-1",
        name: "Reading",
        slots: [{ start: "23:00", end: "23:30" }],
      },
    ]);
    daily.validation.warnings = [
      {
        code: "overlap",
        activityA: "Reading",
        activityB: "Sleep",
        message: "Reading overlaps Sleep.",
      },
    ];
    const { container } = render(<DayView daily={daily} sheets={[]} askConfirmation={vi.fn()} />);

    expect(container.querySelector(".activity-sleep-overlap").textContent).toBe("Overlaps sleep");
    expect(screen.queryByRole("list", { name: "Daily log warnings" })).toBeNull();
  });

  it("shows each slot duration on the right of its corresponding time row", () => {
    const task = {
      id: "reading-1",
      name: "Reading",
      slots: [
        { start: "09:00", end: "10:00" },
        { start: "10:30", end: "11:00" },
      ],
    };
    const { container } = render(
      <DayView daily={createDaily([task])} sheets={[]} askConfirmation={vi.fn()} />,
    );

    const activityCard = container.querySelector(".activity-card");
    const slotRows = [...activityCard.querySelectorAll(".daily-slot-row")];
    expect(activityCard.querySelector(".activity-total").textContent).toBe("1h 30m");
    expect(slotRows.map((row) => row.querySelector(".slot-hours").textContent)).toEqual([
      "1h",
      "30m",
    ]);
    expect(slotRows.every((row) => row.lastElementChild.classList.contains("slot-hours"))).toBe(
      true,
    );
    expect(activityCard.querySelector(".activity-slot-totals")).toBeNull();
  });

  it("hides activities that no longer have any time slots", () => {
    const task = { id: "reading-1", name: "Reading", slots: [] };
    render(<DayView daily={createDaily([task])} sheets={[]} askConfirmation={vi.fn()} />);

    expect(screen.queryByText("Reading", { selector: ".activity-card-name" })).toBeNull();
    expect(screen.getByText("Nothing logged yet. Add an activity to get started.")).toBeTruthy();
  });

  it("explains how the recorded sleep range is counted", () => {
    render(<DayView daily={createDaily()} sheets={[]} askConfirmation={vi.fn()} />);

    expect(
      screen.getByText(
        "Counted toward the night you wake up, so late-evening slots no longer collide.",
      ),
    ).toBeTruthy();
  });
});
