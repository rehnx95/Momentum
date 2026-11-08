import {
  ClipboardList,
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

export default function AppHeader({
  active,
  onNavigate,
  theme,
  setTheme,
  onSignOut,
}) {
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
            className="icon-btn"
            aria-label="Sign out"
            title="Sign out"
            onClick={onSignOut}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
