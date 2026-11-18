#!/usr/bin/env node
/**
 * Momentum PWA patch #2. Run AFTER pwa-patch.cjs, from the repo root.
 *
 *   node pwa-patch-2.cjs                 apply
 *   node pwa-patch-2.cjs --dry           preview only
 *   node pwa-patch-2.cjs --icon path.png use a specific source image/SVG for the icons
 *   node pwa-patch-2.cjs --force         regenerate icons even if they exist
 *
 * What it does (safe to re-run):
 *   1. vite.config.js   -> build.manifest = "manifest.json" (your service worker needs /manifest.json)
 *   2. public/icons/    -> icon-192, icon-512, icon-maskable-512 (needs: npm i -D sharp) + manifest entries
 *   3. src/pwa/pwaIntegration.js + import in src/main.jsx:
 *        shortcuts (?shortcut=), share target, protocol links, .txt file launch,
 *        background-sync wiring, push-subscribe helper
 *   4. public/sw.js     -> stop serving the manifest cache-first (so manifest updates reach installed users)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const FORCE = argv.includes('--force');
const iconIdx = argv.indexOf('--icon');
const ICON_ARG = iconIdx > -1 ? argv[iconIdx + 1] : null;
const ROOT = process.cwd();

const abs = (rel) => path.join(ROOT, rel);
const exists = (rel) => fs.existsSync(abs(rel));
const read = (rel) => fs.readFileSync(abs(rel), 'utf8');
const notes = [];

function write(rel, content) {
  if (DRY) return console.log('[dry] would write', rel);
  fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
  fs.writeFileSync(abs(rel), content);
  console.log('wrote  ', rel);
}

if (!exists('package.json') || !exists('index.html')) {
  console.error('Run this from the Momentum repo root.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. vite.config.js
// ---------------------------------------------------------------------------
function patchVite() {
  const file = ['vite.config.js', 'vite.config.mjs', 'vite.config.ts'].find(exists);
  if (!file) return notes.push('No vite.config found. Add build: { manifest: "manifest.json" } yourself.');
  let src = read(file);
  const want = 'manifest: "manifest.json"';

  if (/manifest\s*:\s*["']manifest\.json["']/.test(src)) return console.log(file + ' already outputs manifest.json');

  let next = src;
  if (/\bmanifest\s*:\s*true\b/.test(src)) {
    next = src.replace(/\bmanifest\s*:\s*true\b/, want);
  } else if (/\bbuild\s*:\s*\{/.test(src)) {
    next = src.replace(/\bbuild\s*:\s*\{/, 'build: {\n    ' + want + ',');
  } else if (/defineConfig\(\s*\{/.test(src)) {
    next = src.replace(/defineConfig\(\s*\{/, (m) => m + '\n  build: { ' + want + ' },');
  } else if (/export\s+default\s*\{/.test(src)) {
    next = src.replace(/export\s+default\s*\{/, (m) => m + '\n  build: { ' + want + ' },');
  } else {
    return notes.push('Could not patch ' + file + ' automatically. Add build: { manifest: "manifest.json" }.');
  }
  write(file, next);
}
patchVite();

// ---------------------------------------------------------------------------
// 2. Icons (+ manifest entries)
// ---------------------------------------------------------------------------
async function makeIcons() {
  const manifestRel = ['public/manifest.webmanifest', 'public/manifest.json'].find(exists);
  if (!manifestRel) return notes.push('No public/manifest.webmanifest found. Run pwa-patch.cjs first.');
  const manifest = JSON.parse(read(manifestRel));
  manifest.icons = Array.isArray(manifest.icons) ? manifest.icons : [];

  const targets = [
    { file: 'icon-192.png', size: 192, purpose: 'any' },
    { file: 'icon-512.png', size: 512, purpose: 'any' },
    { file: 'icon-maskable-512.png', size: 512, purpose: 'maskable' },
  ];

  const have = (t) =>
    manifest.icons.some(
      (i) => (i.sizes || '').split(' ').includes(t.size + 'x' + t.size) && (i.purpose || 'any').split(' ').includes(t.purpose)
    );
  const todo = targets.filter((t) => FORCE || !have(t));
  if (!todo.length) return console.log('manifest already has 192, 512 and maskable icons');

  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    return notes.push('Icons missing but "sharp" is not installed. Run: npm i -D sharp   then re-run this script.');
  }

  const sourceRel = ICON_ARG || ['public/icon-source.png', 'public/favicon.svg', 'public/favicon.png', 'public/logo.svg', 'public/logo.png'].find(exists);
  if (!sourceRel) {
    return notes.push('No source image found for icons. Re-run with --icon path\\to\\logo.png (square, 512px or bigger, or an SVG).');
  }
  const sourceAbs = path.isAbsolute(sourceRel) ? sourceRel : abs(sourceRel);
  const bg = manifest.background_color || '#111827';

  for (const t of todo) {
    const out = 'public/icons/' + t.file;
    if (DRY) {
      console.log('[dry] would generate', out, 'from', sourceRel);
    } else {
      fs.mkdirSync(abs('public/icons'), { recursive: true });
      if (t.purpose === 'maskable') {
        // keep the logo inside the central 80% safe zone on a solid background
        const inner = Math.round(t.size * 0.7);
        const logo = await sharp(sourceAbs, { density: 384 })
          .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();
        await sharp({ create: { width: t.size, height: t.size, channels: 4, background: bg } })
          .composite([{ input: logo, gravity: 'center' }])
          .png()
          .toFile(abs(out));
      } else {
        await sharp(sourceAbs, { density: 384 })
          .resize(t.size, t.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toFile(abs(out));
      }
      console.log('wrote  ', out);
    }
    const entry = { src: '/icons/' + t.file, sizes: t.size + 'x' + t.size, type: 'image/png', purpose: t.purpose };
    const idx = manifest.icons.findIndex((i) => i.src === entry.src);
    if (idx > -1) manifest.icons[idx] = entry;
    else manifest.icons.push(entry);
  }
  write(manifestRel, JSON.stringify(manifest, null, 2) + '\n');
}

// ---------------------------------------------------------------------------
// 3. App-side integration module + import in main.jsx
// ---------------------------------------------------------------------------
const INTEGRATION = `/**
 * PWA integration (generated by pwa-patch-2.cjs).
 *
 * Handles: shortcuts, share target, protocol links, .txt file launch,
 * background sync and push subscription.
 *
 * Use it from React (all optional):
 *
 *   import { subscribeLaunch, subscribeFiles, setSyncHandler, requestSync } from "./pwa/pwaIntegration";
 *
 *   useEffect(() => subscribeLaunch((launch) => {
 *     // launch = { shortcut, share: { title, text, url }, protocol }
 *     if (launch.shortcut === "daily-log") openDailyLog();
 *   }), []);
 *
 *   useEffect(() => subscribeFiles((files) => importTrackFile(files[0])), []);
 *
 *   setSyncHandler(async () => { await flushQueuedWrites(); });  // runs on reconnect / background sync
 *   // after a write fails offline:  queueIt(); requestSync();
 */

