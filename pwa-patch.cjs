#!/usr/bin/env node
/**
 * Momentum PWA patch (Vite + React SPA on Vercel)
 *
 * Run from the repo root:
 *   node pwa-patch.cjs            apply changes
 *   node pwa-patch.cjs --dry      show what would change, write nothing
 *   node pwa-patch.cjs --force    overwrite existing manifest fields with the defaults below
 *   node pwa-patch.cjs --root DIR patch a different folder
 *
 * What it does (safe to re-run):
 *   1. public/manifest.webmanifest  merge missing PWA fields (existing values are kept)
 *   2. public/sw.js                 keeps YOUR existing worker and appends push / sync / periodic sync handlers
 *                                   (creates a full worker only if none exists)
 *   3. public/offline.html          offline fallback page
 *   4. index.html                   manifest link, theme-color, iOS meta, SW registration, file launch handler
 *   5. vercel.json                  correct headers for sw.js and the manifest (existing config is kept)
 *   6. public/screenshots/*.png     auto-listed in the manifest if you add them
 *   7. public/.well-known/assetlinks.json  for the Android package (created only if missing)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const FORCE = argv.includes('--force');
const rootIdx = argv.indexOf('--root');
const ROOT = path.resolve(rootIdx > -1 ? argv[rootIdx + 1] : process.cwd());

const warnings = [];
const abs = (rel) => path.join(ROOT, rel);
const exists = (rel) => fs.existsSync(abs(rel));
const read = (rel) => fs.readFileSync(abs(rel), 'utf8');

function write(rel, content) {
  if (DRY) {
    console.log('[dry] would write', rel);
    return;
  }
  fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
  fs.writeFileSync(abs(rel), content);
  console.log('wrote  ', rel);
}

function readJson(rel) {
  try {
    return JSON.parse(read(rel));
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 0. Sanity checks
// ---------------------------------------------------------------------------
if (!exists('package.json') || !exists('index.html')) {
  console.error('Run this from the Momentum repo root (package.json and index.html not found in ' + ROOT + ').');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. Manifest
// ---------------------------------------------------------------------------
const MANIFEST_CANDIDATES = ['public/manifest.webmanifest', 'public/manifest.json'];
const MANIFEST_PATH = MANIFEST_CANDIDATES.find(exists) || MANIFEST_CANDIDATES[0];
const manifest = (exists(MANIFEST_PATH) && readJson(MANIFEST_PATH)) || {};
if (exists(MANIFEST_PATH) && !readJson(MANIFEST_PATH)) {
  console.error(MANIFEST_PATH + ' exists but is not valid JSON. Fix it first, then re-run.');
  process.exit(1);
}

const defaults = {
  id: '/',
  name: 'Momentum',
  short_name: 'Momentum',
  description:
    'A personal progress workspace for learning tracks, daily routines, activity logs, and progress analytics.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  display_override: ['standalone', 'minimal-ui'],
  orientation: 'any', // change to "portrait" if you want phones locked to portrait
  background_color: '#111827',
  theme_color: '#111827',
  lang: 'en',
  dir: 'ltr',
  categories: ['productivity', 'education', 'lifestyle'],
  prefer_related_applications: false,
  related_applications: [],
  launch_handler: { client_mode: ['navigate-existing', 'auto'] },
  edge_side_panel: { preferred_width: 400 },
  shortcuts: [
    {
      name: 'Daily Log',
      short_name: 'Daily Log',
      description: 'Record today\'s sleep and activity',
      url: '/?shortcut=daily-log',
    },
    {
      name: 'Learning Tracks',
      short_name: 'Tracks',
      description: 'Open your learning tracks',
      url: '/?shortcut=tracks',
    },
    {
      name: 'Progress',
      short_name: 'Progress',
      description: 'See streaks and analytics',
      url: '/?shortcut=progress',
    },
  ],
  share_target: {
    action: '/',
    method: 'GET',
    params: { title: 'share_title', text: 'share_text', url: 'share_url' },
  },
  file_handlers: [
    {
      action: '/?source=file',
      accept: { 'text/plain': ['.txt'] },
    },
  ],
  protocol_handlers: [{ protocol: 'web+momentum', url: '/?protocol=%s' }],
};

for (const [key, value] of Object.entries(defaults)) {
  if (FORCE || manifest[key] === undefined) manifest[key] = value;
}

// Screenshots: list any PNG/JPG found in public/screenshots (never reference missing files)
function imageSize(file) {
  const buf = fs.readFileSync(file);
  if (buf.length > 24 && buf.toString('ascii', 1, 4) === 'PNG') {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  return null;
}

const shotsDir = abs('public/screenshots');
if (fs.existsSync(shotsDir)) {
  const shots = [];
  for (const f of fs.readdirSync(shotsDir).sort()) {
    if (!/\.png$/i.test(f)) continue;
    const size = imageSize(path.join(shotsDir, f));
    if (!size) continue;
    shots.push({
      src: '/screenshots/' + f,
      sizes: size.w + 'x' + size.h,
      type: 'image/png',
      form_factor: size.w >= size.h ? 'wide' : 'narrow',
      label: f.replace(/\.png$/i, '').replace(/[-_]+/g, ' '),
    });
  }
  if (shots.length) manifest.screenshots = shots;
}
if (!manifest.screenshots || !manifest.screenshots.length) {
  warnings.push(
    'No screenshots yet. Add PNGs to public/screenshots/ (at least one wide ~1280x720 and one narrow ~720x1280, ' +
      'e.g. via Chrome DevTools > device toolbar > "Capture screenshot"), then re-run this script.'
  );
}

// Icons: never invent files, only report what is missing
const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
const has = (size, purpose) =>
  icons.some((i) => (i.sizes || '').split(' ').includes(size) && (!purpose || (i.purpose || '').includes(purpose)));
if (!has('192x192')) warnings.push('manifest has no 192x192 icon.');
if (!has('512x512')) warnings.push('manifest has no 512x512 icon.');
if (!has('512x512', 'maskable')) {
  warnings.push('manifest has no 512x512 "maskable" icon (recommended for Android).');
}

write(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');

// ---------------------------------------------------------------------------
// 2. Service worker
// ---------------------------------------------------------------------------
const precache = ['/', '/offline.html', '/' + path.basename(MANIFEST_PATH)];
for (const i of icons) {
  if (i.src && i.src.startsWith('/') && !precache.includes(i.src)) precache.push(i.src);
}
const notifIcon =
  (icons.find((i) => (i.sizes || '').includes('192x192') && !(i.purpose || '').includes('maskable')) || icons[0] || {})
    .src || null;

const SW_TEMPLATE = `/* Momentum service worker (generated by pwa-patch.cjs)
 *
 * Strategy
 *  - Navigations: network first, fall back to cached app shell, then /offline.html
 *  - Same-origin static assets: stale-while-revalidate (Vite hashes filenames)
 *  - /api/* and every cross-origin request (Supabase, etc.) are NEVER cached,
 *    so account data is never stored by the service worker.
 */
