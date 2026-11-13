import {
  ClipboardList,
  LayoutList,
  LogOut,
  User,
  Users,
} from "lucide-react";
import { THEMES } from "../hooks/useTheme";
import MomentumBrand from "./MomentumBrand";
import ThemeMenu from "./ThemeMenu";
import Tooltip from "./Tooltip";

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
  testDataTools,
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
          <ThemeMenu theme={theme} setTheme={setTheme} themes={THEMES} />
          <Tooltip label="Sign out">
            <button
              type="button"
              className="icon-btn signout-btn"
              aria-label="Sign out"
              onClick={onSignOut}
            >
              <LogOut size={18} />
              <span className="signout-label">Sign out</span>
            </button>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
