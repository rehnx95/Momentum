import { useEffect, useState } from "react";
import {
  ClipboardList,
  CircleStop,
  LayoutList,
  LogOut,
  Moon,
  Sun,
  User,
  Users,
} from "lucide-react";
import TrackSheetBrand from "./TrackSheetBrand";

const NAV = [
  { id: "tracker", label: "Tracker", path: "/", icon: LayoutList },
  { id: "daily-log", label: "Daily Log", path: "/daily-log", icon: ClipboardList },
  { id: "people", label: "People", path: "/people", icon: Users },
  { id: "profile", label: "Profile", path: "/profile", icon: User },
];

const TIMER_STORAGE = (userId) => `track-sheet-running-timer:${userId}`;

export default function AppHeader({
  active,
  onNavigate,
  theme,
  setTheme,
  onSignOut,
  userId,
}) {
  const [runningTimer, setRunningTimer] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!userId) return undefined;
    const syncTimer = () => {
      try {
        const value = localStorage.getItem(TIMER_STORAGE(userId));
        const timer = value ? JSON.parse(value) : null;
        setRunningTimer(
          timer &&
            typeof timer.activityName === "string" &&
            Number.isFinite(new Date(timer.startedAt).getTime())
            ? timer
            : null,
        );
      } catch (error) {
        console.error("Could not read the running timer:", error);
        setRunningTimer(null);
      }
      setNow(Date.now());
    };
    syncTimer();
    const interval = window.setInterval(syncTimer, 1000);
    return () => window.clearInterval(interval);
  }, [userId]);

  const elapsedSeconds = runningTimer
    ? Math.max(0, Math.floor((now - new Date(runningTimer.startedAt).getTime()) / 1000))
    : 0;
  const elapsed = [
    Math.floor(elapsedSeconds / 3600),
    Math.floor((elapsedSeconds % 3600) / 60),
    elapsedSeconds % 60,
  ]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <TrackSheetBrand onNavigate={() => onNavigate("/")} />
        <nav className="app-nav" aria-label="Main navigation">
          {NAV.map(({ id, label, path, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(path)}
              aria-current={active === id ? "page" : undefined}
              className={active === id ? "active" : ""}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="app-header-actions">
          {runningTimer && (
            <button
              type="button"
              className="running-timer-pill"
              onClick={() => {
                try {
                  localStorage.setItem("track-sheet-stop-timer-on-open", "1");
                  window.dispatchEvent(new Event("daily-log-stop-timer"));
                } catch (error) {
                  console.error("Could not request timer stop:", error);
                }
                onNavigate("/daily-log");
              }}
              title="Stop timer and return to Daily Log"
            >
              <span aria-hidden="true">●</span>
              <span>Stop {runningTimer.activityName} · {elapsed}</span>
              <CircleStop size={16} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            className="icon-btn"
            onClick={() =>
              setTheme((current) => (current === "dark" ? "light" : "dark"))
            }
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            type="button"
            className="icon-btn signout-btn"
            aria-label="Sign out"
            title="Sign out"
            onClick={onSignOut}
          >
            <LogOut size={18} />
            <span className="signout-label">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
