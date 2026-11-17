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
  loadBuiltInSheet: vi.fn(),
}));

import { supabase } from "../../../shared/lib/supabase";
import { bootstrapBuiltInSheets, loadBuiltInSheet } from "../data/bootstrapBuiltInSheets";
import useSheetLibrary from "./useSheetLibrary";

const dsaTemplate = {
  id: "dsa",
  title: "DSA",
  sheet: {
    steps: [
      {
        subsections: [{ problems: [{ id: "array-problem", title: "Array Problem" }] }],
      },
    ],
  },
};

describe("useSheetLibrary DSA restore", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(bootstrapBuiltInSheets).mockResolvedValue("dsa");
    vi.mocked(loadBuiltInSheet).mockResolvedValue(dsaTemplate);
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { id: "restored-dsa-id" },
      error: null,
    });

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

  it("restores and selects DSA while clearing only its local progress", async () => {
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
      await library.restoreDsaSheet(resetProgress);
    });

    expect(supabase.rpc).toHaveBeenCalledWith("restore_builtin_dsa_sheet", {
      requested_sheet: {
        id: "dsa",
        title: "DSA",
        sheet_data: dsaTemplate.sheet,
      },
    });
    expect(resetProgress).toHaveBeenCalledWith(
      ["array-problem", "custom-restored-dsa-id::array-problem"],
      { persist: false },
    );
    expect(library.selectedSheet.id).toBe("custom-restored-dsa-id");
    expect(library.availableSheets.map((sheet) => sheet.title)).toEqual(["DSA", "Personal"]);
    expect(library.restoringDsaSheet).toBe(false);

    act(() => renderer.unmount());
  });
});
