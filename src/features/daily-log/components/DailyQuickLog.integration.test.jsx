// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DayView from "./DayView";
import useDailyLog from "../hooks/useDailyLog";

const fromMock = vi.hoisted(() => vi.fn());

vi.mock("../../../shared/lib/supabase", () => ({
  supabase: { from: fromMock },
}));

vi.mock("../hooks/useDailyLogHistory", () => ({
  default: () => ({
    allLogs: [],
    allLogsLoading: false,
    clearingHistory: false,
    clearHistory: vi.fn(),
    hasOlderLogs: false,
    loadOlderLogs: vi.fn(),
    olderLogsLoading: false,
  }),
}));

vi.mock("../hooks/useActivityColors", () => ({
  default: () => ({
    activityColors: {},
    assignColor: vi.fn().mockResolvedValue(null),
    setColor: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock("../hooks/useDailyLogTimer", () => ({
  default: () => ({
    quickAdd: vi.fn(),
    runningTimer: null,
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
    timerNow: Date.now(),
  }),
}));

describe("Daily Log Quick Log integration", () => {
  afterEach(cleanup);

  it("keeps DSA and Backend additions made before the initial cloud load finishes", async () => {
    let finishLoad;
    const maybeSingle = vi.fn(
      () =>
        new Promise((resolve) => {
          finishLoad = resolve;
        }),
    );
    fromMock.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle,
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }));

    const sheets = [
      { id: "custom-dsa-row", builtinTemplateId: "dsa", title: "DSA" },
      { id: "custom-backend-row", builtinTemplateId: "backend", title: "Backend" },
    ];
    const clickedSheets = [];
    function DailyLogHarness() {
      const daily = useDailyLog({ id: "quick-log-integration-user" }, {});
      const dailyWithTrackedAdd = {
        ...daily,
        addSheetActivity: (sheet) => {
          clickedSheets.push(sheet.title);
          return daily.addSheetActivity(sheet);
        },
      };
      return (
        <>
          <output data-testid="daily-log-tasks">{JSON.stringify(daily.log.custom_tasks)}</output>
          <DayView daily={dailyWithTrackedAdd} sheets={sheets} askConfirmation={vi.fn()} />
        </>
      );
    }

    render(<DailyLogHarness />);

    await waitFor(() => expect(maybeSingle).toHaveBeenCalledOnce());
    const dsaButton = screen.getByRole("button", { name: "DSA" });
    const backendButton = screen.getByRole("button", { name: "Backend" });
    expect(dsaButton.disabled).toBe(false);
    expect(backendButton.disabled).toBe(false);
    fireEvent.click(dsaButton);
    expect(clickedSheets).toEqual(["DSA"]);
    await waitFor(() => {
      expect(screen.getByTestId("daily-log-tasks").textContent).toContain("sheet:custom-dsa-row");
      expect(screen.getByText("DSA", { selector: ".activity-card-name" })).toBeTruthy();
    });
    fireEvent.click(backendButton);

    await waitFor(() => {
      expect(screen.getByTestId("daily-log-tasks").textContent).toContain("sheet:custom-dsa-row");
      expect(screen.getByTestId("daily-log-tasks").textContent).toContain(
        "sheet:custom-backend-row",
      );
      expect(screen.getByText("DSA", { selector: ".activity-card-name" })).toBeTruthy();
      expect(screen.getByText("Backend", { selector: ".activity-card-name" })).toBeTruthy();
    });

    await act(async () => {
      finishLoad({ data: null, error: null });
      await Promise.resolve();
    });

    expect(screen.getByText("DSA", { selector: ".activity-card-name" })).toBeTruthy();
    expect(screen.getByText("Backend", { selector: ".activity-card-name" })).toBeTruthy();
  });
});
