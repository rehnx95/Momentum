import { describe, expect, it } from "vitest";
import { getProblemDifficulty } from "./problemDifficulty";

describe("getProblemDifficulty", () => {
  it("uses LeetCode difficulty instead of a source-row mapping", () => {
    expect(getProblemDifficulty({ id: "legacy-row-id", lc: 1 })).toBe("Easy");
  });
});
