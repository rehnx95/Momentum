import { useEffect, useState } from "react";

function getSegments(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || "").slice(0, 5));
  return match ? { hour: match[1], minute: match[2] } : { hour: "", minute: "" };
}

function isValidSegment(value, maximum) {
  return /^\d{2}$/.test(value) && Number(value) <= maximum;
}

function commitTime(hour, minute, onChange) {
  if (isValidSegment(hour, 23) && isValidSegment(minute, 59)) {
    onChange(`${hour}:${minute}`);
  } else if (!hour && !minute) {
    onChange("");
  }
}

export function navigateTimeSegments(event) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  const view = event.currentTarget.closest(".daily-day-view, .full-log-summary");
  if (!view) return;

  const inputs = [...view.querySelectorAll(
    'input[data-time-navigation][data-time-segment]:not(:disabled)',
  )];
  const index = inputs.indexOf(event.currentTarget);
  const next = inputs[index + (event.key === "ArrowRight" ? 1 : -1)];
  if (!next) return;

  event.preventDefault();
  next.focus({ preventScroll: true });
  next.select();
}

export function adjustTimeSegment(value, segment, amount) {
  const maximum = segment === "hour" ? 23 : 59;
  const currentValue = Number(value || 0);
  return String((currentValue + amount + maximum + 1) % (maximum + 1)).padStart(2, "0");
}

export default function TimeInput({ value, onChange, disabled, label }) {
  const [segments, setSegments] = useState(() => getSegments(value));

  useEffect(() => {
    setSegments(getSegments(value));
  }, [value]);

  const changeSegment = (segment, rawValue) => {
    const digits = rawValue.replace(/\D/g, "").slice(0, 2);
    const next = { ...segments, [segment]: digits };
    setSegments(next);
    if (!digits) {
      setSegments({ hour: "", minute: "" });
      onChange("");
      return;
    }

    commitTime(next.hour, next.minute, onChange);
  };

  const blurTime = () => {
    const hour = Number(segments.hour);
    const minute = Number(segments.minute);
    if (
      !segments.hour ||
      !segments.minute ||
      hour > 23 ||
      minute > 59
    ) {
      setSegments(getSegments(value));
      return;
    }

    const next = {
      hour: String(hour).padStart(2, "0"),
      minute: String(minute).padStart(2, "0"),
    };
    setSegments(next);
    commitTime(next.hour, next.minute, onChange);
  };

  const adjustSegment = (segment, amount) => {
    const normalized = adjustTimeSegment(segments[segment], segment, amount);
    const next = {
      hour: segments.hour || "00",
      minute: segments.minute || "00",
      [segment]: normalized,
    };
    setSegments(next);
    commitTime(next.hour, next.minute, onChange);
  };

  const handleKeyDown = (segment) => (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      navigateTimeSegments(event);
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      adjustSegment(segment, event.key === "ArrowUp" ? 1 : -1);
    }
  };

  const handleBlur = (event) => {
    if (event.currentTarget.parentElement.contains(event.relatedTarget)) return;
    blurTime();
  };

  return (
    <span className="time-input" role="group" aria-label={label}>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={2}
        value={segments.hour}
        disabled={disabled}
        data-time-navigation
        data-time-segment="hour"
        aria-label={`${label} hour`}
        onChange={(event) => changeSegment("hour", event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onKeyDown={handleKeyDown("hour")}
        onBlur={handleBlur}
      />
      <span aria-hidden="true">:</span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={2}
        value={segments.minute}
        disabled={disabled}
        data-time-navigation
        data-time-segment="minute"
        aria-label={`${label} minute`}
        onChange={(event) => changeSegment("minute", event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onKeyDown={handleKeyDown("minute")}
        onBlur={handleBlur}
      />
    </span>
  );
}
