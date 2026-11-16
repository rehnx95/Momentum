const fs = require("fs");
const path = require("path");
const root = process.cwd();
const p = (...s) => path.join(root, ...s);

function edit(file, label, fn) {
  const full = p(file);
  const before = fs.readFileSync(full, "utf8").replace(/\r\n/g, "\n");
  const after = fn(before);
  if (after === null) return console.log(`${label}: already applied, skipping.`);
  if (after === before) return console.warn(`${label}: pattern not found, NOT changed.`);
  fs.writeFileSync(full, after, "utf8");
  console.log(`${label}: updated.`);
}

// ---------- 1. Skeleton: match the real tracker layout ----------
edit("src/shared/components/AppLoadingFallback.jsx", "AppLoadingFallback.jsx", (src) => {
  if (src.includes("app-loading-tracker-layout")) return null;
  const next = `function TrackerLoadingContent() {
  return (
    <div className="app-loading-tracker-layout">
      <div className="app-loading-tracker-main">
        <div className="app-loading-tracker-heading">
          <LoadingBar className="app-loading-tracker-title" />
          <LoadingBar className="app-loading-tracker-count" />
          <span className="app-loading-spacer" />
          <LoadingBar className="app-loading-search app-loading-tracker-search" />
        </div>
        <div className="app-loading-filters">
          {Array.from({ length: 5 }, (_, index) => (
            <LoadingBar key={index} className={index === 0 ? "is-active" : ""} />
          ))}
        </div>
        <section className="app-loading-progress-card app-loading-progress-inline">
          <div className="app-loading-progress-heading">
            <div>
              <LoadingBar className="app-loading-label" />
              <LoadingBar className="app-loading-copy" />
            </div>
            <LoadingBar className="app-loading-progress-number" />
          </div>
          <LoadingBar className="app-loading-progress-track" />
          <div className="app-loading-progress-stats">
            <LoadingBar />
            <LoadingBar />
            <LoadingBar />
          </div>
        </section>
        <div className="app-loading-row-list">
          {Array.from({ length: 8 }, (_, index) => (
            <div className="app-loading-list-row" key={index}>
              <LoadingBar className="app-loading-row-icon" />
              <LoadingBar className="app-loading-row-title" />
              <LoadingBar className="app-loading-row-count" />
            </div>
          ))}
        </div>
      </div>
      <aside className="app-loading-tracker-side">
        <section className="app-loading-progress-card">
          <LoadingBar className="app-loading-label" />
          <LoadingBar className="app-loading-progress-number" />
          <LoadingBar className="app-loading-copy" />
          <LoadingBar className="app-loading-progress-track" />
          <div className="app-loading-progress-stats">
            <LoadingBar />
            <LoadingBar />
            <LoadingBar />
          </div>
        </section>
      </aside>
    </div>
  );
}

function ProfileLoadingContent`;
  return src.replace(
    /function TrackerLoadingContent\(\) \{[\s\S]*?\n\}\n\nfunction ProfileLoadingContent/,
    () => next,
  );
});

// ---------- 2. Skeleton CSS: same paddings, grid and sidebar as the real pages ----------
edit("src/styles/theme-and-status.css", "theme-and-status.css", (src) => {
  const marker = "/* perf-skeleton-match */";
  if (src.includes(marker)) return null;
  return (
    src.trimEnd() +
    `

${marker}
.app-loading-tracker-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}
.app-loading-tracker-main {
  display: grid;
  gap: 1rem;
  min-width: 0;
}
.app-loading-tracker-heading {
  flex-wrap: wrap;
  justify-content: flex-start;
}
.app-loading-spacer {
  flex: 1 1 0;
}
.app-loading-tracker-search {
  flex: 1 1 100%;
  height: 2.5rem;
}
.app-loading-tracker-side {
  display: none;
}
.app-loading-fallback-fullscreen.app-loading-fallback-tracker .app-loading-fallback-content {
  padding-top: 1rem;
}

@media (min-width: 640px) {
  .app-loading-tracker-search {
    flex: none;
    width: 18rem;
  }
}

@media (min-width: 768px) {
  .app-loading-fallback-fullscreen .app-loading-header-inner,
  .app-loading-fallback-fullscreen .app-loading-fallback-content {
    padding-inline: 1.5rem;
  }
  .app-loading-desktop-nav .app-loading-bar {
    width: 7rem;
  }
  .app-loading-filters {
    width: max-content;
  }
  .app-loading-filters .app-loading-bar {
    flex: none;
    width: 4.5rem;
    height: 2rem;
  }
}

@media (min-width: 761px) {
  .app-loading-fallback-fullscreen.app-loading-fallback-daily-log .app-loading-fallback-content {
    padding: 1.25rem 2rem 2.25rem;
  }
}

@media (min-width: 1100px) {
  .app-loading-tracker-layout {
    grid-template-columns: minmax(0, 1fr) 20rem;
  }
  .app-loading-progress-inline {
    display: none;
  }
  .app-loading-tracker-side {
    display: block;
  }
}
`
  );
});

