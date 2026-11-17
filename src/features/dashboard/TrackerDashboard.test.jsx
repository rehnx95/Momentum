// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TrackerDashboard from "./TrackerDashboard";

vi.mock("../../shared/components/AppHeader", () => ({ default: () => null }));
vi.mock("./components/TrackerControls", () => ({ default: () => null }));
vi.mock("../sheets/components/SheetSwitcher", () => ({ default: () => null }));
vi.mock("../problem-tracker/components/ProblemTree", () => ({
  StepRow: ({ showDifficulty }) => (
    <div data-testid="tracker-step" data-show-difficulty={showDifficulty} />
  ),
}));

function createContext(selectedSheet) {
  return {
    activeFilter: "all",
    askConfirmation: vi.fn(),
    authError: "",
    chipActive: vi.fn(),
    collapseAll: vi.fn(),
    deletingSheetId: null,
    doneCount: 1,
    downloadSampleFormat: vi.fn(),
    expandAll: vi.fn(),
    expandedSteps: new Set(),
    expandedSubs: new Set(),
    filteredSteps: [],
    handleRemoveSheet: vi.fn(),
    handleSkip: vi.fn(),
    handleToggle: vi.fn(),
    handleUploadSheet: vi.fn(),
    headerProps: {},
    hideSkipped: false,
    importProgress: vi.fn(),
    progressError: "",
    progressState: (id) => {
      if (id.endsWith("-p1")) return "done";
      if (id.endsWith("-p2") || id.endsWith("-p124")) return "skipped";
      return "todo";
    },
    renderDialog: () => null,
    reset: vi.fn(),
    search: "",
    selectedSheet,
    setActiveFilter: vi.fn(),
    setHideSkipped: vi.fn(),
    setProgressError: vi.fn(),
    setSearch: vi.fn(),
    setSelectedSheetId: vi.fn(),
    sheetError: "",
    sheetProblems: [
      { id: "dsa::arrays::array-p1" },
      { id: "dsa::arrays::array-p2" },
      { id: "dsa::arrays::array-p17" },
      { id: "dsa::arrays::array-p124" },
    ],
    sheets: [],
    skippedCount: 2,
    theme: "dark",
    todoCount: 1,
    totalProblems: 4,
    toggleStep: vi.fn(),
    toggleSub: vi.fn(),
    uploadSheetInput: { current: null },
    uploadingSheet: false,
  };
}

afterEach(cleanup);

