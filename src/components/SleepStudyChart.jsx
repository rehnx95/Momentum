import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import {
  getDailyLogHistoryCache,
  setDailyLogHistoryCache,
} from "../lib/dailyLogHistoryCache";
import { formatDuration, getSleepMinutes, getStudyMinutes } from "../utils/time";
import { formatTooltipDate } from "../utils/heatmap";
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
  const [tooltip, setTooltip] = useState(null);
  const [activePoint, setActivePoint] = useState(null);
  const [chartWidth, setChartWidth] = useState(DEFAULT_CHART_WIDTH);

  useLayoutEffect(() => {
    const element = chartWrapRef.current;
    if (!element) return undefined;

    const measure = () => {
      const width = Math.round(element.clientWidth);
      if (width > 0) setChartWidth((current) => current === width ? current : width);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const plotWidth = chartWidth - PLOT.left - PLOT.right;
  const plotHeight = CHART_HEIGHT - PLOT.top - PLOT.bottom;
  const maxMinutes = Math.max(
    0,
    ...days.flatMap((day) => series.map((key) => day[key])),
  );
  const maxHours = maxMinutes > 12 * 60 ? 24 : 12;
  const currentYear = new Date().getFullYear();
  const yFor = (minutes) =>
    PLOT.top +
    plotHeight -
    (Math.min(minutes / 60, 24) / maxHours) * plotHeight;
  const xFor = (index) =>
    PLOT.left + (plotWidth * index) / Math.max(1, days.length - 1);
  const ticks = [0, 1, 2, 3, 4].map((step) => (maxHours * step) / 4);
  const showTooltip = (event) => {
    const target = event.target.closest?.("[data-tip]");
    if (!target) {
      setTooltip(null);
      setActivePoint(null);
      return;
    }
    const rect = target.getBoundingClientRect();
    const point = target.dataset.point;
    setActivePoint(point);
    setTooltip((current) => current?.point === point
      ? current
      : {
          text: target.dataset.tip,
          x: rect.left + rect.width / 2,
          y: rect.top,
          point,
        });
  };

  return (
    <section className="sleep-study-graph" aria-label={title}>
      <div
        ref={chartWrapRef}
        className="sleep-study-chart-wrap"
      >
        <svg
          className="sleep-study-chart"
          viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
          role="img"
          aria-label={`${title} over the last 30 days, measured in hours`}
          onMouseOver={showTooltip}
          onMouseLeave={() => {
            setTooltip(null);
            setActivePoint(null);
          }}
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
                  <g key={day.dateKey}>
                    <circle
                      className="sleep-study-point-target"
                      cx={xFor(index)}
                      cy={yFor(day[key])}
                      r="9"
                      aria-label={`${day.label}: ${formatHours(day[key])} ${key}`}
                      data-tip={`${formatDuration(day[key])} ${key} on ${formatTooltipDate(new Date(`${day.dateKey}T00:00:00`), currentYear)}`}
                      data-point={`${key}:${day.dateKey}`}
                      onFocus={showTooltip}
                    />
                    <circle
                      className={`sleep-study-point${activePoint === `${key}:${day.dateKey}` ? " is-active" : ""}`}
                      cx={xFor(index)}
                      cy={yFor(day[key])}
                      r="2.8"
                      aria-hidden="true"
                    />
                  </g>
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
        {tooltip && (
          <div
            className="hm-tip"
            role="tooltip"
            style={{
              left: tooltip.x,
              top: tooltip.y,
            }}
          >
            {tooltip.text}
          </div>
        )}
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
      return () => {
        active = false;
      };
    }
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
        if (active) setHasHistory(Boolean(getDailyLogHistoryCache(userId)));
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

      {error && !hasHistory ? (
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
            <div className="sleep-study-legend" aria-label="Graph legend">
              <span>
                <i className="sleep-study-legend-swatch sleep" aria-hidden="true" />
                Sleep
              </span>
              <span>
                <i className="sleep-study-legend-swatch study" aria-hidden="true" />
                Study
              </span>
            </div>
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
