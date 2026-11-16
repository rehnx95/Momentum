// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validateDay } from "../../../shared/utils/time";
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
    setActivityColor: vi.fn().mockResolvedValue(true),
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

  it("saves palette and custom hex colors for an activity", async () => {
    const daily = createDaily([
      {
        id: "reading-1",
        name: "Reading",
        slots: [{ start: "09:00", end: "10:00" }],
      },
    ]);
    render(<DayView daily={daily} sheets={[]} askConfirmation={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Choose color for Reading" }));
    fireEvent.click(screen.getByRole("button", { name: "Use Teal color" }));
    expect(daily.setActivityColor).toHaveBeenLastCalledWith("Reading", "teal");
    await waitFor(() => {
      expect(screen.queryByRole("group", { name: "Reading color" })).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Choose color for Reading" }));
    fireEvent.change(screen.getByLabelText("Custom hex"), { target: { value: "#12ab34" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => {
      expect(daily.setActivityColor).toHaveBeenLastCalledWith("Reading", "#12ab34");
    });

    fireEvent.click(screen.getByRole("button", { name: "Choose color for Reading" }));
    fireEvent.change(screen.getByLabelText("Pick custom color for Reading"), {
      target: { value: "#345678" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => {
      expect(daily.setActivityColor).toHaveBeenLastCalledWith("Reading", "#345678");
    });
  });

  it("closes the color picker after a failed save attempt", async () => {
    const daily = createDaily([
      {
        id: "reading-1",
        name: "Reading",
        slots: [{ start: "09:00", end: "10:00" }],
      },
    ]);
    daily.setActivityColor.mockResolvedValue(false);
    render(<DayView daily={daily} sheets={[]} askConfirmation={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Choose color for Reading" }));
    fireEvent.click(screen.getByRole("button", { name: "Use Teal color" }));

    await waitFor(() => {
      expect(screen.queryByRole("group", { name: "Reading color" })).toBeNull();
    });
  });

  it("keeps an empty slot when opening the activity color picker", () => {
    const task = { id: "reading-1", name: "Reading", slots: [{ start: "", end: "" }] };
    const { container } = render(
      <DayView daily={createDaily([task])} sheets={[]} askConfirmation={vi.fn()} />,
    );
    const colorButton = screen.getByRole("button", { name: "Choose color for Reading" });

    fireEvent.pointerDown(colorButton);
    fireEvent.click(colorButton);

    expect(container.querySelector(".daily-slot-row")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Reading color" })).toBeTruthy();
  });

  it("closes the activity color picker on an outside pointer press", () => {
    const task = {
      id: "reading-1",
      name: "Reading",
      slots: [{ start: "09:00", end: "10:00" }],
    };
    render(<DayView daily={createDaily([task])} sheets={[]} askConfirmation={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Choose color for Reading" }));
    fireEvent.pointerDown(screen.getByLabelText("Custom hex"));
    expect(screen.getByRole("group", { name: "Reading color" })).toBeTruthy();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("group", { name: "Reading color" })).toBeNull();
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

  it("adds a built-in activity when its previous empty slot was discarded", () => {
    const daily = createDaily();
    const sheet = { id: "dsa", title: "DSA" };
    render(<DayView daily={daily} sheets={[sheet]} askConfirmation={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "DSA" }));

    expect(daily.addSheetActivity).toHaveBeenCalledWith(sheet);
  });

  it("marks the activity slot and sleep range that actually overlap", () => {
    const daily = createDaily([
      {
        id: "reading-1",
        name: "Reading",
        slots: [{ start: "05:30", end: "06:30" }],
      },
    ]);
    daily.log.sleep_time = "22:00";
    daily.log.wake_time = "06:00";
    daily.validation = validateDay(daily.log);
    const { container } = render(<DayView daily={daily} sheets={[]} askConfirmation={vi.fn()} />);

    expect(container.querySelector(".daily-slot-row").classList.contains("is-overlapping")).toBe(
      true,
    );
    expect(
      container.querySelector(".daily-sleep-time-range").classList.contains("is-overlapping"),
    ).toBe(true);
    expect(container.querySelector(".daily-slot-feedback").textContent).toBe(
      "Sleep slot 1 overlaps this slot.",
    );
    expect(container.querySelector(".daily-sleep-feedback").textContent).toBe(
      "Reading slot 1 overlaps Sleep.",
    );
    expect(screen.queryByRole("list", { name: "Daily log warnings" })).toBeNull();
  });

  it("marks only the slots involved in activity overlaps", () => {
    const daily = createDaily([
      {
        id: "reading-1",
        name: "Reading",
        slots: [
          { start: "09:00", end: "11:00" },
          { start: "12:00", end: "13:00" },
        ],
      },
      {
        id: "coding-1",
        name: "Coding",
        slots: [
          { start: "10:00", end: "12:00" },
          { start: "13:00", end: "14:00" },
        ],
      },
    ]);
    daily.validation = validateDay(daily.log);
    const { container } = render(<DayView daily={daily} sheets={[]} askConfirmation={vi.fn()} />);
    const rows = [...container.querySelectorAll(".daily-slot-row")];

    expect(screen.queryByRole("list", { name: "Daily log warnings" })).toBeNull();
    expect(rows.map((row) => row.classList.contains("is-overlapping"))).toEqual([
      true,
      false,
      true,
      false,
    ]);
    expect(container.querySelectorAll(".daily-slot-feedback")).toHaveLength(2);
    expect(container.textContent).toContain("Coding slot 1 overlaps this slot.");
    expect(container.textContent).toContain("Reading slot 1 overlaps this slot.");
  });

  it("shows slot validation errors beside the invalid slot", () => {
    const daily = createDaily([
      {
        id: "reading-1",
        name: "Reading",
        slots: [{ start: "12:34", end: "01:11" }],
      },
    ]);
    daily.validation = validateDay(daily.log);
    const { container } = render(<DayView daily={daily} sheets={[]} askConfirmation={vi.fn()} />);

    expect(container.querySelector(".daily-slot-row").classList.contains("has-slot-error")).toBe(
      true,
    );
    expect(container.querySelector(".daily-slot-feedback").textContent).toBe(
      "Reading slot 1 must end after it starts.",
    );
    expect(
      container
        .querySelector('[aria-label="Reading slot 1 start time hour"]')
        .getAttribute("aria-invalid"),
    ).toBe("true");
    expect(screen.queryByRole("list", { name: "Daily Log errors" })).toBeNull();
  });

  it("shows sleep validation errors beside the sleep time inputs", () => {
    const daily = createDaily();
    daily.log.sleep_time = "22:00";
    daily.validation = validateDay(daily.log);
    const { container } = render(<DayView daily={daily} sheets={[]} askConfirmation={vi.fn()} />);

    expect(
      container.querySelector(".daily-sleep-time-range").classList.contains("has-slot-error"),
    ).toBe(true);
    expect(container.querySelector(".daily-sleep-feedback").textContent).toBe(
      "Enter both sleep and wake times.",
    );
  });

  it("uses the sheet title and adds a matching quick-log entry as that sheet", async () => {
    const sheet = { id: "sheet-1", title: "Algorithms" };
    const task = {
      id: "sheet:sheet-1",
      sheetId: "sheet-1",
      name: "algorithms",
      slots: [{ start: "09:00", end: "10:00" }],
    };
    const daily = createDaily([task]);
    const { rerender } = render(
      <DayView daily={daily} sheets={[sheet]} askConfirmation={vi.fn()} />,
    );

    expect(screen.getByText("Algorithms", { selector: ".activity-card-name" })).toBeTruthy();

    const emptyDaily = createDaily();
    rerender(<DayView daily={emptyDaily} sheets={[sheet]} askConfirmation={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("New activity"), {
      target: { value: "algorithms" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add activity" }));

    await waitFor(() => {
      expect(emptyDaily.addSheetActivity).toHaveBeenCalledWith(sheet);
    });
    expect(emptyDaily.addCustomTask).not.toHaveBeenCalled();
  });

  it("shows each slot duration and avoids repeating the activity total", () => {
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
    expect(activityCard.querySelector(".activity-total")).toBeNull();
    expect(slotRows.map((row) => row.querySelector(".slot-hours").textContent)).toEqual([
      "1h",
      "30m",
    ]);
    expect(
      slotRows.every((row) => {
        const [timeRange, duration] = row.querySelector(".slot-time-controls").children;
        return (
          timeRange.classList.contains("slot-time-range") &&
          duration.classList.contains("slot-hours") &&
          Boolean(row.lastElementChild.querySelector(".slot-remove"))
        );
      }),
    ).toBe(true);
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
