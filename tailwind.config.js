/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        page: 'var(--page)',
        overlay: 'var(--page-overlay)',
        surface: 'var(--surface)',
        panel: 'var(--surface)',
        rowHover: 'var(--surface-hover)',
        border: { DEFAULT: 'var(--border)', strong: 'var(--border-strong)', input: 'var(--input-border)' },
        text: 'var(--text)',
        muted: 'var(--muted)',
        accent: { DEFAULT: 'var(--accent)', hover: 'var(--accent-hover)', soft: 'var(--accent-soft)', fg: 'var(--on-accent)' },
        danger: 'var(--danger)',
        success: 'var(--success)',
        warning: 'var(--warning)',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
