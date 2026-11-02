import { useEffect, useState } from "react";
import { CalendarDays, Clock3, Save } from "lucide-react";
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
    dsa_start: "",
    dsa_end: "",
    dsa_hours: "",
    backend_start: "",
    backend_end: "",
    backend_hours: "",
    height_cm: "",
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

export default function DailyTracker({ user }) {
  const [date, setDate] = useState(() => getLocalDateKey());
  const [log, setLog] = useState(() => emptyLog(getLocalDateKey()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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
                dsa_hours: data.dsa_hours ?? "",
                backend_hours: data.backend_hours ?? "",
                height_cm: data.height_cm ?? "",
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
    setLog((current) => {
      const next = { ...current, [field]: value };
      if (field === "dsa_start" || field === "dsa_end") {
        next.dsa_hours = durationHours(next.dsa_start, next.dsa_end);
      }
      if (field === "backend_start" || field === "backend_end") {
        next.backend_hours = durationHours(next.backend_start, next.backend_end);
      }
      return next;
    });
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
        dsa_start: log.dsa_start || null,
        dsa_end: log.dsa_end || null,
        dsa_hours: log.dsa_hours === "" ? null : Number(log.dsa_hours),
        backend_start: log.backend_start || null,
        backend_end: log.backend_end || null,
        backend_hours:
          log.backend_hours === "" ? null : Number(log.backend_hours),
        height_cm: log.height_cm === "" ? null : Number(log.height_cm),
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
          <h2 id="daily-log-title">Sleep, study, and measurements</h2>
        </div>
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
      </div>

      <div className="daily-grid">
        {field("Sleep", "sleep_time", "time")}
        {field("Wake", "wake_time", "time")}
        {field("Height", "height_cm", "number", "cm")}
      </div>

      <div className="daily-study-grid">
        <div className="daily-study-block">
          <div className="daily-study-title">
            <Clock3 size={15} />
            <span>DSA</span>
          </div>
          <div className="daily-slot-row">
            {field("D slot start", "dsa_start", "time")}
            {field("D slot end", "dsa_end", "time")}
            {field("D hours", "dsa_hours", "number", "hr")}
          </div>
        </div>
        <div className="daily-study-block">
          <div className="daily-study-title">
            <Clock3 size={15} />
            <span>Backend</span>
          </div>
          <div className="daily-slot-row">
            {field("B slot start", "backend_start", "time")}
            {field("B slot end", "backend_end", "time")}
            {field("B hours", "backend_hours", "number", "hr")}
          </div>
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
    </section>
  );
}
