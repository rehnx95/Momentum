import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { parseSheetContent } = require("./convert-sheet.cjs");

describe("convert-sheet stable problem IDs", () => {
  it("keeps IDs with their LeetCode problems when source rows move or titles change", () => {
    const original = parseSheetContent(
      [
        "Step 1 — Arrays",
        "1. First problem (LC 101)",
        "2. Second problem (LC 102)",
        "3. Unlinked topic",
      ].join("\n"),
    );
    const originalIds = new Map(
      original.steps[0].subsections[0].problems.map((problem) => [problem.lc, problem.id]),
    );

    const updated = parseSheetContent(
      [
        "Step 1 — Arrays",
        "1. Unlinked topic",
        "2. Second problem (LC 102)",
        "3. Renamed first problem (LC 101)",
      ].join("\n"),
      original,
    );

    const updatedProblems = updated.steps[0].subsections[0].problems;
    expect(updatedProblems.find((problem) => problem.lc === 101).id).toBe(originalIds.get(101));
    expect(updatedProblems.find((problem) => problem.lc === 102).id).toBe(originalIds.get(102));
    expect(updatedProblems.find((problem) => problem.title === "Unlinked topic").id).toBe(
      original.steps[0].subsections[0].problems[2].id,
    );
    expect(new Set(updatedProblems.map((problem) => problem.id)).size).toBe(3);
  });
});
