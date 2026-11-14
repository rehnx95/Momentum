import { formatDuration } from "../../../shared/utils/time";
import TimeInput from "./TimeInput";

export default function SleepCard({
  sleepTime,
  wakeTime,
  totalMinutes = 0,
  disabled,
  onChange,
  onSaveNow,
}) {
  return (
    <section className="daily-sleep-panel" aria-label="Sleep time">
      <header className="daily-sleep-header">
        <h3>Sleep</h3>
        <span className="daily-sleep-total">
          {totalMinutes > 0 ? formatDuration(totalMinutes) : "—"}
        </span>
      </header>
      <div className="daily-sleep-time-range">
        <TimeInput
          value={sleepTime}
          disabled={disabled}
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
          onChange={(value) => onChange("wake_time", value)}
          label="Wake time"
          showPlaceholder
          onSaveNow={onSaveNow}
        />
      </div>
      <p className="daily-sleep-note">
        Counted toward the night you wake up, so late-evening slots no longer collide.
      </p>
    </section>
  );
}
