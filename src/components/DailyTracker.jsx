import { useEffect, useState } from "react";
import { CalendarDays, Clock3, Plus, Save, Trash2 } from "lucide-react";
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

function normalizeSlots(slots) {
  if (!Array.isArray(slots)) return [];
  return slots.map((slot) => ({
    start: slot.start || "",
    end: slot.end || "",
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

export default function DailyTracker({ user }) {
  const [date, setDate] = useState(() => getLocalDateKey());
  const [log, setLog] = useState(() => emptyLog(getLocalDateKey()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [viewMode, setViewMode] = useState("daily");
  const [allLogs, setAllLogs] = useState([]);
  const [allLogsLoading, setAllLogsLoading] = useState(false);

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
        setLog(
          data
            ? {
                ...emptyLog(date),
                ...data,
                dsa_slots: normalizeSlots(data.dsa_slots),
                backend_slots: normalizeSlots(data.backend_slots),
              }
            : emptyLog(date),
        );
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
  }, [user.id, date]);

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

  useEffect(() => {
    if (viewMode !== "full" || !user?.id) return undefined;
    let active = true;
    setAllLogsLoading(true);
    supabase
      .from("daily_logs")
      .select("date, sleep_time, wake_time, dsa_slots, backend_slots, dsa_hours, backend_hours, updated_at")
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

  const openDailyDate = (selectedDate) => {
    setDate(selectedDate);
    setViewMode("daily");
  };

  const formatSlots = (slots) => {
    const normalized = normalizeSlots(slots);
    if (!normalized.length) return "-";
    return normalized
      .filter((slot) => slot.start || slot.end)
      .map((slot) => `${slot.start || "?"}-${slot.end || "?"}`)
      .join(", ");
  };

  const saveLog = async () => {
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        user_id: user.id,
        date,
        sleep_time: log.sleep_time || null,
        wake_time: log.wake_time || null,
        dsa_slots: log.dsa_slots,
        backend_slots: log.backend_slots,
        dsa_hours: totalSlots(log.dsa_slots) || null,
        backend_hours: totalSlots(log.backend_slots) || null,
      };
      const { error } = await supabase
        .from("daily_logs")
        .upsert(payload, { onConflict: "user_id,date" });
      if (error) throw error;
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

  return (
    <section className="daily-tracker surface-card" aria-labelledby="daily-log-title">
      <div className="daily-tracker-header">
        <div>
          <p className="daily-eyebrow">Daily log</p>
          <h2 id="daily-log-title">
            {viewMode === "daily" ? "Sleep and study slots" : "Full study log"}
          </h2>
        </div>
        <div className="daily-view-actions">
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
            <label className="daily-date">
              <CalendarDays size={16} />
              <span className="sr-only">Log date</span>
              <input
                type="date"
                value={date}
                max={getLocalDateKey()}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
          )}
        </div>
      </div>

      {viewMode === "daily" ? (
        <>
      <div className="daily-grid">
        {field("Sleep", "sleep_time", "time")}
        {field("Wake", "wake_time", "time")}
      </div>

      <div className="daily-study-grid">
        <div className="daily-study-block">
          <div className="daily-study-title">
            <Clock3 size={15} />
            <span>DSA</span>
            <strong>{formatHours(totalSlots(log.dsa_slots))} hr</strong>
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
        <div className="daily-study-block">
          <div className="daily-study-title">
            <Clock3 size={15} />
            <span>Backend</span>
            <strong>{formatHours(totalSlots(log.backend_slots))} hr</strong>
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
      </div>
      <div className="daily-tracker-footer">
        <p className={message ? "daily-message" : "daily-message is-empty"} role="status">
          {message || "\u00a0"}
        </p>
        <button type="button" onClick={saveLog} disabled={saving || loading}>
          <Save size={15} />
          {saving ? "Saving..." : "Save daily log"}
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
            <div className="daily-log-table-wrap">
              <table className="daily-log-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Sleep</th>
                    <th>Wake</th>
                    <th>DSA slots</th>
                    <th>DSA hours</th>
                    <th>Backend slots</th>
                    <th>Backend hours</th>
                  </tr>
                </thead>
                <tbody>
                  {allLogs.map((row) => (
                    <tr key={row.date}>
                      <td>
                        <button type="button" className="daily-log-date-link" onClick={() => openDailyDate(row.date)}>
                          {new Date(`${row.date}T00:00:00`).toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </button>
                      </td>
                      <td>{row.sleep_time || "-"}</td>
                      <td>{row.wake_time || "-"}</td>
                      <td className="daily-log-slots">{formatSlots(row.dsa_slots)}</td>
                      <td>{row.dsa_hours == null ? "-" : `${Number(row.dsa_hours)} hr`}</td>
                      <td className="daily-log-slots">{formatSlots(row.backend_slots)}</td>
                      <td>{row.backend_hours == null ? "-" : `${Number(row.backend_hours)} hr`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
