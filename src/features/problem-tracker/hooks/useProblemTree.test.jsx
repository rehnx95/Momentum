import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import useProblemTree from "./useProblemTree";

const data = {
  steps: [
    {
      id: "step-1",
      subsections: [
        {
          id: "subsection-1",
          problems: [{ id: "problem-1", title: "Problem 1" }],
        },
      ],
    },
  ],
};

describe("useProblemTree", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("defers problem processing until the tracker route is active", async () => {
    const store = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, String(value)),
    });
    const getState = vi.fn(() => "todo");
    let result;
    function HookHarness({ enabled }) {
      result = useProblemTree({ data, progress: {}, getState, update: vi.fn(), enabled });
      return null;
    }

    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(HookHarness, { enabled: false }));
    });

    expect(result.filteredSteps).toEqual([]);
    expect(result.totalProblems).toBe(0);
    expect(getState).not.toHaveBeenCalled();

    await act(async () => {
      renderer.update(React.createElement(HookHarness, { enabled: true }));
    });

    expect(result.totalProblems).toBe(1);
    expect(getState).toHaveBeenCalledWith("problem-1");
    await act(async () => renderer.unmount());
  });
});
