/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    fontSize: {
      xs: ["var(--font-size-xs)", { lineHeight: "1rem" }],
      sm: ["var(--font-size-sm)", { lineHeight: "1.25rem" }],
      base: ["var(--font-size-base)", { lineHeight: "1.5rem" }],
      lg: ["var(--font-size-lg)", { lineHeight: "1.75rem" }],
      xl: ["var(--font-size-xl)", { lineHeight: "1.75rem" }],
      "3xl": ["var(--font-size-display)", { lineHeight: "2.25rem" }],
    },
    fontWeight: {
      normal: "var(--font-weight-normal)",
      medium: "var(--font-weight-medium)",
      semibold: "var(--font-weight-semibold)",
    },
    extend: {
      screens: {
        mobile: { max: "767px" },
      },
      colors: {
        page: "var(--page)",
        panel: "var(--surface)",
        rowHover: "var(--surface-hover)",
        skippedRow: "var(--skipped-row-bg)",
        border: "var(--border)",
        subtle: "var(--border-subtle)",
        mid: "var(--border-mid)",
        "border-strong": "var(--border-strong)",
        text: "var(--text)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        accentHover: "var(--accent-hover)",
        onAccent: "var(--on-accent)",
        done: "var(--study-accent)",
        skip: "var(--muted)",
        success: "var(--success)",
        danger: "var(--danger)",
      },
      fontFamily: {
        sans: ["Segoe UI Variable", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-sm)",
        md: "var(--radius-sm)",
        lg: "var(--radius-sm)",
        xl: "var(--radius-md)",
        "2xl": "var(--radius-lg)",
        "3xl": "var(--radius-lg)",
        full: "var(--radius-full)",
      },
    },
  },
  plugins: [],
};
