import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { supabase } from "../lib/supabase";

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function emptyLog(date) {
  return {
    date,
    sleep_time: "",
    wake_time: "",
    dsa_slots: [],
    backend_slots: [],
    custom_tasks: [],
  };
}

function durationHours(start, end) {
  if (!start || !end) return "";
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  let minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  if (minutes < 0) minutes += 24 * 60;
  return (minutes / 60).toFixed(2).replace(/\.?0+$/, "");
}

function formatTime(value) {
  return value ? String(value).slice(0, 5) : "";
}

function normalizeSlots(slots) {
  if (!Array.isArray(slots)) return [];
  return slots.map((slot) => ({
    start: formatTime(slot.start),
    end: formatTime(slot.end),
  }));
}

function totalSlots(slots) {
  return slots.reduce((total, slot) => {
    const hours = Number(durationHours(slot.start, slot.end));
    return total + (Number.isFinite(hours) ? hours : 0);
  }, 0);
}

function formatHours(hours) {
  return hours % 1 === 0 ? String(hours) : hours.toFixed(2).replace(/0$/, "");
}

function mergeTaskTemplates(savedTasks, templates) {
  const savedMap = new Map(
    (Array.isArray(savedTasks) ? savedTasks : []).map((task) => [task.id, task]),
  );
  return templates.map((template) => {
    const saved = savedMap.get(template.id);
    return {
      id: template.id,
      name: template.name,
      slots: normalizeSlots(saved?.slots),
    };
  });
}

