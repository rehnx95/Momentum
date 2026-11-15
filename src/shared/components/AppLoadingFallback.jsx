export default function AppLoadingFallback({ fullScreen = true }) {
  const Content = fullScreen ? "main" : "div";

  return (
    <div
      className={`app-loading-fallback${fullScreen ? " app-loading-fallback-fullscreen" : ""}`}
      role="status"
      aria-label="Loading app"
    >
      {fullScreen && (
        <header className="app-loading-fallback-header" aria-hidden="true">
          <span className="app-loading-fallback-brand">Momentum</span>
          <nav className="app-loading-fallback-nav">
            <span />
            <span />
            <span />
            <span />
          </nav>
          <span className="app-loading-fallback-action" />
        </header>
      )}
      <Content className="app-loading-fallback-content" aria-hidden="true">
        <span className="app-loading-fallback-title" />
        <span className="app-loading-fallback-subtitle" />
        <div className="app-loading-fallback-cards">
          <span />
          <span />
          <span />
        </div>
      </Content>
    </div>
  );
}
