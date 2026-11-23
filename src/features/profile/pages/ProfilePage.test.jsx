// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProfilePage from "./ProfilePage";

vi.mock("../../../shared/components/AppHeader", () => ({ default: () => null }));
vi.mock("../../../shared/components/Tooltip", () => ({
  default: ({ children }) => children,
}));
vi.mock("../../../shared/components/StatStrip", () => ({ default: () => null }));
vi.mock("../../activity/components/ActivityHeatmap", () => ({ default: () => null }));
vi.mock("../components/RecentAcceptedProblems", () => ({ default: () => null }));
vi.mock("../components/ProfileSheetProgress", () => ({
  default: ({ onRestoreBuiltin }) => (
    <button type="button" onClick={onRestoreBuiltin}>
      Restore built-in sheet
    </button>
  ),
}));

afterEach(cleanup);

function ProfilePageWithState({ context }) {
  const [backupAction, setBackupAction] = useState("");
  return <ProfilePage context={{ ...context, backupAction, setBackupAction }} />;
}

describe("ProfilePage built-in restore", () => {
  it("opens a DSA/Backend picker and restores the selected sheet", async () => {
    const askConfirmation = vi.fn().mockResolvedValue(true);
    const restoreBuiltinSheet = vi.fn().mockResolvedValue(undefined);
    const context = {
      activityLog: [],
      authError: null,
      availableSheets: [{ id: "custom", title: "Custom", problemCount: 1 }],
      builtInSheetOptions: [
        { id: "dsa", title: "DSA" },
        { id: "backend", title: "Backend" },
      ],
      dailyStreak: 0,
      exportProgress: vi.fn(),
      headerProps: {},
      importFileInput: { current: null },
      importProgress: vi.fn(),
      importSheetId: { current: null },
      longestStreak: 0,
      navigateTo: vi.fn(),
      openProfileSettings: vi.fn(),
      ownHeatmapYear: 2026,
      profileProblemsSolved: 0,
      profileProblemsTotal: 0,
      profileSheetStats: [],
      progressError: null,
      publicProfileReturnPath: { current: null },
      recentAccepted: [],
      reset: vi.fn(),
      restoreBuiltinSheet,
      restoringBuiltinSheetId: null,
      customSheetsLoading: false,
      progressLoading: false,
      setOwnHeatmapYear: vi.fn(),
      showNotice: vi.fn(),
      todayDateKey: "2026-01-01",
      user: {},
      userName: "User",
      userUsername: "",
      yearlyActiveDays: 0,
      askConfirmation,
    };

    render(<ProfilePageWithState context={context} />);

    fireEvent.click(screen.getByRole("button", { name: "Restore built-in sheet" }));

    screen.getByRole("dialog", { name: "Choose a built-in sheet to restore" });
    const builtInOptions = screen.getByRole("group", { name: "Built-in sheets" });
    expect(builtInOptions.querySelectorAll("button")).toHaveLength(2);
    expect(screen.getByText("DSA")).toBeTruthy();
    expect(screen.getByText("Backend")).toBeTruthy();
    expect(screen.queryByText("Custom")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Restore Backend sheet" }));

    await waitFor(() => {
      expect(askConfirmation).toHaveBeenCalledOnce();
      expect(restoreBuiltinSheet).toHaveBeenCalledWith("backend");
      expect(context.showNotice).toHaveBeenCalledWith(
        "The original Backend sheet was restored and its progress was reset.",
        "Backend restored",
      );
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
