import { describe, expect, it } from "vitest";
import {
  findSheetByTitle,
  getActivityDisplayName,
  isSheetActivity,
  normalizeActivityName,
} from "./activityName";

describe("activity names", () => {
  const sheets = [
    { id: "sheet-1", title: "Algorithms" },
    { id: "sheet-2", title: "System Design" },
  ];

  it("uses the current sheet title for sheet activities regardless of saved casing", () => {
    expect(
      getActivityDisplayName(
        { id: "sheet:sheet-1", sheetId: "sheet-1", name: "algorithms" },
        sheets,
      ),
    ).toBe("Algorithms");
  });

  it("matches sheet titles case-insensitively and normalizes whitespace", () => {
    expect(findSheetByTitle("  system   design ", sheets)?.title).toBe("System Design");
    expect(
      getActivityDisplayName(
        { id: "sheet:missing", sheetId: "missing", name: "system design" },
        sheets,
      ),
    ).toBe("System Design");
    expect(normalizeActivityName(" Algorithms ")).toBe("algorithms");
  });

  it("does not treat regular activities as sheet activities", () => {
    const activity = { id: "custom-1", name: "algorithms" };
    expect(isSheetActivity(activity)).toBe(false);
    expect(getActivityDisplayName(activity, sheets)).toBe("algorithms");
  });
});
