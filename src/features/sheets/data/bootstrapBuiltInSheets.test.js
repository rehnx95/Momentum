// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../shared/lib/supabase", () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from "../../../shared/lib/supabase";
import { bootstrapBuiltInSheets, loadBuiltInSheet } from "./bootstrapBuiltInSheets";

describe("bootstrapBuiltInSheets", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(supabase.rpc).mockResolvedValue({ error: null });
  });

  it("synchronizes canonical problem titles after ensuring built-in copies", async () => {
    await expect(bootstrapBuiltInSheets("user-1")).resolves.toBe("dsa");

    expect(supabase.rpc).toHaveBeenNthCalledWith(
      1,
      "ensure_builtin_sheet_copies",
      expect.objectContaining({ requested_sheets: expect.any(Array) }),
    );
    expect(supabase.rpc).toHaveBeenNthCalledWith(
      2,
      "sync_builtin_sheet_problem_titles",
      expect.objectContaining({ requested_sheets: expect.any(Array) }),
    );
    const ensuredSheets = vi.mocked(supabase.rpc).mock.calls[0][1].requested_sheets;
    const synchronizedSheets = vi.mocked(supabase.rpc).mock.calls[1][1].requested_sheets;
    expect(synchronizedSheets).toEqual(ensuredSheets);
  });

  it("loads the canonical DSA template for restoration", async () => {
    const sheet = await loadBuiltInSheet("dsa");

    expect(sheet.id).toBe("dsa");
    expect(sheet.title).toBe("DSA");
    expect(sheet.sheet.steps.length).toBeGreaterThan(0);
  });
});