const VERSION = 'v1';
const STATIC_CACHE = 'momentum-static-' + VERSION;
const PAGE_CACHE = 'momentum-pages-' + VERSION;
const OFFLINE_URL = '/offline.html';
const PRECACHE = __PRECACHE__;
const NOTIFICATION_ICON = __ICON__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = [STATIC_CACHE, PAGE_CACHE];
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith('momentum-') && !keep.includes(n)).map((n) => caches.delete(n)));
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable().catch(() => undefined);
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, fonts, etc.
  if (url.pathname.startsWith('/api/')) return; // authenticated endpoints

  if (req.mode === 'navigate') {
    event.respondWith(handleNavigation(event));
    return;
  }

  event.respondWith(staleWhileRevalidate(req));
});

async function handleNavigation(event) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const preload = event.preloadResponse ? await event.preloadResponse : null;
    const fresh = preload || (await fetch(event.request));
    if (fresh && fresh.ok) cache.put('/', fresh.clone()); // SPA: one shell for every route
    return fresh;
  } catch (err) {
    const shell = (await cache.match('/')) || (await caches.match('/'));
    return shell || (await caches.match(OFFLINE_URL)) || Response.error();
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then((res) => {
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    })
    .catch(() => undefined);
  return cached || (await network) || Response.error();
}

