// Standalone unit test for Ayah's data + index logic (runs under Node).
const fs = require("fs");
const vm = require("vm");

const code = fs.readFileSync("app.js", "utf8");

function makeEl() {
  return {
    textContent: "", innerHTML: "", style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {}, addEventListener() {}, appendChild() {}, insertBefore() {},
    querySelector() { return makeEl(); }, querySelectorAll() { return []; }
  };
}

const sandbox = {
  document: {
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    createElement() { return makeEl(); },
    createTextNode(t) { return { nodeValue: t, textContent: t }; },
    addEventListener() {}
  },
  localStorage: (() => { const m = {}; return { getItem(k){ return (k in m) ? m[k] : null; }, setItem(k, v){ m[k] = String(v); }, removeItem(k){ delete m[k]; }, __store: m }; })(),
  btoa, atob,
  navigator: {},
  window: { addEventListener() {}, open() {} },
  fetch() { return Promise.reject(new Error("no net")); },
  setTimeout, clearTimeout, console
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const {
  SURAHS, FALLBACK, TOTAL_VERSES, keyFromIndex, indexFromKey, dailyVerseKey, parseKey
} = vm.runInContext(
  "({SURAHS, FALLBACK, TOTAL_VERSES, keyFromIndex, indexFromKey, dailyVerseKey, parseKey})",
  sandbox
);

let pass = true;
const check = (label, cond) => { console.log((cond ? "PASS" : "FAIL") + " - " + label); if (!cond) pass = false; };

check("Surah count is 114", SURAHS.length === 114);
check("Total verses is 6236", TOTAL_VERSES === 6236);
check("Surah 1 is Al-Fatihah, 7 ayahs", SURAHS[0].name === "Al-Fatihah" && SURAHS[0].ayahCount === 7);
check("Surah 114 is An-Nas, 6 ayahs", SURAHS[113].name === "An-Nas" && SURAHS[113].ayahCount === 6);

let roundTrip = true;
for (let i = 0; i < TOTAL_VERSES; i++) {
  const k = keyFromIndex(i).key;
  if (indexFromKey(k) !== i) { roundTrip = false; console.log("   mismatch at", i, k); break; }
}
check("Index<->key round-trips all 6236 verses", roundTrip);

const keysOk = Object.keys(FALLBACK).every(k => {
  const p = parseKey(k);
  return p.chapter >= 1 && p.chapter <= 114 && p.ayah >= 1 && p.ayah <= SURAHS[p.chapter - 1].ayahCount;
});
check("All fallback verse keys exist in the corpus", keysOk);

const dk = dailyVerseKey();
const dp = parseKey(dk);
check("Daily verse key is valid", dp.chapter >= 1 && dp.chapter <= 114);
check("keyFromIndex(0)==1:1", keyFromIndex(0).key === "1:1");
check("keyFromIndex(6235)==114:6", keyFromIndex(6235).key === "114:6");

  const { RECITERS } = vm.runInContext("({RECITERS})", sandbox);
  check("Reciter list non-empty (>=12)", Array.isArray(RECITERS) && RECITERS.length >= 12);
  check("Reciter ids are unique", new Set(RECITERS.map((r) => r.id)).size === RECITERS.length);
  check("Reciter ids are positive integers", RECITERS.every((r) => Number.isInteger(r.id) && r.id > 0));

  // htmlToText footnote/strip logic
  sandbox.document = {
    createElement() {
      const node = { _h: "" };
      Object.defineProperty(node, "innerHTML", {
        get() { return this._h; },
        set(v) { this._h = String(v); }
      });
      Object.defineProperty(node, "textContent", {
        get() { return this._h.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">"); },
        set() {}
      });
      return node;
    }
  };
  const { htmlToText } = vm.runInContext("({htmlToText})", sandbox);
  check("htmlToText strips sup footnotes",
    htmlToText('In the name of Allāh,<sup foot_note=195932>1</sup> the Merciful.<sup foot_note=9>2</sup>', 2000)
      === "In the name of Allāh, the Merciful.");
  check("htmlToText flattens block tags to paragraphs",
    htmlToText('<h1>Intro</h1><p>First para.</p><p>Second para.</p>', 2000)
      .includes("First para.") && htmlToText('<h1>Intro</h1><p>First para.</p><p>Second para.</p>', 2000)
      .includes("Second para."));
  check("htmlToText caps long text",
    htmlToText("word ".repeat(400), 120).length <= 121);
check("Total surah ayah counts sum matches offsets", OFFSETS_END() === TOTAL_VERSES);

function OFFSETS_END() {
  let acc = 0;
  for (const s of SURAHS) acc += s.ayahCount;
  return acc;
}

