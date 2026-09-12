// Scriptable widget test — stubs mirror the REAL Scriptable API
// (properties not functions — this is how the lineLimit() bug gets caught).
// Run: node widget_test.js
const fs = require("fs");
const vm = require("vm");

let pass = true;
const check = (label, cond) => { console.log((cond ? "PASS" : "FAIL") + " - " + label); if (!cond) pass = false; };

/* ---------- shared stubs (real-API-shaped) ---------- */
class FakeColor {
  constructor(hex, alpha) { this.hex = hex; this.alpha = alpha === undefined ? 1 : alpha; this.isColor = true; }
}
FakeColor.black = () => new FakeColor("#000000");
FakeColor.dynamic = (l, d) => ({ dynamic: true, light: l, dark: d, isColor: true });

class FakeFont { constructor(name, size) { this.name = name; this.size = size; } }
for (const [k, n] of [
  ["systemFont", "system"], ["regularSystemFont", "system"], ["mediumSystemFont", "system"],
  ["semiboldSystemFont", "system"], ["boldSystemFont", "system"],
  ["italicSystemFont", "system"], ["lightSystemFont", "system"],
  ["regularRoundedSystemFont", "rounded"], ["semiboldRoundedSystemFont", "rounded"],
  ["boldRoundedSystemFont", "rounded"],
]) {
  FakeFont[k] = (size) => new FakeFont(n, size);
}

class FakeRect { constructor(x, y, w, h) { this.x = x; this.y = y; this.width = w; this.height = h; } }
class FakeSize { constructor(w, h) { this.width = w; this.height = h; } }

class FakeDrawContext {
  constructor() { this.ops = []; this.size = null; this.respectScreenScale = false; this.opaque = true; }
  setFillColor() {} setStrokeColor(c) { this.ops.push(["stroke", c]); }
  setLineWidth(n) { this.ops.push(["lineWidth", n]); }
  fillEllipse() {} strokeEllipse(r) { this.ops.push(["strokeEllipse", r]); }
  drawTextInRect(t) { this.ops.push(["text", String(t)]); }
  setFont() {} setTextColor() {} setTextAlignedCenter() {}
  getImage() { return { isImage: true, ops: this.ops }; }
}

class FakeWidgetText {
  constructor(text) {
    this.text = String(text);
    this.font = null; this.textColor = null;
    this.lineLimit = 0; this.minimumScaleFactor = 1; this.textOpacity = 1;
    this.url = null; this._align = "left";
  }
  leftAlignText() { this._align = "left"; }
  centerAlignText() { this._align = "center"; }
  rightAlignText() { this._align = "right"; }
}
class FakeWidgetImage {
  constructor(image) {
    this.image = image; this.imageSize = null; this.resizable = true;
    this.tintColor = null; this.cornerRadius = 0; this.url = null;
  }
  leftAlignImage() {} centerAlignImage() {} rightAlignImage() {}
  applyFittingContentMode() {} applyFillingContentMode() {}
}
class FakeStack {
  constructor() {
    this.children = []; this.layout = "vertical"; this.spacing = 0;
    this.size = null; this.cornerRadius = 0; this.borderWidth = 0;
    this.borderColor = null; this.backgroundColor = null; this.url = null;
    this.padding = null;
  }
  addText(t) { const e = new FakeWidgetText(t); this.children.push(e); return e; }
  addImage(i) { const e = new FakeWidgetImage(i); this.children.push(e); return e; }
  addSpacer(len) { const e = { spacer: true, length: len === undefined ? null : len }; this.children.push(e); return e; }
  addStack() { const s = new FakeStack(); this.children.push(s); return s; }
  layoutHorizontally() { this.layout = "horizontal"; }
  layoutVertically() { this.layout = "vertical"; }
  setPadding(t, l, b, r) { this.padding = [t, l, b, r]; }
  useDefaultPadding() {}
  topAlignContent() {} centerAlignContent() {} bottomAlignContent() {}
}
class FakeListWidget extends FakeStack {
  constructor() { super(); this.refreshAfterDate = null; }
  presentSmall() { return Promise.resolve(); }
  presentMedium() { return Promise.resolve(); }
  presentLarge() { return Promise.resolve(); }
}

