// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TrackerControls from "./TrackerControls";

afterEach(cleanup);

describe("TrackerControls", () => {
  it("shows an eye icon that matches the skipped-problem visibility action", () => {
    const setHideSkipped = vi.fn();
    const props = {
      activeFilter: "all",
      chipActive: () => "",
      collapseAll: vi.fn(),
      expandAll: vi.fn(),
      hideSkipped: false,
      setActiveFilter: vi.fn(),
      setHideSkipped,
    };
    const { rerender } = render(<TrackerControls {...props} />);
    const hideButton = screen.getByRole("button", { name: "Hide skipped problems" });

    expect(hideButton.querySelector("svg.lucide-eye-off")).toBeTruthy();
    fireEvent.click(hideButton);
    expect(setHideSkipped.mock.calls[0][0](false)).toBe(true);

    rerender(<TrackerControls {...props} hideSkipped />);
    const showButton = screen.getByRole("button", { name: "Show skipped problems" });
    expect(showButton.querySelector("svg.lucide-eye")).toBeTruthy();
  });
});
