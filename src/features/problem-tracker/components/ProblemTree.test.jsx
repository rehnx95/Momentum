// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProblemRow } from "./ProblemTree";

afterEach(cleanup);

describe("ProblemRow", () => {
  it("opens the practice page from the title and toggles only from the checkbox", () => {
    const onToggle = vi.fn();
    render(
      <ProblemRow
        prob={{
          id: "two-sum",
          title: "Two Sum",
          difficulty: "Easy",
          links: [
            { type: "youtube", url: "https://youtu.be/example" },
            { type: "leetcode", url: "https://leetcode.com/problems/two-sum/" },
            { type: "practice", url: "https://takeuforward.org/practice/dsa/two-sum" },
            { type: "article", url: "https://takeuforward.org/blogs/data-structure-and-algorithm/two-sum" },
          ],
        }}
        state="todo"
        onToggle={onToggle}
        onSkip={vi.fn()}
        showBuiltinMetadata
      />,
    );

    const practiceLink = screen.getByRole("link", { name: "Open Two Sum on TakeUForward" });
    const articleLink = screen.getByRole("link", { name: "Read article for Two Sum" });
    const link = screen.getByRole("link", { name: "Open Two Sum on LeetCode" });
    const youtubeLink = screen.getByRole("link", { name: "Open Two Sum on YouTube" });
    const skipButton = screen.getByRole("button", { name: "Skip Two Sum" });
    const actionGroup = link.closest(".grid");
    const tooltips = Array.from(document.body.querySelectorAll('[role="tooltip"]'));
    const tooltipLabels = tooltips.map((tooltip) => tooltip.textContent);

    expect(screen.getByRole("checkbox", { name: "Mark Two Sum as done" })).toBeTruthy();
    expect(practiceLink.getAttribute("href")).toBe(
      "https://takeuforward.org/practice/dsa/two-sum",
    );
    expect(practiceLink.getAttribute("target")).toBe("_blank");
    expect(practiceLink.getAttribute("rel")).toBe("noopener noreferrer");
    expect(practiceLink.className).not.toContain("underline");
    expect(articleLink.getAttribute("href")).toBe(
      "https://takeuforward.org/blogs/data-structure-and-algorithm/two-sum",
    );
    expect(articleLink.getAttribute("target")).toBe("_blank");
    expect(screen.getByText("Easy")).toBeTruthy();
    expect(actionGroup.className).toContain("grid-cols-[auto_1.25rem_1.25rem_1.25rem_1.25rem]");
    expect(actionGroup.className).toContain("mobile:gap-x-0");
    expect(actionGroup.children).toHaveLength(5);
    expect(actionGroup.children[1].querySelector("a")).toBe(articleLink);
    expect(actionGroup.children[2].querySelector("a")).toBe(link);
    expect(actionGroup.children[3].querySelector("a")).toBe(youtubeLink);
    expect(actionGroup.children[4].querySelector("button")).toBe(skipButton);
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
    expect(tooltipLabels).toEqual(["Read article", "Open on LeetCode", "Open on YouTube", "Skip"]);
    expect(tooltips.every((tooltip) => tooltip.parentElement === document.body)).toBe(true);
    expect(tooltips.every((tooltip) => tooltip.classList.contains("app-tooltip"))).toBe(true);
    expect(tooltips.every((tooltip) => tooltip.classList.contains("app-tooltip-portal"))).toBe(
      true,
    );
    expect(tooltips.every((tooltip) => tooltip.style.position === "fixed")).toBe(true);
    expect(skipButton.getAttribute("aria-describedby")).toBe(tooltips[3].id);
    expect(link.hasAttribute("title")).toBe(false);
    expect(skipButton.hasAttribute("title")).toBe(false);

    fireEvent.click(practiceLink);
    expect(onToggle).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox", { name: "Mark Two Sum as done" }));
    expect(onToggle).toHaveBeenCalledWith("two-sum");
  });

  it("keeps custom rows simple without difficulty or resource links", () => {
    render(
      <ProblemRow
        prob={{
          id: "add-two-numbers",
          title: "Add Two Numbers",
          links: [{ type: "youtube", url: "https://youtu.be/example" }],
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
        prob={{ id: "custom", title: "Custom exercise", links: [], difficulty: "Easy" }}
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
        prob={{ id: "s3-3.1-p65", title: "Linear Search", difficulty: "Easy", links: [] }}
        state="todo"
        onToggle={vi.fn()}
        onSkip={vi.fn()}
        showBuiltinMetadata
        reserveLeetCodeColumn
      />,
    );

    expect(screen.getByText("Easy")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Toggle Linear Search completion" })).toBeNull();
    expect(screen.getByRole("checkbox", { name: "Mark Linear Search as done" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /LeetCode/ })).toBeNull();
    const actionGroup = document.querySelector(".problem-row > div.grid");
    expect(actionGroup.className).toContain("grid-cols-[auto_1.25rem_1.25rem_1.25rem_1.25rem]");
    expect(actionGroup.children).toHaveLength(5);
    expect(actionGroup.children[1].querySelector("a")).toBeNull();
    expect(actionGroup.children[2].querySelector("a")).toBeNull();
    expect(actionGroup.children[3].querySelector("a")).toBeNull();
  });

  it("provides compact difficulty initials for mobile", () => {
    render(
      <>
        {[
          ["easy", "Easy", "E"],
          ["medium", "Medium", "M"],
          ["hard", "Hard", "H"],
        ].map(([id, difficulty]) => (
          <ProblemRow
            key={id}
            prob={{ id, title: difficulty, difficulty, links: [] }}
            state="todo"
            onToggle={vi.fn()}
            onSkip={vi.fn()}
            showBuiltinMetadata
          />
        ))}
      </>,
    );

    const rows = document.querySelectorAll(".problem-row");
    for (const [index, [difficulty, initial]] of [
      ["Easy", "E"],
      ["Medium", "M"],
      ["Hard", "H"],
    ].entries()) {
      const badge = rows[index].querySelector(".grid > span");
      expect(badge.className).toContain("mobile:h-6");
      expect(badge.className).toContain("mobile:w-6");
      expect(badge.children[0].textContent).toBe(difficulty);
      expect(badge.children[0].className).toContain("mobile:hidden");
      expect(badge.children[1].textContent).toBe(initial);
      expect(badge.children[1].className).toContain("mobile:inline");
    }
  });

  it("shows Backend difficulty and an accessible YouTube link", () => {
    render(
      <ProblemRow
        prob={{
          id: "backend-basics",
          title: "Backend basics",
          links: [{ type: "youtube", url: "https://youtu.be/example" }],
          difficulty: "Medium",
        }}
        state="todo"
        onToggle={vi.fn()}
        onSkip={vi.fn()}
        showBuiltinMetadata
      />,
    );

    const link = screen.getByRole("link", { name: "Open Backend basics on YouTube" });
    const actionGroup = link.closest(".grid");
    expect(screen.getByText("Medium")).toBeTruthy();
    expect(link.getAttribute("href")).toBe("https://youtu.be/example");
    expect(actionGroup.children).toHaveLength(3);
    expect(actionGroup.children[1].querySelector("a")).toBe(link);
    expect(actionGroup.children[2].querySelector("button")).toBeTruthy();
    expect(link.querySelector("rect").getAttribute("fill")).toBe("#FF0000");
    expect(link.querySelector("path").getAttribute("fill")).toBe("#FFFFFF");
    expect(actionGroup.className).toContain("grid-cols-[auto_1.25rem_1.25rem]");
    expect(document.querySelector('[role="tooltip"]').textContent).toBe("Open on YouTube");
  });

  it("shows YouTube and LeetCode links together for a built-in DSA problem", () => {
    render(
      <ProblemRow
        prob={{
          id: "two-sum",
          title: "Two Sum",
          difficulty: "Easy",
          links: [
            { type: "youtube", url: "https://youtu.be/example" },
            { type: "leetcode", url: "https://leetcode.com/problems/two-sum/" },
          ],
        }}
        state="todo"
        onToggle={vi.fn()}
        onSkip={vi.fn()}
        showBuiltinMetadata
      />,
    );

    const youtubeLink = screen.getByRole("link", { name: "Open Two Sum on YouTube" });
    const leetcodeLink = screen.getByRole("link", { name: "Open Two Sum on LeetCode" });
    expect(youtubeLink.getAttribute("href")).toBe("https://youtu.be/example");
    expect(youtubeLink.querySelector("rect").getAttribute("fill")).toBe("#FF0000");
    expect(youtubeLink.querySelector("path").getAttribute("fill")).toBe("#FFFFFF");
    expect(leetcodeLink.getAttribute("href")).toBe("https://leetcode.com/problems/two-sum/");
    const actionGroup = youtubeLink.closest(".grid");
    expect(actionGroup.children[1].querySelector("a")).toBe(leetcodeLink);
    expect(actionGroup.children[2].querySelector("a")).toBe(youtubeLink);
    expect(actionGroup.className).toContain("grid-cols-[auto_1.25rem_1.25rem_1.25rem]");
  });
});