describe("TrackerDashboard DSA progress gauge", () => {
  it("shows the gauge only for the built-in DSA sheet", () => {
    render(
      <TrackerDashboard context={createContext({ title: "DSA", builtinTemplateId: "dsa" })} />,
    );

    expect(screen.getByRole("img", { name: "1 of 4 problems solved, 2 skipped" })).toBeTruthy();
    expect(screen.getByText("Solved")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Easy: 1 solved out of 2" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Medium: 0 solved out of 1" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Hard: 0 solved out of 1" })).toBeTruthy();
    const dsaGauge = screen.getByRole("img", { name: "1 of 4 problems solved, 2 skipped" });
    const difficultyColors = [...dsaGauge.querySelectorAll("g[transform^='rotate(']")].map(
      (segment) => segment.querySelectorAll("circle")[1].getAttribute("stroke"),
    );
    expect(difficultyColors).toEqual(["#34D399", "#FFA116", "#FB7185"]);
    const resetButton = screen.getByRole("button", { name: "Reset DSA progress" });
    expect(resetButton.hasAttribute("title")).toBe(false);
    expect(resetButton.getAttribute("aria-describedby")).toBeTruthy();
    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip.textContent).toBe("Reset");
    expect(tooltip.parentElement).toBe(document.body);
    vi.spyOn(resetButton.closest(".app-tooltip-anchor"), "getBoundingClientRect").mockReturnValue({
      top: 120,
      left: 80,
      width: 20,
    });
    vi.spyOn(tooltip, "getBoundingClientRect").mockReturnValue({
      width: 100,
      height: 20,
    });
    fireEvent.mouseEnter(resetButton);
    expect(tooltip.style.position).toBe("fixed");
    expect(tooltip.style.top).toBe("92px");
    expect(tooltip.style.left).toBe("40px");
    expect(resetButton.closest(".app-tooltip-anchor").parentElement.className).toContain(
      "items-center",
    );
    const solvedArcs = document.querySelectorAll("svg circle[stroke-dasharray]");
    expect(solvedArcs[1].style.transition).toBe(
      "stroke-dasharray 900ms cubic-bezier(0.16, 1, 0.3, 1)",
    );
  });

  it("confirms before resetting DSA progress", async () => {
    const context = createContext({ title: "DSA", builtinTemplateId: "dsa" });
    context.askConfirmation.mockResolvedValue(true);
    render(<TrackerDashboard context={context} />);

    fireEvent.click(screen.getByRole("button", { name: "Reset DSA progress" }));

    await waitFor(() => {
      expect(context.reset).toHaveBeenCalledWith(context.sheetProblems.map(({ id }) => id));
    });
  });

  it.each([
    ["DSA", { title: "DSA", builtinTemplateId: "dsa" }, "true"],
    ["Backend", { title: "Backend", builtinTemplateId: "backend" }, "false"],
    ["Custom", { title: "Custom", customId: "custom-1" }, "false"],
  ])("shows tracker difficulty only for %s", (_title, selectedSheet, expectedValue) => {
    const context = createContext(selectedSheet);
    context.filteredSteps = [{ id: "step-1" }];
    render(<TrackerDashboard context={context} />);

    expect(screen.getByTestId("tracker-step").getAttribute("data-show-difficulty")).toBe(
      expectedValue,
    );
  });

  it.each([
    ["Backend", { title: "Backend", builtinTemplateId: "backend" }],
    ["Custom", { title: "Custom", customId: "custom-1" }],
  ])("shows the two-status progress card for the %s sheet", (title, selectedSheet) => {
    const { container } = render(<TrackerDashboard context={createContext(selectedSheet)} />);

    const gauge = screen.getByRole("img", { name: "1 done, 1 to do, 2 skipped" });
    expect(gauge.textContent).toContain("1/4");
    expect(gauge.querySelector("#progress-gauge-arc-mask")).toBeTruthy();
    const arcColors = [...gauge.querySelectorAll("circle")].map((circle) =>
      circle.getAttribute("stroke"),
    );
    expect(new Set(arcColors).size).toBe(2);
    const gaugeSegments = [...gauge.querySelectorAll('g[transform^="rotate("]')];
    const lastSegment = gaugeSegments[gaugeSegments.length - 1];
    const lastSegmentRotation = Number(
      lastSegment.getAttribute("transform").match(/rotate\(([-\d.]+)/)[1],
    );
    const lastSegmentArcLength = Number(
      lastSegment.querySelectorAll("circle")[1].getAttribute("stroke-dasharray").split(" ")[0],
    );
    const fullArcEnd = lastSegmentRotation + (lastSegmentArcLength / (2 * Math.PI * 42)) * 360;
    expect(fullArcEnd).toBeCloseTo(225 + 254 + 2 * 8, 5);
    const doneTile = screen.getByRole("group", { name: "Done: 1" });
    const todoTile = screen.getByRole("group", { name: "To Do: 1" });
    expect(doneTile.parentElement.className).toContain("justify-start");
    expect(doneTile.className).toContain("h-[44px]");
    expect(todoTile.className).toContain("h-[44px]");
    expect(doneTile.className).toContain("bg-white/[0.06]");
    expect(todoTile.className).toContain("bg-white/[0.06]");
    expect(screen.getByText(/Skipped/)).toBeTruthy();
    expect(screen.getByRole("button", { name: `Reset ${title} progress` })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reset DSA progress" })).toBeNull();
    expect(container.querySelector(".tracker-sheet-progress").textContent).not.toContain("25%");
  });

  it("keeps the existing progress display for other built-in sheets", () => {
    const { container } = render(
      <TrackerDashboard context={createContext({ title: "Other", builtinTemplateId: "other" })} />,
    );

    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector(".tracker-sheet-progress").textContent).toContain("25%");
  });

  it("keeps DSA difficulty tiles out of a Backend sheet with stale template metadata", () => {
    render(
      <TrackerDashboard
        context={createContext({
          title: "Backend",
          builtinTemplateId: "dsa",
          customId: "backend-copy",
        })}
      />,
    );

    expect(screen.queryByRole("group", { name: /^(Easy|Medium|Hard):/ })).toBeNull();
    expect(screen.getByRole("group", { name: "Done: 1" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "To Do: 1" })).toBeTruthy();
  });
});
