import { useState } from "react";
import { formatDuration } from "../../../shared/utils/time";
import { getActivityColor } from "../lib/activityColor";

export default function FullLogTimeline({
  activities,
  activityColors,
  totalMinutes,
  activityFilter = "All",
}) {
  const [hoveredActivity, setHoveredActivity] = useState("");
  const visibleActivities = activities
    .filter((activity) => activityFilter === "All" || activity.name === activityFilter)
    .sort(
      (first, second) =>
        second.minutes - first.minutes || String(first.name).localeCompare(String(second.name)),
    );

  return (
    <div
      className="full-log-timeline"
      role="group"
      aria-label="Share of active time"
      onMouseLeave={() => setHoveredActivity("")}
    >
      <div className="full-log-timeline-track-wrap">
        <div className="full-log-timeline-track">
          {visibleActivities.map((activity) => {
            const share = totalMinutes > 0 ? (activity.minutes / totalMinutes) * 100 : 0;
            const color = getActivityColor(activity.name, activityColors);
            const label = `${activity.name} ${formatDuration(activity.minutes)} · ${Math.round(share)}%`;

            return (
              <span
                key={activity.id || activity.name}
                className="full-log-timeline-segment"
                role="img"
                aria-label={label}
                tabIndex={0}
                onMouseEnter={() => setHoveredActivity(label)}
                onFocus={() => setHoveredActivity(label)}
                onBlur={() => setHoveredActivity("")}
                style={{ width: `${share}%`, "--activity-color": color }}
              />
            );
          })}
        </div>
        {hoveredActivity && (
          <span className="full-log-timeline-tooltip" role="tooltip">
            {hoveredActivity}
          </span>
        )}
      </div>
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
