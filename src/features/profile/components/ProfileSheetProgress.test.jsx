// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProfileSheetProgress from "./ProfileSheetProgress";

afterEach(cleanup);

describe("ProfileSheetProgress", () => {
  it("renders icon-only actions with tooltips and disables restore while busy", () => {
    const onExport = vi.fn();
    const onImport = vi.fn();
    const onRestoreDsa = vi.fn();
    const onReset = vi.fn();
    const { rerender } = render(
      <ProfileSheetProgress
        sheets={[]}
        onExport={onExport}
        onImport={onImport}
        onRestoreDsa={onRestoreDsa}
        onReset={onReset}
      />,
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Export progress",
      "Import progress",
      "Restore DSA",
      "Reset all progress",
    ]);
    expect(buttons.every((button) => button.querySelectorAll("svg").length === 1)).toBe(true);
    expect(buttons[0].querySelector("svg").classList.contains("lucide-upload")).toBe(true);
    expect(buttons[1].querySelector("svg").classList.contains("lucide-download")).toBe(true);
    expect(
      [...document.body.querySelectorAll('[role="tooltip"]')].map((tooltip) => tooltip.textContent),
    ).toEqual(["Export progress", "Import progress", "Restore DSA", "Reset all progress"]);

    fireEvent.click(buttons[2]);
    expect(onRestoreDsa).toHaveBeenCalledOnce();

    rerender(<ProfileSheetProgress sheets={[]} onRestoreDsa={onRestoreDsa} restoreDisabled />);
    expect(screen.getByRole("button", { name: "Restore DSA" }).disabled).toBe(true);
  });
});
