// Verifies multi-select display state (checklist) behavior
const fs = require("fs");
const vm = require("vm");

const code = fs.readFileSync("app.js", "utf8");

function makeEl() {
  return {
    checked: false, innerHTML: "", textContent: "", style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {}, addEventListener() {}, insertBefore() {},
    children: [],
    appendChild(c) { this.children.push(c); return c; },
    querySelector() { return makeEl(); }, querySelectorAll() { return []; }
  };
}
function makeCheckbox() { return { checked: false }; }

const boxes = { "#dispEn": makeCheckbox(), "#dispAr": makeCheckbox(), "#dispTafsir": makeCheckbox() };

const document = {
  createElement() { return makeEl(); },
  addEventListener() {},
  querySelector(s) { if (boxes[s]) return boxes[s]; return makeEl(); },
  querySelectorAll() { return []; }
};
const localStorage = { getItem: () => null, setItem() {} };
const windowObj = { addEventListener() {}, open() {} };

const sandbox = { document, localStorage, fetch() { return Promise.reject(new Error("no")); }, navigator: {}, window: windowObj, setTimeout, clearTimeout, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const { state, toggleDisplay, refreshDisplayCheckboxes } = vm.runInContext("({state, toggleDisplay, refreshDisplayCheckboxes})", sandbox);

let pass = true;
const check = (label, cond) => { console.log((cond ? "PASS" : "FAIL") + " - " + label); if (!cond) pass = false; };

check("default display is ['en']", Array.isArray(state.display) && JSON.stringify(state.display) === '["en"]');

// toggle on "ar" -> ["en","ar"]
state.display = ["en"];
toggleDisplay("ar");
check("after toggle ar: ['en','ar']", JSON.stringify(state.display) === '["en","ar"]');

// toggle off "en" -> ["ar"]
toggleDisplay("en");
check("after toggle en off: ['ar']", JSON.stringify(state.display) === '["ar"]');

// toggle on "tafsir" -> ["ar","tafsir"]
toggleDisplay("tafsir");
check("after toggle tafsir on: ['ar','tafsir']", JSON.stringify(state.display) === '["ar","tafsir"]');

// backwards compat: old string saved value becomes full set
state.display = "all";
toggleDisplay("tafsir"); // on -> already in full set, so it removes
check("string migration: 'all' becomes ['en','ar'], tafsir off after toggle", JSON.stringify(state.display) === '["en","ar"]');

// refreshDisplayCheckboxes sets checked props
state.display = ["en", "tafsir"];
refreshDisplayCheckboxes();
check("refresh sets en checked", boxes["#dispEn"].checked === true);
check("refresh sets ar unchecked", boxes["#dispAr"].checked === false);
check("refresh sets tafsir checked", boxes["#dispTafsir"].checked === true);

// renderRead respects each checkbox (esp. the Arabic one)
(async () => {
  // give the sandbox a fetch that resolves "not ok" so loadVerse falls back gracefully
  sandbox.fetch = () => Promise.resolve({ ok: false, status: 0, json: () => Promise.resolve({}) });

  // Case A: only Arabic → arabic visible, translation + tafsir hidden
  vm.runInContext("state.display = ['ar']", sandbox);
  await vm.runInContext("renderRead()", sandbox);
  await new Promise((r) => setTimeout(r, 10));
  const domA = vm.runInContext("({ar: dom.readArabic, en: dom.readTranslation, tf: dom.readTafsir})", sandbox);
  check("renderRead: ar-only → arabic shown", domA.ar.hidden === false);
  check("renderRead: ar-only → english hidden", domA.en.hidden === true);
  check("renderRead: ar-only → tafsir hidden", domA.tf.hidden === true);

  // Case B: all three → everything visible (verse injected so the badge path runs)
  vm.runInContext("verseCache[state.currentKey] = { ar: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', en: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.', key: state.currentKey }", sandbox);
  vm.runInContext("state.display = ['en','ar','tafsir']", sandbox);
  await vm.runInContext("renderRead()", sandbox);
  await new Promise((r) => setTimeout(r, 10));
  const domB = vm.runInContext("({ar: dom.readArabic, en: dom.readTranslation, tf: dom.readTafsir, key: state.currentKey})", sandbox);
  check("renderRead: all → arabic shown", domB.ar.hidden === false);
  check("renderRead: all → english shown", domB.en.hidden === false);
  check("renderRead: all → tafsir shown", domB.tf.hidden === false);
  const badge = domB.ar.children && domB.ar.children[domB.ar.children.length - 1];
  check("renderRead: ayah badge appended", !!badge && badge.className === "ayah-badge");
  check("renderRead: badge shows Western numeral of ayah", !!badge && badge.textContent === String(domB.key).split(":")[1]);

  // Case C: none → all hidden + hint shown
  vm.runInContext("state.display = []", sandbox);
  await vm.runInContext("renderRead()", sandbox);
  await new Promise((r) => setTimeout(r, 10));
  const domC = vm.runInContext("({ar: dom.readArabic, meta: dom.readMeta})", sandbox);
  check("renderRead: none → arabic hidden", domC.ar.hidden === true);
  check("renderRead: none → hint in meta", (domC.meta.textContent || "").includes("Choose Arabic, English or Tafsir"));

  console.log("\n" + (pass ? "ALL DISPLAY CHECKS PASSED ✔" : "SOME DISPLAY CHECKS FAILED ✘"));
  process.exit(pass ? 0 : 1);
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(1); });
