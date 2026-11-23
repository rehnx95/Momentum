// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProblemRow } from "./ProblemTree";

afterEach(cleanup);

describe("ProblemRow", () => {
  it("shows LeetCode metadata for a built-in DSA row", () => {
    const onToggle = vi.fn();
    render(
      <ProblemRow
        prob={{
          id: "two-sum",
          title: "Two Sum",
          difficulty: "Easy",
          link: { type: "leetcode", url: "https://leetcode.com/problems/two-sum/" },
        }}
        state="todo"
        onToggle={onToggle}
        onSkip={vi.fn()}
        showBuiltinMetadata
      />,
    );

    const link = screen.getByRole("link", { name: "Open Two Sum on LeetCode" });
    const skipButton = screen.getByRole("button", { name: "Skip Two Sum" });
    const actionGroup = link.closest(".grid");
    const tooltips = Array.from(document.body.querySelectorAll('[role="tooltip"]'));
    const tooltipLabels = tooltips.map((tooltip) => tooltip.textContent);

    expect(screen.getByRole("button", { name: "Toggle Two Sum completion" })).toBeTruthy();
    expect(screen.getByText("Easy")).toBeTruthy();
    expect(actionGroup.className).toContain("grid-cols-[auto_1.25rem_1.25rem]");
    expect(actionGroup.children).toHaveLength(3);
    expect(link.textContent).toBe("");
    const leetcodeIcon = link.querySelector("svg");
    expect(leetcodeIcon?.getAttribute("viewBox")).toBe("0 0 94 111");
    expect(leetcodeIcon?.getAttribute("width")).toBe("13");
    expect(leetcodeIcon?.getAttribute("height")).toBe("15.3");
    expect(
      Array.from(leetcodeIcon.querySelectorAll("path")).map((path) => path.getAttribute("fill")),
    ).toEqual(["#FFA116", "#B3B3B3", "var(--text)"]);
    expect(link.getAttribute("href")).toBe("https://leetcode.com/problems/two-sum/");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(
      link.compareDocumentPosition(skipButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(skipButton.textContent).toBe("");
    expect(skipButton.querySelector("svg")).not.toBeNull();
    expect(tooltipLabels).toEqual(["Open on LeetCode", "Skip"]);
    expect(tooltips.every((tooltip) => tooltip.parentElement === document.body)).toBe(true);
    expect(tooltips.every((tooltip) => tooltip.classList.contains("app-tooltip"))).toBe(true);
    expect(tooltips.every((tooltip) => tooltip.classList.contains("app-tooltip-portal"))).toBe(
      true,
    );
    expect(tooltips.every((tooltip) => tooltip.style.position === "fixed")).toBe(true);
    expect(skipButton.getAttribute("aria-describedby")).toBe(tooltips[1].id);
    expect(link.hasAttribute("title")).toBe(false);
    expect(skipButton.hasAttribute("title")).toBe(false);

    fireEvent.click(screen.getByRole("checkbox", { name: "Mark Two Sum as done" }));
    expect(onToggle).toHaveBeenCalledWith("two-sum");
  });

  it("keeps custom rows simple without difficulty or resource links", () => {
    render(
      <ProblemRow
        prob={{
          id: "add-two-numbers",
          title: "Add Two Numbers",
          link: { type: "youtube", url: "https://youtu.be/example" },
          difficulty: "Hard",
        }}
        state="todo"
        onToggle={vi.fn()}
        onSkip={vi.fn()}
      />,
    );

    expect(screen.queryByText("Medium")).toBeNull();
    expect(screen.queryByText("Hard")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button", { name: "Toggle Add Two Numbers completion" })).toBeNull();
  });

  it("does not show a resource link when a built-in topic has none", () => {
    render(
      <ProblemRow
        prob={{ id: "custom", title: "Custom exercise", link: null, difficulty: "Easy" }}
        state="todo"
        onToggle={vi.fn()}
        onSkip={vi.fn()}
        showBuiltinMetadata
      />,
    );

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Easy")).toBeTruthy();
  });

  it("shows DSA problem difficulty in DSA tracker rows", () => {
    render(
      <ProblemRow
        prob={{ id: "s3-3.1-p65", title: "Linear Search", difficulty: "Easy", link: null }}
        state="todo"
        onToggle={vi.fn()}
        onSkip={vi.fn()}
        showBuiltinMetadata
      />,
    );

    expect(screen.getByText("Easy")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Toggle Linear Search completion" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /LeetCode/ })).toBeNull();
    expect(document.querySelector(".problem-row > div.grid").children).toHaveLength(3);
  });

  it("shows Backend difficulty and an accessible YouTube link", () => {
    render(
      <ProblemRow
        prob={{
          id: "backend-basics",
          title: "Backend basics",
          link: { type: "youtube", url: "https://youtu.be/example" },
          difficulty: "Medium",
        }}
        state="todo"
        onToggle={vi.fn()}
        onSkip={vi.fn()}
        showBuiltinMetadata
      />,
    );

    const link = screen.getByRole("link", { name: "Open Backend basics on YouTube" });
    expect(screen.getByText("Medium")).toBeTruthy();
    expect(link.getAttribute("href")).toBe("https://youtu.be/example");
    expect(link.querySelector("rect").getAttribute("fill")).toBe("#FF0000");
    expect(link.querySelector("path").getAttribute("fill")).toBe("#FFFFFF");
    expect(document.querySelector('[role="tooltip"]').textContent).toBe("Open on YouTube");
  });
});
