import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProgress } from './useProgress';

const fromMock = vi.hoisted(() => vi.fn());

function installBrowserStubs() {
  const store = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
      key: (index) => Array.from(store.keys())[index] ?? null,
      get length() { return store.size; },
    },
    configurable: true,
  });

  Object.defineProperty(globalThis, 'window', {
    value: {
      setInterval: vi.fn(() => 1),
      clearInterval: vi.fn(),
      setTimeout: vi.fn(() => 1),
      clearTimeout: vi.fn(),
    },
    configurable: true,
  });

  Object.defineProperty(globalThis, 'document', {
    value: {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      visibilityState: 'visible',
      documentElement: {
        setAttribute: vi.fn(),
        removeAttribute: vi.fn(),
      },
    },
    configurable: true,
  });
}

vi.mock('../../../shared/lib/supabase', () => ({
  supabase: { from: fromMock },
}));

vi.mock('../../../shared/lib/userDataCache', () => ({
  readUserDataCache: vi.fn(() => null),
  writeUserDataCache: vi.fn(),
}));

describe('useProgress', () => {
  beforeEach(() => {
    installBrowserStubs();
    fromMock.mockReset();
    fromMock.mockImplementation((table) => {
      if (table === 'progress') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [{ problem_id: 'problem-1', state: 'done', completed_on: '2025-03-14', updated_at: '2025-03-14T12:00:00.000Z' }],
            error: null,
          }),
        };
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ date: '2025-03-14', count: 1 }],
          error: null,
        }),
      };
    });
  });

  afterEach(() => {
    delete globalThis.localStorage;
    delete globalThis.window;
    delete globalThis.document;
  });

  it('loads progress and activity metrics from the persisted sources', async () => {
    let hookResult;
    const user = { id: 'user-1' };

    function HookHarness() {
      hookResult = useProgress(user);
      return null;
    }

    await act(async () => {
      TestRenderer.create(React.createElement(HookHarness));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(hookResult.progress['problem-1']).toBe('done');
    expect(hookResult.activityLog['2025-03-14']).toBe(1);
    expect(hookResult.completedOn['problem-1']).toBe('2025-03-14');
  });
});
