import { useId } from "react";
import { formatDuration } from "../../../shared/utils/time";
import TimeInput from "./TimeInput";

export default function SleepCard({
  sleepTime,
  wakeTime,
  totalMinutes = 0,
  feedback = [],
  disabled,
  onChange,
  onSaveNow,
}) {
  const feedbackId = useId();
  const hasOverlap = feedback.some((issue) => issue.type === "overlap");
  const hasError = feedback.some((issue) => issue.type === "error");
  const describedBy = feedback.length ? feedbackId : undefined;

  return (
    <section className="daily-sleep-panel" aria-label="Sleep time">
      <header className="daily-sleep-header">
        <h3>Sleep</h3>
        <span className="daily-sleep-total">
          {totalMinutes > 0 ? formatDuration(totalMinutes) : "—"}
        </span>
      </header>
      <div
        className={`daily-sleep-time-range${hasOverlap ? " is-overlapping" : ""}${hasError ? " has-slot-error" : ""}`}
        aria-describedby={describedBy}
      >
        <TimeInput
          value={sleepTime}
          disabled={disabled}
          invalid={hasError}
          describedBy={describedBy}
          onChange={(value) => onChange("sleep_time", value)}
          label="Sleep start time"
          showPlaceholder
          onSaveNow={onSaveNow}
        />
        <span className="daily-sleep-time-separator" aria-hidden="true">
          –
        </span>
        <TimeInput
          value={wakeTime}
          disabled={disabled}
          invalid={hasError}
          describedBy={describedBy}
          onChange={(value) => onChange("wake_time", value)}
          label="Wake time"
          showPlaceholder
          onSaveNow={onSaveNow}
        />
      </div>
      {feedback.length > 0 && (
        <ul
          id={feedbackId}
          className={`daily-sleep-feedback${hasError ? " has-slot-error" : ""}`}
          aria-label="Sleep time feedback"
          aria-live="polite"
        >
          {feedback.map((issue, index) => (
            <li key={`${issue.type}-${index}`}>{issue.message}</li>
          ))}
        </ul>
      )}
      <p className="daily-sleep-note">
        Counted toward the night you wake up, so late-evening slots no longer collide.
      </p>
    </section>
  );
}