// ---------- 3. index.html: no theme flash, black background before JS ----------
edit("index.html", "index.html", (src) => {
  if (src.includes("<!-- perf-boot -->")) return null;
  return src.replace(
    '<link rel="icon"',
    `<!-- perf-boot -->
    <style>
      html,
      body {
        background: #000;
      }
      html[data-theme="light"],
      html[data-theme="light"] body {
        background: #f5f5f5;
      }
    </style>
    <script>
      try {
        if (localStorage.getItem("theme") === "light")
          document.documentElement.setAttribute("data-theme", "light");
      } catch (e) {}
    </script>
    <link rel="icon"`,
  );
});

// ---------- 4. Preload helper: start loading code before React renders ----------
const preloadPath = p("src/shared/lib/preload.js");
fs.writeFileSync(
  preloadPath,
  `const routeLoaders = {
  "/profile/edit": () => import("../../features/profile/pages/ProfileSettings"),
  "/profile": () => import("../../features/profile/pages/ProfilePage"),
  "/people": () => import("../../features/people/PeopleSearchPage"),
  "/daily-log": () => import("../../features/daily-log/components/DailyTracker"),
};
const publicProfileLoader = () => import("../../features/people/PublicProfilePage");

function hasCachedAccount() {
  try {
    return Boolean(localStorage.getItem("momentum:account-cache"));
  } catch {
    return false;
  }
}

function safe(loader) {
  loader().catch(() => {});
}

export function preconnectBackend() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) return;
  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = url;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

export function preloadForPath(pathname) {
  if (!hasCachedAccount()) return;
  safe(() => import("../../features/dashboard/AuthenticatedApp"));
  if (routeLoaders[pathname]) safe(routeLoaders[pathname]);
  else if (/^\\/(?:user|u)\\/[A-Za-z0-9-]{3,48}\\/?$/.test(pathname)) safe(publicProfileLoader);
}

export function prefetchRoutesWhenIdle() {
  if (!hasCachedAccount()) return;
  const run = () => {
    Object.values(routeLoaders).forEach(safe);
    safe(publicProfileLoader);
  };
  const schedule = () =>
    "requestIdleCallback" in window
      ? window.requestIdleCallback(run, { timeout: 4000 })
      : window.setTimeout(run, 2000);
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
}
`,
  "utf8",
);
console.log("preload.js: written.");

edit("src/main.jsx", "main.jsx", (src) => {
  if (src.includes("shared/lib/preload")) return null;
  let out = src.replace(
    'import App from "./App";',
    'import App from "./App";\nimport { preconnectBackend, preloadForPath, prefetchRoutesWhenIdle } from "./shared/lib/preload";',
  );
  out = out.replace(
    "ReactDOM.createRoot(",
    `preconnectBackend();
preloadForPath(window.location.pathname);
prefetchRoutesWhenIdle();

ReactDOM.createRoot(`,
  );
  return out;
});

// ---------- 5. Signed-out visitors skip the loading screen ----------
edit("src/features/auth/useAuthentication.js", "useAuthentication.js", (src) => {
  if (src.includes("hasStoredSession")) return null;
  let out = src.replace(
    "const profileRequests = new Map();",
    `const profileRequests = new Map();

function hasStoredSession() {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has("code") || url.hash.includes("access_token")) return true;
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) return true;
    }
    return false;
  } catch {
    return true;
  }
}`,
  );
  out = out.replace(
    "if (!cachedAccount) return AppState.LOADING;",
    "if (!cachedAccount) return hasStoredSession() ? AppState.LOADING : AppState.UNAUTHENTICATED;",
  );
  return out;
});

// ---------- 6. Vite: vendor chunks + modern target ----------
fs.writeFileSync(
  p("vite.config.js"),
  `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@supabase")) return "supabase";
          if (/node_modules\\/(react|react-dom|scheduler)\\//.test(id)) return "react";
          return undefined;
        },
      },
    },
  },
});
`,
  "utf8",
);
console.log("vite.config.js: written.");

// ---------- 7. Vercel: long-lived caching for hashed assets ----------
fs.writeFileSync(
  p("vercel.json"),
  JSON.stringify(
    {
      rewrites: [{ source: "/(.*)", destination: "/index.html" }],
      headers: [
        {
          source: "/assets/(.*)",
          headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
        },
        {
          source: "/favicon.svg",
          headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
        },
      ],
    },
    null,
    2,
  ) + "\n",
  "utf8",
);
console.log("vercel.json: written.");

console.log("\\nDone. Run: npm run lint && npm test && npm run build");