import { describe, expect, it } from "vitest";
import { parseSheet } from "./parseSheet";

describe("parseSheet", () => {
  it("does not create default-skipped problems from legacy Skip markers", () => {
    const sheet = parseSheet(`Step 1 — Basics
1.1 — Arrays
1. Two Sum (LC 1) (Skip)
`);
    const problem = sheet.steps[0].subsections[0].problems[0];

    expect(problem).toEqual({
      id: "s1-1.1-p1",
      title: "Two Sum",
      lc: 1,
    });
  });
});
