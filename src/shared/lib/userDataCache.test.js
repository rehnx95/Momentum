import { afterEach, describe, expect, it, vi } from "vitest";
import { readUserDataCache, writeUserDataCache } from "./userDataCache";

describe("user data cache", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores data separately for each user and section", () => {
    const values = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key) => values.get(key) || null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    });

    writeUserDataCache("user-a", "progress", { "sheet::1": "done" });

    expect(readUserDataCache("user-a", "progress")).toEqual({
      "sheet::1": "done",
    });
    expect(readUserDataCache("user-b", "progress")).toBeNull();
    expect(readUserDataCache("user-a", "sheets")).toBeNull();
  });
});