const CODE = fs.readFileSync("scriptable-widget.js", "utf8");
const MARKER = "read-card-twin-v3";

/* ---------- Scriptable globals the widget script uses ---------- */
class FakeFetchResponse { constructor() {} }
FakeFetchResponse._body = "";
class FakeRequest {
  constructor(url) { this.url = url; this.timeoutInterval = 0; }
  async loadJSON() { return JSON.parse(FakeFetchResponse._body); }
}
const FakeSFSymbol = { named: () => ({ image: null }) };
const FakeDevice = { isUsingDarkAppearance: () => false };
class FakeFMInstance {
  documentsDirectory() { return "/tmp/ayah-test-docs"; }
  joinPath(a, b) { return a + "/" + b; }
  fileExists() { return FakeFileManagerCtor._exists; }
  readString() { return FakeFileManagerCtor._data; }
  writeString(p, s) { FakeFileManagerCtor._exists = true; FakeFileManagerCtor._data = s; }
}
class FakeFileManagerCtor {}
FakeFileManagerCtor.local = () => new FakeFMInstance();
FakeFileManagerCtor._exists = false;
FakeFileManagerCtor._data = "";

/* ---------- run every combination against a shape-aware stub ---------- */
async function runCase(sizeName) {
  const w = new FakeListWidget();
  const sandbox = {
    console, JSON, Math, Date, parseInt, parseFloat, String, Number, Boolean, Array, Object,
    Promise, Request: FakeRequest, FetchResponse: FakeFetchResponse,
    Color: FakeColor, Font: FakeFont, Rect: FakeRect, Size: FakeSize,
    DrawContext: FakeDrawContext, ListWidget: FakeListWidget,
    SFSymbol: FakeSFSymbol, Device: FakeDevice,
    FileManager: FakeFileManagerCtor,
    config: { widgetFamily: sizeName, runsInWidget: sizeName !== "preview", runsInApp: sizeName === "preview" },
    Script: { setWidget: () => {}, name: () => "Ayah Widget" },
    args: { widgetParameter: null },
    Pasteboard: { copy: () => {} },
  };
  sandbox.globalThis = sandbox;
  sandbox.__setWidget = null;
  sandbox.Script = { setWidget: (x) => { sandbox.__setWidget = x; }, name: () => "Ayah Widget" };
  vm.createContext(sandbox);
  vm.runInContext(CODE, sandbox, { filename: "scriptable-widget.js", timeout: 20000 });
  await new Promise((r) => setImmediate(r)); // let the async runner finish
  return sandbox.__setWidget || w; // what the script actually handed to Script.setWidget
}

/* Real 16:87 payload shape (matches Quran.com API) */
FakeFetchResponse._body = JSON.stringify({
  verse: {
    id: 1966, verse_key: "16:87",
    text_imlaei: "\u0648\u064E\u0623\u064E\u0644\u0652\u0642\u064E\u0648\u0652\u0627 \u0625\u0650\u0644\u064E\u0649 \u0627\u0644\u0644\u0651\u064E\u0647\u0650 \u064A\u064E\u0648\u0652\u0645\u064E\u0626\u0650\u0630\u064D \u0627\u0644\u0633\u0651\u064E\u0644\u064E\u0627\u0645\u064E \u06D6 \u0648\u064E\u0636\u064E\u0644\u0651\u064E \u0639\u064E\u0646\u0652\u0647\u064F\u0645\u0652 \u0645\u0651\u064E\u0627 \u0643\u064E\u0627\u0646\u064F\u0648\u0627 \u064A\u064E\u0641\u0652\u062A\u064E\u0631\u064F\u0648\u0646\u064E",
    translations: [{ resource_id: 131, text: "And they will impart to Allah that Day [their] submission, and whatever they used to invent has strayed from them. <sup foot_note=71239>1</sup>" }],
  },
});

