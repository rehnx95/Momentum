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
    const firstServerUpdatedAt = "2026-11-18T10:01:01.000Z";
    const secondServerUpdatedAt = "2026-11-18T10:02:01.000Z";
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
          custom_tasks: [
            { id: "reading", name: "Reading", slots: [{ start: "09:00", end: `${minute}:00` }] },
          ],
        },
        expectedUpdatedAt,
      },
    });
    const firstMutation = makeMutation(firstUpdatedAt, originalUpdatedAt, "10");
    const secondMutation = makeMutation(secondUpdatedAt, originalUpdatedAt, "11");
    let queuedMutations = [firstMutation];
    let remoteUpdatedAt = originalUpdatedAt;
    let releaseFirstUpdate;
    let signalFirstUpdate;
    const firstUpsertStarted = new Promise((resolve) => {
      signalFirstUpdate = resolve;
    });
    const firstUpsertResult = new Promise((resolve) => {
      releaseFirstUpdate = resolve;
    });
    const update = vi.fn(() => {
      if (update.mock.calls.length === 1) {
        signalFirstUpdate();
        return firstUpsertResult.then((result) => {
          remoteUpdatedAt = firstServerUpdatedAt;
          return result;
        });
      }
      remoteUpdatedAt = secondServerUpdatedAt;
      return query;
    });
    const query = {
      update,
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockImplementation(async () => ({
        data: [{ updated_at: remoteUpdatedAt }],
        error: null,
      })),
      eq: vi.fn().mockReturnThis(),
    };
    update.mockImplementation(() => {
      if (update.mock.calls.length === 1) {
        signalFirstUpdate();
        return {
          ...query,
          select: vi.fn().mockImplementation(() =>
            firstUpsertResult.then((result) => {
              remoteUpdatedAt = firstServerUpdatedAt;
              return result;
            }),
          ),
        };
      }
      remoteUpdatedAt = secondServerUpdatedAt;
      return query;
    });
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
    releaseFirstUpdate({ data: [{ updated_at: firstServerUpdatedAt }], error: null });

    const result = await syncPromise;

    expect(result.conflicts).toEqual([]);
    expect(result.syncedKeys).toEqual([secondMutation.key]);
    expect(update).toHaveBeenCalledTimes(2);
    expect(queuedMutations).toEqual([]);
  });

  it("reports a conflict when the atomic updated-at guard matches no row", async () => {
    const date = "2026-11-18";
    const mutation = {
      key: `user-1:daily-log:${date}`,
      userId: "user-1",
      type: "daily-log",
      entityId: date,
      updatedAt: 1,
      payload: {
        row: {
          user_id: "user-1",
          date,
          sleep_time: null,
          wake_time: null,
          sleep_periods: [],
          custom_tasks: [{ id: "local", name: "Local", slots: [] }],
          updated_at: "2026-11-18T10:01:00.000Z",
        },
        expectedUpdatedAt: "2026-11-18T10:00:00.000Z",
      },
    };
    const updateBuilder = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const updateQuery = { update: vi.fn(() => updateBuilder) };
    const readQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          sleep_time: null,
          wake_time: null,
          sleep_periods: [],
          custom_tasks: [{ id: "remote", name: "Remote", slots: [] }],
          updated_at: "2026-11-18T10:02:00.000Z",
        },
        error: null,
      }),
    };
    mocks.from.mockReturnValueOnce(updateQuery).mockReturnValueOnce(readQuery);
    mocks.getOfflineMutations.mockResolvedValue([mutation]);

    const result = await syncOfflineMutations("user-1");

    expect(updateBuilder.eq).toHaveBeenCalledWith("updated_at", "2026-11-18T10:00:00.000Z");
    expect(result.conflicts).toEqual([{ key: mutation.key, type: "daily-log", entityId: date }]);
    expect(mocks.removeOfflineMutation).not.toHaveBeenCalled();
  });
});
