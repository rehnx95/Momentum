import React, { useState } from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it } from "vitest";
import useDailyLogActivities from "./useDailyLogActivities";

function renderActivities(initialLog = { custom_tasks: [] }) {
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
    activities = useDailyLogActivities(logRef, setLog);
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