function createTaskId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function DailyTracker({ user, askConfirmation }) {
  const [date, setDate] = useState(() => getLocalDateKey());
  const [log, setLog] = useState(() => emptyLog(getLocalDateKey()));
  const logRef = useRef(log);
  logRef.current = log;
  const savedLogSnapshotRef = useRef(null);
  const [savedLogSnapshot, setSavedLogSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [viewMode, setViewMode] = useState("daily");
  const [allLogs, setAllLogs] = useState([]);
  const [allLogsLoading, setAllLogsLoading] = useState(false);
  const [dailyLogVisible, setDailyLogVisible] = useState(true);
  const [dsaEnabled, setDsaEnabled] = useState(true);
  const [backendEnabled, setBackendEnabled] = useState(true);
  const [profileCustomTasks, setProfileCustomTasks] = useState([]);
  const [newTaskName, setNewTaskName] = useState("");
  const [showNewTask, setShowNewTask] = useState(false);
  const [trackMenuOpen, setTrackMenuOpen] = useState(false);
  const trackMenuRef = useRef(null);

  useEffect(() => {
    if (!trackMenuOpen) return undefined;
    const onDown = (event) => {
      if (!trackMenuRef.current?.contains(event.target)) setTrackMenuOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setTrackMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [trackMenuOpen]);

  useEffect(() => {
    let active = true;
    supabase
      .from("profiles")
      .select("daily_log_visible, dsa_enabled, backend_enabled, custom_tasks")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) throw error;
        if (data) {
          setDailyLogVisible(data.daily_log_visible !== false);
          setDsaEnabled(data.dsa_enabled !== false);
          setBackendEnabled(data.backend_enabled !== false);
          setProfileCustomTasks(
            Array.isArray(data.custom_tasks)
              ? data.custom_tasks.map((task) => ({ id: task.id, name: task.name }))
              : [],
          );
        }
      })
      .catch((error) => console.error("Failed to load daily log preferences:", error));
    return () => {
      active = false;
    };
  }, [user.id]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMessage("");

    supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) throw error;
        const nextLog = data
          ? {
              ...emptyLog(date),
              ...data,
              sleep_time: formatTime(data.sleep_time),
              wake_time: formatTime(data.wake_time),
              dsa_slots: normalizeSlots(data.dsa_slots),
              backend_slots: normalizeSlots(data.backend_slots),
              custom_tasks: mergeTaskTemplates(data.custom_tasks, profileCustomTasks),
            }
          : {
              ...emptyLog(date),
              custom_tasks: profileCustomTasks.map((task) => ({
                id: task.id,
                name: task.name,
                slots: [],
              })),
            };
        if (
          savedLogSnapshotRef.current !== null &&
          JSON.stringify(logRef.current) !== savedLogSnapshotRef.current
        ) {
          return;
        }
        const snapshot = JSON.stringify(nextLog);
        savedLogSnapshotRef.current = snapshot;
        setSavedLogSnapshot(snapshot);
        setLog(nextLog);
      })
      .catch((error) => {
        if (!active) return;
        console.error("Failed to load daily log:", error);
        setMessage("Could not load this daily log.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user.id, date, profileCustomTasks]);

  const updateField = (field, value) => {
    setLog((current) => ({ ...current, [field]: value }));
  };

  const updateSlot = (track, index, fieldName, value) => {
    setLog((current) => ({
      ...current,
      [`${track}_slots`]: current[`${track}_slots`].map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, [fieldName]: value } : slot,
      ),
    }));
  };

  const addSlot = (track) => {
    setLog((current) => ({
      ...current,
      [`${track}_slots`]: [
        ...current[`${track}_slots`],
        { start: "", end: "" },
      ],
    }));
  };

  const removeSlot = (track, index) => {
    setLog((current) => ({
      ...current,
      [`${track}_slots`]: current[`${track}_slots`].filter(
        (_, slotIndex) => slotIndex !== index,
      ),
    }));
  };

  const savePreferences = async (changes) => {
    const { error } = await supabase
      .from("profiles")
      .update(changes)
      .eq("id", user.id);
    if (error) throw error;
  };

  const toggleVisibility = async () => {
    const nextVisible = !dailyLogVisible;
    setDailyLogVisible(nextVisible);
    try {
      await savePreferences({ daily_log_visible: nextVisible });
    } catch (error) {
      console.error("Failed to save daily log visibility:", error);
      setDailyLogVisible(!nextVisible);
    }
  };

  const toggleBuiltin = async (track) => {
    if (track === "dsa") {
      const nextEnabled = !dsaEnabled;
      setDsaEnabled(nextEnabled);
      await savePreferences({ dsa_enabled: nextEnabled }).catch((error) => {
        console.error("Failed to save DSA preference:", error);
        setDsaEnabled(!nextEnabled);
      });
    } else {
      const nextEnabled = !backendEnabled;
      setBackendEnabled(nextEnabled);
      await savePreferences({ backend_enabled: nextEnabled }).catch((error) => {
        console.error("Failed to save Backend preference:", error);
        setBackendEnabled(!nextEnabled);
      });
    }
  };

  const addCustomTask = () => {
    const name = newTaskName.trim();
    if (!name) return;
    const id = createTaskId();
    setLog((current) => ({
      ...current,
      custom_tasks: [
        ...current.custom_tasks,
        { id, name, slots: [] },
      ],
    }));
    const nextTemplates = [...profileCustomTasks, { id, name }];
    setProfileCustomTasks(nextTemplates);
    savePreferences({ custom_tasks: nextTemplates }).catch((error) =>
      console.error("Failed to save custom task preference:", error),
    );
    setNewTaskName("");
  };

  const removeCustomTask = (taskId) => {
    setLog((current) => ({
      ...current,
      custom_tasks: current.custom_tasks.filter((task) => task.id !== taskId),
    }));
    const nextTemplates = profileCustomTasks.filter((task) => task.id !== taskId);
    setProfileCustomTasks(nextTemplates);
    savePreferences({ custom_tasks: nextTemplates }).catch((error) =>
      console.error("Failed to save custom task preference:", error),
    );
  };

  const confirmRemoveTrack = async (track) => {
    const confirmed = await askConfirmation(
      `Remove the ${track === "dsa" ? "DSA" : "Backend"} track? You can add it again later.`,
      "Remove this track?",
    );
    if (confirmed) await toggleBuiltin(track);
  };

  const confirmRemoveCustomTask = async (task) => {
    const confirmed = await askConfirmation(
      `Remove "${task.name}" and its saved slots from this log?`,
      "Remove custom track?",
    );
    if (confirmed) removeCustomTask(task.id);
  };

  const updateCustomTask = (taskId, update) => {
    setLog((current) => ({
      ...current,
      custom_tasks: current.custom_tasks.map((task) =>
        task.id === taskId ? update(task) : task,
      ),
    }));
  };

  const saveCustomTaskName = (taskId, name) => {
    const nextName = name.trim();
    if (!nextName) return;
    const nextTemplates = profileCustomTasks.map((task) =>
      task.id === taskId ? { ...task, name: nextName } : task,
    );
    setProfileCustomTasks(nextTemplates);
    savePreferences({ custom_tasks: nextTemplates }).catch((error) =>
      console.error("Failed to save custom task name:", error),
    );
  };

  useEffect(() => {
    if (viewMode !== "full" || !user?.id) return undefined;
    let active = true;
    setAllLogsLoading(true);
    supabase
      .from("daily_logs")
      .select("date, sleep_time, wake_time, dsa_slots, backend_slots, custom_tasks, dsa_hours, backend_hours, updated_at")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) throw error;
        setAllLogs(data || []);
      })
      .catch((error) => {
        if (!active) return;
        console.error("Failed to load full daily log:", error);
        setMessage("Could not load the full log.");
      })
      .finally(() => {
        if (active) setAllLogsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user.id, viewMode]);

  const isDirty =
    savedLogSnapshot !== null && JSON.stringify(log) !== savedLogSnapshot;

  const changeDate = async (selectedDate) => {
    if (saving || !selectedDate || selectedDate === date) return !saving;
    if (isDirty) {
      const confirmed = await askConfirmation(
        "You have unsaved changes for this day. Discard them and change the date?",
        "Discard unsaved changes?",
      );
      if (!confirmed) return false;
    }
    savedLogSnapshotRef.current = null;
    setSavedLogSnapshot(null);
    setLog(emptyLog(selectedDate));
    setDate(selectedDate);
    setMessage("");
    return true;
  };

  const openDailyDate = async (selectedDate) => {
    if (await changeDate(selectedDate)) setViewMode("daily");
  };

  const formatSlots = (slots) => {
    const normalized = normalizeSlots(slots);
    const entries = normalized
      .filter((slot) => slot.start || slot.end)
      .map((slot) => `${slot.start || "?"}-${slot.end || "?"}`);
    return entries.length ? entries.join(", ") : "-";
  };

  const saveLog = async () => {
    setSaving(true);
    setMessage("");
    const snapshot = JSON.stringify(log);
    try {
      const payload = {
        user_id: user.id,
        date,
        sleep_time: log.sleep_time || null,
        wake_time: log.wake_time || null,
        dsa_slots: log.dsa_slots,
        backend_slots: log.backend_slots,
        custom_tasks: log.custom_tasks,
        dsa_hours: totalSlots(log.dsa_slots) || null,
        backend_hours: totalSlots(log.backend_slots) || null,
      };
      const { error } = await supabase
        .from("daily_logs")
        .upsert(payload, { onConflict: "user_id,date" });
      if (error) throw error;
      savedLogSnapshotRef.current = snapshot;
      setSavedLogSnapshot(snapshot);
      setMessage("Daily log saved.");
    } catch (error) {
      console.error("Failed to save daily log:", error);
      setMessage("Could not save this daily log.");
    } finally {
      setSaving(false);
    }
  };

  const field = (label, name, type = "number", suffix = "") => (
    <label className="daily-field">
      <span>{label}</span>
      <div className="daily-input-wrap">
        <input
          type={type}
          step={type === "number" ? "0.25" : undefined}
          min={type === "number" ? "0" : undefined}
          value={log[name] ?? ""}
          onChange={(event) => updateField(name, event.target.value)}
          disabled={loading}
        />
        {suffix && <span className="daily-suffix">{suffix}</span>}
      </div>
    </label>
  );

  const shiftDate = (delta) => {
    const [year, month, day] = date.split("-").map(Number);
    const key = getLocalDateKey(new Date(year, month - 1, day + delta));
    if (key <= getLocalDateKey()) changeDate(key);
  };
  const totalStudied =
    totalSlots(log.dsa_slots) +
    totalSlots(log.backend_slots) +
    log.custom_tasks.reduce(
      (sum, task) => sum + totalSlots(task.slots || []),
      0,
    );
  const submitNewTask = () => {
    if (!newTaskName.trim()) return;
    addCustomTask();
    setShowNewTask(false);
  };
  const groupedLogs = allLogs.reduce((groups, row) => {
    const monthKey = row.date.slice(0, 7);
    const existing = groups[groups.length - 1];
    if (existing?.key === monthKey) existing.rows.push(row);
    else {
      groups.push({
        key: monthKey,
        label: new Date(`${row.date}T00:00:00`).toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        }),
        rows: [row],
      });
    }
    return groups;
  }, []);

  return (
    <section className="daily-tracker surface-card" aria-labelledby="daily-log-title">
      <div className="daily-toolbar">
        <div className="daily-toolbar-left">
          <h2 id="daily-log-title" className="page-title">
            {viewMode === "daily" ? "Daily log" : "Full log"}
          </h2>
          {viewMode === "daily" && (
            <div className="daily-date-nav">
              <button
                type="button"
                aria-label="Previous day"
                onClick={() => shiftDate(-1)}
              >
                <ChevronLeft size={16} />
              </button>
              <label className="daily-date">
                <span className="sr-only">Log date</span>
                <input
                  type="date"
                  value={date}
                  max={getLocalDateKey()}
                  onChange={(event) => changeDate(event.target.value)}
                />
              </label>
              <button
                type="button"
                aria-label="Next day"
                disabled={date >= getLocalDateKey()}
                onClick={() => shiftDate(1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
        <div className="daily-toolbar-right">
          <div className="daily-view-switch" aria-label="Daily log view">
            <button
              type="button"
              className={viewMode === "daily" ? "active" : ""}
              aria-pressed={viewMode === "daily"}
              onClick={() => setViewMode("daily")}
            >
              Day
            </button>
            <button
              type="button"
              className={viewMode === "full" ? "active" : ""}
              aria-pressed={viewMode === "full"}
              onClick={() => setViewMode("full")}
            >
              Full log
            </button>
          </div>
          {viewMode === "daily" && (
            <div className="daily-track-menu-wrap" ref={trackMenuRef}>
              <button
                type="button"
                className="daily-add-track"
                aria-haspopup="menu"
                aria-expanded={trackMenuOpen}
                onClick={() => setTrackMenuOpen((visible) => !visible)}
              >
                <Plus size={14} /> New track
              </button>
              {trackMenuOpen && (
                <div className="daily-track-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowNewTask(true);
                      setTrackMenuOpen(false);
                    }}
                  >
                    Custom
                  </button>
                  {!dsaEnabled && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setTrackMenuOpen(false);
                        toggleBuiltin("dsa");
                      }}
                    >
                      DSA
                    </button>
                  )}
                  {!backendEnabled && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setTrackMenuOpen(false);
                        toggleBuiltin("backend");
                      }}
                    >
                      Backend
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!dailyLogVisible ? (
        <div className="daily-full-empty">
          Daily log is hidden.{" "}
          <button type="button" className="slot-add" onClick={toggleVisibility}>
            Show section
          </button>
        </div>
      ) : viewMode === "daily" ? (
        <>
      <div className="daily-basics">
        {field("Sleep", "sleep_time", "time")}
        {field("Wake", "wake_time", "time")}
        <div className="daily-total">
          <span>Total studied</span>
          <strong>{formatHours(totalStudied)} hr</strong>
        </div>
      </div>

      {showNewTask && (
        <div className="daily-new-task-row daily-new-inline">
        <label htmlFor="new-daily-task" className="sr-only">Custom task name</label>
          <input
            id="new-daily-task"
            type="text"
            autoFocus
            value={newTaskName}
            onChange={(event) => setNewTaskName(event.target.value)}
            placeholder="e.g. System Design"
            onKeyDown={(event) => {
              if (event.key === "Enter") submitNewTask();
              if (event.key === "Escape") setShowNewTask(false);
            }}
          />
          <button
            type="button"
            onClick={submitNewTask}
            disabled={!newTaskName.trim()}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setNewTaskName("");
              setShowNewTask(false);
            }}
          >
            Cancel
          </button>
        </div>
      )}

      <div className="daily-study-grid">
        {dsaEnabled && (
        <div className="daily-study-block">
          <div className="daily-study-title">
            <Clock3 size={15} />
            <span>DSA</span>
            <strong>{formatHours(totalSlots(log.dsa_slots))} hr</strong>
            <button type="button" className="track-delete" aria-label="Remove DSA track" onClick={() => confirmRemoveTrack("dsa")}><Trash2 size={14} /></button>
          </div>
          <div className="daily-slot-list">
            {log.dsa_slots.map((slot, index) => (
              <div className="daily-slot-row" key={`dsa-${index}`}>
                <label>
                  <span>From</span>
                  <input type="time" value={slot.start} disabled={loading} onChange={(event) => updateSlot("dsa", index, "start", event.target.value)} />
                </label>
                <label>
                  <span>To</span>
                  <input type="time" value={slot.end} disabled={loading} onChange={(event) => updateSlot("dsa", index, "end", event.target.value)} />
                </label>
                <span className="slot-hours">{formatHours(Number(durationHours(slot.start, slot.end)) || 0)} hr</span>
                <button type="button" className="slot-remove" aria-label={`Remove DSA slot ${index + 1}`} onClick={() => removeSlot("dsa", index)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {log.dsa_slots.length === 0 && <p className="slot-empty">No DSA slots added.</p>}
          </div>
          <button type="button" className="slot-add" onClick={() => addSlot("dsa")}><Plus size={14} /> Add DSA slot</button>
        </div>
        )}
        {backendEnabled && (
        <div className="daily-study-block">
          <div className="daily-study-title">
            <Clock3 size={15} />
            <span>Backend</span>
            <strong>{formatHours(totalSlots(log.backend_slots))} hr</strong>
            <button type="button" className="track-delete" aria-label="Remove Backend track" onClick={() => confirmRemoveTrack("backend")}><Trash2 size={14} /></button>
          </div>
          <div className="daily-slot-list">
            {log.backend_slots.map((slot, index) => (
              <div className="daily-slot-row" key={`backend-${index}`}>
                <label>
                  <span>From</span>
                  <input type="time" value={slot.start} disabled={loading} onChange={(event) => updateSlot("backend", index, "start", event.target.value)} />
                </label>
                <label>
                  <span>To</span>
                  <input type="time" value={slot.end} disabled={loading} onChange={(event) => updateSlot("backend", index, "end", event.target.value)} />
                </label>
                <span className="slot-hours">{formatHours(Number(durationHours(slot.start, slot.end)) || 0)} hr</span>
                <button type="button" className="slot-remove" aria-label={`Remove Backend slot ${index + 1}`} onClick={() => removeSlot("backend", index)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {log.backend_slots.length === 0 && <p className="slot-empty">No Backend slots added.</p>}
          </div>
          <button type="button" className="slot-add" onClick={() => addSlot("backend")}><Plus size={14} /> Add Backend slot</button>
        </div>
        )}
        {log.custom_tasks.map((task) => (
          <div className="daily-study-block custom-task-block" key={task.id}>
            <div className="daily-study-title">
              <Clock3 size={15} />
              <input
                className="custom-task-name"
                aria-label="Custom task name"
                value={task.name}
                onChange={(event) => updateCustomTask(task.id, (current) => ({ ...current, name: event.target.value }))}
                onBlur={(event) => saveCustomTaskName(task.id, event.target.value)}
              />
              <strong>{formatHours(totalSlots(task.slots || []))} hr</strong>
              <button type="button" className="track-delete" aria-label={`Remove ${task.name}`} onClick={() => confirmRemoveCustomTask(task)}>
                <Trash2 size={14} />
              </button>
            </div>
            <div className="daily-slot-list">
              {(task.slots || []).map((slot, index) => (
                <div className="daily-slot-row" key={`${task.id}-${index}`}>
                  <label><span>From</span><input type="time" value={slot.start} onChange={(event) => updateCustomTask(task.id, (current) => ({ ...current, slots: (current.slots || []).map((item, itemIndex) => itemIndex === index ? { ...item, start: event.target.value } : item) }))} /></label>
                  <label><span>To</span><input type="time" value={slot.end} onChange={(event) => updateCustomTask(task.id, (current) => ({ ...current, slots: (current.slots || []).map((item, itemIndex) => itemIndex === index ? { ...item, end: event.target.value } : item) }))} /></label>
                  <span className="slot-hours">{formatHours(Number(durationHours(slot.start, slot.end)) || 0)} hr</span>
                  <button type="button" className="slot-remove" aria-label={`Remove ${task.name} slot`} onClick={() => updateCustomTask(task.id, (current) => ({ ...current, slots: (current.slots || []).filter((_, slotIndex) => slotIndex !== index) }))}><Trash2 size={14} /></button>
                </div>
              ))}
              {(task.slots || []).length === 0 && (
                <p className="slot-empty">No slots added.</p>
              )}
            </div>
            <button type="button" className="slot-add" onClick={() => updateCustomTask(task.id, (current) => ({ ...current, slots: [...(current.slots || []), { start: "", end: "" }] }))}><Plus size={14} /> Add slot</button>
          </div>
        ))}
      </div>
      <div className="daily-tracker-footer">
        <p className={message ? "daily-message" : "daily-message is-empty"} role="status">
          {message || "\u00a0"}
        </p>
        <button type="button" onClick={saveLog} disabled={saving || loading || !isDirty}>
          <Save size={15} />
          {saving
            ? "Saving..."
            : isDirty
              ? "Save daily log"
              : message === "Daily log saved."
                ? "Saved ✓"
                : "No changes"}
        </button>
      </div>
        </>
      ) : (
        <div className="daily-full-log">
          {allLogsLoading ? (
            <p className="daily-full-empty">Loading full log...</p>
          ) : allLogs.length === 0 ? (
            <p className="daily-full-empty">No saved daily logs yet.</p>
          ) : (
            <div className="daily-log-months">
              {groupedLogs.map((month) => (
                <section className="daily-log-month" key={month.key}>
                  <h3 className="daily-log-month-title">{month.label}</h3>
                  <div className="daily-log-cards">
                    {month.rows.map((row) => {
                      const tasks = [];
                      const addTask = (name, slots, savedHours) => {
                        const slotText = formatSlots(slots);
                        const hours = Number(savedHours) || totalSlots(normalizeSlots(slots));
                        if (slotText !== "-" || hours > 0) {
                          tasks.push({ name, slotText, hours });
                        }
                      };
                      if (dsaEnabled) {
                        addTask("DSA", row.dsa_slots, row.dsa_hours);
                      }
                      if (backendEnabled) {
                        addTask("Backend", row.backend_slots, row.backend_hours);
                      }
                      (Array.isArray(row.custom_tasks) ? row.custom_tasks : []).forEach(
                        (task) => addTask(task.name, task.slots),
                      );
                      const hasSleep = Boolean(row.sleep_time || row.wake_time);
                      const sleepHours =
                        row.sleep_time && row.wake_time
                          ? Number(durationHours(row.sleep_time, row.wake_time))
                          : 0;
                      const roundedSleepHours =
                        Math.round(sleepHours * 4) / 4;

                      return (
                        <article className="daily-log-card" key={row.date}>
                          <button
                            type="button"
                            className="daily-log-card-date"
                            onClick={() => openDailyDate(row.date)}
                          >
                            <CalendarDays size={16} />
                            <span>
                              {new Date(`${row.date}T00:00:00`).toLocaleDateString(
                                undefined,
                                {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </button>

                          {hasSleep && (
                            <div className="daily-log-basics">
                              <div>
                                <span>Sleep</span>
                                <strong>{formatTime(row.sleep_time) || "-"}</strong>
                              </div>
                              <div>
                                <span>Wake</span>
                                <strong>{formatTime(row.wake_time) || "-"}</strong>
                              </div>
                              {sleepHours > 0 && (
                                <div className="daily-log-sleep-duration">
                                  <span>Sleep duration</span>
                                  <strong>{formatHours(roundedSleepHours)} hr</strong>
                                </div>
                              )}
                            </div>
                          )}

                          {tasks.length ? (
                            <div className="daily-log-task-grid">
                              {tasks.map((task) => (
                                <div className="daily-log-task" key={task.name}>
                                  <div>
                                    <span>{task.name}</span>
                                    <strong>
                                      {task.hours ? `${formatHours(task.hours)} hr` : "0 hr"}
                                    </strong>
                                  </div>
                                  <p>{task.slotText}</p>
                                </div>
                              ))}
                            </div>
                          ) : !hasSleep ? (
                            <p className="daily-log-nothing">Nothing logged</p>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
