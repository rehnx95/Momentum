import { createPortal } from "react-dom";
import { useLayoutEffect, useRef, useState } from "react";
import { formatDuration, intervalsFor, sleepIntervalsFor } from "../../../shared/utils/time";
import { getActivityColor } from "../lib/activityColor";

export { intervalsFor, sleepIntervalsFor };

function clockLabel(minutes) {
  if (minutes === 1440) return "24:00";
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function unloggedIntervalsFor(activities = [], sleepTime, wakeTime) {
  const loggedIntervals = activities.flatMap((activity) =>
    (activity.slots || []).flatMap((slot) => intervalsFor(slot)),
  );
  loggedIntervals.push(
    ...intervalsFor(
      {
        start: String(sleepTime || "").slice(0, 5),
        end: String(wakeTime || "").slice(0, 5),
      },
      true,
    ),
  );

  const sortedIntervals = loggedIntervals.sort(
    ([firstStart, firstEnd], [secondStart, secondEnd]) =>
      firstStart - secondStart || firstEnd - secondEnd,
  );
  const unloggedIntervals = [];
  let cursor = 0;

  sortedIntervals.forEach(([start, end]) => {
    if (start > cursor) unloggedIntervals.push([cursor, start]);
    cursor = Math.max(cursor, end);
  });

  if (cursor < 1440) unloggedIntervals.push([cursor, 1440]);
  return unloggedIntervals;
}

export function unloggedMinutesFor(activeMinutes, sleepMinutes) {
  return Math.max(0, 1440 - activeMinutes - sleepMinutes);
}

export default function FullLogTimeline({
  activities = [],
  activityColors,
  totalMinutes,
  sleepMinutes = 0,
  sleepTime,
  wakeTime,
  activityFilter = "All",
}) {
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ left: 0, top: 0 });
  const tooltipRef = useRef(null);
  const visibleActivities = activities.filter(
    (activity) => activityFilter === "All" || activity.name === activityFilter,
  );
  const unloggedSegments = unloggedIntervalsFor(activities, sleepTime, wakeTime);
  const shareUnloggedMinutes = unloggedMinutesFor(totalMinutes, sleepMinutes);
  const shareTotal = totalMinutes + sleepMinutes + shareUnloggedMinutes;
  const activityShareSegments = visibleActivities
    .slice()
    .sort(
      (first, second) =>
        second.minutes - first.minutes || String(first.name).localeCompare(String(second.name)),
    )
    .map((activity) => ({
      ...activity,
      share: shareTotal > 0 ? (activity.minutes / shareTotal) * 100 : 0,
      color: getActivityColor(activity.name, activityColors),
    }));
  const sleepShare = shareTotal > 0 ? (sleepMinutes / shareTotal) * 100 : 0;
  const unloggedShare = shareTotal > 0 ? (shareUnloggedMinutes / shareTotal) * 100 : 0;
  const showSleep = activityFilter === "All" || activityFilter === "Sleep";
  const showUnlogged = activityFilter === "All" || activityFilter === "Unlogged";
  let activityShareCursor = activityFilter === "All" ? sleepShare : 0;
  const positionedActivitySegments = activityShareSegments.map((activity) => {
    const segment = { ...activity, left: activityShareCursor };
    activityShareCursor += activity.share;
    return segment;
  });
  const sleepTimeRange =
    sleepTime && wakeTime ? `${String(sleepTime).slice(0, 5)}–${String(wakeTime).slice(0, 5)}` : "";
  const sleepTooltip = `Sleep ${formatDuration(sleepMinutes)}${sleepTimeRange ? ` · ${sleepTimeRange}` : ""} · ${Math.round(sleepShare)}%`;
  const unloggedTooltip = {
    title: `Unlogged ${formatDuration(shareUnloggedMinutes)} · ${Math.round(unloggedShare)}%`,
    intervals: unloggedSegments.map(([start, end]) => ({
      range: `${clockLabel(start)}–${clockLabel(end)}`,
      duration: formatDuration(end - start),
    })),
  };

  useLayoutEffect(() => {
    if (!hoveredSegment || !tooltipRef.current) return undefined;

    const updateTooltipPosition = () => {
      const anchor = hoveredSegment.anchor.getBoundingClientRect();
      const tooltip = tooltipRef.current?.getBoundingClientRect();
      if (!anchor || !tooltip) return;

      const horizontalMargin = 8;
      const halfWidth = tooltip.width / 2;
      const center = anchor.left + anchor.width / 2;
      const left = Math.min(
        Math.max(center, horizontalMargin + halfWidth),
        window.innerWidth - horizontalMargin - halfWidth,
      );
      const above = anchor.top - tooltip.height - horizontalMargin;
      const top =
        above >= horizontalMargin
          ? above
          : Math.min(
              anchor.bottom + horizontalMargin,
              window.innerHeight - tooltip.height - horizontalMargin,
            );

      setTooltipPosition((current) =>
        current.left === left && current.top === top ? current : { left, top },
      );
    };

    updateTooltipPosition();
    window.addEventListener("resize", updateTooltipPosition);
    window.addEventListener("scroll", updateTooltipPosition, true);

    return () => {
      window.removeEventListener("resize", updateTooltipPosition);
      window.removeEventListener("scroll", updateTooltipPosition, true);
    };
  }, [hoveredSegment]);

  const showTooltip = (event, content) => {
    setHoveredSegment({ content, anchor: event.currentTarget });
  };
  const hideTooltip = () => {
    setHoveredSegment(null);
  };

  return (
    <div
      className="full-log-timeline"
      role="group"
      aria-label="Share of time"
      onMouseLeave={hideTooltip}
    >
      <div className="full-log-timeline-track-wrap">
        <div className="full-log-timeline-track">
          {showSleep && sleepShare > 0 && (
            <span
              className="full-log-timeline-segment is-sleep"
              role="img"
              aria-label={`Sleep ${formatDuration(sleepMinutes)} · ${Math.round(sleepShare)}%`}
              tabIndex={0}
              onMouseEnter={(event) => showTooltip(event, sleepTooltip)}
              onFocus={(event) => showTooltip(event, sleepTooltip)}
              onBlur={hideTooltip}
              style={{
                left: "0%",
                width: `${sleepShare}%`,
                "--activity-color": getActivityColor("Sleep", activityColors),
              }}
            />
          )}
          {positionedActivitySegments.map((segment) => {
            const label = `${segment.name} ${formatDuration(segment.minutes)} · ${Math.round(segment.share)}%`;
            return (
              <span
                key={segment.id || segment.name}
                className="full-log-timeline-segment"
                role="img"
                aria-label={label}
                tabIndex={0}
                onMouseEnter={(event) => showTooltip(event, label)}
                onFocus={(event) => showTooltip(event, label)}
                onBlur={hideTooltip}
                style={{
                  left: `${segment.left}%`,
                  width: `${segment.share}%`,
                  "--activity-color": segment.color,
                }}
              />
            );
          })}
          {showUnlogged && unloggedShare > 0 && (
            <span
              className="full-log-timeline-gap"
              role="img"
              aria-label={`Unlogged ${formatDuration(shareUnloggedMinutes)} · ${Math.round(unloggedShare)}%`}
              tabIndex={0}
              onMouseEnter={(event) => showTooltip(event, unloggedTooltip)}
              onFocus={(event) => showTooltip(event, unloggedTooltip)}
              onBlur={hideTooltip}
              style={{ left: `${activityShareCursor}%`, width: `${unloggedShare}%` }}
            />
          )}
        </div>
      </div>
      {hoveredSegment &&
        createPortal(
          <div
            ref={tooltipRef}
            className={`full-log-timeline-tooltip${typeof hoveredSegment.content === "string" ? "" : " is-unlogged"}`}
            role="tooltip"
            style={{ left: `${tooltipPosition.left}px`, top: `${tooltipPosition.top}px` }}
          >
            {typeof hoveredSegment.content === "string" ? (
              hoveredSegment.content
            ) : (
              <>
                <strong>{hoveredSegment.content.title}</strong>
                {hoveredSegment.content.intervals.length > 0 ? (
                  <>
                    <ul className="full-log-tooltip-intervals">
                      {hoveredSegment.content.intervals.map(({ range, duration }) => (
                        <li key={range}>
                          <span>{range}</span>
                          <span>{duration}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <span className="full-log-tooltip-empty">
                    No separate gaps in the recorded timeline.
                  </span>
                )}
              </>
            )}
          </div>,
          document.body,
        )}
      <div className="full-log-activity-breakdown">
        {visibleActivities.map((activity) => {
          const share = totalMinutes > 0 ? (activity.minutes / totalMinutes) * 100 : 0;
          const color = getActivityColor(activity.name, activityColors);

          return (
            <span key={activity.id || activity.name}>
              <i aria-hidden="true" style={{ "--activity-color": color }} />
              {activity.name} {formatDuration(activity.minutes)} · {Math.round(share)}%
            </span>
          );
        })}
      </div>
    </div>
  );
}
