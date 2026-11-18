import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getOfflineMutations: vi.fn(),
  notifyOfflineQueueChanged: vi.fn(),
  putOfflineMutation: vi.fn(),
  removeOfflineMutation: vi.fn(),
  invalidateDailyLogHistoryCache: vi.fn(),
  setDailyLogCache: vi.fn(),
  updateFullLogCacheEntry: vi.fn(),
}));

vi.mock("./supabase", () => ({
  supabase: { from: mocks.from },
}));

vi.mock("./offlineMutationStore", () => ({
  getOfflineMutations: mocks.getOfflineMutations,
  notifyOfflineQueueChanged: mocks.notifyOfflineQueueChanged,
  putOfflineMutation: mocks.putOfflineMutation,
  removeOfflineMutation: mocks.removeOfflineMutation,
}));

vi.mock("../../features/daily-log/lib/dailyLogHistoryCache", () => ({
  invalidateDailyLogHistoryCache: mocks.invalidateDailyLogHistoryCache,
  setDailyLogCache: mocks.setDailyLogCache,
  updateFullLogCacheEntry: mocks.updateFullLogCacheEntry,
}));

import { syncOfflineMutations } from "./offlineSync";

describe("syncOfflineMutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("syncs a newer daily-log edit after an in-flight local version", async () => {
    const date = "2026-11-18";
    const originalUpdatedAt = "2026-11-18T10:00:00.000Z";
    const firstUpdatedAt = "2026-11-18T10:01:00.000Z";
    const secondUpdatedAt = "2026-11-18T10:02:00.000Z";
    const makeMutation = (updatedAt, expectedUpdatedAt, minute) => ({
      key: `user-1:daily-log:${date}`,
      userId: "user-1",
      type: "daily-log",
      entityId: date,
      updatedAt,
      payload: {
        row: {
          user_id: "user-1",
          date,
          updated_at: updatedAt,
          custom_tasks: [{ id: "reading", name: "Reading", slots: [{ start: "09:00", end: `${minute}:00` }] }],
        },
        expectedUpdatedAt,
      },
    });
    const firstMutation = makeMutation(firstUpdatedAt, originalUpdatedAt, "10");
    const secondMutation = makeMutation(secondUpdatedAt, originalUpdatedAt, "11");
    let queuedMutations = [firstMutation];
    let remoteUpdatedAt = originalUpdatedAt;
    let releaseFirstUpsert;
    let signalFirstUpsert;
    const firstUpsertStarted = new Promise((resolve) => {
      signalFirstUpsert = resolve;
    });
    const firstUpsertResult = new Promise((resolve) => {
      releaseFirstUpsert = resolve;
    });
    const upsert = vi.fn((row) => {
      if (upsert.mock.calls.length === 1) {
        signalFirstUpsert();
        return firstUpsertResult.then((result) => {
          remoteUpdatedAt = row.updated_at;
          return result;
        });
      }
      remoteUpdatedAt = row.updated_at;
      return Promise.resolve({ error: null });
    });
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(async () => ({
        data: { updated_at: remoteUpdatedAt },
        error: null,
      })),
      upsert,
    };
    mocks.from.mockReturnValue(query);
    mocks.getOfflineMutations.mockImplementation(async () => [...queuedMutations]);
    mocks.removeOfflineMutation.mockImplementation(async (key, updatedAt) => {
      const index = queuedMutations.findIndex(
        (mutation) => mutation.key === key && mutation.updatedAt === updatedAt,
      );
      if (index < 0) return false;
      queuedMutations.splice(index, 1);
      return true;
    });

    const syncPromise = syncOfflineMutations("user-1");
    await firstUpsertStarted;
    queuedMutations = [secondMutation];
    void syncOfflineMutations("user-1");
    releaseFirstUpsert({ error: null });

    const result = await syncPromise;

    expect(result.conflicts).toEqual([]);
    expect(result.syncedKeys).toEqual([secondMutation.key]);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(queuedMutations).toEqual([]);
  });
});