/* ---------- Push notifications ---------- */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }
  const options = {
    body: data.body || 'Keep your streak going. Log today\\'s progress.',
    data: { url: data.url || '/' },
    tag: data.tag || 'momentum',
  };
  if (NOTIFICATION_ICON) {
    options.icon = NOTIFICATION_ICON;
    options.badge = NOTIFICATION_ICON;
  }
  event.waitUntil(self.registration.showNotification(data.title || 'Momentum', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) await client.navigate(target).catch(() => undefined);
          return;
        }
      }
      await self.clients.openWindow(target);
    })()
  );
});

/* ---------- Background sync ----------
 * The app asks for a sync with:
 *   navigator.serviceWorker.ready.then(r => r.sync.register('momentum-sync'))
 * The worker wakes the page, and the page flushes its own queued writes
 * (it holds the Supabase session, the worker does not).
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'momentum-sync') {
    event.waitUntil(notifyClients({ type: 'momentum:sync' }));
  }
});

/* ---------- Periodic background sync ---------- */
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'momentum-refresh') {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(PAGE_CACHE);
        const res = await fetch('/', { cache: 'no-cache' }).catch(() => null);
        if (res && res.ok) await cache.put('/', res);
        await notifyClients({ type: 'momentum:periodic-refresh' });
      })()
    );
  }
});

async function notifyClients(message) {
  const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  all.forEach((c) => c.postMessage(message));
}
`;

let usedExistingSw = false;
const swSource = SW_TEMPLATE.replace('__PRECACHE__', JSON.stringify(precache)).replace(
  '__ICON__',
  JSON.stringify(notifIcon)
);
const FEATURES_BEGIN = '/* momentum-pwa:features:begin */';
const FEATURES_END = '/* momentum-pwa:features:end */';

function buildFeatures(src) {
  const missing = (evt) => !new RegExp('addEventListener\\(\\s*["\']' + evt + '["\']').test(src);
  const parts = [];
  const iconJson = JSON.stringify(notifIcon);
  if (missing('push')) {
    parts.push(`self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data ? event.data.text() : '' }; }
  const options = {
    body: data.body || "Keep your streak going. Log today's progress.",
    data: { url: data.url || '/' },
    tag: data.tag || 'momentum',
  };
  const icon = ${iconJson};
  if (icon) { options.icon = icon; options.badge = icon; }
  event.waitUntil(self.registration.showNotification(data.title || 'Momentum', options));
});`);
  }
  if (missing('notificationclick')) {
    parts.push(`self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of all) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target).catch(() => undefined);
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});`);
  }
  const needsNotify = missing('sync') || missing('periodicsync');
  if (needsNotify) {
    parts.push(`async function momentumNotifyClients(message) {
  const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  all.forEach((c) => c.postMessage(message));
}`);
  }
  if (missing('sync')) {
    parts.push(`// Page requests: navigator.serviceWorker.ready.then((r) => r.sync.register('momentum-sync'))
// The page then flushes its own queued writes (it holds the Supabase session).
self.addEventListener('sync', (event) => {
  if (event.tag === 'momentum-sync') event.waitUntil(momentumNotifyClients({ type: 'momentum:sync' }));
});`);
  }
  if (missing('periodicsync')) {
    parts.push(`self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'momentum-refresh') {
    event.waitUntil(momentumNotifyClients({ type: 'momentum:periodic-refresh' }));
  }
});`);
  }
  return parts.length ? FEATURES_BEGIN + '\n' + parts.join('\n\n') + '\n' + FEATURES_END + '\n' : '';
}

if (exists('public/sw.js')) {
  // Keep the existing worker (its caching logic is untouched); only append missing event handlers.
  let sw = read('public/sw.js');
  const stripRe = new RegExp('\\n?' + FEATURES_BEGIN.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&') + '[\\s\\S]*?' + FEATURES_END.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&') + '\\n?');
  sw = sw.replace(stripRe, '\n');
  const block = buildFeatures(sw);
  const next = sw.replace(/\s*$/, '\n') + (block ? '\n' + block : '');
  if (next !== read('public/sw.js')) write('public/sw.js', next);
  else console.log('public/sw.js already up to date');
  if (!block) console.log('public/sw.js already has push/sync/periodicsync handlers');
  usedExistingSw = true;
} else {
  write('public/sw.js', swSource);
}

// ---------------------------------------------------------------------------
// 3. Offline page
// ---------------------------------------------------------------------------
const OFFLINE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#111827" />
  <title>Momentum is offline</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #111827; color: #f3f4f6;
           font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 24px; }
    main { max-width: 360px; }
    h1 { font-size: 1.5rem; margin: 0 0 8px; }
    p { color: #9ca3af; line-height: 1.5; margin: 0 0 20px; }
    button { background: #6366f1; color: #fff; border: 0; border-radius: 10px; padding: 12px 20px; font-size: 1rem; cursor: pointer; }
  </style>
</head>
<body>
  <main>
    <h1>You're offline</h1>
    <p>Momentum can't reach the network right now. Reconnect and your progress will sync again.</p>
    <button onclick="location.reload()">Try again</button>
  </main>
  <script>window.addEventListener('online', function () { location.reload(); });</script>
</body>
</html>
`;
if (!usedExistingSw && !exists('public/offline.html')) write('public/offline.html', OFFLINE_HTML);

