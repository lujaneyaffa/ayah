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

  console.log("\n" + (pass ? "ALL TESTS PASSED ✔" : "SOME TESTS FAILED ✘"));
})();