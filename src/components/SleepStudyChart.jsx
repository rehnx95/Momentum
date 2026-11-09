import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatDuration, getSleepMinutes, getStudyMinutes } from "../utils/time";
import "./SleepStudyChart.css";

const DAY_COUNT = 30;
const CHART_WIDTH = 720;
const CHART_HEIGHT = 250;
const PLOT = { left: 38, right: 10, top: 12, bottom: 38 };

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatHours(minutes) {
  return `${(minutes / 60).toFixed(1)}h`;
}

export default function SleepStudyChart({ userId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState(0);

  const loadLogs = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDay = new Date(today);
    firstDay.setDate(firstDay.getDate() - (DAY_COUNT - 1));

    const { data, error: loadError } = await supabase
      .from("daily_logs")
      .select("date, sleep_time, wake_time, custom_tasks")
      .eq("user_id", userId)
      .gte("date", getLocalDateKey(firstDay))
      .lte("date", getLocalDateKey(today))
      .order("date", { ascending: true });

    if (loadError) throw loadError;
    return data || [];
  }, [userId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    loadLogs()
      .then((data) => {
        if (active) setLogs(data);
      })
      .catch((loadError) => {
        if (!active) return;
        console.error("Failed to load sleep and study history:", loadError);
        setError("Could not load sleep and study history.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadLogs, requestId]);

  const days = useMemo(() => {
    const byDate = new Map(logs.map((log) => [log.date, log]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: DAY_COUNT }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (DAY_COUNT - index - 1));
      const dateKey = getLocalDateKey(date);
      const log = byDate.get(dateKey);
      return {
        dateKey,
        label: date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        sleep: log ? getSleepMinutes(log) : 0,
        study: log ? getStudyMinutes(log) : 0,
      };
    });
  }, [logs]);

  const maxHours = Math.max(
    8,
    Math.min(
      24,
      Math.ceil(
        Math.max(...days.flatMap((day) => [day.sleep, day.study])) / 120,
      ) * 2,
    ),
  );
  const plotWidth = CHART_WIDTH - PLOT.left - PLOT.right;
  const plotHeight = CHART_HEIGHT - PLOT.top - PLOT.bottom;
  const groupWidth = plotWidth / DAY_COUNT;
  const barWidth = Math.min(9, groupWidth * 0.4);
  const tickCount = 4;
  const dateLabelIndexes = [0, 7, 14, 21, 29];

  return (
    <section
      className="sleep-study-card surface-card"
      aria-labelledby="sleep-study-heading"
    >
      <header className="sleep-study-heading">
        <div>
          <h2 id="sleep-study-heading">Sleep &amp; study</h2>
          <p>Daily hours over the last 30 days</p>
        </div>
        <div className="sleep-study-legend" aria-hidden="true">
          <span><i className="sleep-study-swatch sleep-swatch" /> Sleep</span>
          <span><i className="sleep-study-swatch study-swatch" /> Study</span>
        </div>
      </header>

      {loading ? (
        <p className="sleep-study-message" role="status">
          Loading sleep and study history…
        </p>
      ) : error ? (
        <div className="sleep-study-message" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setRequestId((current) => current + 1)}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="sleep-study-chart-wrap">
            <svg
              className="sleep-study-chart"
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              role="img"
              aria-label="Grouped bar chart comparing daily sleep and study hours over the last 30 days"
            >
              {Array.from({ length: tickCount + 1 }, (_, index) => {
                const hours = (maxHours / tickCount) * index;
                const y = PLOT.top + plotHeight - (plotHeight * index) / tickCount;
                return (
                  <g key={hours}>
                    <line
                      x1={PLOT.left}
                      x2={CHART_WIDTH - PLOT.right}
                      y1={y}
                      y2={y}
                      className="sleep-study-gridline"
                    />
                    <text x={PLOT.left - 7} y={y + 3} textAnchor="end">
                      {Number.isInteger(hours) ? hours : hours.toFixed(1)}h
                    </text>
                  </g>
                );
              })}

              {days.map((day, index) => {
                const center = PLOT.left + groupWidth * (index + 0.5);
                const sleepHeight = (day.sleep / 60 / maxHours) * plotHeight;
                const studyHeight = (day.study / 60 / maxHours) * plotHeight;
                const x = center - barWidth;
                const sleepY = PLOT.top + plotHeight - sleepHeight;
                const studyY = PLOT.top + plotHeight - studyHeight;
                return (
                  <g key={day.dateKey}>
                    <rect
                      x={x}
                      y={sleepY}
                      width={barWidth - 1}
                      height={sleepHeight}
                      className="sleep-study-bar sleep-bar"
                    >
                      <title>{`${day.label}: ${formatHours(day.sleep)} sleep`}</title>
                    </rect>
                    <rect
                      x={center + 1}
                      y={studyY}
                      width={barWidth - 1}
                      height={studyHeight}
                      className="sleep-study-bar study-bar"
                    >
                      <title>{`${day.label}: ${formatHours(day.study)} study`}</title>
                    </rect>
                    {dateLabelIndexes.includes(index) && (
                      <text
                        x={center}
                        y={CHART_HEIGHT - 12}
                        textAnchor="middle"
                      >
                        {day.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
          <p className="sleep-study-footnote">
            Days without a saved log appear as 0h.
          </p>
          <ul className="sr-only">
            {days.map((day) => (
              <li key={day.dateKey}>
                {day.dateKey}: {formatDuration(day.sleep)} sleep,{" "}
                {formatDuration(day.study)} study
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
