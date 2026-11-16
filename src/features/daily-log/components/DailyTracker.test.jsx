// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DailyTracker from "./DailyTracker";

const { useDailyLogMock } = vi.hoisted(() => ({ useDailyLogMock: vi.fn() }));

vi.mock("../hooks/useDailyLog", () => ({ default: useDailyLogMock }));
vi.mock("./DayView", () => ({ default: () => null }));
vi.mock("./FullLog", () => ({ default: () => null }));
vi.mock("./TrendsView", () => ({ default: () => null }));

function createDaily(overrides = {}) {
  return {
    viewMode: "daily",
    date: "2026-11-15",
    status: "Saving soon…",
    message: "",
    dirty: true,
    saving: false,
    loading: false,
    loadFailed: false,
    validation: { errors: [], warnings: [] },
    saveNow: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("DailyTracker save status", () => {
  afterEach(cleanup);

  beforeEach(() => {
    useDailyLogMock.mockReset();
  });

  it("offers a manual save while valid changes are pending", () => {
    const daily = createDaily();
    useDailyLogMock.mockReturnValue(daily);
    render(<DailyTracker user={{ id: "user-1" }} sheets={[]} activityLog={{}} />);

    fireEvent.click(screen.getByRole("button", { name: "Save now" }));

    expect(daily.saveNow).toHaveBeenCalledOnce();
    expect(screen.getByRole("status").textContent).toContain("Saving…");
  });

  it("shows a retry action after a save failure", () => {
    const daily = createDaily({
      status: "Could not save",
      message: "Your edits are still here.",
    });
    useDailyLogMock.mockReturnValue(daily);
    render(<DailyTracker user={{ id: "user-1" }} sheets={[]} activityLog={{}} />);

    expect(screen.getByRole("button", { name: "Retry save" })).toBeTruthy();
  });

  it("keeps the save action slot when the status changes to saved", () => {
    const daily = createDaily();
    useDailyLogMock.mockReturnValue(daily);
    const { container, rerender } = render(
      <DailyTracker user={{ id: "user-1" }} sheets={[]} activityLog={{}} />,
    );
    const actionSlot = container.querySelector(".daily-save-action-slot");

    expect(actionSlot).toBeTruthy();
    expect(actionSlot.querySelector("button").textContent).toBe("Save now");

    useDailyLogMock.mockReturnValue(createDaily({ status: "Saved", dirty: false }));
    rerender(<DailyTracker user={{ id: "user-1" }} sheets={[]} activityLog={{}} />);

    expect(container.querySelector(".daily-save-action-slot")).toBe(actionSlot);
    expect(actionSlot.querySelector("button")).toBeNull();
  });

  it("does not offer saving while validation errors remain", () => {
    useDailyLogMock.mockReturnValue({
      ...createDaily(),
      status: "Fix errors to save",
      validation: { errors: [{ code: "invalid-slot-order" }], warnings: [] },
    });
    render(<DailyTracker user={{ id: "user-1" }} sheets={[]} activityLog={{}} />);

    expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Fix errors to save");
  });
});
