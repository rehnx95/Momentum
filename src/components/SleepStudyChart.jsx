import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatDuration, getSleepMinutes, getStudyMinutes } from "../utils/time";
import "./SleepStudyChart.css";

const DAY_COUNT = 30;
const DEFAULT_CHART_WIDTH = 720;
const CHART_HEIGHT = 220;
const PLOT = { left: 42, right: 12, top: 14, bottom: 30 };
const DATE_LABEL_INDEXES = [0, 7, 14, 21, 29];
const CHARTS = [
  { title: "Sleep hours", series: ["sleep"] },
  { title: "Study hours", series: ["study"] },
  { title: "Sleep + study", series: ["sleep", "study"] },
];

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatHours(minutes) {
  return `${(minutes / 60).toFixed(1)}h`;
}

function SleepStudyGraph({ days, title, series }) {
  const chartWrapRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(DEFAULT_CHART_WIDTH);
  useEffect(() => {
    const element = chartWrapRef.current;
    if (!element) return undefined;

    const updateWidth = () => {
      setChartWidth(element.clientWidth || DEFAULT_CHART_WIDTH);
    };
    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const plotWidth = chartWidth - PLOT.left - PLOT.right;
  const plotHeight = CHART_HEIGHT - PLOT.top - PLOT.bottom;
  const maxMinutes = Math.max(
    0,
    ...days.flatMap((day) => series.map((key) => day[key])),
  );
  const maxHours = Math.max(8, Math.ceil(maxMinutes / 120) * 2);
  const yFor = (minutes) =>
    PLOT.top + plotHeight - (minutes / 60 / maxHours) * plotHeight;
  const xFor = (index) =>
    PLOT.left + (plotWidth * index) / Math.max(1, days.length - 1);
  const ticks = [0, maxHours / 2, maxHours];

  return (
    <section className="sleep-study-graph" aria-label={title}>
      <header className="sleep-study-graph-heading">
        <h3>{title}</h3>
        <div className="sleep-study-legend" aria-hidden="true">
          {series.map((key) => (
            <span key={key}>
              <i className={`sleep-study-swatch ${key}-swatch`} />
              {key === "sleep" ? "Sleep" : "Study"}
            </span>
          ))}
        </div>
      </header>
      <div className="sleep-study-chart-wrap" ref={chartWrapRef}>
        <svg
          className="sleep-study-chart"
          viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
          role="img"
          aria-label={`${title} over the last 30 days, measured in hours`}
        >
          {ticks.map((hours) => {
            const y = yFor(hours * 60);
            return (
              <g key={hours}>
                <line
                  x1={PLOT.left}
                  x2={chartWidth - PLOT.right}
                  y1={y}
                  y2={y}
                  className="sleep-study-gridline"
                />
                <text x={PLOT.left - 8} y={y + 4} textAnchor="end">
                  {hours}h
                </text>
              </g>
            );
          })}
          {series.map((key) => {
            const colorClass = `${key}-series`;
            const points = days
              .map((day, index) => `${xFor(index)},${yFor(day[key])}`)
              .join(" ");
            return (
              <g key={key} className={colorClass}>
                <polyline className="sleep-study-line" points={points} />
                {days.map((day, index) => (
                  <circle
                    key={day.dateKey}
                    className="sleep-study-point"
                    cx={xFor(index)}
                    cy={yFor(day[key])}
                    r="2.8"
                  >
                    <title>{`${day.label}: ${formatHours(day[key])} ${key}`}</title>
                  </circle>
                ))}
              </g>
            );
          })}
          {DATE_LABEL_INDEXES.map((index) => {
            const day = days[index];
            if (!day) return null;
            return (
              <text
                key={day.dateKey}
                x={xFor(index)}
                y={CHART_HEIGHT - 8}
                textAnchor={
                  index === 0
                    ? "start"
                    : index === days.length - 1
                      ? "end"
                      : "middle"
                }
              >
                {day.label}
              </text>
            );
          })}
        </svg>
      </div>
    </section>
  );
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

  return (
    <section
      className="sleep-study-card surface-card"
      aria-labelledby="sleep-study-heading"
    >
      <header className="sleep-study-heading">
        <div>
          <h2 id="sleep-study-heading">Sleep &amp; study trends</h2>
          <p>Daily hours over the last 30 days</p>
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
          <div className="sleep-study-graphs">
            {CHARTS.map((chart) => (
              <SleepStudyGraph
                key={chart.title}
                days={days}
                title={chart.title}
                series={chart.series}
              />
            ))}
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
