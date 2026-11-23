// @vitest-environment jsdom

import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../shared/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock("../data/bootstrapBuiltInSheets", () => ({
  bootstrapBuiltInSheets: vi.fn(),
  getBuiltInSheetOptions: vi.fn(() => [
    { id: "dsa", title: "DSA" },
    { id: "backend", title: "Backend" },
  ]),
  loadBuiltInSheet: vi.fn(),
}));

import { supabase } from "../../../shared/lib/supabase";
import { bootstrapBuiltInSheets, loadBuiltInSheet } from "../data/bootstrapBuiltInSheets";
import useSheetLibrary from "./useSheetLibrary";

function createBuiltInTemplate(id, title) {
  return {
    id,
    title,
    sheet: {
      steps: [
        {
          subsections: [{ problems: [{ id: "array-problem", title: "Array Problem" }] }],
        },
      ],
    },
  };
}

describe("useSheetLibrary built-in restore", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(bootstrapBuiltInSheets).mockResolvedValue("dsa");
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { id: "restored-sheet-id" }, error: null });

    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "personal-id",
          title: "Personal",
          source_name: "personal.txt",
          sheet_data: { steps: [] },
          builtin_template_id: null,
        },
      ],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    vi.mocked(supabase.from).mockReturnValue({ select });
  });

  it.each([
    ["dsa", "DSA"],
    ["backend", "Backend"],
  ])("restores and selects the built-in %s sheet consistently", async (templateId, title) => {
    const template = createBuiltInTemplate(templateId, title);
    vi.mocked(loadBuiltInSheet).mockResolvedValue(template);
    let library;
    function HookHarness() {
      library = useSheetLibrary({ id: "user-1" }, vi.fn());
      return null;
    }

    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(HookHarness));
      await Promise.resolve();
    });

    const resetProgress = vi.fn().mockResolvedValue(undefined);
    await act(async () => {
      await library.restoreBuiltinSheet(templateId, resetProgress);
    });

    expect(supabase.rpc).toHaveBeenCalledWith("restore_builtin_sheet", {
      requested_sheet: {
        id: templateId,
        title,
        sheet_data: template.sheet,
      },
    });
    expect(resetProgress).toHaveBeenCalledWith(["custom-restored-sheet-id::array-problem"], {
      persist: false,
    });
    expect(library.selectedSheet.id).toBe("custom-restored-sheet-id");
    expect(library.availableSheets.map((sheet) => sheet.title)).toContain(title);
    expect(library.restoringBuiltinSheetId).toBe(null);

    act(() => renderer.unmount());
  });
});
