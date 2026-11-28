import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.css";
import "./styles/shared-components.css";
import "./styles/interaction-layout.css";
import "./styles/theme-and-status.css";
import "./styles/layout.css";
import "./styles/responsive/core.css";
import App from "./App";
import FeedbackButton from "./shared/components/FeedbackButton";
import { preloadForPath } from "./shared/lib/preload";
import { clearPointerFocusOnClick } from "./shared/utils/pointerFocus";
import { initPwaIntegration } from "./pwa/pwaIntegration";
initPwaIntegration();

function PointerFocusReset() {
  React.useEffect(() => {
    document.addEventListener("click", clearPointerFocusOnClick);
    return () => document.removeEventListener("click", clearPointerFocusOnClick);
  }, []);

  return null;
}

function RevealScrollbarsWhileScrolling() {
  React.useEffect(() => {
    const hideTimers = new Map();
    const showScrollbars = (event) => {
      const element = event.target === document ? document.scrollingElement : event.target;
      if (!(element instanceof HTMLElement)) return;

      element.classList.add("scrollbars-visible");
      window.clearTimeout(hideTimers.get(element));
      hideTimers.set(
        element,
        window.setTimeout(() => {
          element.classList.remove("scrollbars-visible");
          hideTimers.delete(element);
        }, 700),
      );
    };

    document.addEventListener("scroll", showScrollbars, {
      capture: true,
      passive: true,
    });
    return () => {
      document.removeEventListener("scroll", showScrollbars, true);
      for (const [element, timer] of hideTimers) {
        window.clearTimeout(timer);
        element.classList.remove("scrollbars-visible");
      }
      hideTimers.clear();
    };
  }, []);

  return null;
}

class AppErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Application render failed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error-screen flex min-h-screen items-center justify-center px-6">
          <section className="max-w-md text-center">
            <h1 className="text-xl font-semibold">The app could not load</h1>
            <p className="mt-3 text-sm text-muted">
              Reload the page to try again. If this keeps happening, contact support and include the
              browser console error.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-secondary mt-6 rounded-lg px-4 py-2 text-sm font-semibold"
            >
              Reload app
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

window.addEventListener("vite:preloadError", (event) => {
  let shouldReload = false;
  try {
    const lastReload = Number(sessionStorage.getItem("momentum:chunk-reload-at"));
    shouldReload = !lastReload || Date.now() - lastReload > 60_000;
    if (shouldReload) {
      sessionStorage.setItem("momentum:chunk-reload-at", String(Date.now()));
    }
  } catch (error) {
    console.warn("Could not check the chunk-reload state:", error);
  }

  if (!shouldReload) return;
  event.preventDefault();
  window.location.reload();
});

preloadForPath(window.location.pathname);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Could not register offline app support:", error);
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PointerFocusReset />
    <RevealScrollbarsWhileScrolling />
    <AppErrorBoundary>
      <App />
      <FeedbackButton placement="floating" />
    </AppErrorBoundary>
  </React.StrictMode>,
);
