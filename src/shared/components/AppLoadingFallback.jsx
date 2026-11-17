import { Activity, Users } from "lucide-react";
import "./AppLoadingFallback.css";

const NAV = ["tracker", "daily-log", "people", "profile"];

const Bar = ({ className = "" }) => <span className={`sk-bar ${className}`} />;
const times = (count, render) => Array.from({ length: count }, (_, index) => render(index));

function getVariant(pathname) {
  if (pathname === "/daily-log") return "daily-log";
  if (pathname === "/people") return "people";
  if (pathname === "/profile/edit") return "settings";
  if (pathname === "/profile") return "profile";
  if (/^\/(?:u|user)\//.test(pathname)) return "public";
  return "tracker";
}

const ACTIVE_NAV = {
  tracker: "tracker",
  "daily-log": "daily-log",
  people: "people",
  public: "people",
  profile: "profile",
  settings: "profile",
};

function getDailyView() {
  try {
    const userId = JSON.parse(localStorage.getItem("momentum:account-cache"))?.user?.id;
    const view = userId && localStorage.getItem(`momentum:daily-log-view:${userId}`);
    return view === "full" || view === "trends" ? view : "daily";
  } catch {
    return "daily";
  }
}

/* ---------- Header and mobile nav ---------- */

function HeaderSkeleton({ active }) {
  return (
    <header className="sk-header" aria-hidden="true">
      <div className="sk-header-inner">
        <span className="sk-brand">
          <span className="sk-brand-icon">
            <Activity size={21} strokeWidth={2.25} />
          </span>
          <span>Momentum</span>
        </span>
        <nav className="sk-nav">
          {NAV.map((id) => (
            <Bar key={id} className={id === active ? "is-active" : ""} />
          ))}
        </nav>
        <div className="sk-actions">
          <Bar />
          <Bar className="sk-signout" />
        </div>
      </div>
    </header>
  );
}

function MobileNavSkeleton({ active }) {
  return (
    <nav className="sk-mobile-nav" aria-hidden="true">
      {NAV.map((id) => (
        <span className={`sk-mobile-item${id === active ? " is-active" : ""}`} key={id}>
          <Bar />
          <Bar />
        </span>
      ))}
    </nav>
  );
}

/* ---------- Tracker ---------- */

function TrackerSkeleton() {
  return (
    <div className="sk-tracker">
      <div className="sk-tracker-main">
        <div className="sk-tracker-head">
          <Bar className="sk-tracker-title" />
          <Bar className="sk-tracker-count" />
          <span className="sk-grow" />
          <Bar className="sk-tracker-search" />
        </div>

        <div className="sk-tracker-controls">
          <div className="sk-filter-group">
            {times(5, (i) => (
              <Bar key={i} className={i === 0 ? "is-active" : ""} />
            ))}
          </div>
          <Bar className="sk-expand" />
        </div>

        <div className="sk-step-list">
          {times(9, (i) => (
            <div className="sk-card sk-step-row" key={i}>
              <Bar className="sk-chevron" />
              <Bar className="sk-step-title" />
              <Bar className="sk-step-track" />
              <Bar className="sk-step-count" />
            </div>
          ))}
        </div>
      </div>

      <aside className="sk-tracker-side">
        <section className="sk-card sk-side-card">
          <div className="sk-row-between">
            <Bar className="sk-label-sm" />
            <Bar className="sk-reset" />
          </div>
          <div className="sk-dsa-progress">
            <div className="sk-progress-gauge">
              <div className="sk-gauge-chart">
                <div className="sk-gauge-crop">
                  <svg viewBox="0 0 100 100" className="sk-gauge-svg" aria-hidden="true">
                    <defs>
                      <clipPath id="tracker-skeleton-gauge-mask">
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M21.3622 21.3622C5.54592 37.1784 5.54592 62.8216 21.3622 78.6378C21.9479 79.2236 21.9479 80.1734 21.3622 80.7591C20.7764 81.3449 19.8266 81.3449 19.2408 80.7591C2.25303 63.7713 2.25303 36.2287 19.2408 19.2409C36.2286 2.25305 63.7713 2.25305 80.7591 19.2409C97.7469 36.2287 97.7469 63.7713 80.7591 80.7591C80.1733 81.3449 79.2236 81.3449 78.6378 80.7591C78.052 80.1734 78.052 79.2236 78.6378 78.6378C94.454 62.8216 94.454 37.1784 78.6378 21.3622C62.8216 5.54594 37.1784 5.54594 21.3622 21.3622Z"
                        />
                      </clipPath>
                    </defs>
                    <g clipPath="url(#tracker-skeleton-gauge-mask)">
                      <g transform="rotate(225 50 50)">
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          fill="transparent"
                          stroke="var(--border)"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray="186.2 77.69"
                          strokeDashoffset="66"
                        />
                      </g>
                    </g>
                  </svg>
                </div>
                <div className="sk-gauge-overlay">
                  <div className="sk-gauge-center">
                    <Bar className="sk-gauge-value" />
                    <Bar className="sk-gauge-caption" />
                  </div>
                  <Bar className="sk-gauge-skipped" />
                </div>
              </div>
            </div>
            <div className="sk-difficulty-tiles">
              {times(3, (i) => (
                <div className="sk-difficulty-box" key={i}>
                  <Bar className="sk-difficulty-label" />
                  <Bar className="sk-difficulty-count" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}

/* ---------- Daily Log (Day / Full Log / Trends) ---------- */

function DailyToolbar({ view }) {
  return (
    <header className="sk-toolbar">
      <div className="sk-toolbar-copy">
        <Bar className="sk-daily-title" />
        <Bar className="sk-daily-sub" />
      </div>
      <div className="sk-switch" data-view={view}>
        {times(3, (i) => (
          <Bar key={i} className={i === ["daily", "full", "trends"].indexOf(view) ? "is-active" : ""} />
        ))}
      </div>
    </header>
  );
}

function DaySkeleton() {
  return (
    <>
      <div className="sk-date-row">
        <Bar className="sk-sq" />
        <Bar className="sk-date" />
        <Bar className="sk-sq" />
      </div>
      <div className="sk-daily-layout">
        <section className="sk-card sk-activities">
          <div className="sk-row-between">
            <Bar className="sk-h-md" />
            <Bar className="sk-text-sm" />
          </div>
          {[3, 2, 3, 2].map((slots, i) => (
            <div className="sk-activity" key={i}>
              <div className="sk-activity-head">
                <Bar className="sk-dot" />
                <Bar className="sk-activity-name" />
                <span className="sk-grow" />
                {times(3, (j) => (
                  <Bar key={j} className="sk-icon-btn" />
                ))}
              </div>
              <div className="sk-slot-grid">
                {times(slots, (j) => (
                  <Bar key={j} className="sk-slot" />
                ))}
              </div>
            </div>
          ))}
        </section>

        <div className="sk-side-panel">
          <section className="sk-card sk-small-card">
            <Bar className="sk-h-sm" />
            <div className="sk-quick-row">
              <Bar className="sk-quick-input" />
              <Bar className="sk-quick-add" />
            </div>
            <div className="sk-chips">
              <Bar />
              <Bar />
            </div>
          </section>
          <section className="sk-card sk-small-card">
            <div className="sk-row-between">
              <Bar className="sk-h-sm" />
              <Bar className="sk-text-xs" />
            </div>
            <Bar className="sk-sleep-range" />
            <Bar className="sk-text-sm" />
          </section>
        </div>
      </div>
    </>
  );
}

function FullLogSkeleton() {
  return (
    <>
      <div className="sk-full-toolbar">
        <Bar className="sk-dropdown" />
        <div className="sk-legend">
          {times(7, (i) => (
            <Bar key={i} />
          ))}
        </div>
      </div>
      <div className="sk-card sk-table">
        <div className="sk-cols sk-table-head">
          {times(6, (i) => (
            <Bar key={i} />
          ))}
        </div>
        {times(7, (i) => (
          <div className="sk-cols sk-table-row" key={i}>
            <Bar className="sk-cell-date" />
            <div className="sk-timeline">
              <Bar className="sk-track-bar" />
              <Bar className="sk-breakdown" />
            </div>
            {times(4, (j) => (
              <Bar key={j} className="sk-cell" />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function TrendsSkeleton() {
  const navGroup = (
    <div className="sk-nav-group">
      <Bar className="sk-sq" />
      <Bar className="sk-range" />
      <Bar className="sk-sq" />
    </div>
  );
  return (
    <div className="sk-trends">
      <section className="sk-card sk-panel">
        <div className="sk-row-between">
          <Bar className="sk-h-md" />
          <Bar className="sk-dropdown sk-dropdown-wide" />
        </div>
        <div className="sk-row-between sk-period">
          {navGroup}
          <Bar className="sk-summary" />
        </div>
        <div className="sk-chart" />
      </section>
      <section className="sk-card sk-panel">
        <div className="sk-row-between sk-period">
          <div className="sk-heading-group">
            <Bar className="sk-h-md" />
            <Bar className="sk-text-sm" />
          </div>
          {navGroup}
        </div>
        {times(5, (i) => (
          <div className="sk-time-row" key={i}>
            <Bar className="sk-time-label" />
            <Bar className="sk-time-pct" />
            <Bar className="sk-time-value" />
            <Bar className="sk-time-track" />
          </div>
        ))}
      </section>
    </div>
  );
}

function DailyLogSkeleton() {
  const view = getDailyView();
  return (
    <>
      <DailyToolbar view={view} />
      {view === "full" ? <FullLogSkeleton /> : view === "trends" ? <TrendsSkeleton /> : <DaySkeleton />}
    </>
  );
}

/* ---------- Profile (own and public) ---------- */

function ProfileSkeleton({ isPublic }) {
  return (
    <div className="sk-profile">
      <div className="sk-profile-left">
        <section className="sk-card sk-hero">
          <Bar className="sk-avatar" />
          <div className="sk-identity">
            <Bar className="sk-name" />
            <Bar className="sk-handle" />
            <Bar className="sk-email" />
          </div>
          <div className="sk-hero-actions">
            <Bar />
            {!isPublic && <Bar />}
          </div>
          <div className="sk-stats">
            {times(4, (i) => (
              <div key={i}>
                <Bar className="sk-stat-label-lg" />
                <Bar className="sk-stat-value" />
              </div>
            ))}
          </div>
        </section>

        <section className="sk-card sk-sheets">
          <div className="sk-row-between sk-sheets-head">
            <Bar className="sk-h-md" />
            {!isPublic && (
              <div className="sk-sheet-actions">
                <Bar />
                <Bar />
                <Bar />
              </div>
            )}
          </div>
          {times(2, (i) => (
            <div className="sk-sheet-row" key={i}>
              <div className="sk-row-between">
                <Bar className="sk-sheet-name" />
                <Bar className="sk-sheet-counts" />
              </div>
              <Bar className="sk-progress sk-progress-md" />
            </div>
          ))}
        </section>
      </div>

      <div className="sk-profile-main">
        <section className="sk-card sk-heat-card">
          <div className="sk-row-between">
            <Bar className="sk-heat-title" />
            <Bar className="sk-year" />
          </div>
          <Bar className="sk-heat-months" />
          <div className="sk-heat">
            <div className="sk-heat-days" />
            <div className="sk-heat-grid">
              {times(53 * 7, (i) => (
                <span className="sk-heat-cell" key={i} />
              ))}
            </div>
          </div>
          <div className="sk-row-between">
            <Bar className="sk-text-sm" />
            <Bar className="sk-text-sm" />
          </div>
        </section>

        <section className="sk-card sk-recent">
          <div className="sk-row-between sk-recent-head">
            <div className="sk-stack">
              <Bar className="sk-h-sm" />
              {!isPublic && <Bar className="sk-text-sm" />}
            </div>
            <Bar className="sk-count-box" />
          </div>
          {times(8, (i) => (
            <div className="sk-ac-row" key={i}>
              <Bar className="sk-check" />
              <Bar className="sk-ac-title" />
              <Bar className="sk-ac-sheet" />
              <Bar className="sk-ac-date" />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

/* ---------- Settings and People ---------- */

function SettingsSkeleton() {
  return (
    <div className="sk-settings">
      <Bar className="sk-back" />
      <Bar className="sk-settings-title" />
      <section className="sk-card sk-form">
        {times(2, (i) => (
          <div className="sk-field" key={i}>
            <Bar className="sk-label" />
            <Bar className="sk-input" />
          </div>
        ))}
        <Bar className="sk-submit" />
      </section>
    </div>
  );
}

function PeopleSkeleton() {
  return (
    <div className="sk-people">
      <Bar className="sk-people-title" />
      <Bar className="sk-people-desc" />
      <Bar className="sk-people-search" />
      <Bar className="sk-people-hint" />
      <section className="sk-empty">
        <Users size={22} aria-hidden="true" />
        <Bar className="sk-empty-title" />
        <Bar className="sk-empty-text" />
      </section>
    </div>
  );
}

/* ---------- Entry ---------- */

export default function AppLoadingFallback({ fullScreen = true }) {
  const pathname = typeof window === "undefined" ? "/" : window.location.pathname;
  const variant = getVariant(pathname);
  const active = ACTIVE_NAV[variant];
  const Content = fullScreen ? "main" : "div";

  return (
    <div
      className={`sk-root sk-v-${variant}${fullScreen ? " sk-fullscreen" : ""}`}
      role="status"
      aria-label="Loading app"
    >
      {fullScreen && <HeaderSkeleton active={active} />}
      <Content className="sk-page" aria-hidden="true">
        {variant === "daily-log" ? (
          <DailyLogSkeleton />
        ) : variant === "profile" ? (
          <ProfileSkeleton />
        ) : variant === "public" ? (
          <ProfileSkeleton isPublic />
        ) : variant === "settings" ? (
          <SettingsSkeleton />
        ) : variant === "people" ? (
          <PeopleSkeleton />
        ) : (
          <TrackerSkeleton />
        )}
      </Content>
      {fullScreen && <MobileNavSkeleton active={active} />}
    </div>
  );
}