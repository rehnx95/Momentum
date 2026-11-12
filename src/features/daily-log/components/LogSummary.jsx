import TimeInput from "./TimeInput";

function formatTime(value) {
  if (!value) return "--:--";
  const [hours, minutes] = String(value).slice(0, 5).split(":");
  return `${hours}:${minutes}`;
}

function SummaryTime({ value, label, onChange, disabled }) {
  if (onChange) {
    return (
      <TimeInput
        value={value}
        disabled={disabled}
        onChange={onChange}
        label={label}
        showPlaceholder
      />
    );
  }

  return (
    <span
      className="time-input log-summary-time-value"
      role="group"
      aria-label={`${label}: ${formatTime(value)}`}
    >
      {formatTime(value)}
    </span>
  );
}

export default function LogSummary({
  className,
  ariaLabel,
  sleepTime,
  wakeTime,
  sleepDuration,
  studied,
  solved,
  onSleepTimeChange,
  onWakeTimeChange,
  disabled = false,
}) {
  return (
    <section className={`log-summary-card ${className}`} aria-label={ariaLabel}>
      <div className="log-summary-sleep-row">
        <small className="log-summary-sleep-label">Sleep</small>
        <div
          className="log-summary-time-pair"
          role="group"
          aria-label="Sleep and wake times"
        >
          <SummaryTime
            value={sleepTime}
            label="Sleep time"
            onChange={onSleepTimeChange}
            disabled={disabled}
          />
          <span className="slot-arrow" aria-hidden="true">→</span>
          <SummaryTime
            value={wakeTime}
            label="Wake time"
            onChange={onWakeTimeChange}
            disabled={disabled}
          />
        </div>
        {sleepTime && wakeTime && (
          <strong className="log-summary-duration" aria-label={`Sleep duration: ${sleepDuration}`}>
            {sleepDuration}
          </strong>
        )}
        <div
          className="full-log-day-totals log-summary-totals"
          aria-label={`${studied} studied, ${solved} solved`}
        >
          <strong>{studied}</strong>
          <span>{solved} solved</span>
        </div>
      </div>
    </section>
  );
}