const LAUNCH_PARAMS = ["shortcut", "share_title", "share_text", "share_url", "protocol", "source"];

let pendingLaunch = null;
let pendingFiles = null;
const launchListeners = new Set();
const fileListeners = new Set();
let syncHandler = null;
let launchConsumed = false;

function readLaunchFromUrl() {
  const url = new URL(window.location.href);
  const p = url.searchParams;
  const shortcut = p.get("shortcut");
  const protocol = p.get("protocol");
  const share = {
    title: p.get("share_title") || "",
    text: p.get("share_text") || "",
    url: p.get("share_url") || "",
  };
  const hasShare = Boolean(share.title || share.text || share.url);
  if (!shortcut && !protocol && !hasShare) return null;

  // Clean the address bar so a refresh does not replay the launch
  LAUNCH_PARAMS.forEach((k) => url.searchParams.delete(k));
  window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + url.hash);

  let parsedProtocol = protocol;
  try {
    parsedProtocol = protocol ? decodeURIComponent(protocol) : null; // e.g. "web+momentum:daily-log"
  } catch (e) {
    /* keep raw value */
  }
  return { shortcut: shortcut || null, share: hasShare ? share : null, protocol: parsedProtocol };
}

export function subscribeLaunch(handler) {
  launchListeners.add(handler);
  if (pendingLaunch) {
    launchConsumed = true;
    const launch = pendingLaunch;
    pendingLaunch = null;
    handler(launch);
  }
  return () => launchListeners.delete(handler);
}

export function subscribeFiles(handler) {
  fileListeners.add(handler);
  if (pendingFiles) {
    const files = pendingFiles;
    pendingFiles = null;
    handler(files);
  }
  return () => fileListeners.delete(handler);
}

function emitLaunch(launch) {
  if (!launchListeners.size) {
    pendingLaunch = launch;
    return;
  }
  launchConsumed = true;
  launchListeners.forEach((fn) => fn(launch));
}

function emitFiles(files) {
  if (!fileListeners.size) {
    pendingFiles = files;
    return;
  }
  fileListeners.forEach((fn) => fn(files));
}

