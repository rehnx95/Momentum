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
    function HookHarness({ enabled, progress = {} }) {
      result = useProblemTree({ data, progress, getState, update: vi.fn(), enabled });
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
    expect(result.filteredSteps).toBe(data.steps);
    expect(getState).not.toHaveBeenCalled();

    await act(async () => {
      renderer.update(
        React.createElement(HookHarness, {
          enabled: true,
          progress: { "problem-1": "done" },
        }),
      );
    });

    expect(result.filteredSteps).toBe(data.steps);
    expect(result.doneCount).toBe(1);
    expect(result.todoCount).toBe(0);

    await act(async () => {
      result.setActiveFilter("done");
    });
    expect(result.filteredSteps[0].subsections[0].problems).toEqual(
      data.steps[0].subsections[0].problems,
    );
    await act(async () => renderer.unmount());
  });

  it("keeps progress handlers stable while reading the latest state", async () => {
    const store = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, String(value)),
    });
    const update = vi.fn();
    let result;
    function HookHarness({ progress }) {
      const getState = (id) => progress[id] || "todo";
      result = useProblemTree({ data, progress, getState, update });
      return null;
    }

    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(HookHarness, { progress: {} }));
    });
    const handleToggle = result.handleToggle;
    const handleSkip = result.handleSkip;

    await act(async () => {
      renderer.update(
        React.createElement(HookHarness, { progress: { "problem-1": "done" } }),
      );
    });

    expect(result.handleToggle).toBe(handleToggle);
    expect(result.handleSkip).toBe(handleSkip);
    act(() => result.handleToggle("problem-1"));
    expect(update).toHaveBeenLastCalledWith("problem-1", "todo");
    act(() => result.handleSkip("problem-1"));
    expect(update).toHaveBeenLastCalledWith("problem-1", "skipped");
    await act(async () => renderer.unmount());
  });
});
