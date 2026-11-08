import { useEffect, useRef, useState } from "react";
import {
  ClipboardList,
  LayoutList,
  LogOut,
  Moon,
  Pencil,
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
  userName = "",
  onSignOut,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
        <div className="app-header-actions" ref={menuRef}>
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
            className="avatar-btn"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Account menu"
            onClick={() => setOpen((current) => !current)}
          >
            {(userName || "U").charAt(0).toUpperCase()}
          </button>
          {open && (
            <div className="popover popover-right" role="menu" style={{ top: "100%" }}>
              <button
                type="button"
                role="menuitem"
                className="popover-item"
                onClick={() => {
                  setOpen(false);
                  onNavigate("/profile/edit");
                }}
              >
                <Pencil size={15} /> Edit profile
              </button>
              <div className="popover-sep" />
              <button
                type="button"
                role="menuitem"
                className="popover-item"
                style={{ color: "#f87171" }}
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