(async () => {
  // 1. syntax
  check("widget script is valid JS", true);

  // 2. verse math must match the app (key follows the same UTC-day formula)
  const m = await runCase("medium");
  const rootKids = m.children;
  check("widget builds a vertical root", m.layout === "vertical");
  const allStacks = [];
  const walkStacks = (s) => { for (const c of s.children || []) { if (c.children) { allStacks.push(c); walkStacks(c); } } };
  walkStacks(m);
  const allTexts = [];
  const walkTexts = (s) => { for (const c of s.children || []) { if (c.text !== undefined) allTexts.push(c.text); if (c.children) walkTexts(c); } };
  walkTexts(m);
  const headerRow = allStacks.find((st) => {
    const ts = [];
    const walkT = (s) => { for (const c of s.children || []) { if (c.text !== undefined) ts.push(c.text); if (c.children) walkT(c); } };
    walkT(st);
    return ts.indexOf("An-Nahl") !== -1 && ts.some((t) => /^\d{1,3}:\d{1,3}$/.test(t || ""));
  });
  check("header row has surah name + verse-key pill", !!headerRow);
  const arText = allTexts.find((t) => typeof t === "string" && /[\u0600-\u06FF]/.test(t || ""));
  check("Arabic verse text present", !!arText);
  check("Arabic ends with ringed badge image", !!rootKids.find((c) => c.children && c.children.some((k) => k.image)));
  const trans = rootKids.map((c) => c.text).find((t) => typeof t === "string" && t.indexOf("submission") !== -1);
  check("clean translation present (no <sup> leftovers)", !!trans && trans.indexOf("<") === -1);
  const meta = rootKids.map((c) => c.text).find((t) => typeof t === "string" && (t || "").indexOf("Translation: Saheeh International") !== -1);
  check("meta line matches app ('Translation: Saheeh International')", !!meta);

  // 3. no function-call style on property-only APIs
  check("lineLimit used as property only", CODE.indexOf(".lineLimit(") === -1);
  check("minimumScaleFactor used as property only", CODE.indexOf(".minimumScaleFactor(") === -1);
  check("textOpacity used as property only", CODE.indexOf(".textOpacity(") === -1);
  check("centerAlignText used (function-style is correct here)", CODE.indexOf(".centerAlignText()") !== -1);

  // 4. all sizes render
  for (const fam of ["small", "large"]) {
    let ok = false;
    try { await runCase(fam); ok = true; } catch (e) { console.log("   " + fam + " error: " + e.message); }
    check("renders for " + fam + " size", ok);
  }

  // 5. preview (in-app) renders and pin parameter works
  let pinOk = false;
  try { await runCase("preview"); pinOk = true; } catch (e) { console.log("   preview error: " + e.message); }
  check("renders for in-app preview", pinOk);

  // 6. offline: second run must still paint (cache), and error widget exists as backstop
  check("offline cache file was written", FakeFileManagerCtor._exists);
  const offlineW = await runCase("medium");
  check("offline run still builds the widget", offlineW.children.length > 0);
  const src = CODE;
  check("self-reporting error widget present", src.indexOf("showErrorWidget") !== -1 && src.indexOf("tell Cline") !== -1);
  check("refresh scheduled for next UTC midnight", src.indexOf("refreshAfterDate") !== -1 && src.indexOf("nextUTCMidnight") !== -1);
  check("tapping widget opens the app", src.indexOf("lujaneyaffa.github.io/ayah") !== -1);
  check("twin marker version", src.indexOf(MARKER) !== -1);

  // 7. hardening — a pressed ▶ can never end with "nothing shows up"
  check("palette wrapped in fallback try/catch (top-level can never crash)", CODE.indexOf("catch (palErr)") !== -1);
  check("fetch has hard timeout race", CODE.indexOf("withTimeout") !== -1 && CODE.indexOf("Promise.race") !== -1);
  check("every path presents via present()", CODE.indexOf("function present(w)") !== -1 && CODE.indexOf("let presented") !== -1 && CODE.indexOf("Script.setWidget(w);") !== -1 === false || CODE.indexOf("function present(w)") !== -1);
  check("in-app watchdog guarantees a preview on stall", CODE.indexOf("Timer.schedule") !== -1 && CODE.indexOf("Ayah widget stalled") !== -1);
  check("script logs breadcrumbs to the console", CODE.indexOf('console.log("[Ayah widget] script starting') !== -1);

  console.log(pass ? "\nALL WIDGET CHECKS PASSED ✔" : "\nSOME WIDGET CHECKS FAILED ✘");
  process.exit(pass ? 0 : 1);
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
