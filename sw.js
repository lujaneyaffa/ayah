/* Ayah service worker — network-first for the shell (so updates flow),
   network-first for Quran.com data + word timings, cache-first for recitation
   audio (offline playback of ayahs you've played), cache fallback everywhere */
const VERSION = "v42";
const SHELL_CACHE = `ayah-shell-${VERSION}`;
const API_CACHE = `ayah-api-${VERSION}`;
const AUDIO_CACHE = `ayah-audio-${VERSION}`;
// Memorization-check model + inference library: a ~100MB one-time download.
// Deliberately NOT versioned with the app — it doesn't change on every
// deploy, and re-downloading 100MB on every unrelated app update would be
// awful. Served cache-first since jsdelivr URLs are pinned to exact versions
// (immutable) and the model files under /models/ only change if we ship a
// different model, in which case the path itself would change.
const ASR_CACHE = "ayah-asr-v1";
const ASR_HOSTS = new Set(["cdn.jsdelivr.net"]);
/* Recitation audio CDNs used by the app. Played ayahs are stored so playback
   keeps working with no connection. */
const AUDIO_HOSTS = new Set([
  "verses.quran.com",
  "verses.quranicaudio.com",
  "download.quranicaudio.com",
  "mirrors.quranicaudio.com",
  "everyayah.com"
]);
const AUDIO_MAX_ENTRIES = 80; // keep roughly the last ~80 played ayahs

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./widget.html",
  "./widget-page.js",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon-180.png",
  "./icons/favicon-32.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, API_CACHE, AUDIO_CACHE, ASR_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

const audioFills = new Map(); // file url -> in-flight fill, so parallel Range requests share ONE download

function fillAudioCache(fileUrl) {
  if (audioFills.has(fileUrl)) return audioFills.get(fileUrl);
  const job = (async () => {
    const cache = await caches.open(AUDIO_CACHE);
    if (await cache.match(fileUrl)) return;
    // Let the streaming response the player is waiting on get the bandwidth first.
    await new Promise((r) => setTimeout(r, 1500));
    const res = await fetch(fileUrl);
    if (!res || !res.ok || res.status !== 200) return;
    await cache.put(fileUrl, res);
    const keys = await cache.keys();
    if (keys.length > AUDIO_MAX_ENTRIES) {
      for (const k of keys.slice(0, keys.length - AUDIO_MAX_ENTRIES)) await cache.delete(k);
    }
  })().catch(() => {}).finally(() => audioFills.delete(fileUrl));
  audioFills.set(fileUrl, job);
  return job;
}

async function serveAudioFromCache(full, req) {
  const range = req.headers.get("range");
  if (!range) return full;
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  if (!m || (!m[1] && !m[2])) return full;
  const buf = await full.arrayBuffer();
  const total = buf.byteLength;
  let start = m[1] ? parseInt(m[1], 10) : total - parseInt(m[2], 10);
  let end = m[1] && m[2] ? parseInt(m[2], 10) : total - 1;
  if (!isFinite(start) || start < 0) start = 0;
  if (!isFinite(end) || end >= total) end = total - 1;
  if (start > end || start >= total) {
    return new Response(null, {
      status: 416,
      statusText: "Range Not Satisfiable",
      headers: { "Content-Range": `bytes */${total}` }
    });
  }
  const headers = new Headers(full.headers);
  headers.set("Content-Range", `bytes ${start}-${end}/${total}`);
  headers.set("Content-Length", String(end - start + 1));
  headers.set("Accept-Ranges", "bytes");
  return new Response(buf.slice(start, end + 1), { status: 206, statusText: "Partial Content", headers });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Quran.com data (verses/translations) + qurancdn word timings:
  // network-first, cache fallback (works offline for seen verses)
  if (req.method === "GET" &&
      (url.hostname === "api.quran.com" || url.hostname === "api.qurancdn.com")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(API_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Recitation audio. Cache HIT: served from the stored full body, with
  // Range requests sliced by hand into proper 206s (the Cache API's own Range
  // support is inconsistent across engines, and a plain 200 handed back for a
  // mid-file Range request cuts long ayahs off). Cache MISS: pass straight
  // through to the network exactly as if there were no service worker, so
  // playback starts immediately with the CDN's real 206s, and fill the cache
  // once in the background for offline replay. (It used to download the WHOLE
  // file before answering the first request — and every parallel Range request
  // the browser fires started its own full download — so on a slow connection
  // playback stalled or gave up part-way, which sounds like a random cut-off.)
  if (req.method === "GET" && AUDIO_HOSTS.has(url.hostname)) {
    event.respondWith((async () => {
      const cache = await caches.open(AUDIO_CACHE);
      const full = await cache.match(req.url);
      if (full) return serveAudioFromCache(full, req);
      try { event.waitUntil(fillAudioCache(req.url)); } catch { fillAudioCache(req.url); }
      return fetch(req);
    })());
    return;
  }

  // ASR inference library (jsdelivr, exact version pinned in the URL — safe
  // to cache forever, never needs revalidation).
  if (req.method === "GET" && ASR_HOSTS.has(url.hostname)) {
    event.respondWith(
      caches.open(ASR_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
        return res;
      })
    );
    return;
  }

  // Same-origin requests
  if (url.origin === self.location.origin) {
    // Memorization-check model files: cache-first, once and done — see the
    // ASR_CACHE comment above for why these skip the network-first path
    // every other same-origin asset gets below.
    if (url.pathname.includes("/models/")) {
      event.respondWith(
        caches.open(ASR_CACHE).then(async (cache) => {
          const hit = await cache.match(req);
          if (hit) return hit;
          const res = await fetch(req);
          if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
          return res;
        })
      );
      return;
    }

    // Page navigations: network-first (always get the latest HTML when online;
    // fall back to cache when offline)
    if (req.mode === "navigate") {
      event.respondWith(
        fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
            return res;
          })
          .catch(() =>
            caches.match(req).then((m) => m || caches.match("./index.html"))
          )
      );
      return;
    }

    // Everything else (CSS/JS/icons): network-first so pushed updates apply
    // on the very next open; falls back to cache when offline.
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(req, copy).catch(() => {}));
          }
          return res;
        })
        .catch(() =>
          caches.open(SHELL_CACHE).then((cache) => cache.match(req))
        )
    );
    return;
  }

  // Everything else (links out, etc.) — pass through
  return;
});