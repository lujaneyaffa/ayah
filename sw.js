/* Ayah service worker — network-first for the shell (so updates flow),
   network-first for Quran.com data + word timings, cache-first for recitation
   audio (offline playback of ayahs you've played), cache fallback everywhere */
const VERSION = "v38";
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

  // Recitation audio: cache-first so played ayahs replay offline. Entries are
  // stored as FULL bodies under a Range-less request key; Range requests
  // (which <audio> sends for every chunk of a long recitation, not just on
  // seek) are sliced from that cached body BY HAND below, because relying on
  // the Cache API's own automatic Range support is inconsistent across
  // engines — a plain 200 handed back for a mid-file Range request confuses
  // the media pipeline and was cutting long ayahs off partway through.
  if (req.method === "GET" && AUDIO_HOSTS.has(url.hostname)) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const plainReq = new Request(req.url); // Range-less: stable cache key
        let full = await cache.match(plainReq);
        if (!full) {
          // Not cached: fetch the complete file (no Range header) so it can
          // be stored and replayed offline later, regardless of what range
          // this particular request asked for.
          full = await fetch(plainReq);
          if (full && full.ok && full.status === 200) {
            await cache.put(plainReq, full.clone()).catch(() => {});
            const keys = await cache.keys();
            if (keys.length > AUDIO_MAX_ENTRIES) {
              for (const k of keys.slice(0, keys.length - AUDIO_MAX_ENTRIES)) {
                await cache.delete(k);
              }
            }
          }
        }
        if (!full || !full.ok) return full;

        const range = req.headers.get("range");
        if (!range) return full.clone();
        const m = /bytes=(\d*)-(\d*)/.exec(range);
        if (!m || (!m[1] && !m[2])) return full.clone();

        const buf = await full.clone().arrayBuffer();
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
        return new Response(buf.slice(start, end + 1), {
          status: 206,
          statusText: "Partial Content",
          headers
        });
      })
    );
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