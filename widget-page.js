/* Widget page logic — shows the SAME daily verse as the app.
   Typography scales with the widget frame (vmin), so resizing the
   Mac desktop widget re-fits the ayah instead of cropping it. */
(function () {
  "use strict";

  var COUNTS = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
  var NAMES = ["Al-Fatihah","Al-Baqarah","Aal-E-Imran","An-Nisa","Al-Ma'idah","Al-An'am","Al-A'raf","Al-Anfal","At-Tawbah","Yunus","Hud","Yusuf","Ar-Ra'd","Ibrahim","Al-Hijr","An-Nahl","Al-Isra","Al-Kahf","Maryam","Ta-Ha","Al-Anbiya","Al-Hajj","Al-Mu'minun","An-Nur","Al-Furqan","Ash-Shu'ara","An-Naml","Al-Qasas","Al-Ankabut","Ar-Rum","Luqman","As-Sajdah","Al-Ahzab","Saba","Fatir","Ya-Sin","As-Saffat","Sad","Az-Zumar","Ghafir","Fussilat","Ash-Shura","Az-Zukhruf","Ad-Dukhan","Al-Jathiyah","Al-Ahqaf","Muhammad","Al-Fath","Al-Hujurat","Qaf","Adh-Dhariyat","At-Tur","An-Najm","Al-Qamar","Ar-Rahman","Al-Waqi'ah","Al-Hadid","Al-Mujadila","Al-Hashr","Al-Mumtahanah","As-Saff","Al-Jumu'ah","Al-Munafiqun","At-Taghabun","At-Talaq","At-Tahrim","Al-Mulk","Al-Qalam","Al-Haqqah","Al-Ma'arij","Nuh","Al-Jinn","Al-Muzzammil","Al-Muddaththir","Al-Qiyamah","Al-Insan","Al-Mursalat","An-Naba","An-Nazi'at","Abasa","At-Takwir","Al-Infitar","Al-Mutaffifin","Al-Inshiqaq","Al-Buruj","At-Tariq","Al-A'la","Al-Ghashiyah","Al-Fajr","Al-Balad","Ash-Shams","Al-Layl","Ad-Duhaa","Ash-Sharh","At-Tin","Al-Alaq","Al-Qadr","Al-Bayyinah","Az-Zalzalah","Al-Adiyat","Al-Qari'ah","At-Takathur","Al-Asr","Al-Humazah","Al-Fil","Quraysh","Al-Ma'un","Al-Kawthar","Al-Kafirun","An-Nasr","Al-Masad","Al-Ikhlas","Al-Falaq","An-Nas"];

  function keyFromIndex(index) {
    var offs = [], acc = 0, i, c = 0;
    for (i = 0; i < COUNTS.length; i++) { offs.push(acc); acc += COUNTS[i]; }
    i = Math.max(0, Math.min(acc - 1, index));
    while (c < 113 && offs[c + 1] <= i) c++;
    return (c + 1) + ":" + (i - offs[c] + 1);
  }
  function dailyKey() {
    var now = new Date();
    var dayIndex = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000);
    return keyFromIndex(dayIndex % 6236);
  }
  function clean(html) {
    return String(html || "")
      .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "\u2019")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .trim();
  }

  var LS = "ayah.widget.v1";
  function loadCache() {
    try { return JSON.parse(localStorage.getItem(LS)) || null; } catch (e) { return null; }
  }
  function saveCache(d) {
    try { localStorage.setItem(LS, JSON.stringify(d)); } catch (e) {}
  }

  function byId(id) { return document.getElementById(id); }
  var el = { head: byId("head"), arabic: byId("arabic"), trans: byId("trans"), foot: byId("foot") };

  function paint(d, offline) {
    var key = d.key || "";
    var chap = parseInt(key.split(":")[0], 10);
    el.head.textContent = (NAMES[chap - 1] || "12 Years") + "  ·  " + key;
    el.arabic.textContent = d.ar + "  ﴿" + key.split(":")[1] + "﴾";
    el.trans.textContent = d.en || "";
    el.trans.classList.toggle("hide", !d.en);
    el.foot.textContent = offline ? "offline · showing last verse" : "daily ayah · tap to open app";
    fit();
  }

  /* Auto-fit: shrink text until the whole card fits the widget frame,
     so resizing a Mac desktop widget re-fits the ayah instead of cropping it. */
  var docEl = document.documentElement;
  function fit() {
    var card = byId("card");
    if (!card) return;
    var f = 1, guard = 0;
    docEl.style.setProperty("--fit", f);
    while (guard++ < 40 && card.scrollHeight > card.clientHeight + 2 && f > 0.34) {
      f -= 0.045;
      docEl.style.setProperty("--fit", f);
    }
  }
  if (typeof ResizeObserver !== "undefined") {
    try { new ResizeObserver(fit).observe(document.body); } catch (e) {}
  }
  window.addEventListener("resize", fit);

  var qsKey = null;
  try {
    var qs = new URLSearchParams((location.search || "").replace(/^\?/, ""));
    qsKey = qs.get("key");
  } catch (e) {}

  function load() {
    var key = qsKey || dailyKey();
    var cached = loadCache();
    if (cached && cached.ar && cached.key === key) paint(cached, false); // instant paint

    fetch("https://api.quran.com/api/v4/verses/by_key/" + encodeURIComponent(key) +
        "?translations=131&fields=text_imlaei")
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (j) {
        var v = (j && j.verse) || (j && j.verses && j.verses[0]);
        if (!v) throw new Error("bad shape");
        var d = {
          key: key,
          ar: v.text_imlaei || v.text_uthmani || "",
          en: clean(v.translations && v.translations[0] ? v.translations[0].text : ""),
          day: dailyKey(),
        };
        if (!d.ar) throw new Error("empty verse");
        saveCache(d);
        paint(d, false);
      })
      .catch(function () {
        if (cached && cached.ar) paint(cached, true);
        else {
          el.head.textContent = "12 Years";
          el.arabic.textContent = "…";
          el.trans.textContent = "Open once while online to load the verse.";
        }
      });
  }

  load();
  // If the widget frame stays alive overnight, refetch when it becomes visible
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && !qsKey) {
      var c = loadCache();
      if (c && c.day && c.day !== dailyKey()) load();
    }
  });

  // exposed for tests (harmless in the browser)
  if (typeof globalThis !== "undefined") {
    globalThis.__widgetInternals = { keyFromIndex: keyFromIndex, dailyKey: dailyKey, clean: clean };
  }
})();