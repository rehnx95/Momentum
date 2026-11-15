import { Activity, Users } from "lucide-react";

const navigation = [
  { id: "tracker", label: "Tracker" },
  { id: "daily-log", label: "Activity Log" },
  { id: "people", label: "People" },
  { id: "profile", label: "Profile" },
];

function getLoadingVariant(pathname) {
  if (pathname === "/daily-log") return "daily-log";
  if (pathname === "/people") return "people";
  if (/^\/(?:profile|u\/|user\/)/.test(pathname)) return "profile";
  return "tracker";
}

function LoadingBar({ className = "" }) {
  return <span className={`app-loading-bar ${className}`} />;
}

function TrackerLoadingContent() {
  return (
    <>
      <div className="app-loading-tracker-heading">
        <LoadingBar className="app-loading-tracker-title" />
        <LoadingBar className="app-loading-tracker-count" />
      </div>
      <LoadingBar className="app-loading-search" />
      <div className="app-loading-filters">
        {Array.from({ length: 5 }, (_, index) => (
          <LoadingBar key={index} className={index === 0 ? "is-active" : ""} />
        ))}
      </div>
      <section className="app-loading-progress-card">
        <div className="app-loading-progress-heading">
          <div>
            <LoadingBar className="app-loading-label" />
            <LoadingBar className="app-loading-copy" />
          </div>
          <LoadingBar className="app-loading-progress-number" />
        </div>
        <LoadingBar className="app-loading-progress-track" />
        <div className="app-loading-progress-stats">
          <LoadingBar />
          <LoadingBar />
          <LoadingBar />
        </div>
      </section>
      <div className="app-loading-row-list">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="app-loading-list-row" key={index}>
            <LoadingBar className="app-loading-row-icon" />
            <LoadingBar className="app-loading-row-title" />
            <LoadingBar className="app-loading-row-count" />
          </div>
        ))}
      </div>
    </>
  );
}

