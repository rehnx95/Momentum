// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

vi.mock("../../../shared/lib/supabase", () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from "../../../shared/lib/supabase";
import { bootstrapBuiltInSheets, loadBuiltInSheet } from "./bootstrapBuiltInSheets";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parseSheet } = require("../../../../scripts/convert-sheet.cjs");
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("bootstrapBuiltInSheets", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(supabase.rpc).mockResolvedValue({ error: null });
  });

  it("synchronizes complete canonical tracks after ensuring built-in copies", async () => {
    await expect(bootstrapBuiltInSheets("user-1")).resolves.toBe("dsa");

    expect(supabase.rpc).toHaveBeenNthCalledWith(
      1,
      "ensure_builtin_sheet_copies",
      expect.objectContaining({ requested_sheets: expect.any(Array) }),
    );
    expect(supabase.rpc).toHaveBeenNthCalledWith(
      2,
      "sync_builtin_sheet_data",
      expect.objectContaining({ requested_sheets: expect.any(Array) }),
    );
    const ensuredSheets = vi.mocked(supabase.rpc).mock.calls[0][1].requested_sheets;
    const synchronizedSheets = vi.mocked(supabase.rpc).mock.calls[1][1].requested_sheets;
    expect(synchronizedSheets).toEqual(ensuredSheets);
  });

  it.each(["dsa", "backend"])("keeps the %s JSON in sync with its text source", async (id) => {
    const sheet = await loadBuiltInSheet(id);
    const sourceFile = path.join(repositoryRoot, "source", `${id}.txt`);

    expect(sheet.id).toBe(id);
    expect(sheet.sheet.steps.length).toBeGreaterThan(0);
    expect(parseSheet(sourceFile, sheet.sheet)).toEqual(sheet.sheet);
    expect(fs.existsSync(sourceFile)).toBe(true);
  });
});
