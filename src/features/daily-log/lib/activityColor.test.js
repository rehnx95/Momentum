import { describe, expect, it } from "vitest";
import {
  ACTIVITY_COLOR_PALETTE,
  getActivityColor,
  getActivityKey,
  isActivityColorValue,
} from "./activityColor";

describe("activity colors", () => {
  it("defines the requested 15-color palette in allocation order", () => {
    expect(ACTIVITY_COLOR_PALETTE.map(({ id }) => id)).toEqual([
      "sand",
      "slate_blue",
      "sky",
      "olive",
      "rose",
      "dusty_red",
      "teal",
      "lavender",
      "mint",
      "deep_teal",
      "peach",
      "salmon",
      "steel_blue",
      "bronze",
      "sage",
    ]);
  });

  it("normalizes names and treats DSA and DSA Sheet as the same activity", () => {
    expect(getActivityKey("  DSA   ")).toBe("dsa sheet");
    expect(getActivityColor(" Reading ")).toBe(getActivityColor("reading"));
    expect(getActivityColor("DSA")).toBe(getActivityColor("DSA Sheet"));
  });

  it("uses the five fixed colors and a separate fixed Sleep gray", () => {
    expect(getActivityColor("DSA")).toBe("var(--activity-color-sand)");
    expect(getActivityColor("Backend")).toBe("var(--activity-color-slate-blue)");
    expect(getActivityColor("System Design")).toBe("var(--activity-color-sky)");
    expect(getActivityColor("Project")).toBe("var(--activity-color-olive)");
    expect(getActivityColor("Reading")).toBe("var(--activity-color-rose)");
    expect(getActivityColor("Sleep")).toBe("var(--activity-color-sleep)");
  });

  it("uses saved palette assignments and custom hex colors consistently", () => {
    expect(getActivityColor("Reading", { reading: "teal" })).toBe("var(--activity-color-teal)");
    expect(getActivityColor("Writing", { writing: "#12aBcD" })).toBe("#12aBcD");
  });

  it("accepts palette ids or six-digit hex values only", () => {
    expect(isActivityColorValue("sage")).toBe(true);
    expect(isActivityColorValue("#12aBcD")).toBe(true);
    expect(isActivityColorValue("#12ab")).toBe(false);
    expect(isActivityColorValue("not-a-color")).toBe(false);
  });
});
