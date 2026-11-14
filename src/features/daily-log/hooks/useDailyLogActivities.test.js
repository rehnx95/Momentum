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

  it("creates sheet activities with blank slots and can fill a legacy missing slot", async () => {
    const { activities, logRef, renderer } = renderActivities({
      custom_tasks: [{ id: "legacy", name: "Project", slots: [] }],
    });

    await act(async () => {
      await activities.addSheetActivity({ id: "sheet-1", title: "DSA" });
    });
    act(() => activities.updateSlot("legacy", 0, "start", "09:00"));

    expect(logRef.current.custom_tasks).toEqual([
      {
        id: "legacy",
        name: "Project",
        slots: [{ start: "09:00", end: "", endDayOffset: 0 }],
      },
      { id: "sheet:sheet-1", sheetId: "sheet-1", name: "DSA", slots: [{ start: "", end: "" }] },
    ]);
    act(() => renderer.unmount());
  });

  it("discards an untouched slot without deleting its activity", async () => {
    const { activities, logRef, renderer } = renderActivities();
    let task;

    await act(async () => {
      task = await activities.addCustomTask("Reading");
    });
    act(() => activities.discardEmptySlot(task.id, 0));

    expect(logRef.current.custom_tasks).toEqual([{ ...task, slots: [] }]);
    act(() => renderer.unmount());
  });
});
