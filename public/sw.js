const CACHE_NAME = "momentum-app-shell";
const PRECACHE_ENTRIES = ["index.html", "AuthenticatedApp", "DailyTracker"];

async function getPrecacheUrls() {
  const response = await fetch("/manifest.json", { cache: "no-cache" });
  if (!response.ok) throw new Error("Could not load the app asset manifest.");
  const manifest = await response.json();
  const urls = new Set(["/", "/manifest.webmanifest"]);
  const visited = new Set();

  function resolveEntry(reference) {
    if (manifest[reference]) return reference;
    const key = Object.keys(manifest).find(
      (candidate) =>
        manifest[candidate].name === reference || manifest[candidate].src === reference,
    );
    if (!key) throw new Error(`The app asset manifest is missing ${reference}.`);
    return key;
  }

  function visit(key) {
    if (visited.has(key)) return;
    visited.add(key);
    const entry = manifest[key];
    if (!entry) throw new Error(`The app asset manifest is missing ${key}.`);
    if (entry.file) urls.add(`/${entry.file}`);
    for (const file of [...(entry.css || []), ...(entry.assets || [])]) {
      urls.add(`/${file}`);
    }
    for (const dependency of entry.imports || []) visit(dependency);
  }

  for (const entry of PRECACHE_ENTRIES) visit(resolveEntry(entry));
  return [...urls];
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(await getPrecacheUrls());
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (
    url.origin !== self.location.origin ||
    ["/api/", "/auth/v1/", "/rest/v1/", "/storage/v1/", "/functions/v1/"].some((prefix) =>
      url.pathname.startsWith(prefix),
    )
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            try {
              const cache = await caches.open(CACHE_NAME);
              await cache.put("/index.html", response.clone());
            } catch (error) {
              console.warn("Could not cache the latest app shell:", error);
            }
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cachedPage = await cache.match("/index.html");
          if (cachedPage) return cachedPage;
          const cachedRoot = await cache.match("/");
          if (cachedRoot) return cachedRoot;
          return new Response("The app shell is not available offline.", { status: 503 });
        }),
    );
    return;
  }
  if (!url.pathname.startsWith("/assets/")) return;
  event.respondWith(
    caches.match(request, { ignoreVary: true }).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(request).then(async (response) => {
        if (response.ok) {
          try {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          } catch (error) {
            console.warn("Could not cache an app asset:", error);
          }
        }
        return response;
      });
    }),
  );
});

/* momentum-pwa:features:begin */
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data ? event.data.text() : '' }; }
  const options = {
    body: data.body || "Keep your streak going. Log today's progress.",
    data: { url: data.url || '/' },
    tag: data.tag || 'momentum',
  };
  const icon = "/icon-192.png";
  if (icon) { options.icon = icon; options.badge = icon; }
  event.waitUntil(self.registration.showNotification(data.title || 'Momentum', options));
});

self.addEventListener('notificationclick', (event) => {
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
});

async function momentumNotifyClients(message) {
  const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  all.forEach((c) => c.postMessage(message));
}

// Page requests: navigator.serviceWorker.ready.then((r) => r.sync.register('momentum-sync'))
// The page then flushes its own queued writes (it holds the Supabase session).
self.addEventListener('sync', (event) => {
  if (event.tag === 'momentum-sync') event.waitUntil(momentumNotifyClients({ type: 'momentum:sync' }));
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'momentum-refresh') {
    event.waitUntil(momentumNotifyClients({ type: 'momentum:periodic-refresh' }));
  }
});
/* momentum-pwa:features:end */
