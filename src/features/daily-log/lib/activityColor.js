export const ACTIVITY_COLOR_PALETTE = [
  { id: "sand", name: "Sand", hex: "#c9a96e" },
  { id: "slate_blue", name: "Slate blue", hex: "#657fb6" },
  { id: "sky", name: "Sky", hex: "#90d4fe" },
  { id: "olive", name: "Olive", hex: "#718b4f" },
  { id: "rose", name: "Rose", hex: "#f9b3d1" },
  { id: "dusty_red", name: "Dusty red", hex: "#b97276" },
  { id: "teal", name: "Teal", hex: "#59b7af" },
  { id: "lavender", name: "Lavender", hex: "#b496d0" },
  { id: "mint", name: "Mint", hex: "#a7daa6" },
  { id: "deep_teal", name: "Deep teal", hex: "#2b9192" },
  { id: "peach", name: "Peach", hex: "#f7bd8f" },
  { id: "salmon", name: "Salmon", hex: "#e1979b" },
  { id: "steel_blue", name: "Steel blue", hex: "#6da0d1" },
  { id: "bronze", name: "Bronze", hex: "#b28b50" },
  { id: "sage", name: "Sage", hex: "#87a76c" },
];

const PALETTE_BY_ID = new Map(ACTIVITY_COLOR_PALETTE.map((color) => [color.id, color]));
const FIXED_ACTIVITY_COLORS = {
  "dsa sheet": "sand",
  backend: "slate_blue",
  "system design": "sky",
  project: "olive",
  reading: "rose",
};

export function getActivityKey(name) {
  const normalized = String(name || "Activity")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  return normalized === "dsa" ? "dsa sheet" : normalized;
}

export function isActivityColorValue(value) {
  return PALETTE_BY_ID.has(value) || /^#[0-9a-f]{6}$/i.test(String(value || ""));
}

export function getActivityColor(name, assignments = {}) {
  const key = getActivityKey(name);
  if (key === "sleep") return "var(--activity-color-sleep)";

  const assignedColor = assignments[key] || FIXED_ACTIVITY_COLORS[key] || "sand";
  if (PALETTE_BY_ID.has(assignedColor)) {
    return `var(--activity-color-${assignedColor.replace(/_/g, "-")})`;
  }
  if (/^#[0-9a-f]{6}$/i.test(assignedColor)) return assignedColor;
  return "var(--activity-color-sand)";
}
