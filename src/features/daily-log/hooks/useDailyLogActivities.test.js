import React, { useState } from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import useDailyLogActivities from "./useDailyLogActivities";

function renderActivities(initialLog = { custom_tasks: [] }, assignActivityColor) {
  const logRef = { current: initialLog };
  let activities;

  function Harness() {
    const [, setState] = useState(initialLog);
    const setLog = (update) => {
      setState((current) => {
        const next = typeof update === "function" ? update(current) : update;
        logRef.current = next;
        return next;
      });
    };
    activities = useDailyLogActivities(logRef, setLog, assignActivityColor);
    return null;
  }

  let renderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(Harness));
  });
  return { activities, logRef, renderer };
}

describe("useDailyLogActivities", () => {
  it("creates activities with blank editable slots and removes them with their last slot", async () => {
    const { activities, logRef, renderer } = renderActivities();
    let task;

    await act(async () => {
      task = await activities.addCustomTask("Reading");
    });

    expect(task.slots).toEqual([{ start: "", end: "" }]);
    expect(logRef.current.custom_tasks[0].slots).toEqual([{ start: "", end: "" }]);

    act(() => activities.removeSlot(task.id, 0));
    expect(logRef.current.custom_tasks).toEqual([]);
    act(() => renderer.unmount());
  });

  it("adds a Quick Log activity when color assignment is unavailable", async () => {
    const assignActivityColor = vi.fn().mockResolvedValue(null);
    const { activities, logRef, renderer } = renderActivities(
      { custom_tasks: [] },
      assignActivityColor,
    );
    let task;

    await act(async () => {
      task = await activities.addCustomTask("Focus");
    });

    expect(assignActivityColor).toHaveBeenCalledWith("Focus");
    expect(task.name).toBe("Focus");
    expect(logRef.current.custom_tasks[0]).toEqual(task);
    act(() => renderer.unmount());
  });

  it("adds an activity immediately without waiting for color assignment", async () => {
    let resolveColor;
    const assignActivityColor = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveColor = resolve;
        }),
    );
    const { activities, logRef, renderer } = renderActivities(
      { custom_tasks: [] },
      assignActivityColor,
    );
    let task;

    await act(async () => {
      task = await activities.addCustomTask("Focus");
    });

    expect(task.name).toBe("Focus");
    expect(logRef.current.custom_tasks).toEqual([task]);
    expect(assignActivityColor).toHaveBeenCalledWith("Focus");
    await act(async () => {
      resolveColor("sand");
      await Promise.resolve();
    });
    act(() => renderer.unmount());
  });

  it("restores empty built-in activities and adds slots when selected again", async () => {
    const { activities, logRef, renderer } = renderActivities({
      custom_tasks: [
        {
          id: "sheet:sheet-1",
          sheetId: "sheet-1",
          name: "DSA",
          slots: [],
        },
      ],
    });
    const sheet = { id: "sheet-1", title: "DSA" };

    await act(async () => {
      await activities.addSheetActivity(sheet);
    });

    expect(logRef.current.custom_tasks).toEqual([
      {
        id: "sheet:sheet-1",
        sheetId: "sheet-1",
        name: "DSA",
        slots: [{ start: "", end: "" }],
      },
    ]);

    await act(async () => {
      await activities.addSheetActivity(sheet);
    });
    expect(logRef.current.custom_tasks[0].slots).toEqual([
      { start: "", end: "" },
      { start: "", end: "" },
    ]);

    act(() => renderer.unmount());
  });

  it("adds a sheet activity when color assignment is unavailable", async () => {
    const assignActivityColor = vi.fn().mockResolvedValue(null);
    const { activities, logRef, renderer } = renderActivities(
      { custom_tasks: [] },
      assignActivityColor,
    );
    const sheet = { id: "sheet-2", title: "System Design" };
    let result;

    await act(async () => {
      result = await activities.addSheetActivity(sheet);
    });

    expect(assignActivityColor).toHaveBeenCalledWith("System Design");
    expect(result).toBe(true);
    expect(logRef.current.custom_tasks).toEqual([
      {
        id: "sheet:sheet-2",
        sheetId: "sheet-2",
        name: "System Design",
        slots: [{ start: "", end: "" }],
      },
    ]);
    act(() => renderer.unmount());
  });

  it("adds a built-in sheet immediately without waiting for color assignment", async () => {
    let resolveColor;
    const assignActivityColor = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveColor = resolve;
        }),
    );
    const { activities, logRef, renderer } = renderActivities(
      { custom_tasks: [] },
      assignActivityColor,
    );
    const sheet = { id: "sheet-3", title: "Algorithms" };
    let result;

    await act(async () => {
      result = await activities.addSheetActivity(sheet);
    });

    expect(result).toBe(true);
    expect(logRef.current.custom_tasks).toEqual([
      {
        id: "sheet:sheet-3",
        sheetId: "sheet-3",
        name: "Algorithms",
        slots: [{ start: "", end: "" }],
      },
    ]);
    expect(assignActivityColor).toHaveBeenCalledWith("Algorithms");
    await act(async () => {
      resolveColor("sand");
      await Promise.resolve();
    });
    act(() => renderer.unmount());
  });

  it("removes an activity when its last untouched slot is discarded", async () => {
    const { activities, logRef, renderer } = renderActivities();
    let task;

    await act(async () => {
      task = await activities.addCustomTask("Reading");
    });
    act(() => activities.discardEmptySlot(task.id, 0));

    expect(logRef.current.custom_tasks).toEqual([]);
    act(() => renderer.unmount());
  });
});
