import { describe, expect, it } from "vitest";
import { getUploadedSheetTitle } from "./sheetTitle";

describe("getUploadedSheetTitle", () => {
  it("preserves the uploaded name's casing and separators", () => {
    expect(getUploadedSheetTitle("my_Dsa-Sheet.TXT")).toBe("my_Dsa-Sheet");
  });

  it("does not interpret built-in identifiers as uploaded filenames", () => {
    expect(getUploadedSheetTitle("builtin:dsa")).toBe("");
  });
});