function ProfileLoadingContent() {
  return (
    <div className="app-loading-profile-layout">
      <div className="app-loading-profile-column">
        <section className="app-loading-profile-card">
          <div className="app-loading-profile-identity">
            <LoadingBar className="app-loading-avatar" />
            <div className="app-loading-profile-copy">
              <LoadingBar className="app-loading-profile-name" />
              <LoadingBar className="app-loading-copy" />
              <LoadingBar className="app-loading-copy app-loading-email" />
            </div>
          </div>
          <div className="app-loading-profile-stats">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index}>
                <LoadingBar className="app-loading-copy" />
                <LoadingBar className="app-loading-stat-value" />
              </div>
            ))}
          </div>
        </section>
        <section className="app-loading-profile-card app-loading-sheet-progress">
          <div className="app-loading-card-heading">
            <LoadingBar className="app-loading-section-title" />
            <LoadingBar className="app-loading-button" />
          </div>
          {Array.from({ length: 3 }, (_, index) => (
            <div className="app-loading-sheet-row" key={index}>
              <div className="app-loading-sheet-meta">
                <LoadingBar className="app-loading-sheet-name" />
                <LoadingBar className="app-loading-copy" />
              </div>
              <LoadingBar className="app-loading-sheet-track" />
            </div>
          ))}
        </section>
      </div>
      <div className="app-loading-profile-column">
        <section className="app-loading-profile-card">
          <div className="app-loading-card-heading">
            <LoadingBar className="app-loading-section-title" />
            <LoadingBar className="app-loading-button" />
          </div>
          <div className="app-loading-heatmap-clip">
            <div className="app-loading-heatmap-months">
              {Array.from({ length: 12 }, (_, index) => (
                <LoadingBar key={index} />
              ))}
            </div>
            <div className="app-loading-heatmap">
              {Array.from({ length: 53 }, (_, week) => (
                <div className="app-loading-heat-week" key={week}>
                  {Array.from({ length: 7 }, (_, day) => (
                    <LoadingBar
                      className={`app-loading-heat-cell tone-${(week + day) % 4}`}
                      key={day}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="app-loading-profile-card">
          <div className="app-loading-card-heading">
            <LoadingBar className="app-loading-section-title" />
            <LoadingBar className="app-loading-button" />
          </div>
          {Array.from({ length: 4 }, (_, index) => (
            <div className="app-loading-activity-row" key={index}>
              <LoadingBar className="app-loading-row-icon" />
              <LoadingBar className="app-loading-row-title" />
              <LoadingBar className="app-loading-row-count" />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function DailyLogLoadingContent() {
  return (
    <>
      <header className="app-loading-daily-toolbar">
        <div className="app-loading-daily-title-group">
          <LoadingBar className="app-loading-section-title" />
          <LoadingBar className="app-loading-daily-subtitle" />
        </div>
        <LoadingBar className="app-loading-daily-switcher" />
      </header>
      <div className="app-loading-daily-date">
        <LoadingBar className="app-loading-date-arrow" />
        <LoadingBar className="app-loading-button app-loading-date" />
        <LoadingBar className="app-loading-date-arrow" />
      </div>
      <div className="app-loading-daily-layout">
        <section className="app-loading-profile-card app-loading-daily-activities">
          <div className="app-loading-card-heading">
            <LoadingBar className="app-loading-section-title" />
            <LoadingBar className="app-loading-copy" />
          </div>
          {Array.from({ length: 2 }, (_, index) => (
            <div className="app-loading-activity-row" key={index}>
              <LoadingBar className="app-loading-row-icon" />
              <LoadingBar className="app-loading-row-title" />
              <LoadingBar className="app-loading-row-count" />
            </div>
          ))}
        </section>
        <div className="app-loading-daily-panels">
          <section className="app-loading-profile-card app-loading-quick-log">
            <LoadingBar className="app-loading-section-title" />
            <LoadingBar className="app-loading-search" />
            <div className="app-loading-quick-tags">
              <LoadingBar />
              <LoadingBar />
            </div>
          </section>
          <section className="app-loading-profile-card app-loading-sleep">
            <div className="app-loading-card-heading">
              <LoadingBar className="app-loading-section-title" />
              <LoadingBar className="app-loading-copy" />
            </div>
            <div className="app-loading-sleep-times">
              <LoadingBar />
              <LoadingBar />
            </div>
            <LoadingBar className="app-loading-sleep-note" />
          </section>
        </div>
      </div>
    </>
  );
}

function PeopleLoadingContent() {
  return (
    <div className="app-loading-people-layout">
      <LoadingBar className="app-loading-section-title app-loading-people-title" />
      <div className="app-loading-people-description">
        <LoadingBar />
        <LoadingBar />
      </div>
      <LoadingBar className="app-loading-search app-loading-people-search" />
      <LoadingBar className="app-loading-people-hint" />
      <section className="app-loading-people-empty">
        <Users size={22} aria-hidden="true" />
        <LoadingBar className="app-loading-people-empty-title" />
        <div className="app-loading-people-description">
          <LoadingBar />
          <LoadingBar />
        </div>
      </section>
    </div>
  );
}

export default function AppLoadingFallback({ fullScreen = true }) {
  const pathname = typeof window === "undefined" ? "/" : window.location.pathname;
  const variant = getLoadingVariant(pathname);
  const Content = fullScreen ? "main" : "div";
  const activeNavigation = variant === "profile" ? "profile" : variant;

  return (
    <div
      className={`app-loading-fallback app-loading-fallback-${variant}${fullScreen ? " app-loading-fallback-fullscreen" : ""}`}
      role="status"
      aria-label="Loading app"
    >
      {fullScreen && (
        <header className="app-loading-fallback-header" aria-hidden="true">
          <div className="app-loading-header-inner">
            <span className="app-loading-brand">
              <span className="app-loading-brand-icon">
                <Activity size={20} aria-hidden="true" />
              </span>
              <span className="app-loading-brand-name">Momentum</span>
            </span>
            <nav className="app-loading-desktop-nav">
              {navigation.map(({ id }) => (
                <LoadingBar
                  className={id === activeNavigation ? "is-active" : ""}
                  key={id}
                />
              ))}
            </nav>
            <div className="app-loading-header-actions">
              <LoadingBar />
              <LoadingBar />
            </div>
          </div>
        </header>
      )}
      <Content className="app-loading-fallback-content" aria-hidden="true">
        {variant === "profile" ? (
          <ProfileLoadingContent />
        ) : variant === "daily-log" ? (
          <DailyLogLoadingContent />
        ) : variant === "people" ? (
          <PeopleLoadingContent />
        ) : (
          <TrackerLoadingContent />
        )}
      </Content>
      {fullScreen && (
        <nav className="app-loading-mobile-nav" aria-hidden="true">
          {navigation.map(({ id }) => (
            <span
              className={`app-loading-mobile-item${id === activeNavigation ? " is-active" : ""}`}
              key={id}
            >
              <LoadingBar />
              <LoadingBar />
            </span>
          ))}
        </nav>
      )}
    </div>
  );
}
