// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProblemRow } from "./ProblemTree";

afterEach(cleanup);

describe("ProblemRow", () => {
  it("shows the difficulty and an icon-only LeetCode link before Skip", () => {
    const onToggle = vi.fn();
    render(
      <ProblemRow
        prob={{ id: "two-sum", title: "Two Sum", lc: 1 }}
        state="todo"
        onToggle={onToggle}
        onSkip={vi.fn()}
      />,
    );

    const link = screen.getByRole("link", { name: "Open Two Sum on LeetCode" });
    const skipButton = screen.getByRole("button", { name: "Skip Two Sum" });
    const difficulty = screen.getByRole("button", { name: "Toggle Two Sum completion" });
    const actionGroup = difficulty.parentElement;
    const tooltips = Array.from(document.body.querySelectorAll('[role="tooltip"]'));
    const tooltipLabels = tooltips.map(
      (tooltip) => tooltip.textContent,
    );

    expect(difficulty).toBeTruthy();
    expect(difficulty.hasAttribute("title")).toBe(false);
    expect(actionGroup.className).toContain("grid-cols-[auto_1.25rem_1.25rem]");
    expect(actionGroup.children).toHaveLength(3);
    expect(link.textContent).toBe("");
    expect(link.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(link.getAttribute("href")).toBe("https://leetcode.com/problems/two-sum/");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(difficulty.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(link.compareDocumentPosition(skipButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(skipButton.textContent).toBe("");
    expect(skipButton.querySelector("svg")).not.toBeNull();
    expect(tooltipLabels).toEqual(["Open on LeetCode", "Skip"]);
    expect(tooltips.every((tooltip) => tooltip.parentElement === document.body)).toBe(true);
    expect(tooltips.every((tooltip) => tooltip.classList.contains("fixed"))).toBe(true);
    expect(tooltips.every((tooltip) => tooltip.style.transform === "translate(-50%, -100%)")).toBe(true);
    expect(link.hasAttribute("title")).toBe(false);
    expect(skipButton.hasAttribute("title")).toBe(false);

    fireEvent.click(difficulty);
    expect(onToggle).toHaveBeenCalledWith("two-sum");
  });

  it("does not show a LeetCode link when the problem has no mapped ID", () => {
    render(
      <ProblemRow
        prob={{ id: "custom", title: "Custom exercise", lc: null }}
        state="todo"
        onToggle={vi.fn()}
        onSkip={vi.fn()}
      />,
    );

    expect(screen.queryByRole("link", { name: /LeetCode/ })).toBeNull();
    expect(screen.queryByText(/Easy|Medium|Hard/)).toBeNull();
  });

  it("shows the DSA sheet difficulty for problems without a LeetCode link", () => {
    render(
      <ProblemRow
        prob={{ id: "s3-3.1-p65", title: "Linear Search", lc: null }}
        state="todo"
        onToggle={vi.fn()}
        onSkip={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Toggle Linear Search completion" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /LeetCode/ })).toBeNull();
    expect(document.querySelector(".problem-row > div.grid").children).toHaveLength(3);
  });
});
