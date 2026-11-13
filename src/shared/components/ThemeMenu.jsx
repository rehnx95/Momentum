import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Palette } from "lucide-react";
import { THEMES } from "../hooks/useTheme";

export default function ThemeMenu({ theme, setTheme, themes = THEMES }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const itemRefs = useRef([]);

  const themeItems = useMemo(() => themes || [], [themes]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }

      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

      event.preventDefault();
      const currentIndex = themeItems.findIndex((item) => item.id === theme);
      const nextIndex = event.key === "ArrowDown"
        ? (currentIndex + 1 + themeItems.length) % themeItems.length
        : (currentIndex - 1 + themeItems.length) % themeItems.length;
      const nextItem = themeItems[nextIndex];
      if (nextItem) {
        itemRefs.current[nextIndex]?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, theme, themeItems]);

  const handleSelect = (nextTheme) => {
    setTheme(nextTheme);
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        type="button"
        className="icon-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Change theme"
        onClick={() => setOpen((current) => !current)}
      >
        <Palette size={18} />
      </button>
      {open && (
        <div className="popover popover-right" role="menu" aria-label="Choose theme">
          {themeItems.map((themeOption, index) => {
            const isActive = themeOption.id === theme;
            return (
              <button
                key={themeOption.id}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                className="popover-item"
                onClick={() => handleSelect(themeOption.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSelect(themeOption.id);
                  }
                }}
              >
                <span className="flex items-center justify-center gap-1.5">
                  {themeOption.preview.map((color) => (
                    <span
                      key={`${themeOption.id}-${color}`}
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ background: color, border: "1px solid rgba(255,255,255,0.18)" }}
                    />
                  ))}
                </span>
                <span className="flex-1">{themeOption.label}</span>
                {isActive && <Check size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
