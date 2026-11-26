// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../shared/lib/supabase", () => ({
  supabase: {
    auth: { getSession: vi.fn() },
    from: vi.fn(),
  },
}));

import { supabase } from "../../../shared/lib/supabase";
import seedSampleData from "./seedSampleData";

describe("seedSampleData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: "test-user" } } },
      error: null,
    });
  });

  it("deletes old tracking rows before writing replacement sample data", async () => {
    const operations = [];
    vi.mocked(supabase.from).mockImplementation((table) => ({
      delete: () => ({
        eq: async (_column, userId) => {
          operations.push({ type: "delete", table, userId });
          return { error: null };
        },
      }),
      upsert: async (rows, options) => {
        operations.push({ type: "upsert", table, rows, options });
        return { error: null };
      },
    }));

    const summary = await seedSampleData({
      userId: "test-user",
      sheets: [
        {
          id: "test-sheet",
          sheet: {
            steps: [
              {
                subsections: [{ problems: [{ id: "problem-1" }] }],
              },
            ],
          },
        },
      ],
    });

    const deletes = operations.filter(({ type }) => type === "delete");
    const writes = operations.filter(({ type }) => type === "upsert");
    expect(deletes.map(({ table }) => table)).toEqual(["daily_logs", "progress", "activity_log"]);
    expect(deletes.every(({ userId }) => userId === "test-user")).toBe(true);
    expect(operations.findIndex(({ type }) => type === "upsert")).toBe(3);
    expect(writes.filter(({ table }) => table === "daily_logs")).toHaveLength(
      Math.ceil(summary.dailyLogDays / 200),
    );
    expect(writes[writes.length - 1].table).toBe("progress");
    expect(writes[0].rows[0].custom_tasks).toHaveLength(5);
    expect(writes[writes.length - 1].rows.every((row) => row.user_id === "test-user")).toBe(true);
  });
});
