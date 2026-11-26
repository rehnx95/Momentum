import { useCallback } from "react";
import { getSleepPeriods } from "../../../shared/utils/time";

function withSleepPeriods(log, sleepPeriods) {
  const firstPeriod = sleepPeriods[0];
  return {
    ...log,
    sleep_periods: sleepPeriods,
    sleep_time: firstPeriod?.start || "",
    wake_time: firstPeriod?.end || "",
  };
}

export default function useDailyLogActivities(logRef, setLog, assignActivityColor) {
  const updateField = useCallback(
    (field, value) => {
      setLog((current) => ({ ...current, [field]: value }));
    },
    [setLog],
  );

  const updateSlot = useCallback(
    (activity, index, field, value) => {
      setLog((current) => ({
        ...current,
        custom_tasks: current.custom_tasks.map((task) =>
          task.id !== activity
            ? task
            : {
                ...task,
                slots: Array.from(
                  { length: Math.max(task.slots.length, index + 1) },
                  (_, slotIndex) => {
                    const slot = task.slots[slotIndex] || { start: "", end: "" };
                    return slotIndex === index ? { ...slot, [field]: value } : slot;
                  },
                ),
              },
        ),
      }));
    },
    [setLog],
  );

  const updateSleepPeriod = useCallback(
    (periodId, field, value) => {
      setLog((current) => {
        const existingPeriods = getSleepPeriods(current);
        const periods = existingPeriods.some((period) => period.id === periodId)
          ? existingPeriods.map((period) =>
              period.id === periodId ? { ...period, [field]: value } : period,
            )
          : [...existingPeriods, { id: periodId, start: "", end: "" }].map((period) =>
              period.id === periodId ? { ...period, [field]: value } : period,
            );
        return withSleepPeriods(current, periods);
      });
    },
    [setLog],
  );

  const addSleepPeriod = useCallback(() => {
    const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    setLog((current) =>
      withSleepPeriods(current, [...getSleepPeriods(current), { id, start: "", end: "" }]),
    );
  }, [setLog]);

  const removeSleepPeriod = useCallback(
    (periodId) => {
      setLog((current) =>
        withSleepPeriods(
          current,
          getSleepPeriods(current).filter((period) => period.id !== periodId),
        ),
      );
    },
    [setLog],
  );

  const addSlot = useCallback(
    (activity) => {
      setLog((current) => ({
        ...current,
        custom_tasks: current.custom_tasks.map((task) =>
          task.id === activity ? { ...task, slots: [...task.slots, { start: "", end: "" }] } : task,
        ),
      }));
    },
    [setLog],
  );

  const removeSlot = useCallback(
    (activity, index) => {
      setLog((current) => ({
        ...current,
        custom_tasks: current.custom_tasks.flatMap((task) => {
          if (task.id !== activity) return [task];
          const slots = task.slots.filter((_, slotIndex) => slotIndex !== index);
          return slots.length ? [{ ...task, slots }] : [];
        }),
      }));
    },
    [setLog],
  );

  const discardEmptySlot = useCallback(
    (activity, index) => {
      setLog((current) => {
        const task = current.custom_tasks.find((item) => item.id === activity);
        const slot = task?.slots[index];
        if (!slot || String(slot.start || "").trim() || String(slot.end || "").trim()) {
          return current;
        }

        return {
          ...current,
          custom_tasks: current.custom_tasks.flatMap((item) => {
            if (item.id !== activity) return [item];
            const slots = item.slots.filter((_, slotIndex) => slotIndex !== index);
            return slots.length ? [{ ...item, slots }] : [];
          }),
        };
      });
    },
    [setLog],
  );

  const addCustomTask = useCallback(
    async (name) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      if (assignActivityColor) void assignActivityColor(trimmed);
      const task = {
        id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        name: trimmed,
        slots: [{ start: "", end: "" }],
      };
      setLog((current) => ({
        ...current,
        custom_tasks: [...current.custom_tasks, task],
      }));
      return task;
    },
    [assignActivityColor, setLog],
  );

  const addSheetActivity = useCallback(
    async (sheet) => {
      const id = `sheet:${sheet.id}`;
      if (logRef.current.custom_tasks.some((task) => task.id === id)) {
        addSlot(id);
        return true;
      }
      if (assignActivityColor) void assignActivityColor(sheet.title);
      const task = {
        id,
        sheetId: sheet.id,
        name: sheet.title,
        slots: [{ start: "", end: "" }],
      };
      setLog((current) => ({
        ...current,
        custom_tasks: [...current.custom_tasks, task],
      }));
      return true;
    },
    [addSlot, assignActivityColor, logRef, setLog],
  );

  const removeCustomTask = useCallback(
    (taskId) => {
      setLog((current) => ({
        ...current,
        custom_tasks: current.custom_tasks.filter((task) => task.id !== taskId),
      }));
    },
    [setLog],
  );

  const renameCustomTask = useCallback(
    async (taskId, name) => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      if (assignActivityColor) void assignActivityColor(trimmed);
      setLog((current) => ({
        ...current,
        custom_tasks: current.custom_tasks.map((task) =>
          task.id === taskId ? { ...task, name: trimmed } : task,
        ),
      }));
      return true;
    },
    [assignActivityColor, setLog],
  );

  return {
    addCustomTask,
    addSheetActivity,
    addSlot,
    addSleepPeriod,
    discardEmptySlot,
    removeCustomTask,
    removeSlot,
    removeSleepPeriod,
    renameCustomTask,
    updateField,
    updateSleepPeriod,
    updateSlot,
  };
}
