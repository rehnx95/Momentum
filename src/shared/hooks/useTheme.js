import { useEffect, useState } from "react";
import { getItem, setItem } from "../lib/safeStorage";

export const THEMES = [
  { id: "dark", label: "Dark", preview: ["#09090B", "#111113", "#818CF8"] },
  { id: "light", label: "Light", preview: ["#F7F7F8", "#FFFFFF", "#4F46E5"] },
  { id: "cocoa", label: "Cocoa", preview: ["#2F2626", "#3B3030", "#E0A96D"] },
];

const validThemes = new Set(THEMES.map((theme) => theme.id));

function getStoredTheme() {
  try {
    const stored = getItem("theme");
    if (stored && validThemes.has(stored)) return stored;
  } catch (error) {
    console.warn("Unable to read theme preference.", error);
  }
  return null;
}

function getInitialTheme() {
  const storedTheme = getStoredTheme();
  if (storedTheme) return storedTheme;
  const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
  return prefersLight ? "light" : "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState(() => getInitialTheme());

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);

    if (!setItem("theme", theme)) {
      console.warn("Unable to persist theme preference.");
    }

    const themeColorMeta = document.head.querySelector('meta[name="theme-color"]') || document.createElement("meta");
    themeColorMeta.setAttribute("name", "theme-color");
    themeColorMeta.setAttribute("content", getComputedStyle(root).getPropertyValue("--page").trim() || "#09090B");
    if (!themeColorMeta.parentNode) {
      document.head.appendChild(themeColorMeta);
    }
  }, [theme]);

  return { theme, setTheme, themes: THEMES };
}
