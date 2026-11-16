const fs = require("fs");
const path = require("path");

const root = __dirname;
const results = [];

// transform(text) returns new text, null (already applied), or undefined (anchor not found)
function edit(file, label, transform) {
  const full = path.join(root, file);
  const raw = fs.readFileSync(full, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const after = transform(raw.replace(/\r\n/g, "\n"));
  if (after === null) return results.push(`skip   ${file}: ${label} (already applied)`);
  if (after === undefined) return results.push(`FAILED ${file}: ${label} (anchor not found, edit by hand)`);
  fs.writeFileSync(full, after.replace(/\n/g, eol), "utf8");
  results.push(`ok     ${file}: ${label}`);
}

// 1. Vendor chunks: React and Supabase stay cached across deploys
edit("vite.config.js", "vendor chunks", (text) => {
  if (text.includes("manualChunks")) return null;
  return [
    'import { defineConfig } from "vite";',
    'import react from "@vitejs/plugin-react";',
    "",
    "export default defineConfig({",
    "  plugins: [react()],",
    "  server: { port: 5173 },",
    "  build: {",
    "    rollupOptions: {",
    "      output: {",
    "        manualChunks: {",
    '          "vendor-react": ["react", "react-dom"],',
    '          "vendor-supabase": ["@supabase/supabase-js"],',
    "        },",
    "      },",
    "    },",
    "  },",
    "});",
    "",
  ].join("\n");
});

// 2. Long-lived cache for hashed build assets (Vite emits them under /assets)
edit("vercel.json", "immutable asset cache", (text) => {
  if (text.includes('"headers"')) return null;
  const config = JSON.parse(text);
  const next = {
    headers: [
      {
        source: "/assets/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ],
    ...config,
  };
  return JSON.stringify(next, null, 2) + "\n";
});

// 3. Open the Supabase connection before the JS asks for it
edit("index.html", "preconnect to Supabase", (text) => {
  if (text.includes("rel=\"preconnect\"")) return null;
  const anchor = '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />';
  if (!text.includes(anchor)) return undefined;
  return text.replace(
    anchor,
    '<link rel="preconnect" href="%VITE_SUPABASE_URL%" crossorigin />\n    ' + anchor,
  );
});

// 4. Start downloading app chunks while auth is still restoring
edit("src/App.jsx", "early chunk preload", (text) => {
  if (text.includes("loadAuthenticatedApp")) return null;
  const lazyLine =
    'const AuthenticatedApp = lazy(() => import("./features/dashboard/AuthenticatedApp"));';
  const appStart = "function App() {";
  if (!text.includes(lazyLine) || !text.includes(appStart)) return undefined;

  const preloadBlock = [
    "// If this browser has signed in before, start fetching the app chunks now so the",
    "// download overlaps with the session check instead of waiting for it.",
    "try {",
    '  if (localStorage.getItem("momentum:account-cache")) {',
    "    loadAuthenticatedApp().catch(() => {});",
    "    preloadCurrentPage(window.location.pathname)?.catch(() => {});",
    "  }",
    "} catch {",
    "  // Storage may be unavailable; normal lazy loading still works.",
    "}",
    "",
    appStart,
  ].join("\n");

  return text
    .replace(
      lazyLine,
      'const loadAuthenticatedApp = () => import("./features/dashboard/AuthenticatedApp");\n' +
        "const AuthenticatedApp = lazy(loadAuthenticatedApp);",
    )
    .replace(appStart, preloadBlock);
});

console.log(results.join("\n"));