// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseDailyLog = vi.fn();

vi.mock("../hooks/useDailyLog", () => ({
  default: (...args) => mockUseDailyLog(...args),
}));

vi.mock("./DayView", () => ({
  default: () => <div>Day view</div>,
}));

vi.mock("./FullLog", () => ({
  default: () => <div>Full log</div>,
}));

vi.mock("./TrendsView", () => ({
  default: () => <div>Trends view</div>,
}));

import DailyTracker from "./DailyTracker";

describe("DailyTracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-15T14:41:00"));
    mockUseDailyLog.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the saved state beside the page title", () => {
    mockUseDailyLog.mockReturnValue({
      date: "2026-11-15",
      viewMode: "daily",
      status: "Saved",
      message: "",
      changeViewMode: vi.fn(),
    });

    render(
      <DailyTracker user={{ id: "user-1" }} sheets={[]} activityLog={{}} askConfirmation={vi.fn()} />,
    );

    expect(screen.getByRole("heading", { name: "Daily log" })).toBeTruthy();
    expect(screen.getByText(/Saved\s+2:41\s*(PM|pm)/i)).toBeTruthy();
  });
});
