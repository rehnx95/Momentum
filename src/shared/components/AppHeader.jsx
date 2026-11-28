import { ClipboardList, LayoutList, LogOut, Moon, Sun, User, Users } from "lucide-react";
import MomentumBrand from "./MomentumBrand";
import OfflineSyncStatus from "./OfflineSyncStatus";
import FeedbackButton from "./FeedbackButton";
import Tooltip from "./Tooltip";
import { preloadForPath } from "../lib/preload";

const NAV = [
  { id: "tracker", label: "Tracker", path: "/", icon: LayoutList },
  { id: "daily-log", label: "Activity Log", path: "/daily-log", icon: ClipboardList },
  { id: "people", label: "People", path: "/people", icon: Users },
  { id: "profile", label: "Profile", path: "/profile", icon: User },
];

export default function AppHeader({
  active,
  onNavigate,
  theme,
  setTheme,
  onSignOut,
  testDataTools,
  offlineSync,
}) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <MomentumBrand onNavigate={() => onNavigate("/")} />
        <nav className="app-nav" aria-label="Main navigation">
          {NAV.map(({ id, label, path, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onPointerEnter={() => preloadForPath(path)}
              onFocus={() => preloadForPath(path)}
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
          {testDataTools}
          <FeedbackButton placement="header" />
          {offlineSync && (
            <OfflineSyncStatus
              online={offlineSync.online}
              pendingCount={offlineSync.pendingCount}
              syncing={offlineSync.syncing}
              message={offlineSync.message}
              onRetry={() => void offlineSync.retrySync()}
            />
          )}
          <button
            type="button"
            className="icon-btn"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Tooltip label="Sign out">
            <button
              type="button"
              className="icon-btn signout-btn"
              aria-label="Sign out"
              onClick={onSignOut}
            >
              <LogOut size={18} />
             
            </button>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
