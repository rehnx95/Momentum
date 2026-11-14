import { formatDuration } from "../../../shared/utils/time";
import { getActivityColor } from "../lib/activityColor";

export default function FullLogTimeline({
  activities,
  activityColors,
  totalMinutes,
  activityFilter = "All",
}) {
  const visibleActivities = activities
    .filter((activity) => activityFilter === "All" || activity.name === activityFilter)
    .sort(
      (first, second) =>
        second.minutes - first.minutes || String(first.name).localeCompare(String(second.name)),
    );

  return (
    <div className="full-log-timeline" role="group" aria-label="Share of active time">
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
              title={label}
              style={{ width: `${share}%`, "--activity-color": color }}
            />
          );
        })}
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
