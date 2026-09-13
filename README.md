# Ayah — Quran Verse Widget

A calm widget that shows one ayah at a time, with translation from Quran.com.
A **fully self-owned, dependency-free static PWA** — no build step, no Vercel,
no subscriptions, no v0 credits.

## Where it lives
- **Live app:** https://lujaneyaffa.github.io/ayah/
- **Source code:** https://github.com/lujaneyaffa/ayah
- **Your local editable copy:** `~/ayah`

## Edit → ship (repeat whenever you want)
1. Edit files in `~/ayah` (plain HTML/CSS/JS — or ask me to make changes).
2. Ship it:
   ```bash
   cd ~/ayah
   git add -A
   git commit -m "describe your change"
   git push
   ```
3. GitHub Pages auto-publishes within ~1 minute. Refresh/reopen the app on
   your devices to get the update.

## What it does
- **Read** — one ayah at a time (Arabic + Saheeh International translation,
  footnote markers stripped for clean reading), Previous / Next / Shuffle,
  arrow-key navigation, a new "daily verse" each day,
  plus **surah + ayah dropdowns** to jump anywhere in the Qur'an
- **Display options** — a dropdown chooses what's shown under the Arabic:
  translation only, Arabic only, **Tafsir (Ibn Kathir)**, or both translation + tafsir
- **Audio** — play recitation of the current ayah (like Quran.com) with 12
  reciters to choose from (Alafasy, Sudais, Al-Husary, al-Minshawi, and more)
  and **playback speed** (0.5×–2×); your choices are remembered
- **Browse** — all 114 surahs, expandable to per-ayah chips
- **Memorized** — mark verses (saved on-device), live count
- **Memorization check** — recite a whole Mushaf page out loud and see which
  words you got right, checked live as you go (updates every few seconds
  while reciting, not just at the end). Powered by Tarteel's own Quran-tuned
  Whisper model running **entirely on your device** (no audio ever leaves
  it). First check downloads the checker (~130MB, once); after that it
  works offline like everything else.
- **Offline** — service worker caches the shell + viewed verses and audio links;
  curated verses work with no internet; tafsir caches recently viewed verses
- **Installable PWA** + light/dark themes
- **Refresh button** (↻ in the top bar) — tap anytime to check for a new build,
  update the service worker, and reload to the latest version instantly
- **Fits every iPhone** — responsive layout with safe-area (notch/home-indicator)
  padding; on narrow screens the audio bar rearranges into clean rows so no
  control is ever cut off; long ayahs and words wrap instead of overflowing

## Run locally
```bash
cd ~/ayah
python3 -m http.server 8137
# open http://localhost:8137
```

## Put it on your iPhone
1. Open **https://lujaneyaffa.github.io/ayah/** in Safari.
2. Tap **Share → Add to Home Screen → Add** — runs full-screen like an app.

### Real home-screen widget on iPhone (free)
iOS only lets *native* apps have widgets — but the free **Scriptable** app can run
our widget script and put a **live daily-ayah widget** on your home screen
(same verse the app shows, Arabic + Saheeh translation, big Western ayah number,
offline cache, tap opens the app):

1. Open **https://lujaneyaffa.github.io/ayah/widget-install.html** on your iPhone.
2. Follow the 5 steps there (install Scriptable → copy code → paste → add widget).

If `scriptable-widget.js` changes, re-copy the code from the install page and
re-paste it in Scriptable.

## Add it as a widget on your Mac
macOS 15.6 supports Safari web widgets:
1. Open the URL in Safari.
2. Right-click the page → **Add to Widget** if shown, or right-click the
   desktop → **Edit Widgets…** → search **"Ayah"** → drag it onto the desktop.
3. **Tip:** for a clean resize-proof desktop widget, point Safari at
   **`/widget.html`** instead of the main page. That page auto-scales the
   Arabic + translation to fit any widget size (tested down to the longest
   verse in the Qur'an at tiny sizes — nothing gets cut off). You can also
   pass a fixed verse with `?key=2:255`.

> Note: iOS doesn't allow websites to become home-screen *widgets* (only
> native apps do that). This free route = full-screen app icon + the Scriptable
> widget on iPhone, and a live desktop widget on Mac.

## Files
| File | Purpose |
|---|---|
| `index.html` | App shell + metadata |
| `styles.css` | Design (light/dark auto) |
| `app.js` | Logic + full 114-surah index + offline verses |
| `manifest.webmanifest` | PWA manifest |
| `sw.js` | Service worker (offline) |
| `icons/` | App icons (SVG sources + PNGs) |
| `models/tarteel-whisper-quran/` | Quantized ONNX Quran-recitation model for the memorization checker |
| `test.js` | Node tests |

## Data & privacy
Quran text from the public Quran.com API. Memorized list + last verse live
only in your browser's `localStorage` — nothing leaves the device unless
you turn on Sync (below).

## Device sync (iPhone ⇄ Mac)
Your stars, last-read verse, reciter, repeat and display settings can sync
between devices through **your own private GitHub repo** (`lujaneyaffa/ayah-sync`,
created for this). One-time setup **on each device**:

1. In the app, tap **⚙ Setup** (bottom of the page)
2. Open the token link: github.com → Settings → Developer settings →
   Fine-grained tokens → **Generate new token**
   - Name: `ayah` · Expiration: 1 year
   - Repository access: **Only select repositories** → `ayah-sync`
   - Permissions → Contents → **Read and write**
3. Paste the token into the app → **Save** (then tap **✔ Test** — a step-by-step
   check of the token will explain exactly what's right or wrong, e.g.
   read-only permissions, wrong repo selected, or an invalid token)

If sync isn't working, tap **✔ Test** in ⚙ Setup — the app now reports the exact
GitHub error (401 invalid, 403 read-only token, 404 token can't see the repo,
or HTTP details) instead of a generic "offline", so the fix is clear right there.

That's it — after that, syncing is automatic (on open, on return to the
tab, every 90 s, and on every change, debounced 1.5 s). Rules: stars merge
as a **union** (never lost), settings are last-write-wins, and conflicting
writes are auto-merged via the repo's compare-and-swap. The token lives
only in that device's browser storage and unlocks nothing but `ayah-sync`.