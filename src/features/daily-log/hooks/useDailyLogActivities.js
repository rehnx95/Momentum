import { useCallback } from "react";

export default function useDailyLogActivities(logRef, setLog) {
  const updateField = useCallback((field, value) => {
    setLog((current) => ({ ...current, [field]: value }));
  }, [setLog]);

  const updateSlot = useCallback((activity, index, field, value) => {
    setLog((current) => ({
      ...current,
      custom_tasks: current.custom_tasks.map((task) =>
        task.id === activity
          ? {
              ...task,
              slots: task.slots.map((slot, slotIndex) =>
                slotIndex === index
                  ? { ...slot, [field]: value, endDayOffset: 0 }
                  : slot,
              ),
            }
          : task,
      ),
    }));
  }, [setLog]);

  const addSlot = useCallback((activity) => {
    setLog((current) => ({
      ...current,
      custom_tasks: current.custom_tasks.map((task) =>
        task.id === activity
          ? { ...task, slots: [...task.slots, { start: "", end: "" }] }
          : task,
      ),
    }));
  }, [setLog]);

  const removeSlot = useCallback((activity, index) => {
    setLog((current) => ({
      ...current,
      custom_tasks: current.custom_tasks.map((task) =>
        task.id === activity
          ? { ...task, slots: task.slots.filter((_, i) => i !== index) }
          : task,
      ),
    }));
  }, [setLog]);

  const addCustomTask = useCallback(async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const task = {
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      name: trimmed,
      slots: [],
    };
    setLog((current) => ({
      ...current,
      custom_tasks: [...current.custom_tasks, task],
    }));
    return task;
  }, [setLog]);

  const addSheetActivity = useCallback(async (sheet) => {
    const id = `sheet:${sheet.id}`;
    if (logRef.current.custom_tasks.some((task) => task.id === id)) return true;
    const task = { id, sheetId: sheet.id, name: sheet.title, slots: [] };
    setLog((current) => ({
      ...current,
      custom_tasks: [...current.custom_tasks, task],
    }));
    return true;
  }, [logRef, setLog]);

  const removeCustomTask = useCallback((taskId) => {
    setLog((current) => ({
      ...current,
      custom_tasks: current.custom_tasks.filter((task) => task.id !== taskId),
    }));
  }, [setLog]);

  const renameCustomTask = useCallback((taskId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLog((current) => ({
      ...current,
      custom_tasks: current.custom_tasks.map((task) =>
        task.id === taskId ? { ...task, name: trimmed } : task,
      ),
    }));
  }, [setLog]);

  return {
    addCustomTask,
    addSheetActivity,
    addSlot,
    removeCustomTask,
    removeSlot,
    renameCustomTask,
    updateField,
    updateSlot,
  };
}
