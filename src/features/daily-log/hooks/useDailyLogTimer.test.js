import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useDailyLogTimer from './useDailyLogTimer';
import { timerStorageKey } from '../lib/dailyLogModel';

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
  supabase: { from: vi.fn() },
}));

describe('useDailyLogTimer', () => {
  beforeEach(() => {
    installBrowserStubs();
    localStorage.clear();
  });

  afterEach(() => {
    delete globalThis.localStorage;
    delete globalThis.window;
    delete globalThis.document;
  });

  it('starts and stops a timer without leaving a stale running state', async () => {
    const setLog = vi.fn();
    const setMessage = vi.fn();
    const flushPendingSave = vi.fn().mockResolvedValue(true);
    const saveLogRef = { current: vi.fn().mockResolvedValue(true) };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    let hookResult;

    function HookHarness() {
      hookResult = useDailyLogTimer({
        userId: 'user-1',
        dateRef: { current: dateKey },
        logRef: { current: { date: dateKey, sleep_time: '', wake_time: '', custom_tasks: [] } },
        setLog,
        saveLogRef,
        flushPendingSave,
        setMessage,
      });
      return null;
    }

    await act(async () => {
      TestRenderer.create(React.createElement(HookHarness));
    });

    act(() => {
      const started = hookResult.startTimer('task-1', 'Reading', '#3b82f6');
      expect(started).toBe(true);
    });

    expect(hookResult.runningTimer).toMatchObject({ activityId: 'task-1' });
    expect(localStorage.getItem(timerStorageKey('user-1'))).not.toBeNull();

    await act(async () => {
      const stopped = await hookResult.stopTimer();
      expect(stopped).toBe(true);
    });

    expect(hookResult.runningTimer).toBeNull();
    expect(localStorage.getItem(timerStorageKey('user-1'))).toBeNull();
    expect(saveLogRef.current).toHaveBeenCalled();
  });
});
