import { afterEach, describe, expect, it, vi } from "vitest";
import { isNetworkUnavailable } from "./network";

describe("isNetworkUnavailable", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("recognizes offline state and fetch failures", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(isNetworkUnavailable(new Error("Request failed"))).toBe(true);

    vi.stubGlobal("navigator", { onLine: true });
    expect(isNetworkUnavailable(new TypeError("Failed to fetch"))).toBe(true);
    expect(isNetworkUnavailable(new Error("Network connection timed out"))).toBe(true);
  });

  it("does not classify ordinary server errors as offline", () => {
    vi.stubGlobal("navigator", { onLine: true });
    expect(isNetworkUnavailable(new Error("Permission denied"))).toBe(false);
  });
});
