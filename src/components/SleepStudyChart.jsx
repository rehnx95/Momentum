import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  getDailyLogHistoryCache,
  setDailyLogHistoryCache,
} from "../lib/dailyLogHistoryCache";
import { formatDuration, getSleepMinutes, getStudyMinutes } from "../utils/time";
import "./SleepStudyChart.css";

const DAY_COUNT = 30;
const DEFAULT_CHART_WIDTH = 720;
const CHART_HEIGHT = 220;
const PLOT = { left: 42, right: 12, top: 14, bottom: 30 };
const DATE_LABEL_INDEXES = [0, 7, 14, 21, 29];
const CHARTS = [
  { id: "sleep", label: "Sleep", title: "Sleep hours", series: ["sleep"] },
  { id: "study", label: "Study", title: "Study hours", series: ["study"] },
  {
    id: "combined",
    label: "Study + Sleep",
    title: "Study + sleep hours",
    series: ["study", "sleep"],
  },
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
  const cachedHistory = getDailyLogHistoryCache(userId);
  const [logs, setLogs] = useState(
    () => cachedHistory?.logs || [],
  );
  const [selectedChart, setSelectedChart] = useState("sleep");
  const tabRefs = useRef({});
  const [hasHistory, setHasHistory] = useState(Boolean(cachedHistory));
  const [loading, setLoading] = useState(!cachedHistory);
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
    const cachedHistory = getDailyLogHistoryCache(userId);
    setLogs(cachedHistory?.logs || []);
    setHasHistory(Boolean(cachedHistory));
    if (cachedHistory?.isFresh) {
      setLoading(false);
      return () => {
        active = false;
      };
    }
    if (!cachedHistory) setLoading(true);
    setError("");

    loadLogs()
      .then((data) => {
        if (active) {
          setDailyLogHistoryCache(userId, data);
          setLogs(data);
          setHasHistory(true);
        }
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
  }, [loadLogs, requestId, userId]);

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
  const activeChart = CHARTS.find((chart) => chart.id === selectedChart);
  const handleTabKeyDown = (event, currentIndex) => {
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % CHARTS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + CHARTS.length) % CHARTS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = CHARTS.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextChart = CHARTS[nextIndex];
    setSelectedChart(nextChart.id);
    tabRefs.current[nextChart.id]?.focus();
  };

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
      ) : error && !hasHistory ? (
        <div className="sleep-study-message" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setRequestId((current) => current + 1)}>
            Try again
          </button>
        </div>
      ) : (
        <>
          {error && (
            <div className="sleep-study-message" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => setRequestId((current) => current + 1)}>
                Try again
              </button>
            </div>
          )}
          <div
            className="sleep-study-tabs"
            role="tablist"
            aria-label="Sleep and study graph"
          >
            {CHARTS.map((chart, index) => (
              <button
                key={chart.id}
                ref={(element) => {
                  tabRefs.current[chart.id] = element;
                }}
                id={`sleep-study-tab-${chart.id}`}
                type="button"
                role="tab"
                aria-selected={selectedChart === chart.id}
                aria-controls="sleep-study-tabpanel"
                tabIndex={selectedChart === chart.id ? 0 : -1}
                className="sleep-study-tab"
                onClick={() => setSelectedChart(chart.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                {chart.label}
              </button>
            ))}
          </div>
          <div
            id="sleep-study-tabpanel"
            role="tabpanel"
            aria-labelledby={`sleep-study-tab-${selectedChart}`}
            className="sleep-study-tabpanel"
          >
            <SleepStudyGraph
              days={days}
              title={activeChart.title}
              series={activeChart.series}
            />
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