// ---------------------------------------------------------------------------
// 4. index.html
// ---------------------------------------------------------------------------
let html = read('index.html');
const original = html;
const headAdds = [];
const manifestHref = '/' + path.basename(MANIFEST_PATH);

if (!/rel=["']manifest["']/i.test(html)) headAdds.push('<link rel="manifest" href="' + manifestHref + '" />');
if (!/name=["']theme-color["']/i.test(html)) headAdds.push('<meta name="theme-color" content="' + manifest.theme_color + '" />');
if (!/name=["']mobile-web-app-capable["']/i.test(html)) headAdds.push('<meta name="mobile-web-app-capable" content="yes" />');
if (!/name=["']apple-mobile-web-app-capable["']/i.test(html)) headAdds.push('<meta name="apple-mobile-web-app-capable" content="yes" />');
if (!/name=["']apple-mobile-web-app-title["']/i.test(html)) headAdds.push('<meta name="apple-mobile-web-app-title" content="Momentum" />');
if (!/rel=["']apple-touch-icon["']/i.test(html) && notifIcon) {
  headAdds.push('<link rel="apple-touch-icon" href="' + notifIcon + '" />');
}
if (headAdds.length) {
  if (!/<\/head>/i.test(html)) {
    warnings.push('index.html has no </head>; add the PWA tags manually.');
  } else {
    html = html.replace(/<\/head>/i, '    ' + headAdds.join('\n    ') + '\n  </head>');
  }
}

const REG_BEGIN = '<!-- momentum-pwa:begin -->';
const REG_END = '<!-- momentum-pwa:end -->';

// Does the app already register a service worker (index.html or src/)?
function findExistingRegistration() {
  const re = /serviceWorker\s*\.\s*register|registerSW\s*\(/;
  const outsideBlock = html.replace(new RegExp(REG_BEGIN + '[\\s\\S]*?' + REG_END), '');
  if (re.test(outsideBlock)) return 'index.html';
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return null;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === 'node_modules') continue;
        const hit = walk(full);
        if (hit) return hit;
      } else if (/\.(js|jsx|ts|tsx|mjs)$/.test(ent.name) && re.test(fs.readFileSync(full, 'utf8'))) {
        return path.relative(ROOT, full);
      }
    }
    return null;
  };
  return walk(abs('src'));
}
const existingReg = findExistingRegistration();
if (existingReg) console.log('service worker is already registered in ' + existingReg + ', not adding a second registration');

const REG_CALL = existingReg
  ? ''
  : `
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function (err) {
            console.warn('Service worker registration failed', err);
          });
        });`;

const REG_SCRIPT = `${REG_BEGIN}
    <script>
      (function () {
        // File handler: the OS opens a .txt track with Momentum
        if ('launchQueue' in window) {
          window.launchQueue.setConsumer(async function (params) {
            if (!params.files || !params.files.length) return;
            var files = [];
            for (var i = 0; i < params.files.length; i++) files.push(await params.files[i].getFile());
            window.__momentumLaunchFiles = files; // read this if the app mounts after launch
            window.dispatchEvent(new CustomEvent('momentum:files', { detail: files }));
          });
        }

        if (!('serviceWorker' in navigator)) return;
        var host = location.hostname;
        if (host === 'localhost' || host === '127.0.0.1') return; // keep dev HMR clean
${REG_CALL}
        // Periodic sync works with whoever registered the worker
        navigator.serviceWorker.ready.then(function (reg) {
          if (!('periodicSync' in reg) || !navigator.permissions) return;
          navigator.permissions.query({ name: 'periodic-background-sync' }).then(function (status) {
            if (status.state === 'granted') {
              reg.periodicSync.register('momentum-refresh', { minInterval: 24 * 60 * 60 * 1000 }).catch(function () {});
            }
          }).catch(function () {});
        });
      })();
    </script>
    ${REG_END}`;

if (!html.includes(REG_BEGIN)) {
  if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, '    ' + REG_SCRIPT + '\n  </body>');
  } else {
    warnings.push('index.html has no </body>; add the registration script manually.');
  }
} else {
  const re = new RegExp(REG_BEGIN + '[\\s\\S]*?' + REG_END);
  html = html.replace(re, () => REG_SCRIPT);
}

if (html !== original) write('index.html', html);
else console.log('index.html already up to date');

// ---------------------------------------------------------------------------
// 4b. Digital Asset Links (Android TWA from PWABuilder). Never overwrites an existing file.
// ---------------------------------------------------------------------------
const ASSETLINKS = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'app.vercel.momentum_rehnx.twa',
      sha256_cert_fingerprints: [
        '0C:F4:99:3B:51:C2:F7:7F:28:05:85:7D:CE:39:B7:ED:65:A0:F8:EE:BD:51:A5:69:88:F5:AF:BA:69:15:D2:8A',
      ],
    },
  },
];
if (!exists('public/.well-known/assetlinks.json')) {
  write('public/.well-known/assetlinks.json', JSON.stringify(ASSETLINKS, null, 2) + '\n');
} else {
  console.log('public/.well-known/assetlinks.json exists, left unchanged');
}

// ---------------------------------------------------------------------------
// 5. vercel.json (merge, never replace)
// ---------------------------------------------------------------------------
let vercel = {};
let vercelOk = true;
if (exists('vercel.json')) {
  vercel = readJson('vercel.json');
  if (!vercel) {
    vercelOk = false;
    warnings.push('vercel.json is not valid JSON; skipped. Add the headers for /sw.js and the manifest manually.');
  }
}
if (vercelOk && vercel.routes) {
  vercelOk = false;
  warnings.push(
    'vercel.json uses legacy "routes" (cannot be combined with "headers"); skipped. ' +
      'Set Cache-Control: max-age=0 on /sw.js manually.'
  );
}
if (vercelOk) {
  vercel.headers = Array.isArray(vercel.headers) ? vercel.headers : [];
  const addHeader = (source, headers) => {
    const hit = vercel.headers.find((h) => h.source === source);
    if (!hit) {
      vercel.headers.push({ source, headers });
      return;
    }
    hit.headers = hit.headers || [];
    for (const h of headers) {
      const i = hit.headers.findIndex((x) => x.key.toLowerCase() === h.key.toLowerCase());
      if (i === -1) hit.headers.push(h);
      else hit.headers[i] = h;
    }
  };
  addHeader('/sw.js', [
    { key: 'Content-Type', value: 'text/javascript; charset=utf-8' },
    { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
    { key: 'Service-Worker-Allowed', value: '/' },
  ]);
  addHeader(manifestHref, [
    { key: 'Content-Type', value: 'application/manifest+json; charset=utf-8' },
    { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
  ]);
  addHeader('/.well-known/assetlinks.json', [
    { key: 'Content-Type', value: 'application/json; charset=utf-8' },
    { key: 'Cache-Control', value: 'public, max-age=3600' },
  ]);
  write('vercel.json', JSON.stringify(vercel, null, 2) + '\n');
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\nDone' + (DRY ? ' (dry run, nothing written)' : '') + '.');
if (warnings.length) {
  console.log('\nTo do:');
  warnings.forEach((w) => console.log(' - ' + w));
}
console.log('\nNext: npm run build && npm run preview, then check DevTools > Application.');
console.log('Then deploy and re-run https://www.pwabuilder.com/reportcard?site=https://momentum-rehnx.vercel.app/');
