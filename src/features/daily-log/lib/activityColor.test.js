import { describe, expect, it } from "vitest";
import { getActivityColor } from "./activityColor";

describe("activity colors", () => {
  it("assigns the same color regardless of casing or whitespace", () => {
    expect(getActivityColor(" Reading ")).toBe(getActivityColor("reading"));
  });

  it("uses the same color for the DSA name and its Full Log label", () => {
    expect(getActivityColor("DSA")).toBe(getActivityColor("DSA Sheet"));
  });

  it("assigns clear, different colors to common activities", () => {
    const colors = [
      "DSA Sheet",
      "Reading",
      "Project",
      "System Design",
      "Exercise",
      "Writing",
      "Planning",
    ].map((name) => getActivityColor(name));
    expect(new Set(colors).size).toBe(colors.length);
  });

  it("uses the screenshot palette with stable per-activity variables", () => {
    expect(getActivityColor("Reading")).toBe("var(--daily-task-2)");
  });
});
