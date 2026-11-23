// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../shared/lib/supabase", () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from "../../../shared/lib/supabase";
import {
  bootstrapBuiltInSheets,
  getBuiltInSheetOptions,
  loadBuiltInSheet,
} from "./bootstrapBuiltInSheets";

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

  it.each(["dsa", "backend"])("loads the built-in %s sheet directly", async (id) => {
    const sheet = await loadBuiltInSheet(id);

    expect(sheet.id).toBe(id);
    expect(sheet.sheet.steps.length).toBeGreaterThan(0);
  });

  it("registers DSA and Backend as the built-in sheet types", () => {
    expect(getBuiltInSheetOptions()).toEqual([
      { id: "dsa", title: "DSA" },
      { id: "backend", title: "Backend" },
    ]);
  });

  it.each(["dsa", "backend"])("uses a consistent metadata schema for %s", async (id) => {
    const sheet = await loadBuiltInSheet(id);
    const problems = sheet.sheet.steps.flatMap((step) =>
      step.subsections.flatMap((subsection) => subsection.problems),
    );
    const expectedLinkType = id === "dsa" ? "leetcode" : "youtube";

    expect(
      problems.every(
        (problem) =>
          JSON.stringify(Object.keys(problem).sort()) ===
          JSON.stringify(["difficulty", "id", "link", "title"]),
      ),
    ).toBe(true);
    let problemNumber = 0;
    const expectedProblemIds = sheet.sheet.steps.flatMap((step) =>
      step.subsections.flatMap((subsection) =>
        subsection.problems.map(() => `${subsection.id}-p${++problemNumber}`),
      ),
    );
    expect(problems.map((problem) => problem.id)).toEqual(expectedProblemIds);
    expect(new Set(problems.map((problem) => problem.id)).size).toBe(problems.length);
    expect(
      problems.every((problem) => ["Easy", "Medium", "Hard"].includes(problem.difficulty)),
    ).toBe(true);
    expect(
      problems.every((problem) => problem.link === null || problem.link.type === expectedLinkType),
    ).toBe(true);
  });

  it("includes difficulty for every Backend topic and links all playlist videos", async () => {
    const backend = await loadBuiltInSheet("backend");
    const problems = backend.sheet.steps.flatMap((step) =>
      step.subsections.flatMap((subsection) => subsection.problems),
    );

    expect(problems).toHaveLength(153);
    expect(
      problems.every((problem) => ["Easy", "Medium", "Hard"].includes(problem.difficulty)),
    ).toBe(true);
    expect(problems.filter((problem) => problem.link?.type === "youtube")).toHaveLength(31);
    expect(
      problems.find((problem) => problem.title === "Roadmap for backend from first principles"),
    ).toMatchObject({
      link: { type: "youtube", url: "https://youtu.be/0Rwb4Xmlcwc" },
      difficulty: "Easy",
    });
  });
});
