import { describe, expect, it } from "vitest";
import { getProblemDifficulty } from "./problemDifficulty";

describe("getProblemDifficulty", () => {
  it("uses the difficulty embedded in the built-in problem", () => {
    expect(getProblemDifficulty({ id: "legacy-row-id", lc: 1, difficulty: "Medium" })).toBe(
      "Medium",
    );
  });
});