console.log("\n--- Integration: verse loading pipeline ---");
(async () => {
  // Fake a real Quran.com response (same shape as verified via curl)
  const fakeResponse = {
    verse: {
      verse_key: "1:5",
      text_imlaei: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
      translations: [{ resource_id: 20, text: "It is You we worship and You we ask for help." }]
    }
  };

  sandbox.fetch = (url) => {
    if (url.includes("by_key/1:5")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(fakeResponse) });
    }
    if (url.includes("/tafsirs/169/by_ayah/1:5")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ tafsir: { resource_id: 169, text: "<p>Explanation here.</p><sup foot_note=7>1</sup>" } })
      });
    }
    return Promise.reject(new Error("network down"));
  };

  const { loadVerse, loadTafsir } = vm.runInContext("({loadVerse, loadTafsir})", sandbox);

  // 1) network path
  const fromNetwork = await loadVerse("1:5");
  check("Online verse loads Arabic from API", fromNetwork.ar.includes("إِيَّاكَ"));
  check("Online verse loads English translation", fromNetwork.en.includes("It is You we worship"));

  // 2) fallback path (no network, but curated verse exists)
  const fromFallback = await loadVerse("2:286");
  check("Offline curated verse falls back", fromFallback.ar.length > 10 && fromFallback.en.length > 10);

  // 3) truly unavailable verse offline -> throws
  let threw = false;
  try { await loadVerse("3:200"); } catch { threw = true; }
  check("Missing verse throws when offline (graceful error state)", threw);

  // 4) tafsir: flattened + footnote-free, and cached
  const tf1 = await loadTafsir("1:5");
  check("loadTafsir flattens HTML + strips footnotes", tf1 === "Explanation here.");
  const tf2 = await loadTafsir("1:5");
  check("loadTafsir served from cache", tf2 === tf1);

  // --- Sync anti-clobber invariants (v23) ---
  const { collectSyncPayload, isDailySeed, dailyVerseKey: dvk } = vm.runInContext(
    "({collectSyncPayload, isDailySeed, dailyVerseKey})", sandbox);
  const todaySeed = dvk();
  const yestSeed = dvk(-1);
  check("today's auto-daily verse counts as a seed", isDailySeed(todaySeed));
  check("yesterday's auto-daily verse counts as a seed", isDailySeed(yestSeed));
  check("a 3-days-stale auto-daily verse counts as a seed", isDailySeed(dvk(-3)));
  check("a real reading spot (2:50) is NOT a seed", isDailySeed("2:50") === false);

  sandbox.localStorage.__store["ayah.lastVerse.v1"] = JSON.stringify(todaySeed);
  const payloadSeed = vm.runInContext("collectSyncPayload()", sandbox);
  check("payload omits an idle daily-seed position", payloadSeed.lastVerse === undefined);

  sandbox.localStorage.__store["ayah.lastVerse.v1"] = JSON.stringify("2:50");
  const payloadReal = vm.runInContext("collectSyncPayload()", sandbox);
  check("payload carries a real reading position", payloadReal.lastVerse === "2:50");

  const base = vm.runInContext("lastRemoteMemorized", sandbox);
  check("union baseline is a Set (never null)", !!base && typeof base.has === "function");

  // --- Position carry-forward (v25): an empty device must NOT erase the cloud's position ---
  sandbox.localStorage.__store["ayah.lastVerse.v1"] = JSON.stringify(null);
  vm.runInContext("lastRemotePos = { verse: \"2:50\", savedAt: 123 };", sandbox);
  const payloadCarry = vm.runInContext("collectSyncPayload()", sandbox);
  check("empty device CARRY-FORWARDS the cloud position (2:50)", payloadCarry.lastVerse === "2:50");

  sandbox.localStorage.__store["ayah.lastVerse.v1"] = JSON.stringify("2:55");
  const payloadLocal = vm.runInContext("collectSyncPayload()", sandbox);
  check("a device with a real local spot pushes ITS position (2:55)", payloadLocal.lastVerse === "2:55");

  // --- b64decode regression (v27): the cloud pull MUST actually decode base64.
  // The old implementation omitted atob — every pull failed to parse, pushes
  // were blocked, and stars/position never merged. Lock the round-trip in.
  const { b64encode, b64decode } = vm.runInContext("({b64encode, b64decode})", sandbox);
  const sampleJson = JSON.stringify({ memorized: ["2:1", "2:2"], lastVerse: "2:50", device: "dev-regression" });
  check("b64decode(b64encode(json)) round-trips exactly", b64decode(b64encode(sampleJson)) === sampleJson);
  check("b64decode of a real GitHub-content payload parses to JSON object",
    JSON.parse(b64decode(b64encode(sampleJson))).lastVerse === "2:50");

  // --- Multi-ayah loop (v30) ---
  vm.runInContext('state.loop = { on: true, from: "2:1", to: "2:3" }; state.currentKey = "2:3";', sandbox);
  check("loop WRAPS at the end of the selection (2:3 → back to 2:1)",
    vm.runInContext("loopAdvance()", sandbox) === "wrap");
  vm.runInContext('state.currentKey = "2:2";', sandbox);
  check("loop CONTINUES inside the selection (2:2)", vm.runInContext("loopAdvance()", sandbox) === "next");
  vm.runInContext('state.currentKey = "3:5";', sandbox);
  check("loop keeps playing through when outside the selection", vm.runInContext("loopAdvance()", sandbox) === "next");
  vm.runInContext("state.loop.on = false;", sandbox);
  check("loop OFF falls back to the autoPlay logic", vm.runInContext("loopAdvance()", sandbox) === "off");
  const nl = vm.runInContext('normalizeLoop({ on: true, from: "2:1", to: "999:999" })', sandbox);
  check("normalizeLoop drops an invalid endpoint, keeps a valid one",
    nl.on === true && nl.from === "2:1" && nl.to === null);
  const nlEmpty = vm.runInContext("normalizeLoop(undefined)", sandbox);
  check("normalizeLoop(undefined) is a safe empty loop",
    nlEmpty.on === false && nlEmpty.from === null && nlEmpty.to === null);
  sandbox.localStorage.__store["ayah.lastVerse.v1"] = JSON.stringify("2:50");
  vm.runInContext('state.loop = { on: true, from: "2:1", to: "2:3" };', sandbox);
  const payloadLoop = vm.runInContext("collectSyncPayload()", sandbox);
  check("payload includes the loop range for cross-device sync",
    payloadLoop.loop.on === true && payloadLoop.loop.from === "2:1" && payloadLoop.loop.to === "2:3");

  // --- Word-by-word highlight timing (v31) ---
  const segsFn = vm.runInContext("ayahSegmentsFromSurahTimings", sandbox);
  const surahVT = [{ verse_key: "2:6", timestamp_from: 55250, timestamp_to: 67870,
    segments: [[1, 55205, 56465], [2, 56465, 57375], [3, 57375, 58115]] }];
  const s26 = segsFn(surahVT, "2:6");
  check("segments rebase onto the per-ayah file (ayah-relative, start at 0)",
    !!s26 && s26[0][0] === 1 && s26[0][1] === 0 && s26[1][1] === 56465 - 55250);
  check("a segment starting before the ayah cut clamps to 0", s26[0][1] === 0);
  check("segments return null for an unknown verse key", segsFn(surahVT, "3:1") === null);
  // Real-data quirk: a word can be split into a 2-element continuation segment
  // [pos, from] that has no end time and runs to the ayah end (v31, 2:255 word 50)
  const splitVT = [{ verse_key: "112:1", timestamp_from: 1000, timestamp_to: 5000,
    segments: [[1, 1000, 2000], [2, 2000, 3000], [2, 3000]] }];
  const sSplit = segsFn(splitVT, "112:1");
  check("a 2-element continuation segment runs to the ayah end",
    sSplit.length === 3 && sSplit[2][1] === 2000 && sSplit[2][2] === 4000);
  const prop = vm.runInContext("proportionalSegments(4, 1000)", sandbox);
  check("proportional fallback covers the verse evenly",
    prop.length === 4 && prop[0][1] === 0 && prop[3][2] === 1000);
  check("proportional fallback rejects impossible input",
    vm.runInContext("proportionalSegments(0, 1000)", sandbox) === null &&
    vm.runInContext("proportionalSegments(4, NaN)", sandbox) === null);
  const pick = vm.runInContext("pickActiveWord", sandbox);
  check("pickActiveWord finds the word playing at 1500ms (word 2)", pick(s26, 1500) === 2);
  check("pickActiveWord past the last word keeps the last word", pick(s26, 9999) === 3);
  check("pickActiveWord before the first word returns 0", pick(s26, -5) === 0);
  check("pickActiveWord inside a gap keeps the previous word lit",
    pick([[1, 0, 100], [2, 200, 300]], 150) === 1);
  check("pickActiveWord with no data returns 0", pick(null, 100) === 0);
  check("a split word still highlights as one word at both spans",
    pick(sSplit, 2500) === 2 && pick(sSplit, 3500) === 2);
  const wl = vm.runInContext("wordListFromApi", sandbox);
  const apiWords = [
    { char_type_name: "word", position: 1, text: "ذَٰلِكَ" },
    { char_type_name: "end", position: 2, text: "﴿١﴾" },
    { char_type_name: "word", position: 3, text: "ٱلْكِتَـٰبُ" }
  ];
  const wlOut = wl(apiWords);
  check("word list keeps only renderable words (drops the ayah medallion)",
    wlOut.length === 2 && wlOut[0].position === 1 && wlOut[1].position === 3);
  check("word list tolerates garbage input", wl(null).length === 0 && wl(undefined).length === 0);

  // --- Offline + reconnect (v32) ---
  const upd = vm.runInContext("updateDecision", sandbox);
  check("reconnect: a newer remote version triggers a reload",
    upd("v33", "v32") === "reload");
  check("reconnect: same or missing remote does nothing",
    upd("v32", "v32") === "none" && upd(null, "v32") === "none");
  check("reconnect: missing current version stays safe",
    upd("v33", null) === "none");

  // --- Memorization check (v35) ---
  const normWord = vm.runInContext("normalizeArabicWord", sandbox);
  const tokenize = vm.runInContext("tokenizeArabic", sandbox);
  const align = vm.runInContext("alignRecitation", sandbox);
  const verdict = vm.runInContext("recitationVerdict", sandbox);

  check("normalizeArabicWord strips diacritics",
    normWord("الْحَمْدُ") === normWord("الحمد"));
  check("normalizeArabicWord folds alef variants to bare alef",
    normWord("أحمد") === normWord("احمد") && normWord("إحمد") === normWord("احمد"));
  check("normalizeArabicWord folds teh marbuta to heh",
    normWord("رحمة") === normWord("رحمه"));
  check("normalizeArabicWord folds alef maksura to yeh",
    normWord("موسى") === normWord("موسي"));
  check("normalizeArabicWord drops punctuation, keeps letters",
    normWord("الكتاب،") === normWord("الكتاب"));

  check("tokenizeArabic splits on whitespace and normalizes each word",
    JSON.stringify(tokenize("الْحَمْدُ لِلَّهِ")) === JSON.stringify([normWord("الحمد"), normWord("لله")]));
  check("tokenizeArabic tolerates empty/garbage input",
    tokenize("").length === 0 && tokenize(null).length === 0);

  check("alignRecitation: exact match scores 100%", (() => {
    const r = align(["ا", "ب", "ج"], ["ا", "ب", "ج"]);
    return r.correct === 3 && r.total === 3 && r.accuracy === 1 && r.extraWords === 0;
  })());
  check("alignRecitation: a dropped trailing word is marked missed", (() => {
    const r = align(["ا", "ب", "ج"], ["ا", "ب"]);
    return JSON.stringify(r.perWord) === JSON.stringify(["said", "said", "missed"]) && r.correct === 2;
  })());
  check("alignRecitation: an inserted word doesn't hurt reference words and counts as extra", (() => {
    const r = align(["ا", "ب"], ["ا", "x", "ب"]);
    return r.correct === 2 && r.accuracy === 1 && r.extraWords === 1;
  })());
  check("alignRecitation: a substituted middle word is marked missed there only", (() => {
    const r = align(["ا", "ب", "ج"], ["ا", "x", "ج"]);
    return JSON.stringify(r.perWord) === JSON.stringify(["said", "missed", "said"]) && r.correct === 2;
  })());
  check("alignRecitation: empty reference never divides by zero",
    align([], []).accuracy === 0 && align([], []).total === 0);

  check("recitationVerdict: high accuracy reads as success",
    /Great/.test(verdict(1)) && /Great/.test(verdict(0.95)));
  check("recitationVerdict: mid accuracy asks to check highlights",
    /Almost/.test(verdict(0.7)));
  check("recitationVerdict: low accuracy asks to practice again",
    /practice/.test(verdict(0.2)));

  // --- Segmenting: cut on real pauses (v43) ---
  const findQuietCut = vm.runInContext("findQuietCutIndex", sandbox);
  const findPausesFn = vm.runInContext("findPauses", sandbox);
  const sr = 16000;
  let pseed = 777;
  const prnd = () => { pseed = (pseed * 1664525 + 1013904223) >>> 0; return pseed / 4294967296 - 0.5; };
  // synthetic recitation: voiced bursts separated by pauses of the given lengths (seconds)
  const makeSpeech = (chunks) => {
    const total = chunks.reduce((a, c) => a + c.sec, 0);
    const out = new Float32Array(Math.round(total * sr)); let o = 0;
    for (const c of chunks) {
      const n = Math.round(c.sec * sr);
      for (let i = 0; i < n; i++) out[o + i] = c.speech ? Math.sin(i * 0.05) * (0.25 + 0.15 * Math.sin(i / 3000)) + prnd() * 0.02 : prnd() * 0.003;
      o += n;
    }
    return out;
  };

  check("findQuietCutIndex: picks the quiet stretch over the loud one", (() => {
    const pcm = new Float32Array(sr * 4);
    for (let i = 0; i < pcm.length; i++) pcm[i] = i > sr * 1.5 && i < sr * 2.5 ? 0 : 1; // loud, quiet, loud
    const idx = findQuietCut(pcm, sr * 2, sr * 2);
    return idx > sr * 1.5 && idx < sr * 2.5;
  })());
  check("findPauses: finds a real pause and reports where it is", (() => {
    const pcm = makeSpeech([{ sec: 3, speech: 1 }, { sec: 0.8, speech: 0 }, { sec: 3, speech: 1 }]);
    const ps = findPausesFn(pcm, 0, pcm.length, 250);
    return ps.length === 1 && ps[0].a / sr > 2.8 && ps[0].a / sr < 3.2 && (ps[0].b - ps[0].a) / sr > 0.6;
  })());
  check("findPauses: ignores a gap shorter than the minimum (a breath inside a word/phrase)", (() => {
    const pcm = makeSpeech([{ sec: 3, speech: 1 }, { sec: 0.1, speech: 0 }, { sec: 3, speech: 1 }]);
    return findPausesFn(pcm, 0, pcm.length, 250).length === 0;
  })());
  check("findPauses: judges 'quiet' relative to the recording (a very quiet mic still has pauses)", (() => {
    const pcm = makeSpeech([{ sec: 3, speech: 1 }, { sec: 0.8, speech: 0 }, { sec: 3, speech: 1 }]);
    for (let i = 0; i < pcm.length; i++) pcm[i] *= 0.05;
    return findPausesFn(pcm, 0, pcm.length, 250).length === 1;
  })());
  check("findPauses: steady noise has no pauses", (() => {
    const pcm = new Float32Array(sr * 6); for (let i = 0; i < pcm.length; i++) pcm[i] = prnd() * 0.3;
    return findPausesFn(pcm, 0, pcm.length, 250).length === 0;
  })());

  const planSegs = vm.runInContext("planAsrSegments", sandbox);
  check("planAsrSegments: short audio is a single segment", (() => {
    const pcm = makeSpeech([{ sec: 5, speech: 1 }]);
    const segs = planSegs(pcm, sr, null, 0, true);
    return segs.length === 1 && segs[0].start === 0 && segs[0].end === pcm.length && segs[0].final;
  })());
  check("planAsrSegments: cuts on the LONGEST pause, not the first one", (() => {
    // short 0.4s pause at ~5s, long 1.2s pause at ~11s, then more speech
    const pcm = makeSpeech([{ sec: 5, speech: 1 }, { sec: 0.4, speech: 0 }, { sec: 5.5, speech: 1 }, { sec: 1.2, speech: 0 }, { sec: 5, speech: 1 }, { sec: 10, speech: 1 }]);
    const segs = planSegs(pcm, sr, null, 0, true);
    const cutAt = segs[0].end / sr;
    return cutAt > 10.9 && cutAt < 12.3;
  })());
  check("planAsrSegments: a cut never lands inside speech when a pause is available", (() => {
    const pcm = makeSpeech([{ sec: 6, speech: 1 }, { sec: 0.7, speech: 0 }, { sec: 6, speech: 1 }, { sec: 0.7, speech: 0 }, { sec: 6, speech: 1 }, { sec: 0.7, speech: 0 }, { sec: 6, speech: 1 }, { sec: 3, speech: 1 }]);
    const segs = planSegs(pcm, sr, null, 0, true);
    // every cut but the last segment's end must sit in a silent stretch
    return segs.slice(0, -1).every((sg) => { let peak = 0; for (let i = sg.end - 400; i < sg.end + 400; i++) peak = Math.max(peak, Math.abs(pcm[i])); return peak < 0.05; });
  })());
  check("planAsrSegments: no segment is longer than the maximum", (() => {
    const pcm = makeSpeech([{ sec: 60, speech: 1 }]); // continuous, no pauses at all -> falls back to quiet spots
    const segs = planSegs(pcm, sr, null, 0, true);
    return segs.length >= 3 && segs.every((sg) => (sg.end - sg.start) / sr <= 18.01);
  })());
  check("planAsrSegments: segments are contiguous and cover the audio exactly", (() => {
    const pcm = makeSpeech([{ sec: 7, speech: 1 }, { sec: 0.6, speech: 0 }, { sec: 9, speech: 1 }, { sec: 0.9, speech: 0 }, { sec: 8, speech: 1 }, { sec: 0.5, speech: 0 }, { sec: 9, speech: 1 }]);
    const segs = planSegs(pcm, sr, null, 0, true);
    let ok = segs[0].start === 0 && segs[segs.length - 1].end === pcm.length;
    for (let i = 1; i < segs.length; i++) if (segs[i].start !== segs[i - 1].end) ok = false;
    return ok;
  })());
  check("planAsrSegments: while recording, earlier segments are final and the last is provisional", (() => {
    const pcm = makeSpeech([{ sec: 8, speech: 1 }, { sec: 0.8, speech: 0 }, { sec: 8, speech: 1 }, { sec: 0.8, speech: 0 }, { sec: 8, speech: 1 }, { sec: 0.8, speech: 0 }, { sec: 5, speech: 1 }]);
    const segs = planSegs(pcm, sr, null, 0, false);
    return segs.length >= 2 && segs.slice(0, -1).every((x) => x.final) && segs[segs.length - 1].final === false;
  })());
  check("planAsrSegments: with less than a full window of audio nothing is decided yet", (() => {
    const pcm = makeSpeech([{ sec: 8, speech: 1 }, { sec: 0.8, speech: 0 }, { sec: 6, speech: 1 }]);
    const segs = planSegs(pcm, sr, null, 0, false);
    return segs.length === 1 && segs[0].final === false && segs[0].end === pcm.length;
  })());
  check("planAsrSegments: once recording has ended, everything is final", (() => {
    const pcm = makeSpeech([{ sec: 8, speech: 1 }, { sec: 0.8, speech: 0 }, { sec: 8, speech: 1 }, { sec: 0.8, speech: 0 }, { sec: 9, speech: 1 }, { sec: 5, speech: 1 }]);
    return planSegs(pcm, sr, null, 0, true).every((x) => x.final);
  })());
  check("planAsrSegments: live cuts are exactly the cuts a final pass makes (cached text stays valid)", (() => {
    const full = makeSpeech([{ sec: 8, speech: 1 }, { sec: 0.9, speech: 0 }, { sec: 9, speech: 1 }, { sec: 0.6, speech: 0 }, { sec: 8, speech: 1 }, { sec: 0.8, speech: 0 }, { sec: 9, speech: 1 }, { sec: 0.7, speech: 0 }, { sec: 8, speech: 1 }, { sec: 8, speech: 1 }]);
    const late = planSegs(full, sr, null, 0, true);
    // as if the recording were 30s, then 45s, then 60s long: whatever was already final must match
    return [30, 45, 60].every((secs) => {
      const early = planSegs(full.subarray(0, Math.min(full.length, secs * sr)), sr, null, 0, false).filter((x) => x.final);
      return early.every((x, i) => late[i].start === x.start && late[i].end === x.end);
    });
  })());
  check("planAsrSegments: resuming from a finished boundary continues with the same cuts", (() => {
    const full = makeSpeech([{ sec: 8, speech: 1 }, { sec: 0.9, speech: 0 }, { sec: 9, speech: 1 }, { sec: 0.6, speech: 0 }, { sec: 8, speech: 1 }, { sec: 0.8, speech: 0 }, { sec: 9, speech: 1 }, { sec: 0.7, speech: 0 }, { sec: 8, speech: 1 }]);
    const all = planSegs(full, sr, null, 0, true);
    const rest = planSegs(full, sr, null, all[0].end, true);
    return rest.length === all.length - 1 && rest.every((x, i) => x.start === all[i + 1].start && x.end === all[i + 1].end);
  })());

  // --- Mic gain normalization (v38) ---
  const normGain = vm.runInContext("normalizeGain", sandbox);
  check("normalizeGain boosts a quiet recording up near full scale", (() => {
    const pcm = new Float32Array(1000).fill(0.05);
    const out = normGain(pcm);
    let peak = 0; for (const v of out) peak = Math.max(peak, Math.abs(v));
    return peak > 0.8 && peak <= 0.86;
  })());
  check("normalizeGain leaves an already-loud recording alone", (() => {
    const pcm = new Float32Array(1000).fill(0.9);
    const out = normGain(pcm);
    return out === pcm; // same reference — no unnecessary copy/scale
  })());
  check("normalizeGain leaves silence alone (no divide-by-zero blowup)", (() => {
    const pcm = new Float32Array(1000); // all zeros
    const out = normGain(pcm);
    return out.every((v) => v === 0);
  })());
  check("normalizeGain preserves relative shape, not just peak", (() => {
    const pcm = new Float32Array([0.02, -0.01, 0.04, -0.02]);
    const out = normGain(pcm);
    return Math.abs(out[0] / out[2] - pcm[0] / pcm[2]) < 1e-6;
  })());

  // --- Checker v39: tolerant matching, reached, incremental segments, speech gate ---
  const sim = vm.runInContext("wordSimilarity", sandbox);
  const looksSpeech = vm.runInContext("segmentLooksLikeSpeech", sandbox);
  const nw = normWord;

  check("wordSimilarity: identical = 1, unrelated = low",
    sim("الرحمن", "الرحمن") === 1 && sim("الرحمن", "كتاب") < 0.5);
  check("wordSimilarity: short words never fuzzy-match",
    sim("من", "مع") === 0 && sim("لا", "ما") === 0);
  check("alignRecitation: a one-letter slip is 'close', not flat wrong", (() => {
    const r = align([nw("الرَّحْمَٰنِ")], [nw("الرحمان")]);
    return r.perWord[0] === "close" && r.close === 1 && r.correct === 0 && r.reached === 1;
  })());
  check("alignRecitation: a compound the model splits in two still matches (يَا أَيُّهَا)", (() => {
    const r = align([nw("يَٰٓأَيُّهَا"), nw("ٱلَّذِينَ")], [nw("يَا"), nw("أَيُّهَا"), nw("الَّذِينَ")]);
    return r.perWord[0] !== "missed" && r.perWord[1] === "said" && r.extraWords === 0;
  })());
  check("alignRecitation: two reference words spoken as one heard word both match", (() => {
    const r = align(["لا", "اله"], ["لااله"]);
    return r.perWord[0] === "said" && r.perWord[1] === "said";
  })());
  check("alignRecitation: words after where the reciter stopped are 'not reached', not mistakes", (() => {
    const r = align(["ا", "ب", "ج", "د"], ["ا", "ب"]);
    return r.reached === 2 && r.accuracy === 0.5 && r.reachedAccuracy === 1;
  })());
  check("alignRecitation: a skipped word in the MIDDLE is a miss inside the reached span", (() => {
    const r = align(["ا", "ب", "ج", "د"], ["ا", "ج", "د"]);
    return r.reached === 4 && r.perWord[1] === "missed" && r.correct === 3;
  })());
  check("alignRecitation: when a phrase repeats, the EARLIEST alignment wins (a reciter starts at the top)", (() => {
    const r = align(["ا", "ب", "ج", "ا", "ب"], ["ا", "ب"]);
    return r.perWord.join() === "said,said,missed,missed,missed" && r.reached === 2;
  })());
  check("alignRecitation: only the tail of a repeated phrase heard still lands on the first occurrence", (() => {
    const r = align(["س", "ا", "ب", "ج", "ا", "ب"], ["ا", "ب"]);
    return r.perWord[1] === "said" && r.perWord[2] === "said" && r.perWord[4] === "missed";
  })());
  check("alignRecitation: nothing heard means nothing reached",
    align(["ا", "ب"], []).reached === 0);
  check("alignRecitation: a full-page-sized alignment finishes quickly", (() => {
    const ref = [], said = [];
    for (let i = 0; i < 250; i++) { ref.push("كلمه" + (i % 37)); said.push("كلمه" + (i % 37)); }
    const t0 = Date.now();
    const r = align(ref, said);
    return r.correct === 250 && Date.now() - t0 < 1500;
  })());

  const mkAudio = (sec) => new Float32Array(sr * sec);
  let seed = 12345;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 - 0.5; };
  check("segmentLooksLikeSpeech: steady noise is not speech", (() => {
    const n = mkAudio(6); for (let i = 0; i < n.length; i++) n[i] = rnd() * 0.3;
    return looksSpeech(n) === false;
  })());
  check("segmentLooksLikeSpeech: digital silence is not speech", looksSpeech(mkAudio(6)) === false);
  check("segmentLooksLikeSpeech: bursts of voice-like sound with pauses between IS speech", (() => {
    const n = mkAudio(6);
    for (let i = 0; i < n.length; i++) {
      const burst = Math.floor(i / (sr * 0.4)) % 2 === 0;
      n[i] = burst ? Math.sin(i * 0.07) * 0.3 + rnd() * 0.05 : rnd() * 0.004;
    }
    return looksSpeech(n) === true;
  })());
  check("segmentLooksLikeSpeech: SUSTAINED voiced sound with only gentle swells (real recitation has few true gaps) is speech", (() => {
    const n = mkAudio(6);
    for (let i = 0; i < n.length; i++) {
      const swell = 0.35 + 0.65 * Math.abs(Math.sin(i / sr * Math.PI * 1.3)); // never drops to silence
      n[i] = Math.sin(i * 0.05) * 0.2 * swell + rnd() * 0.003;
    }
    return looksSpeech(n) === true;
  })());
  check("segmentLooksLikeSpeech: too-short scraps are skipped", looksSpeech(new Float32Array(500).fill(0.3)) === false);

  // --- Mistakes report (v43) ---
  const buildReport = vm.runInContext("buildCheckReport", sandbox);
  check("alignRecitation: a wrong word is reported with what was heard instead", (() => {
    const r = align(["ا", "بكر", "ج"], ["ا", "سوى", "ج"], ["ا", "سُوى", "ج"]);
    return r.perWord[1] === "missed" && r.heard[1] === "سُوى" && r.heard[0] === "ا";
  })());
  check("alignRecitation: a word that was never heard has nothing heard for it", (() => {
    const r = align(["ا", "بكر", "ج", "د"], ["ا", "ج", "د"]);
    return r.perWord[1] === "missed" && r.heard[1] === null && r.correct === 3;
  })());
  check("alignRecitation: pairing a wrong word never costs a real match", (() => {
    const r = align(["ا", "ب", "ج", "د", "ه"], ["ا", "ج", "د", "ه"]);
    return r.correct === 4 && r.perWord[1] === "missed" && r.heard[1] === null;
  })());
  check("alignRecitation: a close word reports what was heard", (() => {
    const r = align([nw("الرَّحْمَٰنِ")], [nw("الرحمان")], ["الرحمان"]);
    return r.perWord[0] === "close" && r.heard[0] === "الرحمان";
  })());

  const aRep = align(["ا", "بكر", "جمل", "الرحمن", "ه", "و"], ["ا", "سوى", "جمل", "الرحمان", "ه"], ["ا", "سُوى", "جمل", "الرحمان", "ه"]);
  const rep = buildReport(aRep, ["ا", "بَكْر", "جَمَل", "الرَّحْمَٰنِ", "هـ", "و"], [1, 1, 2, 2, 2, 3]);
  check("buildCheckReport: counts mistakes and close separately", rep.mistakes === 1 && rep.close === 1);
  check("buildCheckReport: groups by ayah in reading order", rep.groups.length === 2 && rep.groups[0].ayah === 1 && rep.groups[1].ayah === 2);
  check("buildCheckReport: a wrong word says what was heard instead, with the expected word", (() => {
    const it = rep.groups[0].items[0];
    return it.kind === "wrong" && it.expected === "بَكْر" && it.heard === "سُوى" && it.idx === 1;
  })());
  check("buildCheckReport: a close word is listed as close", rep.groups[1].items[0].kind === "close");
  check("buildCheckReport: words past where the reciter stopped are 'not reached', not mistakes",
    rep.notReached && rep.notReached.words === 1 && rep.notReached.fromAyah === 3 && rep.mistakes === 1);
  check("buildCheckReport: a perfect recitation has an empty report", (() => {
    const r = buildReport(align(["ا", "ب"], ["ا", "ب"]), ["ا", "ب"], [1, 1]);
    return r.mistakes === 0 && r.close === 0 && r.groups.length === 0 && r.notReached === null;
  })());
  check("buildCheckReport: a skipped word is 'skipped' (nothing heard for it)", (() => {
    const r = buildReport(align(["ا", "بكر", "ج", "د"], ["ا", "ج", "د"]), ["ا", "بكر", "ج", "د"], [1, 1, 1, 1]);
    return r.groups[0].items[0].kind === "skipped" && r.groups[0].items[0].heard === null;
  })());

  // --- Second look at dropped phrases (v43) ---
  const suspectGaps = vm.runInContext("findSuspectGaps", sandbox);
  const segsForGap = vm.runInContext("segmentsForGap", sandbox);
  const refine = vm.runInContext("refineWithSecondLook", sandbox);

  check("alignRecitation: reports which reference word each heard word lined up with", (() => {
    const r = align(["ا", "ب", "ج"], ["ا", "ج", "x"]);
    return r.saidRef[0] === 0 && r.saidRef[1] === 2 && r.saidRef[2] === -1;
  })());
  check("findSuspectGaps: finds a run of 3+ missed words inside what was recited", (() => {
    const g = suspectGaps({ reached: 8, perWord: ["said", "missed", "missed", "missed", "said", "missed", "said", "said", "missed"] }, 3);
    return g.length === 1 && g[0].from === 1 && g[0].to === 3;
  })());
  check("findSuspectGaps: a lone missed word is not suspicious", suspectGaps({ reached: 4, perWord: ["said", "missed", "said", "said"] }, 3).length === 0);
  check("findSuspectGaps: words after where the reciter stopped are never suspicious", suspectGaps({ reached: 2, perWord: ["said", "said", "missed", "missed", "missed"] }, 3).length === 0);
  check("segmentsForGap: covers the segment before through the segment after the gap",
    JSON.stringify(segsForGap({ from: 2, to: 3 }, { saidRef: [0, 1, -1, 4, 5] }, [0, 0, 0, 1, 1])) === "[0,1]");
  check("segmentsForGap: a gap at the very start begins at the first segment",
    JSON.stringify(segsForGap({ from: 0, to: 2 }, { saidRef: [3, 4, 5] }, [1, 1, 2])) === "[0,1]");

  const ref8 = ["بسم", "الله", "الرحمن", "الرحيم", "الحمد", "لله", "رب", "العالمين"];
  check("refineWithSecondLook: recovers a phrase the first pass dropped", await (async () => {
    const texts = ["", "الحمد لله رب العالمين", ""];
    const r = await refine(texts, ref8, async (k) => (k === 1 ? "بسم الله الرحمن الرحيم الحمد لله رب العالمين" : texts[k]));
    return r.refined === 1 && r.alignment.correct === 8;
  })());
  check("refineWithSecondLook: does nothing when the first pass had no suspicious gap", await (async () => {
    let calls = 0;
    const r = await refine(["بسم الله الرحمن الرحيم الحمد لله رب العالمين"], ref8, async () => { calls++; return "x"; });
    return r.refined === 0 && calls === 0 && r.alignment.correct === 8;
  })());
  check("refineWithSecondLook: keeps the original when the retry is no better (a genuinely skipped ayah stays skipped)", await (async () => {
    const texts = ["", "الحمد لله رب العالمين", ""];
    const r = await refine(texts, ref8, async (k) => texts[k]);
    return r.refined === 0 && r.alignment.correct === 4 && r.texts[1] === texts[1];
  })());
  check("refineWithSecondLook: rejects a retry that has more words but matches the text worse", await (async () => {
    const texts = ["", "الحمد لله رب العالمين", ""];
    const r = await refine(texts, ref8, async (k) => (k === 1 ? "ص ض ط ظ ع غ ف ق" : texts[k]));
    return r.refined === 0 && r.alignment.correct === 4 && r.texts[1] === texts[1];
  })());
  check("refineWithSecondLook: stops at once if the attempt was cancelled", await (async () => {
    const texts = ["", "الحمد لله رب العالمين", ""];
    const r = await refine(texts, ref8, async () => "بسم الله الرحمن الرحيم الحمد لله رب العالمين", () => true);
    return r.refined === 0 && r.alignment.correct === 4;
  })());

  // --- Repeat-loop guard (v43) ---
  const collapse = vm.runInContext("collapseRepeatedPhrases", sandbox);
  check("collapseRepeatedPhrases: a phrase stuck on repeat is kept once", collapse("س ا ب ج ا ب ج ا ب ج ا ب ج ا ب ج ص") === "س ا ب ج ص");
  check("collapseRepeatedPhrases: a single word looping is kept once", collapse("س ا ا ا ا ا ا ص") === "س ا ص");
  check("collapseRepeatedPhrases: ignores diacritics when deciding two words are the same", collapse("رَبِّ رَبِ ربّ رب رب") === "رَبِّ");
  check("collapseRepeatedPhrases: normal repetition (2x or 3x) is left alone", collapse("ا ب ا ب") === "ا ب ا ب" && collapse("ا ب ا ب ا ب") === "ا ب ا ب ا ب");
  check("collapseRepeatedPhrases: ordinary text and empty input are untouched", collapse("بسم الله الرحمن الرحيم") === "بسم الله الرحمن الرحيم" && collapse("") === "");

  console.log("\n" + (pass ? "ALL TESTS PASSED ✔" : "SOME TESTS FAILED ✘"));
})();