/* Fallback so shortcuts work even before the app subscribes: click the matching nav item. */
const SHORTCUT_LABELS = {
  "daily-log": [/^daily\\s*log$/i, /^log$/i, /^daily$/i],
  tracks: [/^(learning\\s*)?tracks?$/i, /^sheets?$/i, /^problems?$/i],
  progress: [/^progress$/i, /^analytics$/i, /^insights$/i, /^profile$/i, /^activity$/i],
};

function fallbackNavigate(shortcut) {
  const patterns = SHORTCUT_LABELS[shortcut];
  if (!patterns) return;
  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    if (launchConsumed || tries > 25) return clearInterval(timer); // ~5s, app handled it or gave up
    const nodes = document.querySelectorAll('button, a, [role="tab"], [role="button"]');
    for (const node of nodes) {
      const label = (node.textContent || "").trim();
      if (label && patterns.some((re) => re.test(label))) {
        node.click();
        clearInterval(timer);
        return;
      }
    }
  }, 200);
}

/* ---------- Background sync ---------- */
export function setSyncHandler(fn) {
  syncHandler = fn;
}

export async function requestSync() {
  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg.sync) await reg.sync.register("momentum-sync");
    else if (syncHandler) syncHandler(); // browsers without Background Sync
  } catch (e) {
    if (syncHandler) syncHandler();
  }
}

function runSync() {
  if (syncHandler) Promise.resolve(syncHandler()).catch((e) => console.warn("Sync failed", e));
}

/* ---------- Push (client side only; you still need a server that sends pushes) ---------- */
function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Call from a button click. Returns the PushSubscription to store on your server, or null. */
export async function subscribeToPush(vapidPublicKey) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
}

/* ---------- Init ---------- */
export function initPwaIntegration() {
  if (typeof window === "undefined") return;

  const launch = readLaunchFromUrl();
  if (launch) {
    // wait a tick so React can mount and subscribe
    setTimeout(() => {
      emitLaunch(launch);
      if (launch.shortcut) fallbackNavigate(launch.shortcut);
    }, 0);
  }

  window.addEventListener("momentum:files", (e) => emitFiles(e.detail));
  if (window.__momentumLaunchFiles && window.__momentumLaunchFiles.length) {
    emitFiles(window.__momentumLaunchFiles);
  }

  window.addEventListener("online", runSync);
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      const type = event.data && event.data.type;
      if (type === "momentum:sync" || type === "momentum:periodic-refresh") runSync();
    });
  }
}
`;

function patchMain() {
  const mainRel = ['src/main.jsx', 'src/main.js', 'src/main.tsx', 'src/index.jsx', 'src/index.js'].find(exists);
  write('src/pwa/pwaIntegration.js', INTEGRATION);
  if (!mainRel) return notes.push('No src/main.jsx found. Import initPwaIntegration() and call it once at startup.');

  let src = read(mainRel);
  if (src.includes('pwaIntegration')) return console.log(mainRel + ' already wired');

  const importLine = 'import { initPwaIntegration } from "./pwa/pwaIntegration";';
  const re = /^import\s[^\n]*?(?:from\s+)?["'][^"']+["'];?[ \t]*$/gm;
  let last = null;
  let m;
  while ((m = re.exec(src))) last = m;
  if (!last) return notes.push('Could not find imports in ' + mainRel + '. Add: ' + importLine + ' and call initPwaIntegration();');

  const at = last.index + last[0].length;
  const next = src.slice(0, at) + '\n' + importLine + '\ninitPwaIntegration();' + src.slice(at);
  write(mainRel, next);
}

// ---------------------------------------------------------------------------
// 4. sw.js: stop cache-first on the manifest
// ---------------------------------------------------------------------------
function patchSw() {
  if (!exists('public/sw.js')) return notes.push('public/sw.js not found. Run pwa-patch.cjs first.');
  const src = read('public/sw.js');
  const re = /\s*&&\s*url\.pathname\s*!==\s*["']\/manifest\.webmanifest["']/;
  if (!re.test(src)) return console.log('public/sw.js: manifest is not served cache-first (nothing to fix)');
  write('public/sw.js', src.replace(re, ''));
}

(async function main() {
  await makeIcons();
  patchMain();
  patchSw();

  console.log('\nDone' + (DRY ? ' (dry run, nothing written)' : '') + '.');
  if (notes.length) {
    console.log('\nTo do:');
    notes.forEach((n) => console.log(' - ' + n));
  }
  console.log('\nNext: npm run build, confirm dist/manifest.json exists, then npm run preview and test.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
