// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProfileSheetProgress from "./ProfileSheetProgress";

afterEach(cleanup);

describe("ProfileSheetProgress", () => {
  it("opens one built-in restore picker and disables it while restoring", () => {
    const onExport = vi.fn();
    const onImport = vi.fn();
    const onRestoreBuiltin = vi.fn();
    const onReset = vi.fn();
    const { rerender } = render(
      <ProfileSheetProgress
        sheets={[]}
        onExport={onExport}
        onImport={onImport}
        onRestoreBuiltin={onRestoreBuiltin}
        onReset={onReset}
      />,
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Export progress",
      "Import progress",
      "Restore built-in sheet",
      "Reset all progress",
    ]);
    expect(buttons.every((button) => button.querySelectorAll("svg").length === 1)).toBe(true);
    expect(buttons[0].querySelector("svg").classList.contains("lucide-upload")).toBe(true);
    expect(buttons[1].querySelector("svg").classList.contains("lucide-download")).toBe(true);
    expect(
      [...document.body.querySelectorAll('[role="tooltip"]')].map((tooltip) => tooltip.textContent),
    ).toEqual([
      "Export progress",
      "Import progress",
      "Restore built-in sheet",
      "Reset all progress",
    ]);
    expect(screen.queryByRole("progressbar")).toBeNull();

    const exportTooltip = document.body.querySelector('[role="tooltip"]');
    fireEvent.mouseEnter(buttons[0]);
    expect(exportTooltip.classList.contains("app-tooltip-visible")).toBe(true);
    fireEvent.click(buttons[0]);
    expect(exportTooltip.classList.contains("app-tooltip-visible")).toBe(false);

    fireEvent.click(buttons[2]);
    expect(onRestoreBuiltin).toHaveBeenCalledOnce();

    rerender(
      <ProfileSheetProgress
        sheets={[]}
        onRestoreBuiltin={onRestoreBuiltin}
        restoringBuiltinSheetId="backend"
        restoreDisabled
      />,
    );
    expect(screen.getByRole("button", { name: "Restore built-in sheet" }).disabled).toBe(true);
  });

  it("does not render a progress card when there are no sheets or actions", () => {
    const { container } = render(<ProfileSheetProgress sheets={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
