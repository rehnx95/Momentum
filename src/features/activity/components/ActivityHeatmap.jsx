import { memo, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { buildHeatmap, formatTooltipDate } from "../utils/heatmap";
import { formatDuration } from "../../../shared/utils/time";
import "./ActivityHeatmap.css";

const WEEKDAYS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const GAP = 2;
const LABEL_W = 34;
const MIN_CELL = 4;
const getHourLevel = (hours) => {
  if (hours <= 0) return 0;
  if (hours < 1) return 1;
  if (hours < 3) return 2;
  if (hours < 5) return 3;
  return 4;
};

const ActivityHeatmap = memo(function ActivityHeatmap({
  activity,
  todayKey,
  years = [],
  selectedYear = null,
  onSelectYear,
  loading = false,
  mode = 'problems',
}) {
  const scrollRef = useRef(null);
  const yearMenuRef = useRef(null);
  const yearTriggerRef = useRef(null);
  const [cell, setCell] = useState(12);
  const [tip, setTip] = useState(null);
  const [yearMenuOpen, setYearMenuOpen] = useState(false);
  const yearMenuId = useId();
  const currentYear = Number(todayKey.slice(0, 4));

  const levelFn = mode === 'hours' ? getHourLevel : undefined;
  const heat = useMemo(
    () => buildHeatmap({ activity, todayKey, year: selectedYear, levelFn }),
    [activity, todayKey, selectedYear, levelFn],
  );

  const yearList = useMemo(() => {
    const set = new Set([currentYear, ...years]);
    for (const [key, count] of Object.entries(activity || {})) {
      if (count > 0) set.add(Number(key.slice(0, 4)));
    }

    return [...set].filter(Number.isFinite).sort((a, b) => b - a);
  }, [activity, years, currentYear]);

  useEffect(() => {
    if (!yearMenuOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!yearMenuRef.current?.contains(event.target)) setYearMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setYearMenuOpen(false);
        yearTriggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [yearMenuOpen]);

  // Size the cells so the grid fills the available width.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const measure = () => {
      const usable = el.clientWidth - LABEL_W - (heat.columns - 1) * GAP - 6;
      const nextCell = Math.min(
        12,
        Math.max(MIN_CELL, Math.floor((usable / heat.columns) * 10) / 10),
      );
      setCell((current) => current === nextCell ? current : nextCell);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [heat.columns]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = selectedYear == null ? el.scrollWidth : 0;
  }, [heat.columns, selectedYear]);

  const showTip = (event) => {
    const target = event.target;
    const text = target instanceof HTMLElement ? target.dataset.tip : undefined;
    if (!text) {
      setTip(null);
      return;
    }
    const rect = target.getBoundingClientRect();
    setTip({ text, x: rect.left + rect.width / 2, y: rect.top });
  };

  const title =
    mode === 'hours'
      ? `${formatDuration(heat.total * 60)} studied ${
          selectedYear == null ? 'in the last year' : `in ${selectedYear}`
        }`
      : `${heat.total.toLocaleString()} ${
          heat.total === 1 ? 'problem' : 'problems'
        } solved ${
          selectedYear == null ? 'in the last year' : `in ${selectedYear}`
        }`;

  return (
    <section className={`hm-card${loading ? ' hm-loading' : ''}`} aria-label="Activity heatmap">
      <header className="hm-header">
        <h3 className="hm-title">{title}</h3>
        <div className="hm-year-picker" ref={yearMenuRef}>
          <button
            ref={yearTriggerRef}
            type="button"
            className="hm-year-trigger"
            aria-label="Select activity year"
            aria-expanded={yearMenuOpen}
            aria-controls={yearMenuId}
            onClick={() => setYearMenuOpen((open) => !open)}
          >
            <span>{selectedYear == null ? 'Last 12 months' : selectedYear}</span>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          {yearMenuOpen && (
            <div
              id={yearMenuId}
              className="hm-year-menu"
              role="group"
              aria-label="Activity year"
            >
              <button
                type="button"
                aria-pressed={selectedYear == null}
                onClick={() => {
                  onSelectYear?.(null);
                  setYearMenuOpen(false);
                }}
              >
                Last 12 months
              </button>
              {yearList.map((year) => (
                <button
                  key={year}
                  type="button"
                  aria-pressed={selectedYear === year}
                  onClick={() => {
                    onSelectYear?.(year);
                    setYearMenuOpen(false);
                  }}
                >
                  {year}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
      <div className="hm-body">
        <div className="hm-main">
          <div className="hm-scroll" ref={scrollRef} onScroll={() => setTip(null)}>
            <div
              className="hm-inner"
              style={{ '--hm-weeks': heat.columns, '--hm-cell': `${cell}px` }}
            >
              <div className="hm-months">
                {heat.labels.map((label, i) => (
                  <span key={i}>{label}</span>
                ))}
              </div>
              <div className="hm-heat">
                <div className="hm-weekdays">
                  {WEEKDAYS.map((label, i) => (
                    <span key={i}>{label}</span>
                  ))}
                </div>
                <div className="hm-weeks" onMouseOver={showTip} onMouseLeave={() => setTip(null)}>
                  {heat.weeks.map((week, w) => (
                    <div className="hm-week" key={w}>
                      {week.map((day) => {
                        const tipText =
                          mode === 'hours'
                            ? `${formatDuration(day.count * 60)} on ${formatTooltipDate(day.date, currentYear)}`
                            : `${day.count === 0
                                ? 'No problems'
                                : `${day.count} ${day.count === 1 ? 'problem' : 'problems'}`
                              } on ${formatTooltipDate(day.date, currentYear)}`;
                        return (
                          <span
                            key={day.key}
                            data-tip={day.inRange ? tipText : undefined}
                            aria-label={day.inRange ? tipText : undefined}
                            aria-hidden={day.inRange ? undefined : true}
                            className={`hm-day hm-l${day.level}${day.inRange ? '' : ' hm-off'}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="hm-foot">
            <div className="hm-summary">
              <span>
                {mode === 'hours'
                  ? `Days with study: ${heat.activeDays}`
                  : `Total active days: ${heat.activeDays}`}
              </span>
            </div>
            <div className="hm-legend" aria-label="Activity scale: less to more">
              <span>Less</span>
              {[0, 1, 2, 3, 4].map((l) => (
                <span key={l} className={`hm-swatch hm-l${l}`} />
              ))}
              <span>More</span>
            </div>
          </div>
        </div>
      </div>
      {tip && (
        <div className="hm-tip" role="tooltip" style={{ left: tip.x, top: tip.y }}>
          {tip.text}
        </div>
      )}
    </section>
  );
});

export default ActivityHeatmap;