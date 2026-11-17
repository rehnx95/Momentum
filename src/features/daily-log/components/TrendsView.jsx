import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatDuration,
  getSleepMinutes,
  getSlotDurationMinutes,
} from "../../../shared/utils/time";
import { getLocalDateKey } from "../../../shared/utils/date";
import Dropdown from "../../../shared/components/Dropdown";
import Tooltip from "../../../shared/components/Tooltip";
import { SleepStudyGraph } from "../../activity/components/SleepStudyChart";
import { getActivityDisplayName, isSheetActivity } from "../lib/activityName";
import { getActivityColor } from "../lib/activityColor";

const EMPTY_LOGS = [];
const CHART_WINDOW_DAYS = 30;
const MOBILE_CHART_WINDOW_DAYS = 7;

function activityEntries(log, sheets) {
  const activities = new Map();
  const tasks = Array.isArray(log?.custom_tasks) ? log.custom_tasks : [];

  tasks.forEach((task) => {
    const name = isSheetActivity(task)
      ? getActivityDisplayName(task, sheets)
      : String(task.name || "").trim();
    if (!name) return;
    const minutes = (Array.isArray(task.slots) ? task.slots : []).reduce(
      (total, slot) => total + (getSlotDurationMinutes(slot) || 0),
      0,
    );
    if (minutes <= 0) return;

    const sheet = isSheetActivity(task);
    const key = `${sheet ? "sheet" : "activity"}:${name.toLowerCase()}`;
    const existing = activities.get(key);
    activities.set(key, {
      key,
      name,
      isSheet: sheet,
      minutes: (existing?.minutes || 0) + minutes,
    });
  });

  return [...activities.values()];
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateLabel(date, options) {
  return date.toLocaleDateString(undefined, options);
}

function formatRangeLabel(start, end) {
  const startOptions = { month: "short", day: "numeric" };
  if (start.getFullYear() !== end.getFullYear()) {
    startOptions.year = "numeric";
  }
  return `${dateLabel(start, startOptions)} – ${dateLabel(end, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function RangeNavigation({
  className,
  label,
  rangeLabel,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  nextDisabled,
  loading,
}) {
  return (
    <div className={`${className} daily-date-nav`} role="group" aria-label={label}>
      <Tooltip label={previousLabel}>
        <button
          type="button"
          className="date-navigation-arrow"
          aria-label={previousLabel}
          onClick={onPrevious}
          disabled={loading}
        >
          <ChevronLeft size={14} aria-hidden="true" />
        </button>
      </Tooltip>
      <span className="date-navigation-trigger trends-range-label">{rangeLabel}</span>
      <Tooltip label={nextLabel}>
        <button
          type="button"
          className="date-navigation-arrow"
          aria-label={nextLabel}
          onClick={onNext}
          disabled={nextDisabled || loading}
        >
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </Tooltip>
    </div>
  );
}

export default function TrendsView({ daily, sheets = [] }) {
  const [chartSelection, setChartSelection] = useState("active");
  const [chartOffset, setChartOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const chartPanelRef = useRef(null);
  const [chartPanelWidth, setChartPanelWidth] = useState(720);
  const todayKey = getLocalDateKey();
  const allLogs = Array.isArray(daily.allLogs) ? daily.allLogs : EMPTY_LOGS;
  const { allLogsLoading, hasOlderLogs, loadOlderLogs, olderLogsLoading } = daily;
  const chartWindowDays = chartPanelWidth <= 520 ? MOBILE_CHART_WINDOW_DAYS : CHART_WINDOW_DAYS;

  useLayoutEffect(() => {
    const element = chartPanelRef.current?.querySelector(".sleep-study-chart-wrap");
    if (!element) return undefined;

    const measure = () => {
      const width = Math.round(element.clientWidth);
      if (width > 0) setChartPanelWidth((current) => (current === width ? current : width));
    };

    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const activityOptions = useMemo(() => {
    const byKey = new Map();
    allLogs.forEach((log) => {
      activityEntries(log, sheets).forEach(({ key, name, isSheet }) => {
        if (!byKey.has(key)) byKey.set(key, { key, name, isSheet });
      });
    });
    return [...byKey.values()].sort((first, second) =>
      first.name.localeCompare(second.name, undefined, { sensitivity: "base" }),
    );
  }, [allLogs, sheets]);
  const chartModes = useMemo(
    () => [
      { id: "sleep", label: "Sleep", title: "Sleep hours", series: ["sleep"] },
      { id: "active", label: "Active", title: "Active hours", series: ["study"] },
      {
        id: "combined",
        label: "Sleep + Active",
        title: "Sleep + active hours",
        series: ["study", "sleep"],
      },
      ...activityOptions.map((activity) => ({
        id: `activity:${activity.key}`,
        label: activity.name,
        title: `${activity.name} hours`,
        series: ["study"],
        activityKey: activity.key,
        activityName: activity.name,
      })),
    ],
    [activityOptions],
  );
  const chartMode = chartModes.find(({ id }) => id === chartSelection) || chartModes[1];

  const { chartDays, chartAverages, chartRangeLabel, chartSummary, chartStartKey } = useMemo(() => {
    const logsByDate = new Map(allLogs.map((log) => [log.date, log]));
    const windowEnd = new Date(`${todayKey}T00:00:00`);
    windowEnd.setDate(windowEnd.getDate() + chartOffset * chartWindowDays);
    const windowStart = new Date(windowEnd);
    windowStart.setDate(windowEnd.getDate() - chartWindowDays + 1);
    const dates = Array.from({ length: chartWindowDays }, (_, index) => {
      const date = new Date(windowStart);
      date.setDate(windowStart.getDate() + index);
      return date;
    });
    const logsInRange = dates.map((date) => logsByDate.get(dateKey(date))).filter(Boolean);
    const chartDays = dates.map((date) => {
      const key = dateKey(date);
      const log = logsByDate.get(key);
      const activities = activityEntries(log, sheets);
      const activeMinutes = chartMode.activityKey
        ? activities.find((activity) => activity.key === chartMode.activityKey)?.minutes || 0
        : activities.reduce((total, activity) => total + activity.minutes, 0);

      return {
        dateKey: key,
        label: dateLabel(date, { month: "short", day: "numeric" }),
        sleep: log ? getSleepMinutes(log) : null,
        sleepRecorded: Boolean(log?.sleep_time && log?.wake_time),
        study: log ? activeMinutes : null,
      };
    });
    const chartAverages = chartMode.series.flatMap((key) => {
      const values = chartDays
        .filter((day) => key !== "sleep" || day.sleepRecorded)
        .map((day) => day[key])
        .filter((value) => value !== null);
      if (!values.length) return [];
      const label = key === "sleep" ? "Sleep" : chartMode.activityName || "Active";
      return [
        { key, value: values.reduce((total, value) => total + value, 0) / values.length, label },
      ];
    });
    const sleepLogs = logsInRange.filter((log) => log.sleep_time && log.wake_time);
    const averageSleep = sleepLogs.length
      ? sleepLogs.reduce((total, log) => total + getSleepMinutes(log), 0) / sleepLogs.length
      : null;
    const totalActive = logsInRange.reduce(
      (total, log) =>
        total + activityEntries(log, sheets).reduce((sum, activity) => sum + activity.minutes, 0),
      0,
    );
    const daysLogged = new Set(
      logsInRange
        .filter(
          (log) => activityEntries(log, sheets).length > 0 || log.sleep_time || log.wake_time,
        )
        .map((log) => log.date),
    ).size;
    const averageActive = logsInRange.length ? totalActive / logsInRange.length : null;

    return {
      chartDays,
      chartAverages,
      chartRangeLabel: formatRangeLabel(windowStart, windowEnd),
      chartStartKey: dateKey(windowStart),
      chartSummary: {
        daysLogged: `${daysLogged} / ${chartWindowDays}`,
        averageSleep: averageSleep === null ? "—" : formatDuration(averageSleep),
        averageActive: averageActive === null ? "—" : formatDuration(averageActive),
      },
    };
  }, [allLogs, chartMode, chartOffset, chartWindowDays, sheets, todayKey]);

  const { weekRangeLabel, timeWent, totalTimeWent, weekStartKey } = useMemo(() => {
    const logsByDate = new Map(allLogs.map((log) => [log.date, log]));
    const weekEnd = new Date(`${todayKey}T00:00:00`);
    weekEnd.setDate(weekEnd.getDate() + weekOffset * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);
    const dates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    });
    const totals = new Map();
    dates.forEach((date) => {
      activityEntries(logsByDate.get(dateKey(date)), sheets).forEach(({ name, minutes }) => {
        const key = name.toLowerCase();
        const existing = totals.get(key);
        totals.set(key, {
          name,
          minutes: (existing?.minutes || 0) + minutes,
        });
      });
    });

    const totalMinutes = [...totals.values()].reduce(
      (total, activity) => total + activity.minutes,
      0,
    );

    return {
      weekStartKey: dateKey(weekStart),
      weekRangeLabel: formatRangeLabel(weekStart, weekEnd),
      totalTimeWent: formatDuration(totalMinutes),
      timeWent: [...totals.values()]
        .sort((first, second) => second.minutes - first.minutes)
        .map(({ name, minutes }) => ({
          label: name,
          value: formatDuration(minutes),
          minutes,
          percentage: totalMinutes ? Math.round((minutes / totalMinutes) * 100) : 0,
          color: getActivityColor(name, daily.activityColors),
        })),
    };
  }, [allLogs, daily.activityColors, sheets, todayKey, weekOffset]);

  const requiredStartKey = [chartStartKey, weekStartKey].sort()[0];
  const oldestLoadedDate = allLogs[allLogs.length - 1]?.date;
  const legendItems = chartMode.series.map((key) => ({
    key,
    label: key === "sleep" ? "Sleep" : chartMode.activityName || "Active",
  }));
  const showSeriesLegend = legendItems.length > 1;
  const activityColor = chartMode.activityName
    ? getActivityColor(chartMode.activityName, daily.activityColors)
    : undefined;
  const seriesLabels = Object.fromEntries(
    legendItems.map(({ key, label }) => [key, label.toLowerCase()]),
  );

  useEffect(() => {
    if (
      !requiredStartKey ||
      !oldestLoadedDate ||
      !hasOlderLogs ||
      olderLogsLoading ||
      allLogsLoading ||
      requiredStartKey >= oldestLoadedDate
    ) {
      return;
    }
    void loadOlderLogs();
  }, [
    allLogsLoading,
    hasOlderLogs,
    loadOlderLogs,
    olderLogsLoading,
    oldestLoadedDate,
    requiredStartKey,
  ]);

  return (
    <section className="trends-view" aria-label="Daily log trends">
      <article ref={chartPanelRef} className="trends-panel trends-chart-panel-card">
        <header className="trends-chart-header">
          <h3>{chartMode.title}</h3>
          <label>
            <span className="sr-only">Chart activity</span>
            <Dropdown
              className="trends-activity-select"
              ariaLabel="Chart activity"
              value={chartMode.id}
              onChange={setChartSelection}
              options={chartModes.map((mode) => ({
                value: mode.id,
                label: mode.label,
              }))}
            />
          </label>
        </header>
        <div className="trends-chart-period-summary">
          <RangeNavigation
            className="trends-month-navigation"
            label="Select chart period"
            rangeLabel={chartRangeLabel}
            previousLabel={`Previous ${chartWindowDays} days`}
            nextLabel={`Next ${chartWindowDays} days`}
            onPrevious={() => setChartOffset((offset) => offset - 1)}
            onNext={() => setChartOffset((offset) => Math.min(0, offset + 1))}
            nextDisabled={chartOffset >= 0}
            loading={olderLogsLoading}
          />
          <div className="trends-chart-summary" aria-label={`${chartWindowDays}-day summary`}>
            <span>
              <strong>{chartSummary.daysLogged}</strong>
              <small>days logged</small>
            </span>
            <span>
              <strong>{chartSummary.averageSleep}</strong>
              <small>avg sleep</small>
            </span>
            <span>
              <strong>{chartSummary.averageActive}</strong>
              <small>avg active</small>
            </span>
          </div>
        </div>
        <div className="sleep-study-tabpanel trends-chart-panel">
          {(showSeriesLegend || chartAverages.length > 0) && (
            <div className="sleep-study-legend" aria-label="Chart legend">
              {showSeriesLegend &&
                legendItems.map(({ key, label }) => (
                  <span key={key}>
                    <i
                      className={`sleep-study-legend-swatch ${key}`}
                      aria-hidden="true"
                      style={
                        key === "study" && activityColor
                          ? { "--study-chart-color": activityColor }
                          : undefined
                      }
                    />
                    {label}
                  </span>
                ))}
              {chartAverages.map(({ key, label }) => (
                <span key={`${key}-average`}>
                  <i className="sleep-study-legend-swatch average" aria-hidden="true" />
                  Average {label}
                </span>
              ))}
            </div>
          )}
          <SleepStudyGraph
            days={chartDays}
            title={chartMode.title}
            series={chartMode.series}
            seriesLabels={seriesLabels}
            activityColor={activityColor}
            averages={chartAverages}
            chartHeightOverride={315}
          />
        </div>
      </article>

      <article className="trends-panel trends-time-panel">
        <header className="trends-time-header">
          <div className="trends-time-heading">
            <h3>Where your time went</h3>
            <span className="trends-time-total">{totalTimeWent} total</span>
          </div>
          <RangeNavigation
            className="trends-week-navigation"
            label="Select totals week"
            rangeLabel={weekRangeLabel}
            previousLabel="Previous 7 days"
            nextLabel="Next 7 days"
            onPrevious={() => setWeekOffset((offset) => offset - 1)}
            onNext={() => setWeekOffset((offset) => Math.min(0, offset + 1))}
            nextDisabled={weekOffset >= 0}
            loading={olderLogsLoading}
          />
        </header>
        <div className="trends-time-list">
          {timeWent.length ? (
            timeWent.map((item) => (
              <div key={item.label} className="trends-time-row">
                <div className="trends-time-label">
                  <span
                    className="trends-time-dot"
                    aria-hidden="true"
                    style={{ "--activity-color": item.color }}
                  />
                  <span>{item.label}</span>
                </div>
                <span className="trends-time-percentage">{item.percentage}%</span>
                <strong>{item.value}</strong>
                <div className="trends-track" aria-hidden="true">
                  <span
                    style={{
                      width: `${item.percentage}%`,
                      "--activity-color": item.color,
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="trends-no-data">No timed activities in this 7-day period.</p>
          )}
        </div>
      </article>
    </section>
  );
}
