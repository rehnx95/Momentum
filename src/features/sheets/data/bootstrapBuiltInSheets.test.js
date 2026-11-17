// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../shared/lib/supabase", () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from "../../../shared/lib/supabase";
import leetcodeProblemLinks from "../leetcodeProblemLinks.json";
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
    expect(supabase.rpc).toHaveBeenNthCalledWith(
      3,
      "sync_builtin_sheet_problem_links",
      expect.objectContaining({ requested_sheets: expect.any(Array) }),
    );
    const ensuredSheets = vi.mocked(supabase.rpc).mock.calls[0][1].requested_sheets;
    const synchronizedSheets = vi.mocked(supabase.rpc).mock.calls[1][1].requested_sheets;
    const linkedSheets = vi.mocked(supabase.rpc).mock.calls[2][1].requested_sheets;
    expect(synchronizedSheets).toEqual(ensuredSheets);
    expect(linkedSheets).toEqual(ensuredSheets);
  });

  it("loads the canonical DSA template for restoration", async () => {
    const sheet = await loadBuiltInSheet("dsa");
    const problems = sheet.sheet.steps.flatMap((step) =>
      step.subsections.flatMap((subsection) => subsection.problems),
    );

    expect(sheet.id).toBe("dsa");
    expect(sheet.title).toBe("DSA");
    expect(sheet.sheet.steps.length).toBeGreaterThan(0);
    expect(problems.find((problem) => problem.id === "s1-1.3-p23")).toMatchObject({
      title: "Armstrong Number",
      lc: 1134,
    });
    expect(problems.find((problem) => problem.id === "s4-4.1-p102")).toMatchObject({
      title: "Implement Lower Bound",
      lc: 35,
    });
    expect(problems.find((problem) => problem.id === "s6-6.4-p197")).toMatchObject({
      title: "Remove Duplicates from Sorted DLL",
      lc: 83,
    });
    expect(problems.find((problem) => problem.id === "s16-16.4-p469")).toMatchObject({
      title: "Print Longest Common Subsequence",
      lc: 1143,
    });
    expect(problems.find((problem) => problem.id === "s16-16.4-p480")).toMatchObject({
      title: "Count Palindromic Subsequences",
      lc: 730,
    });
    expect(leetcodeProblemLinks[1134]).toEqual({
      url: "https://leetcode.com/problems/armstrong-number/",
      difficulty: "Easy",
    });
    expect(leetcodeProblemLinks[83].url).toBe(
      "https://leetcode.com/problems/remove-duplicates-from-sorted-list/",
    );
    expect(leetcodeProblemLinks[730].url).toBe(
      "https://leetcode.com/problems/count-different-palindromic-subsequences/",
    );
  });
});
