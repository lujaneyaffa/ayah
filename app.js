"use strict";

/* ================================================================
   Ayah — Quran Verse Widget (local rebuild, fully self-owned)
   Data: Quran.com public API. Offline fallback: curated verses.
   ================================================================ */

/* ---------- All 114 surahs: [id, english name, arabic name, ayah count, Meccan?] ---------- */
const SURAH_RAW = [
  [1, "Al-Fatihah", "الفاتحة", 7, true], [2, "Al-Baqarah", "البقرة", 286, false], [3, "Aal-E-Imran", "آل عمران", 200, false],
  [4, "An-Nisa", "النساء", 176, false], [5, "Al-Ma'idah", "المائدة", 120, false], [6, "Al-An'am", "الأنعام", 165, true],
  [7, "Al-A'raf", "الأعراف", 206, true], [8, "Al-Anfal", "الأنفال", 75, false], [9, "At-Tawbah", "التوبة", 129, false],
  [10, "Yunus", "يونس", 109, true], [11, "Hud", "هود", 123, true], [12, "Yusuf", "يوسف", 111, true],
  [13, "Ar-Ra'd", "الرعد", 43, true], [14, "Ibrahim", "إبراهيم", 52, true], [15, "Al-Hijr", "الحجر", 99, true],
  [16, "An-Nahl", "النحل", 128, true], [17, "Al-Isra", "الإسراء", 111, true], [18, "Al-Kahf", "الكهف", 110, true],
  [19, "Maryam", "مريم", 98, true], [20, "Ta-Ha", "طه", 135, true], [21, "Al-Anbiya", "الأنبياء", 112, true],
  [22, "Al-Hajj", "الحج", 78, false], [23, "Al-Mu'minun", "المؤمنون", 118, true], [24, "An-Nur", "النور", 64, false],
  [25, "Al-Furqan", "الفرقان", 77, true], [26, "Ash-Shu'ara", "الشعراء", 227, true], [27, "An-Naml", "النمل", 93, true],
  [28, "Al-Qasas", "القصص", 88, true], [29, "Al-Ankabut", "العنكبوت", 69, true], [30, "Ar-Rum", "الروم", 60, true],
  [31, "Luqman", "لقمان", 34, true], [32, "As-Sajdah", "السجدة", 30, true], [33, "Al-Ahzab", "الأحزاب", 73, false],
  [34, "Saba", "سبأ", 54, true], [35, "Fatir", "فاطر", 45, true], [36, "Ya-Sin", "يس", 83, true],
  [37, "As-Saffat", "الصافات", 182, true], [38, "Sad", "ص", 88, true], [39, "Az-Zumar", "الزمر", 75, true],
  [40, "Ghafir", "غافر", 85, true], [41, "Fussilat", "فصلت", 54, true], [42, "Ash-Shura", "الشورى", 53, true],
  [43, "Az-Zukhruf", "الزخرف", 89, true], [44, "Ad-Dukhan", "الدخان", 59, true], [45, "Al-Jathiyah", "الجاثية", 37, true],
  [46, "Al-Ahqaf", "الأحقاف", 35, true], [47, "Muhammad", "محمد", 38, false], [48, "Al-Fath", "الفتح", 29, false],
  [49, "Al-Hujurat", "الحجرات", 18, false], [50, "Qaf", "ق", 45, true], [51, "Adh-Dhariyat", "الذاريات", 60, true],
  [52, "At-Tur", "الطور", 49, true], [53, "An-Najm", "النجم", 62, true], [54, "Al-Qamar", "القمر", 55, true],
  [55, "Ar-Rahman", "الرحمن", 78, true], [56, "Al-Waqi'ah", "الواقعة", 96, true], [57, "Al-Hadid", "الحديد", 29, false]
];

const SURAHS = SURAH_RAW.map(([id, name, arabic, ayahCount, meccan]) => ({ id, name, arabic, ayahCount, meccan }));
const SURAH_RAW_2 = [
  [58, "Al-Mujadila", "المجادلة", 22, false], [59, "Al-Hashr", "الحشر", 24, false], [60, "Al-Mumtahanah", "الممتحنة", 13, false],
  [61, "As-Saff", "الصف", 14, false], [62, "Al-Jumu'ah", "الجمعة", 11, false], [63, "Al-Munafiqun", "المنافقون", 11, false],
  [64, "At-Taghabun", "التغابن", 18, false], [65, "At-Talaq", "الطلاق", 12, false], [66, "At-Tahrim", "التحريم", 12, false],
  [67, "Al-Mulk", "الملك", 30, true], [68, "Al-Qalam", "القلم", 52, true], [69, "Al-Haqqah", "الحاقة", 52, true],
  [70, "Al-Ma'arij", "المعارج", 44, true], [71, "Nuh", "نوح", 28, true], [72, "Al-Jinn", "الجن", 28, true],
  [73, "Al-Muzzammil", "المزمل", 20, true], [74, "Al-Muddaththir", "المدثر", 56, true], [75, "Al-Qiyamah", "القيامة", 40, true],
  [76, "Al-Insan", "الإنسان", 31, true], [77, "Al-Mursalat", "المرسلات", 50, true], [78, "An-Naba", "النبأ", 40, true],
  [79, "An-Nazi'at", "النازعات", 46, true], [80, "Abasa", "عبس", 42, true], [81, "At-Takwir", "التكوير", 29, true],
  [82, "Al-Infitar", "الانفطار", 19, true], [83, "Al-Mutaffifin", "المطففين", 36, true], [84, "Al-Inshiqaq", "الانشقاق", 25, true],
  [85, "Al-Buruj", "البروج", 22, true], [86, "At-Tariq", "الطارق", 17, true], [87, "Al-A'la", "الأعلى", 19, true],
  [88, "Al-Ghashiyah", "الغاشية", 26, true], [89, "Al-Fajr", "الفجر", 30, true], [90, "Al-Balad", "البلد", 20, true],
  [91, "Ash-Shams", "الشمس", 15, true], [92, "Al-Layl", "الليل", 21, true], [93, "Ad-Duhaa", "الضحى", 11, true],
  [94, "Ash-Sharh", "الشرح", 8, true], [95, "At-Tin", "التين", 8, true], [96, "Al-Alaq", "العلق", 19, true],
  [97, "Al-Qadr", "القدر", 5, true], [98, "Al-Bayyinah", "البينة", 8, false], [99, "Az-Zalzalah", "الزلزلة", 8, true],
  [100, "Al-Adiyat", "العاديات", 11, true], [101, "Al-Qari'ah", "القارعة", 11, true], [102, "At-Takathur", "التكاثر", 8, true],
  [103, "Al-Asr", "العصر", 3, true], [104, "Al-Humazah", "الهمزة", 9, true], [105, "Al-Fil", "الفيل", 5, true],
  [106, "Quraysh", "قريش", 4, true], [107, "Al-Ma'un", "الماعون", 7, true], [108, "Al-Kawthar", "الكوثر", 3, true],
  [109, "Al-Kafirun", "الكافرون", 6, true], [110, "An-Nasr", "النصر", 3, false], [111, "Al-Masad", "المسد", 5, true],
  [112, "Al-Ikhlas", "الإخلاص", 4, true], [113, "Al-Falaq", "الفلق", 5, true], [114, "An-Nas", "الناس", 6, true]
];
SURAHS.push(...SURAH_RAW_2.map(([id, name, arabic, ayahCount, meccan]) => ({ id, name, arabic, ayahCount, meccan })));
/* ---------- Offline fallback verses (Arabic simplified + English translation) ---------- */
const FALLBACK = {
  "1:1":  { ar: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
            en: "In the name of Allah, the Entirely Merciful, the Especially Merciful." },
  "1:2":  { ar: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
            en: "All praise is due to Allah, Lord of the worlds." },
  "1:5":  { ar: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
            en: "It is You we worship and You we ask for help." },
  "2:152":{ ar: "فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ",
            en: "So remember Me; I will remember you. And be grateful to Me and do not deny Me." },
  "2:153":{ ar: "يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ",
            en: "O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient." },
  "2:185":{ ar: "شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ هُدًى لِّلنَّاسِ وَبَيِّنَاتٍ مِّنَ الْهُدَىٰ وَالْفُرْقَانِ",
            en: "The month of Ramadan is that in which was revealed the Qur'an — a guidance for the people and clear proofs of guidance and the criterion." },
  "2:186":{ ar: "وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ",
            en: "And when My servants ask you concerning Me — indeed I am near. I respond to the invocation of the supplicant when he calls upon Me." },
  "2:255":{ ar: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ",
            en: "Allah — there is no deity except Him, the Ever-Living, the Sustainer of all existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except what He wills. His Kursi extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great." },
  "2:286":{ ar: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ",
            en: "Allah does not charge a soul except with what it can bear. It will have the consequence of what good it has gained, and it will bear the consequence of what evil it has earned." },
  "3:139":{ ar: "وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنتُمُ الْأَعْلَوْنَ إِن كُنتُم مُّؤْمِنِينَ",
            en: "So do not weaken and do not grieve, and you will be superior if you are true believers." },
  "3:173":{ ar: "الَّذِينَ قَالَ لَهُمُ النَّاسُ إِنَّ النَّاسَ قَدْ جَمَعُوا لَكُمْ فَاخْشَوْهُمْ فَزَادَهُمْ إِيمَانًا وَقَالُوا حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ",
            en: "Those to whom people said: Indeed, the people have gathered against you, so fear them. But it increased them in faith, and they said: Allah is sufficient for us, and He is the best Disposer of affairs." },
  "13:28":{ ar: "الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
            en: "Those who have believed and whose hearts are assured by the remembrance of Allah. Unquestionably, by the remembrance of Allah hearts are assured." }
};
const FALLBACK_2 = {
  "20:14":{ ar: "إِنَّنِي أَنَا اللَّهُ لَا إِلَٰهَ إِلَّا أَنَا فَاعْبُدْنِي وَأَقِمِ الصَّلَاةَ لِذِكْرِي",
            en: "Indeed, I am Allah. There is no deity except Me, so worship Me and establish prayer for My remembrance." },
  "21:87":{ ar: "لَا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ",
            en: "There is no deity except You, exalted are You. Indeed, I have been of the wrongdoers." },
  "36:82":{ ar: "إِنَّمَا أَمْرُهُ إِذَا أَرَادَ شَيْئًا أَن يَقُولَ لَهُ كُن فَيَكُونُ",
            en: "His command is only when He intends a thing that He says to it: Be, and it is." },
  "39:53":{ ar: "قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ ۚ إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا ۚ إِنَّهُ هُوَ الْغَفُورُ الرَّحِيمُ",
            en: "Say: O My servants who have transgressed against themselves, do not despair of the mercy of Allah. Indeed, Allah forgives all sins. Indeed, it is He who is the Forgiving, the Merciful." },
  "40:60":{ ar: "وَقَالَ رَبُّكُمُ ادْعُونِي أَسْتَجِبْ لَكُمْ",
            en: "And your Lord says: Call upon Me; I will respond to you." },
  "50:16":{ ar: "وَلَقَدْ خَلَقْنَا الْإِنسَانَ وَنَعْلَمُ مَا تُوَسْوِسُ بِهِ نَفْسُهُ ۖ وَنَحْنُ أَقْرَبُ إِلَيْهِ مِنْ حَبْلِ الْوَرِيدِ",
            en: "And We have already created man and know what his soul whispers to him, and We are closer to him than his jugular vein." },
  "55:13":{ ar: "فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ",
            en: "So which of the favors of your Lord would you deny?" },
  "65:3": { ar: "وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ ۚ وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ",
            en: "And will provide for him from where he does not expect. And whoever relies upon Allah — then He is sufficient for him." },
  "94:5": { ar: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا",
            en: "For indeed, with hardship comes ease." },
  "94:6": { ar: "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
            en: "Indeed, with hardship comes ease." },
  "103:1":{ ar: "وَالْعَصْرِ",
            en: "By time," },
  "103:2":{ ar: "إِنَّ الْإِنسَانَ لَفِي خُسْرٍ",
            en: "Indeed, mankind is in loss," },
  "103:3":{ ar: "إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ",
            en: "Except for those who have believed and done righteous deeds and advised each other to truth and advised each other to patience." },
  "112:1":{ ar: "قُلْ هُوَ اللَّهُ أَحَدٌ",
            en: "Say: He is Allah, who is One," },
  "112:2":{ ar: "اللَّهُ الصَّمَدُ",
            en: "Allah, the Eternal Refuge." },
  "112:3":{ ar: "لَمْ يَلِدْ وَلَمْ يُولَدْ",
            en: "He neither begets nor is born," },
  "112:4":{ ar: "وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ",
            en: "Nor is there to Him any equivalent." },
  "113:1":{ ar: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ",
            en: "Say: I seek refuge in the Lord of the daybreak," },
  "114:1":{ ar: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ",
            en: "Say: I seek refuge in the Lord of mankind," }
};
Object.assign(FALLBACK, FALLBACK_2);
FALLBACK_2.length = 0;
/* ================================================================
   Logic
   ================================================================ */

/* ---------- Constants ---------- */
const API_BASE = "https://api.quran.com/api/v4";
const TRANS_ID = 20; // Saheeh International translation
const LS_MEMORIZED = "ayah.memorized.v1";
const LS_LAST = "ayah.lastVerse.v1";
const LS_VERSECACHE = "ayah.verseCache.v1";
const LS_PAGECACHE = "ayah.pageCache.v1"; // Memorization check works by Mushaf page, not single ayah
const LS_CHECK_PAGE = "ayah.checkPage.v1";
const TOTAL_PAGES = 604; // standard Madani Mushaf pagination
const AUDIO_BASE = "https://verses.quran.com/";
const LS_RECITER = "ayah.reciter.v1";
const LS_AUDIOCACHE = "ayah.audioCache.v2"; // v2: invalidates broken mirror URLs cached by older versions
const QDC_BASE = "https://api.qurancdn.com/api/qdc"; // quran.com site API — per-word segment timings
const LS_WORDTIMING = "ayah.wordTiming.v1";
const LS_AUTO = "ayah.auto.v1";
const LS_REPEAT = "ayah.repeat.v1";
const LS_LOOP = "ayah.loop.v1"; // multi-ayah loop range { on, from, to }
const LS_SPEED = "ayah.speed.v1";
const LS_VERSION = "ayah.version.v1";
const LS_NAV_AT = "ayah.lastNavAt.v1";
const APP_VERSION = "v37"; // keep in sync with sw.js VERSION
const LS_DISPLAY = "ayah.display.v1";
const LS_TAFSIRCACHE = "ayah.tafsirCache.v1";
// Declared here, not in the sync section: `state` reads them at line ~224,
// long before the sync section at the bottom would execute (TDZ crash otherwise).
const LS_SYNC_META = "ayah.syncMeta.v1";
const LS_SYNC_ON = "ayah.syncOn.v1";
const LS_SYNC_TOKEN = "ayah.syncToken.v1";
const TAFSIR_ID = 169; // Ibn Kathir (Abridged) — English

/* ---------- Recitations (Quran.com audio reciters) ---------- */
const RECITERS = [
  { id: 7,  name: "Mishari Rashid al-`Afasy" },
  { id: 2,  name: "AbdulBaset AbdulSamad (Murattal)" },
  { id: 1,  name: "AbdulBaset AbdulSamad (Mujawwad)" },
  { id: 3,  name: "Abdur-Rahman as-Sudais" },
  { id: 4,  name: "Abu Bakr al-Shatri" },
  { id: 6,  name: "Mahmoud Khalil Al-Husary" },
  { id: 12, name: "Mahmoud Khalil Al-Husary (Muallim)" },
  { id: 9,  name: "Mohamed Siddiq al-Minshawi (Murattal)" },
  { id: 8,  name: "Mohamed Siddiq al-Minshawi (Mujawwad)" },
  { id: 10, name: "Sa`ud ash-Shuraym" },
  { id: 5,  name: "Hani ar-Rifai" },
  { id: 11, name: "Mohamed al-Tablawi" }
];

/* ---------- Global verse index across the whole Qur'an (1..6236) ---------- */
const OFFSETS = [];
{
  let acc = 0;
  for (const s of SURAHS) {
    OFFSETS.push(acc);
    acc += s.ayahCount;
  }
}
const TOTAL_VERSES = accChecker();

function accChecker() {
  let total = 0;
  for (const s of SURAHS) total += s.ayahCount;
  return total;
}

/* ---------- Verse key <-> global index ---------- */
function parseKey(key) {
  const [c, a] = key.split(":").map(Number);
  return { chapter: c, ayah: a };
}
function keyFromIndex(index) {
  const i = Math.max(0, Math.min(TOTAL_VERSES - 1, index));
  let chapter = 0;
  while (chapter < 113 && OFFSETS[chapter + 1] <= i) chapter++;
  return { key: `${chapter + 1}:${i - OFFSETS[chapter] + 1}`, index: i };
}
function indexFromKey(key) {
  const { chapter, ayah } = parseKey(key);
  return OFFSETS[chapter - 1] + ayah - 1;
}
function surahById(id) {
  return SURAHS.find((s) => s.id === id) || SURAHS[0];
}
function surahNameFor(key) {
  return surahById(parseKey(key).chapter).name;
}

/* ---------- Local storage helpers ---------- */
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* full disk etc. */ }
}

/* ---------- State ---------- */
const state = {
  view: "read",
  currentKey: "1:1",
  memorized: new Set(loadJSON(LS_MEMORIZED, [])),
  installed: false,
  deferredPrompt: null,
  chapterExpanded: null,
  chapterCache: {},
  reciterId: Number(loadJSON(LS_RECITER, 7)),
  audioCache: loadJSON(LS_AUDIOCACHE, {}),
  wordTimingCache: loadJSON(LS_WORDTIMING, {}),
  wordTiming: null, // { key, reciterId, segs, prop } — active word-highlight timing
  wordCountFor: 0, // word count of the currently rendered ayah (for fallback timing)
  checkRefWords: [], // display-form words of the page shown on the Check tab
  checkPage: Math.max(1, Math.min(TOTAL_PAGES, Number(loadJSON(LS_CHECK_PAGE, 1)) || 1)),
  autoPlay: loadJSON(LS_AUTO, false),
  repeat: Number(loadJSON(LS_REPEAT, 1)),
  loop: normalizeLoop(loadJSON(LS_LOOP, null)),
  repeatCount: 0,
  wantPlaying: false, // user/setting intent to be playing — the single source
                       // of truth for Play/Pause, so a Pause click always wins
                       // even mid repeat-restart or while the next verse loads
  speed: Number(loadJSON(LS_SPEED, 1)),
  display: loadJSON(LS_DISPLAY, ["en"]),
  tafsirCache: loadJSON(LS_TAFSIRCACHE, {}),
  syncOn: loadJSON(LS_SYNC_ON, true),
  syncMeta: loadJSON(LS_SYNC_META, { savedAt: 0, deviceId: null }),
  syncToken: loadJSON(LS_SYNC_TOKEN, ""),
  lastNavAt: Number(loadJSON(LS_NAV_AT, 0)),
  syncBusy: false
};

/* ---------- DOM refs ---------- */
const $ = (sel) => document.querySelector(sel);
const dom = {
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  memCount: $("#memCount"),
  memHeadline: $("#memHeadline"),
  memSub: $("#memSub"),
  memList: $("#memList"),
  surahList: $("#surahList"),
  surahSearch: $("#surahSearch"),
  readCard: $("#readCard"),
  readSurah: $("#readSurah"),
  readKey: $("#readKey"),
  readArabic: $("#readArabic"),
  readTranslation: $("#readTranslation"),
  readMeta: $("#readMeta"),
  btnMemorize: $("#btnMemorize"),
  memLabel: $("#memLabel"),
  btnPrev: $("#btnPrev"),
  btnNext: $("#btnNext"),
  btnShuffle: $("#btnShuffle"),
  btnQuranCom: $("#btnQuranCom"),
  installBtn: $("#installBtn"),
  toast: $("#toast"),
  refreshBtn: $("#refreshBtn"),
  readSurahSelect: $("#readSurahSelect"),
  readAyahSelect: $("#readAyahSelect"),
  reciterSelect: $("#reciterSelect"),
  btnPlay: $("#btnPlay"),
  playIcon: $("#playIcon"),
  pauseIcon: $("#pauseIcon"),
  audioFill: $("#audioFill"),
  audioEl: $("#audioEl"),
  btnAuto: $("#btnAuto"),
  btnLoop: $("#btnLoop"),
  loopRow: $("#loopRow"),
  loopFromSurah: $("#loopFromSurah"),
  loopFromAyah: $("#loopFromAyah"),
  loopToSurah: $("#loopToSurah"),
  loopToAyah: $("#loopToAyah"),
  repeatSelect: $("#repeatSelect"),
  speedSelect: $("#speedSelect"),
  dispEn: $("#dispEn"),
  dispAr: $("#dispAr"),
  dispTafsir: $("#dispTafsir"),
  readTafsir: $("#readTafsir"),
  syncNow: $("#syncNow"),
  syncSetup: $("#syncSetup"),
  syncPanel: $("#syncPanel"),
  syncToken: $("#syncToken"),
  syncSave: $("#syncSave"),
  syncTest: $("#syncTest"),
  syncStatus: $("#syncStatus"),
  appVersion: $("#appVersion"),
  diagLog: $("#diagLog"),
  checkSurah: $("#checkSurah"),
  checkKey: $("#checkKey"),
  checkArabic: $("#checkArabic"),
  checkRecordBtn: $("#checkRecordBtn"),
  checkStatus: $("#checkStatus"),
  checkResult: $("#checkResult"),
  checkPageInput: $("#checkPageInput"),
  checkPagePrev: $("#checkPagePrev"),
  checkPageNext: $("#checkPageNext")
};

/* ---------- Toast helper ---------- */
let toastTimer = null;
let navPending = false; // true only when a REAL user action changed the verse
function toast(msg) {
  dom.toast && (dom.toast.textContent = msg);
  dom.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove("show"), 2200);
}

function toggleDisplay(key) {
  // backwards-compat: older saved strings like "translation" / "all"
  let arr = Array.isArray(state.display) ? state.display.slice() : ["en", "ar", "tafsir"];
  if (arr.includes(key)) {
    arr = arr.filter((k) => k !== key);
  } else {
    arr.push(key);
  }
  state.display = arr;
  saveJSON(LS_DISPLAY, state.display);
  queuePush();
  renderRead();
}

function refreshDisplayCheckboxes() {
  const v = state.display || [];
  dom.dispEn.checked = v.includes("en");
  dom.dispAr.checked = v.includes("ar");
  dom.dispTafsir.checked = v.includes("tafsir");
}

function trimCache(obj, max) {
  const keys = Object.keys(obj);
  if (keys.length > max) delete obj[keys[0]];
}

/* Strip footnote markers (e.g. <sup foot_note=…>1</sup>) and flatten
   HTML into readable paragraphs. Returns plain text (safe for textContent). */
function htmlToText(html, cap) {
  if (!html) return "";
  const t = html
    .replace(/<sup[^>]*>.*?<\/sup>/gi, "")                 // footnote superscripts
    .replace(/<(h[1-6]|p|li|br|div|tr)[^>]*>/gi, "\n")     // block elements -> newlines
    .replace(/<[^>]+>/g, "");                                // any remaining tags
  const d = document.createElement("div");
  d.innerHTML = t; // decode HTML entities safely
  const lines = (d.textContent || "")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  let out = lines.join("\n\n");
  if (cap && out.length > cap) out = out.slice(0, cap).trimEnd() + "…";
  return out;
}
/* ================================================================
   Verse data loading (Quran.com API with layered offline fallback)
   ================================================================ */
const verseCache = loadJSON(LS_VERSECACHE, {});
const pageCache = loadJSON(LS_PAGECACHE, {});

async function fetchVerse(key) {
  const url = `${API_BASE}/verses/by_key/${key}?translations=${TRANS_ID}&fields=text_imlaei&words=true&word_fields=text_imlaei`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("API error " + res.status);
  const json = await res.json();
  const v = json.verse;
  return {
    ar: v.text_imlaei || v.text_uthmani || "",
    en: (v.translations && v.translations[0] && v.translations[0].text) || "",
    words: wordListFromApi(v.words),
    meta: `${surahNameFor(key)} • ${v.verse_key}`
  };
}

async function loadVerse(key) {
  // 1) memory / localStorage cache — only trusted when it already carries words
  //    (entries saved by pre-v31 versions lack them; refetch to upgrade)
  if (verseCache[key] && verseCache[key].words) return verseCache[key];
  // 2) network (Quran.com)
  try {
    const data = await fetchVerse(key);
    verseCache[key] = verseCache[key] ? Object.assign({}, verseCache[key], data) : data;
    saveJSON(LS_VERSECACHE, verseCache); // keep at most ~400 entries
    const keys = Object.keys(verseCache);
    if (keys.length > 400) {
      delete verseCache[keys[0]];
      saveJSON(LS_VERSECACHE, verseCache);
    }
    return data;
  } catch (err) {
    // 3) stale-but-usable cached entry beats an error
    if (verseCache[key]) return verseCache[key];
    // 4) curated offline fallback
    const fb = FALLBACK[key];
    if (fb) return { ar: fb.ar, en: fb.en, meta: `${surahNameFor(key)} • ${key}` };
    throw err;
  }
}

/* ================================================================
   Word-by-word highlight timing (quran.com qdc segment data)
   ================================================================ */
const surahTimingMemo = new Map(); // session cache: `${reciterId}:${surah}` -> verse_timings[]

// Pure: keep only the renderable words from the v4 verse.words list.
// The ayah-number medallion arrives as char_type_name "end" — excluded here
// (the app renders its own .ayah-badge instead).
function wordListFromApi(words) {
  if (!Array.isArray(words)) return [];
  return words
    .filter((w) => w && w.char_type_name === "word" && typeof w.position === "number")
    .map((w) => ({
      position: w.position,
      text: (typeof w.text_imlaei === "string" && w.text_imlaei) || (typeof w.text === "string" ? w.text : "")
    }))
    .filter((w) => w.text);
}

// Pure: qdc segments are [[wordPos, fromMs, toMs], ...] measured against the
// WHOLE-surah audio file. The app plays per-ayah mp3s cut from the same
// recitation, so subtracting the ayah's timestamp_from rebases them onto the
// per-ayah file. Quirks found in real data: a segment may be a 2-element
// continuation [pos, from] meaning "runs to the ayah end", and a single word
// can be split across two segments (same position, consecutive spans).
function ayahSegmentsFromSurahTimings(verseTimings, key) {
  if (!Array.isArray(verseTimings)) return null;
  const entry = verseTimings.find((vt) => vt && vt.verse_key === key);
  if (!entry || !Array.isArray(entry.segments) || !entry.segments.length) return null;
  const base = Number(entry.timestamp_from) || 0;
  const ayahEndRaw = Number(entry.timestamp_to);
  const segs = [];
  for (const s of entry.segments) {
    if (!Array.isArray(s) || s.length < 2) continue;
    const pos = Number(s[0]);
    const fromRaw = Number(s[1]);
    let toRaw = s.length >= 3 ? Number(s[2]) : ayahEndRaw;
    if (!isFinite(toRaw) || toRaw <= fromRaw) toRaw = isFinite(ayahEndRaw) ? ayahEndRaw : fromRaw + 1;
    const from = Math.max(0, fromRaw - base);
    const to = toRaw - base;
    if (!isFinite(pos) || !isFinite(from) || !isFinite(to) || to <= from) continue;
    segs.push([pos, from, to]);
  }
  return segs.length ? segs : null;
}

// Pure: even distribution fallback for reciters with no segment data.
function proportionalSegments(wordCount, durationMs) {
  const n = Number(wordCount) | 0;
  const dur = Number(durationMs);
  if (n <= 0 || !isFinite(dur) || dur <= 0) return null;
  const segs = [];
  for (let i = 0; i < n; i++) segs.push([i + 1, (i / n) * dur, ((i + 1) / n) * dur]);
  return segs;
}

// Pure: which word position is active at time ms (binary search; a gap in the
// segments keeps the previous word lit rather than going dark).
function pickActiveWord(segs, ms) {
  if (!Array.isArray(segs) || !segs.length) return 0;
  const t = Number(ms);
  if (!isFinite(t) || t < segs[0][1]) return 0;
  let lo = 0, hi = segs.length - 1, ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segs[mid][1] <= t) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
  }
  return segs[ans][0] || 0;
}

async function loadWordTiming(key) {
  const reciterId = state.reciterId;
  const { chapter: surah } = parseKey(key);
  const memoKey = `${reciterId}:${surah}`;
  let timings = surahTimingMemo.get(memoKey);
  if (!timings) {
    // Instant path: a per-ayah slice saved from an earlier session.
    const saved = state.wordTimingCache[`${reciterId}:${key}`];
    if (saved && Array.isArray(saved.segs) && saved.segs.length) {
      state.wordTiming = { key, reciterId, segs: saved.segs, prop: !!saved.prop };
      return state.wordTiming;
    }
    try {
      const url = `${QDC_BASE}/audio/reciters/${reciterId}/audio_files?chapter=${surah}&segments=true`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("qdc " + res.status);
      const json = await res.json();
      const files = (json && json.audio_files) || [];
      timings = files[0] && files[0].verse_timings ? files[0].verse_timings : [];
    } catch {
      timings = [];
    }
    surahTimingMemo.set(memoKey, timings);
  }
  let segs = ayahSegmentsFromSurahTimings(timings, key);
  const prop = !segs;
  if (!segs) {
    // No real data for this reciter: the even-distribution fallback is built
    // lazily by updateWordHighlight once the audio duration is known.
    segs = null;
  }
  if (!segs) { state.wordTiming = { key, reciterId, segs: null, prop }; return null; }
  state.wordTiming = { key, reciterId, segs, prop: false };
  state.wordTimingCache[`${reciterId}:${key}`] = { segs };
  trimCache(state.wordTimingCache, 120);
  saveJSON(LS_WORDTIMING, state.wordTimingCache);
  return state.wordTiming;
}

function updateWordHighlight() {
  const wt = state.wordTiming;
  if (!wt || wt.key !== state.currentKey || wt.reciterId !== state.reciterId) return;
  let segs = wt.segs;
  if (!segs && wt.prop) {
    // Proportional fallback: needs the real duration, which arrives with metadata.
    const durMs = dom.audioEl.duration * 1000;
    segs = proportionalSegments(state.wordCountFor, durMs);
    if (segs) wt.segs = segs; // build once, reuse every frame after
  }
  if (!segs) return;
  const pos = pickActiveWord(segs, dom.audioEl.currentTime * 1000);
  dom.readArabic.querySelectorAll(".qword-active").forEach((n) => n.classList.remove("qword-active"));
  if (!pos) return;
  const node = dom.readArabic.querySelector(`[data-wpos="${pos}"]`);
  if (node) node.classList.add("qword-active");
}

/* ---------- Tafsir (Ibn Kathir) ---------- */
async function loadTafsir(key) {
  if (state.tafsirCache[key]) return state.tafsirCache[key];
  try {
    const url = `${API_BASE}/tafsirs/${TAFSIR_ID}/by_ayah/${key}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("tafsir " + res.status);
    const json = await res.json();
    const txt = htmlToText(json.tafsir && json.tafsir.text, 7000);
    if (!txt) throw new Error("empty tafsir");
    state.tafsirCache[key] = txt;
    saveJSON(LS_TAFSIRCACHE, state.tafsirCache);
    trimCache(state.tafsirCache, 60);
    return txt;
  } catch {
    return null;
  }
}

/* ================================================================
   Read view
   ================================================================ */
let readToken = 0;

function updateMemButton() {
  const isMem = state.memorized.has(state.currentKey);
  dom.btnMemorize.classList.toggle("is-on", isMem);
  dom.btnMemorize.setAttribute("aria-pressed", String(isMem));
  dom.memLabel.textContent = isMem ? "Memorized ✓" : "Memorize";
}

async function renderRead() {
  const key = state.currentKey;
  const token = ++readToken;
  dom.readCard.classList.add("is-loading");
  dom.readArabic.textContent = "…";
  dom.readTranslation.textContent = "Loading verse…";
  dom.readMeta.textContent = "";
  dom.readSurah.textContent = surahNameFor(key);
  dom.readKey.textContent = key;
  dom.btnQuranCom.href = `https://quran.com/${key}`;
  const chap = parseKey(key).chapter;
  if (String(dom.readSurahSelect.value) !== String(chap)) {
    dom.readSurahSelect.value = String(chap);
    populateAyahSelect(chap);
  }
  dom.readAyahSelect.value = String(parseKey(key).ayah);
  updateMemButton();

  const wantTrans = state.display.includes("en");
  const wantTafsir = state.display.includes("tafsir");
  const wantAr = state.display.includes("ar");
  dom.readArabic.hidden = !wantAr;
  dom.readTranslation.hidden = !wantTrans;
  dom.readTafsir.hidden = !wantTafsir;
  if (!wantAr && !wantTrans && !wantTafsir) {
    dom.readMeta.textContent = "Nothing selected — tick Arabic, English or Tafsir above.";
  }

  try {
    const data = await loadVerse(key);
    if (token !== readToken) return; // stale response
    if (data.ar) {
      const words = Array.isArray(data.words) ? data.words : null;
      state.wordCountFor = words ? words.length : 0;
      if (words && words.length) {
        // Word-per-span render so the recitation can light up each word
        dom.readArabic.textContent = "";
        for (const w of words) {
          const span = document.createElement("span");
          span.className = "qword";
          span.dataset.wpos = String(w.position);
          span.textContent = w.text;
          dom.readArabic.appendChild(span);
          dom.readArabic.appendChild(document.createTextNode(" "));
        }
      } else {
        dom.readArabic.textContent = data.ar;
      }
      const badge = document.createElement("span");
      badge.className = "ayah-badge";
      badge.textContent = String(parseKey(key).ayah); // Western numerals
      dom.readArabic.appendChild(badge);
    } else {
      dom.readArabic.textContent = "—";
    }
    if (wantTrans) {
      dom.readTranslation.textContent = htmlToText(data.en).trim();
      dom.readMeta.textContent = data.en
        ? `Translation: Saheeh International`
        : ((data.ar || data.en) ? "" : "Offline: showing the saved verse.");
    } else if (!wantAr && !wantTafsir) {
      dom.readMeta.textContent = "Nothing selected — tick Arabic, English or Tafsir above.";
    } else {
      dom.readMeta.textContent = "";
    }

    // Tafsir (only when asked for) — loaded separately so it never blocks the verse
    if (wantTafsir) {
      dom.readTafsir.hidden = false;
      dom.readTafsir.innerHTML = '<div class="tf-head">Tafsir · Ibn Kathir</div><p>Loading…</p>';
      loadTafsir(key).then((txt) => {
        if (token !== readToken) return;
        dom.readTafsir.innerHTML = "";
        const head = document.createElement("div");
        head.className = "tf-head";
        head.textContent = "Tafsir · Ibn Kathir";
        const body = document.createElement("p");
        body.textContent = txt || "Tafsir unavailable offline.";
        dom.readTafsir.appendChild(head);
        dom.readTafsir.appendChild(body);
      });
    }
  } catch (err) {
    if (token !== readToken) return;
    dom.readArabic.textContent = "—";
    if (wantTrans) dom.readTranslation.textContent = "Couldn't load this verse (offline, no saved copy).";
  } finally {
    if (token === readToken) dom.readCard.classList.remove("is-loading");
  }
  // Only a REAL user navigation counts as "last read". The daily verse and
  // restored positions are never pushed, so an idle/fresh device can never
  // clobber the position of the device you're actually reading on.
  if (navPending) {
    navPending = false;
    saveJSON(LS_LAST, key);
    state.lastNavAt = Date.now();
    saveJSON(LS_NAV_AT, state.lastNavAt);
    queuePush(); // last-read position follows you across devices
  }
  if (state.view === "read") updateMemButton();
  refreshAudio(key); // fire-and-forget; doesn't block the verse display
}

function populateSurahSelect(sel) {
  sel = sel || dom.readSurahSelect;
  sel.innerHTML = "";
  for (const s of SURAHS) {
    const opt = document.createElement("option");
    opt.value = String(s.id);
    opt.textContent = `${s.id}. ${s.name}`;
    sel.appendChild(opt);
  }
}

function populateAyahSelect(chapterId, sel) {
  const s = surahById(chapterId);
  sel = sel || dom.readAyahSelect;
  sel.innerHTML = "";
  for (let a = 1; a <= s.ayahCount; a++) {
    const opt = document.createElement("option");
    opt.value = String(a);
    opt.textContent = String(a);
    sel.appendChild(opt);
  }
}

function populateReciterSelect() {
  const sel = dom.reciterSelect;
  sel.innerHTML = "";
  for (const r of RECITERS) {
    const opt = document.createElement("option");
    opt.value = String(r.id);
    opt.textContent = r.name;
    sel.appendChild(opt);
  }
  sel.value = String(state.reciterId);
}

/* ---------- Recitation audio (like Quran.com) ---------- */
async function loadAudioUrl(key, reciterId) {
  const ck = `${reciterId}:${key}`;
  if (state.audioCache[ck]) return state.audioCache[ck];
  const url = `${API_BASE}/verses/by_key/${key}?audio=${reciterId}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("audio api " + res.status);
  const json = await res.json();
  const rel = json.verse && json.verse.audio && json.verse.audio.url;
  if (!rel) throw new Error("no audio url");
  // The API returns three shapes: plain CDN paths ("Alafasy/mp3/…"),
  // protocol-relative mirrors ("//mirrors.quranicaudio.com/…") and
  // occasionally absolute URLs. Handle all three or playback breaks.
  const relStr = String(rel).trim();
  let full;
  if (relStr.startsWith("//")) full = "https:" + relStr;
  else if (/^https?:\/\//i.test(relStr)) full = relStr;
  else full = AUDIO_BASE + relStr;
  state.audioCache[ck] = full;
  saveJSON(LS_AUDIOCACHE, state.audioCache);
  trimCache(state.audioCache, 400);
  return full;
}

async function refreshAudio(key) {
  const btn = dom.btnPlay;
  loadWordTiming(key).catch(() => {}); // fire-and-forget; highlight data for this verse
  btn.disabled = true;
  dom.audioFill.style.width = "0%";
  try {
    const url = await loadAudioUrl(key, state.reciterId);
    btn.dataset.url = url;
    btn.disabled = false;
    btn.title = "Play verse recitation";
    // Only CONTINUE an already-playing session (state.wantPlaying already
    // true from an actual Play tap) — Auto-play/Loop must never spontaneously
    // start audio on their own, or opening/reconnecting to the app with
    // either toggle left on from a previous session would blast audio with
    // no user action at all. Re-checked live (not a snapshot from before
    // this await) so a Pause click during the fetch always wins too.
    if (state.wantPlaying) {
      dom.audioEl.src = url;
      dom.audioEl.playbackRate = state.speed;
      dom.audioEl.play().then(() => {
        dom.playIcon.style.display = "none";
        dom.pauseIcon.style.display = "";
      }).catch(() => {
        state.wantPlaying = false;
        dom.playIcon.style.display = "";
        dom.pauseIcon.style.display = "none";
      });
    }
  } catch {
    btn.dataset.url = "";
    btn.title = "Audio unavailable offline";
  }
}

function applySpeed() {
  if (dom.audioEl) dom.audioEl.playbackRate = state.speed;
}
function togglePlay() {
  const el = dom.audioEl;
  const url = dom.btnPlay.dataset.url;
  if (!url) { toast("Audio unavailable offline"); return; }
  // Decide on app-level intent, not el.paused — the element is briefly
  // "paused" mid repeat-restart and mid verse-change, and a Pause click
  // landing in that gap must still stop playback, not restart it.
  if (state.wantPlaying) {
    state.wantPlaying = false;
    state.repeatCount = 0;
    el.pause();
    dom.playIcon.style.display = "";
    dom.pauseIcon.style.display = "none";
  } else {
    state.wantPlaying = true;
    if (el.src !== url) el.src = url;
    el.playbackRate = state.speed;
    state.repeatCount = 0;
    el.play().then(() => {
      dom.playIcon.style.display = "none";
      dom.pauseIcon.style.display = "";
    }).catch(() => {
      state.wantPlaying = false;
      toast("Playback couldn't start (offline?)");
    });
  }
}

function goPrev() {
  navPending = true;
  const { index } = keyFromIndex(indexFromKey(state.currentKey));
  state.currentKey = keyFromIndex(index - 1).key;
  renderRead();
}
function goNext() {
  navPending = true;
  const { index } = keyFromIndex(indexFromKey(state.currentKey));
  state.currentKey = keyFromIndex(index + 1).key;
  renderRead();
}
function goShuffle() {
  navPending = true;
  state.currentKey = keyFromIndex(Math.floor(Math.random() * TOTAL_VERSES)).key;
  renderRead();
}
/* ---------- Loop a range of ayahs (multi-ayah repeat) ---------- */
function normalizeLoop(raw) {
  // Always returns a safe { on, from, to } — invalid/unknown endpoints are
  // dropped so a bad cloud payload or old storage can never break playback.
  const l = { on: false, from: null, to: null };
  if (raw && typeof raw === "object") {
    l.on = raw.on === true;
    for (const k of ["from", "to"]) {
      const v = typeof raw[k] === "string" ? raw[k] : null;
      if (v && /^\d+:\d+$/.test(v) && indexFromKey(v) >= 0 && indexFromKey(v) < TOTAL_VERSES) {
        l[k] = v;
      }
    }
  }
  return l;
}
function loopActive() {
  return !!(state.loop && state.loop.on && state.loop.from && state.loop.to);
}
// What should happen when the current ayah's audio ends? Pure helper (unit-
// tested): "wrap" = jump back to the start of the selection, "next" = play on,
// "off" = loop disabled (fall back to the autoPlay logic).
function loopAdvance() {
  if (!loopActive()) return "off";
  const cur = indexFromKey(state.currentKey);
  const to = indexFromKey(state.loop.to);
  return cur === to ? "wrap" : "next";
}
function syncLoopUI() {
  if (!dom.btnLoop || !dom.loopRow) return;
  populateSurahSelect(dom.loopFromSurah);
  populateSurahSelect(dom.loopToSurah);
  const fromChap = state.loop.from ? parseKey(state.loop.from).chapter : null;
  const toChap = state.loop.to ? parseKey(state.loop.to).chapter : null;
  if (fromChap) {
    dom.loopFromSurah.value = String(fromChap);
    populateAyahSelect(fromChap, dom.loopFromAyah);
    dom.loopFromAyah.value = String(parseKey(state.loop.from).ayah);
  }
  if (toChap) {
    dom.loopToSurah.value = String(toChap);
    populateAyahSelect(toChap, dom.loopToAyah);
    dom.loopToAyah.value = String(parseKey(state.loop.to).ayah);
  }
  dom.loopRow.hidden = !state.loop.on;
  dom.btnLoop.classList.toggle("is-on", state.loop.on);
  dom.btnLoop.setAttribute("aria-pressed", String(state.loop.on));
}
function setLoopEndpoint(which, chap, ayah) {
  // Changing a surah resets that endpoint's ayah to 1 (same as the read
  // selector). Keeps from ≤ to by moving the OTHER endpoint when out of order.
  const key = `${chap}:${ayah}`;
  state.loop[which] = key;
  if (state.loop.from && state.loop.to &&
      indexFromKey(state.loop.from) > indexFromKey(state.loop.to)) {
    state.loop[which === "from" ? "to" : "from"] = key;
  }
  saveJSON(LS_LOOP, state.loop);
  queuePush();
  syncLoopUI();
}
function toggleMemorize() {
  const key = state.currentKey;
  if (state.memorized.has(key)) {
    state.memorized.delete(key);
    toast("Removed from memorized");
  } else {
    state.memorized.add(key);
    toast("Marked as memorized ★");
  }
  saveJSON(LS_MEMORIZED, [...state.memorized]);
  queuePush();
  updateMemButton();
  renderMemorized();
}
/* ================================================================
   Browse view
   ================================================================ */
let browseToken = 0;

function renderBrowse(filter) {
  const query = (filter || "").trim().toLowerCase();
  const list = dom.surahList;
  list.innerHTML = "";

  const surahs = SURAHS.filter((s) => {
    if (!query) return true;
    return (
      s.name.toLowerCase().includes(query) ||
      s.arabic.includes(query) ||
      String(s.id) === query
    );
  });

  if (!surahs.length) {
    const li = document.createElement("li");
    li.className = "empty-state";
    li.textContent = "No surah found.";
    list.appendChild(li);
    return;
  }

  for (const s of surahs) {
    const li = document.createElement("li");
    li.className = "surah-item";
    li.setAttribute("role", "button");
    li.setAttribute("tabindex", "0");
    li.innerHTML = `
      <span class="surah-num">${s.id}</span>
      <span class="surah-en">${s.name}</span>
      <span class="surah-ar">${s.arabic}</span>
      <span class="surah-count">${s.ayahCount} ayahs</span>
    `;

    const open = () => toggleChapter(s, li);
    li.addEventListener("click", open);
    li.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });

    // Expandable ayah picker
    const picker = document.createElement("div");
    picker.className = "ayah-picker";
    picker.style.display = "none";
    li.appendChild(picker);
    list.appendChild(li);
  }
}

async function toggleChapter(surah, li) {
  const picker = li.querySelector(".ayah-picker");
  const isOpen = picker.style.display !== "none";
  picker.style.display = "none";
  if (isOpen) {
    li.classList.remove("surah-open");
    return;
  }

  li.classList.add("surah-open");
  if (picker.dataset.loaded === "1") {
    picker.style.display = "flex";
    return;
  }

  picker.innerHTML = '<span class="surah-count">Loading ayahs…</span>';
  picker.style.display = "flex";
  picker.dataset.loaded = "1";

  const token = ++browseToken;
  try {
    const keys = await getChapterKeys(surah.id);
    if (token !== browseToken) return;
    picker.innerHTML = "";
    for (const key of keys) {
      const chip = document.createElement("button");
      chip.className = "ayah-chip" + (state.memorized.has(key) ? " is-mem" : "");
      chip.textContent = String(parseKey(key).ayah);
      chip.title = `Go to ${surah.name} ${key.split(":")[1]}`;
      chip.addEventListener("click", (e) => {
        e.stopPropagation();
        navPending = true;
        state.currentKey = key;
        setView("read");
      });
      picker.appendChild(chip);
    }
  } catch {
    if (token !== browseToken) return;
    picker.innerHTML = '<span class="error-note">Couldn’t load ayahs offline.</span>';
  }
}

async function getChapterKeys(chapterId) {
  if (state.chapterCache[chapterId]) return state.chapterCache[chapterId];
  const s = surahById(chapterId);
  const keys = [];
  let page = 1;
  const per = 100;
  while (keys.length < s.ayahCount) {
    const url = `${API_BASE}/verses/by_chapter/${chapterId}?per_page=${per}&page=${page}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("API error " + res.status);
    const json = await res.json();
    const verses = json.verses || [];
    if (!verses.length) break;
    for (const v of verses) keys.push(v.verse_key);
    if (keys.length >= s.ayahCount) break;
    page++;
  }
  state.chapterCache[chapterId] = keys;
  return keys;
}

/* ================================================================
   Memorized view
   ================================================================ */
function renderMemorized() {
  const keys = [...state.memorized].sort((a, b) => indexFromKey(a) - indexFromKey(b));
  dom.memCount.textContent = keys.length;
  dom.memHeadline.textContent =
    keys.length === 1 ? "1 ayah memorized" : `${keys.length} ayahs memorized`;
  dom.memSub.textContent =
    keys.length ? "Keep going — review them anytime." : "Mark verses to build your list.";
  dom.memList.innerHTML = "";

  if (!keys.length) {
    const li = document.createElement("li");
    li.className = "empty-state";
    li.innerHTML = '<span class="big">🕌</span>Nothing memorized yet.<br/>Tap ★ on any verse to save it here.';
    dom.memList.appendChild(li);
    return;
  }

  for (const key of keys) {
    const li = document.createElement("li");
    const { chapter, ayah } = parseKey(key);
    const s = surahById(chapter);
    const cached = verseCache[key];
    li.className = "mem-item";
    li.innerHTML = `
      <span class="mem-key">${s.id}:${ayah}</span>
      <span class="mem-meaning">${cached ? escaped(cached.ar) : s.name}</span>
      <button class="mem-unmem" title="Remove from memorized" aria-label="Remove ${key}">✕</button>
    `;
    const chip = li.querySelector(".mem-meaning");
    const label = document.createElement("span");
    label.className = "mem-meta";
    label.textContent = s.name;
    li.insertBefore(label, chip);
    li.addEventListener("click", (e) => {
      if (e.target.classList.contains("mem-unmem")) {
        state.memorized.delete(key);
        saveJSON(LS_MEMORIZED, [...state.memorized]);
        renderMemorized();
        toast("Removed from memorized");
      } else {
        state.currentKey = key;
        setView("read");
      }
    });
    dom.memList.appendChild(li);
  }
}

function escaped(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}
/* ================================================================
   View switching + events
   ================================================================ */
function setView(name) {
  // Leaving the Check tab must never leave the mic listening in the
  // background with no visible recording UI — stop and discard silently.
  if (state.view === "check" && name !== "check" && checkRec.active) {
    stopCheckRecordingRaw();
    dom.checkRecordBtn.textContent = "🎙 Start Reciting";
    dom.checkRecordBtn.classList.remove("is-recording");
    dom.checkStatus.textContent = "";
  }
  state.view = name;
  dom.tabs.forEach((t) => {
    const on = t.dataset.view === name;
    t.classList.toggle("is-active", on);
    t.setAttribute("aria-selected", String(on));
  });
  dom.views.forEach((v) => v.classList.toggle("is-active", v.dataset.view === name));

  if (name === "read") renderRead();
  if (name === "browse") renderBrowse(dom.surahSearch.value);
  if (name === "memorized") renderMemorized();
}

function wireEvents() {
  dom.tabs.forEach((t) =>
    t.addEventListener("click", () => setView(t.dataset.view))
  );

  dom.btnPrev.addEventListener("click", goPrev);
  dom.btnNext.addEventListener("click", goNext);
  dom.btnShuffle.addEventListener("click", goShuffle);
  dom.btnMemorize.addEventListener("click", toggleMemorize);
  dom.btnQuranCom.addEventListener("click", () => {
    window.open(`https://quran.com/${state.currentKey}`, "_blank", "noopener");
  });
  if (dom.checkRecordBtn) dom.checkRecordBtn.addEventListener("click", toggleCheckRecording);
  if (dom.checkPagePrev) dom.checkPagePrev.addEventListener("click", () => goCheckPage(-1));
  if (dom.checkPageNext) dom.checkPageNext.addEventListener("click", () => goCheckPage(1));
  if (dom.checkPageInput) {
    dom.checkPageInput.value = String(state.checkPage);
    dom.checkPageInput.addEventListener("change", () => {
      let n = parseInt(dom.checkPageInput.value, 10);
      if (!isFinite(n) || n < 1) n = 1;
      if (n > TOTAL_PAGES) n = TOTAL_PAGES;
      dom.checkPageInput.value = String(n);
      state.checkPage = n;
      saveJSON(LS_CHECK_PAGE, n);
      renderCheckPage(n);
    });
    renderCheckPage(state.checkPage);
  }

  // Keyboard arrows for quick reading
  document.addEventListener("keydown", (e) => {
    if (state.view !== "read") return;
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
    if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
  });

  // Browse search
  dom.surahSearch.addEventListener("input", (e) => renderBrowse(e.target.value));

  // Surah / ayah selector on Read
  dom.readSurahSelect.addEventListener("change", () => {
    const chap = Number(dom.readSurahSelect.value);
    populateAyahSelect(chap);
    navPending = true;
    state.currentKey = `${chap}:1`;
    renderRead();
  });
  dom.readAyahSelect.addEventListener("change", () => {
    navPending = true;
    state.currentKey = `${dom.readSurahSelect.value}:${dom.readAyahSelect.value}`;
    renderRead();
  });

  // Audio — playback continues / repeat / auto-advance
  dom.btnPlay.addEventListener("click", togglePlay);
  dom.reciterSelect.addEventListener("change", () => {
    state.reciterId = Number(dom.reciterSelect.value);
    saveJSON(LS_RECITER, state.reciterId);
    state.audioCache = {};
    saveJSON(LS_AUDIOCACHE, state.audioCache);
    queuePush();
    renderRead();
  });
  dom.btnAuto.addEventListener("click", () => {
    state.autoPlay = !state.autoPlay;
    saveJSON(LS_AUTO, state.autoPlay);
    queuePush();
    dom.btnAuto.classList.toggle("is-on", state.autoPlay);
    dom.btnAuto.setAttribute("aria-pressed", String(state.autoPlay));
    toast(state.autoPlay ? "Auto-play ON — advance to next ayah after audio" : "Auto-play OFF");
  });
  dom.btnLoop.addEventListener("click", () => {
    state.loop.on = !state.loop.on;
    if (state.loop.on && (!state.loop.from || !state.loop.to)) {
      // First enable: seed the selection with the ayah you're on.
      state.loop.from = state.currentKey;
      state.loop.to = state.currentKey;
    }
    saveJSON(LS_LOOP, state.loop);
    queuePush();
    syncLoopUI();
    toast(state.loop.on
      ? `Loop ON — ${state.loop.from} → ${state.loop.to} repeats until you pause`
      : "Loop OFF");
  });
  dom.refreshBtn.addEventListener("click", () => checkForUpdates(true));
  dom.repeatSelect.addEventListener("change", () => {
    state.repeat = Number(dom.repeatSelect.value);
    state.repeatCount = 0;
    saveJSON(LS_REPEAT, state.repeat);
    queuePush();
    toast(`Repeat: ${state.repeat}×`);
  });
  dom.loopFromSurah.addEventListener("change", () => setLoopEndpoint("from", Number(dom.loopFromSurah.value), 1));
  dom.loopFromAyah.addEventListener("change", () => setLoopEndpoint("from", Number(dom.loopFromSurah.value), Number(dom.loopFromAyah.value)));
  dom.loopToSurah.addEventListener("change", () => setLoopEndpoint("to", Number(dom.loopToSurah.value), 1));
  dom.loopToAyah.addEventListener("change", () => setLoopEndpoint("to", Number(dom.loopToSurah.value), Number(dom.loopToAyah.value)));
  dom.speedSelect.addEventListener("change", () => {
    state.speed = Number(dom.speedSelect.value);
    saveJSON(LS_SPEED, state.speed);
    applySpeed();
    queuePush();
    toast(`Playback speed: ${state.speed}×`);
  });
  dom.dispEn.addEventListener("change", () => toggleDisplay("en"));
  dom.dispAr.addEventListener("change", () => toggleDisplay("ar"));
  dom.dispTafsir.addEventListener("change", () => toggleDisplay("tafsir"));

  dom.audioEl.addEventListener("ended", () => {
    if (state.repeat > 1) {
      // Repeat this ayah the chosen number of times first.
      // Restart cleanly: pause, rewind to 0, reset the fill bar, then give the
      // element one animation-frame before play() so Chrome/iOS WebKit actually
      // re-triggers from the beginning instead of stalling at the end marker.
      state.repeatCount++;
      if (state.repeatCount < state.repeat) {
        const el = dom.audioEl;
        el.pause();
        el.currentTime = 0;
        dom.audioFill.style.width = "0%";
        updateWordHighlight(); // rewind resets the lit word too
        // Guard for any environment without rAF (tests, older engines): fall
        // back to playing on the next macrotask instead.
        const raf = (typeof requestAnimationFrame === "function")
          ? requestAnimationFrame
          : (cb) => setTimeout(cb, 0);
        raf(() => {
          if (!state.wantPlaying) return; // user paused during the restart gap
          el.play()
            .then(() => {
              dom.playIcon.style.display = "none";
              dom.pauseIcon.style.display = "";
            })
            .catch(() => {});
        });
        return;
      }
    }
    state.repeatCount = 0; // reset for the next verse
    const loopStep = loopAdvance();
    if (loopStep === "wrap") {
      // Finished the last ayah of the selection: jump back to its first ayah
      // and keep playing. (From === To means one ayah loops until paused.)
      navPending = true;
      state.currentKey = state.loop.from;
      renderRead();
      return;
    }
    if (loopStep === "next") {
      goNext(); // still inside the selection — play on
      return;
    }
    if (state.autoPlay) {
      goNext(); // continue to the next ayah (#2)
    } else {
      state.wantPlaying = false;
      dom.playIcon.style.display = "";
      dom.pauseIcon.style.display = "none";
      dom.audioFill.style.width = "0%";
    }
  });
  dom.audioEl.addEventListener("timeupdate", () => {
    const d = dom.audioEl.duration;
    if (d && isFinite(d)) {
      dom.audioFill.style.width = `${(dom.audioEl.currentTime / d) * 100}%`;
    }
    updateWordHighlight();
  });

  // Install button for Android / desktop Chrome-style prompts
  dom.installBtn.addEventListener("click", async () => {
    if (state.deferredPrompt) {
      state.deferredPrompt.prompt();
      const choice = await state.deferredPrompt.userChoice;
      state.deferredPrompt = null;
      dom.installBtn.hidden = true;
      if (choice.outcome === "accepted") toast("Installed 🎉");
    } else {
      toast("On iPhone: Safari → Share → “Add to Home Screen”");
    }
  });

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    state.deferredPrompt = e;
    dom.installBtn.hidden = false;
  });
  window.addEventListener("appinstalled", () => {
    state.installed = true;
    dom.installBtn.hidden = true;
  });
}

/* ================================================================
   Reconnect (back online): update the app itself, then sync data
   ================================================================ */
// Pure: what should the page do when the reported remote version differs
// from the one this tab is running?
function updateDecision(remote, current) {
  return remote && current && remote !== current ? "reload" : "none";
}

async function onBackOnline() {
  try {
    refreshSW(); // ask the SW to check for a newer worker (fire-and-forget)
    const remote = await fetchRemoteVersion();
    if (remote) saveJSON(LS_VERSION, remote);
    if (updateDecision(remote, APP_VERSION) === "reload") {
      toast("New version " + remote + " — updating…");
      setTimeout(() => location.reload(), 1200);
      return;
    }
    // Data refresh over the fresh connection: same order as the Sync now
    // button — push this device's real state, then adopt the cloud position.
    if (state.syncOn && state.syncToken) {
      const pushed = await pushSync();
      await pullSync(true);
      refreshSyncStatus();
      toast(pushed ? "Back online — synced ✓" : "Back online");
    }
  } catch { /* reconnect bookkeeping must never break the app */ }
}

function onWentOffline() {
  toast("Offline — the app keeps working (played ayahs stay available)");
}

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("online", () => { onBackOnline(); });
  window.addEventListener("offline", () => { onWentOffline(); });
}

/* ================================================================
   Service worker (progressive enhancement — safe to fail)
   ================================================================ */
function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* ignore — still works without offline */
    });
  });
}

/* ---------- Update / refresh ---------- */
async function fetchRemoteVersion() {
  try {
    const res = await fetch("./sw.js?t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) return null;
    const text = await res.text();
    const m = text.match(/VERSION\s*=\s*"([^"]+)"/);
    return m ? m[1] : null;
  } catch {
    return null; // offline or blocked
  }
}

async function refreshSW() {
  try {
    if (!("serviceWorker" in navigator)) return;
    await navigator.serviceWorker.ready;
    await navigator.serviceWorker.getRegistration().then((reg) => reg && reg.update());
  } catch { /* ignore */ }
}

async function checkForUpdates(manual) {
  const remote = await fetchRemoteVersion();
  const local = loadJSON(LS_VERSION, "");
  if (remote) saveJSON(LS_VERSION, remote);

  if (!manual) {
    // Quiet auto-check on launch: keep the service worker pointed at the latest.
    if (remote && remote !== local) refreshSW();
    return;
  }

  const btn = dom.refreshBtn;
  btn.disabled = true;
  btn.classList.add("is-spinning");
  try {
    if (!remote) {
      toast("Offline — can't check for updates");
      return;
    }
    await refreshSW();
    toast(remote !== local ? "New version " + remote + " — refreshing…" : "Up to date — refreshing…");
    setTimeout(() => location.reload(), 650);
  } finally {
    btn.disabled = false;
    btn.classList.remove("is-spinning");
  }
}

/* ================================================================
   Sync (iPhone <-> Mac) — through your own private GitHub repo.
   Backend: lujaneyaffa/ayah-sync (private) → sync.json via the GitHub
   Contents API, authorized by a personal token YOU paste per device.
   The token lives only in each device's localStorage — never in the
   code. Rules: last-write-wins for settings; memorized stars merge
   as a UNION so a star can never be lost. Fails silent, always.
   ================================================================ */
const GH_API = "https://api.github.com";
const SYNC_REPO = "lujaneyaffa/ayah-sync";
const SYNC_FILE = "sync.json";
let syncSha = null; // last-known blob sha — compare-and-swap for writes
/* The UNION baseline that stops any device from erasing another device's
   stars. We PERSIST the last set we saw in the cloud and only treat an empty
   pull as "cloud is empty" after we ACTUALLY read it — so a push that races
   ahead of a read can never write [] over real stars. */
const LS_REMOTE_MEM = "ayah.remoteMemorized.v1";
let lastRemoteMemorized = new Set(loadJSON(LS_REMOTE_MEM, []).filter((k) => typeof k === "string"));
/* Position baseline: the last REAL reading position we saw in the cloud.
   Unlike stars (a union), position is a single value — so a device with no
   real spot of its own must CARRY THIS FORWARD on push, never erase it.
   Persisted so a booting device still knows the cloud position. */
const LS_REMOTE_POS = "ayah.remotePos.v1";
let lastRemotePos = loadJSON(LS_REMOTE_POS, null);
let baselineKnown = false; // true only once we've read the cloud this session
// LS_SYNC_META / LS_SYNC_ON / LS_SYNC_TOKEN live in the top constants block.

function syncReady() { return !!(state.syncOn && state.syncToken); }
function b64encode(str) { return btoa(unescape(encodeURIComponent(str))); }
// b64decode MUST actually base64-decode (atob) before URL-unescaping.
// The old version omitted atob, so every cloud pull failed to parse — reads
// returned null, and v23+ correctly refused to write ("couldn't read first").
function b64decode(str) { return decodeURIComponent(escape(atob(String(str).replace(/\s+/g, "")))); }
function ghHeaders(extra) {
  return Object.assign({
    Authorization: "Bearer " + state.syncToken,
    Accept: "application/vnd.github+json"
  }, extra || {});
}

/* Try to pull a readable reason out of a GitHub API error response. */
async function ghErr(res) {
  try {
    const body = await res.json();
    const msg = (body && (body.message || body.error)) || res.statusText;
    return `${res.status}: ${msg}`;
  } catch {
    return String(res.status);
  }
}
async function syncFail(res, label) {
  const err = await ghErr(res);
  syncStatusMsg(`${label} (${err}) — ⚙ Setup → Test`);
  console.warn("[Ayah sync]", label, err);
}

function deviceId() {
  if (!state.syncMeta.deviceId) {
    state.syncMeta.deviceId = "dev-" + Math.random().toString(36).slice(2, 10);
    saveJSON(LS_SYNC_META, state.syncMeta);
  }
  return state.syncMeta.deviceId;
}
function syncStatusMsg(msg) {
  if (dom.syncStatus) dom.syncStatus.textContent = "Sync: " + msg;
}
function collectSyncPayload() {
  // Union local stars with the last set we saw in the cloud so a push from one
  // device can never erase a star another device added. (lastRemoteMemorized
  // is refreshed right before every push — see pushSync.)
  const merged = new Set([...state.memorized, ...lastRemoteMemorized]);
  const spot = loadJSON(LS_LAST, null);
  // Real local reading spot? Use it (local "last read" wins).
  // Otherwise CARRY FORWARD the last real position we saw in the cloud, so an
  // idle/empty device can never erase your other device's position.
  let lastVerse;
  if (spot && !isDailySeed(spot)) {
    lastVerse = spot;
  } else if (lastRemotePos && lastRemotePos.verse && !isDailySeed(lastRemotePos.verse)) {
    lastVerse = lastRemotePos.verse;
  }
  return {
    memorized: [...merged],
    lastVerse: lastVerse, // undefined only when the cloud itself has none
    reciterId: state.reciterId,
    repeat: state.repeat,
    speed: state.speed,
    autoPlay: state.autoPlay,
    loop: { on: state.loop.on, from: state.loop.from, to: state.loop.to },
    display: state.display,
    savedAt: Date.now(),
    device: deviceId()
  };
}
/* ---- Diagnostics: triple-tap the footer to dump local/cloud/will-push ---- */
async function debugDump() {
  if (!dom.diagLog) { toast("diag: element missing"); return; }
  let remote = null;
  try {
    const res = await fetch(`${GH_API}/repos/${SYNC_REPO}/contents/${SYNC_FILE}?t=${Date.now()}`, { headers: ghHeaders() });
    if (res.ok) {
      const j = await res.json();
      remote = JSON.parse(b64decode(j.content || ""));
    } else {
      remote = { http: res.status, note: await res.text().slice(0, 200) };
    }
  } catch (e) {
    remote = { error: String(e && e.message ? e.message : e) };
  }
  const local = {
    thisDevice: deviceId(),
    syncTokenPresent: !!state.syncToken,
    syncReady: syncReady(),
    baselineKnown: baselineKnown,
    localLastVerse: loadJSON(LS_LAST, null),
    localLastNavAt: state.lastNavAt,
    localMemorized: [...state.memorized],
    cachedCloudMemorized: [...lastRemoteMemorized],
    cachedCloudPosition: lastRemotePos ? lastRemotePos.verse : null
  };
  const willPush = collectSyncPayload();
  const report =
    "LOCAL:\n" + JSON.stringify(local, null, 2) + "\n" +
    "\nCLOUD (current sync.json):\n" + JSON.stringify(remote, null, 2) + "\n" +
    "\nWILL-PUSH (next payload):\n" + JSON.stringify(willPush, null, 2);
  dom.diagLog.textContent = report;
  dom.diagLog.hidden = false;
  console.log("[ayah diagnostics]", report);
  toast("diagnostics shown ↓");
}
let pushTimer = null;
function queuePush() {
  if (!state.syncOn) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => pushSync().catch(() => {}), 1500);
}
async function pushSync() {
  if (!syncReady() || state.syncBusy) return false;
  if (typeof fetch !== "function" || typeof btoa !== "function") return false;
  state.syncBusy = true;
  syncStatusMsg("syncing…");
  let ok = false;
  try {
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      // CORE ANTI-CLOBBER GUARD: before writing, always read the cloud first
      // and union against it. A device that cannot READ must not WRITE — its
      // view of the world is unknowably stale, and writing would erase stars
      // another device made. applyPosition=false, so a stale cloud position can
      // never yank this device's real spot either.
      const baseline = await pullSync(false);
      if (baseline) applyRemote(baseline, false);
      if (!baselineKnown) {
        syncStatusMsg("sync paused — couldn't read cloud first (will retry)");
        break;
      }
      const payload = collectSyncPayload();
      // Visible proof of what this device is writing to the cloud.
      console.log("[ayah sync] pushing", JSON.stringify(payload));
      if (attempt === 0) syncStatusMsg("pushed " + (payload.lastVerse || "no position"));
      const body = {
        message: "Ayah sync " + new Date().toISOString(),
        content: b64encode(JSON.stringify(payload)),
        branch: "main"
      };
      if (syncSha) body.sha = syncSha;
      const res = await fetch(`${GH_API}/repos/${SYNC_REPO}/contents/${SYNC_FILE}`, {
        method: "PUT",
        headers: ghHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(body)
      });
      if ((res.status === 409 || res.status === 422) && attempt < 2) {
        // Your other device wrote first (409) or we didn't know the sha yet (422):
        // pull the latest, union-merge locally, retry with the fresh sha.
        syncSha = null;
        const remote = await pullSync(false);
        if (remote) applyRemote(remote, false);
        continue;
      }
      if (res.status === 401) { await syncFail(res, "✗ token invalid or revoked"); break; }
      if (res.status === 403) { await syncFail(res, "✗ token can't write (needs Contents Read+write)"); break; }
      if (res.status === 404) {
        await syncFail(res, "✗ no access to the sync repo — re-create token & select 'ayah-sync'");
        break;
      }
      if (!res.ok) { await syncFail(res, "✗ sync failed"); break; }
      const done = await res.json();
      if (done && done.content && done.content.sha) syncSha = done.content.sha;
      state.syncMeta.savedAt = Date.now();
      saveJSON(LS_SYNC_META, state.syncMeta);
      const t = new Date();
      const hh = String(t.getHours()).padStart(2, "0");
      const mm = String(t.getMinutes()).padStart(2, "0");
      syncStatusMsg("synced " + hh + ":" + mm + " → cloud ✓");
      ok = true;
    }
  } catch (e) {
    syncStatusMsg("network error (" + (e && e.message ? e.message : "fetch failed") + ") — will retry");
  } finally {
    state.syncBusy = false;
  }
  return ok;
}
async function pullSync(applyPosition) {
  if (!syncReady() || typeof fetch !== "function") return null;
  try {
    const res = await fetch(`${GH_API}/repos/${SYNC_REPO}/contents/${SYNC_FILE}?t=${Date.now()}`, {
      headers: ghHeaders()
    });
    if (res.status === 404) {
      // GitHub returns 404 both when the file doesn't exist yet AND when the
      // token can't see the private repo. Probe the repo endpoint to tell apart.
      try {
        const rp = await fetch(`${GH_API}/repos/${SYNC_REPO}`, { headers: ghHeaders() });
        if (rp.ok) { syncSha = null; baselineKnown = true; return null; } // repo visible → file not created yet; cloud is KNOWN empty
      } catch { /* fall through to the warning below */ }
      await syncFail(res, "✗ token can't access the sync repo — re-create token & select 'ayah-sync'");
      baselineKnown = false;
      return null;
    }
    if (res.status === 401) { baselineKnown = false; await syncFail(res, "✗ token invalid or revoked"); return null; }
    if (res.status === 403) { baselineKnown = false; await syncFail(res, "✗ token can't read (needs Contents access)"); return null; }
    if (!res.ok) { baselineKnown = false; await syncFail(res, "✗ pull failed"); return null; }
    const meta = await res.json();
    syncSha = meta.sha || null;
    let remote = null;
    try { remote = JSON.parse(b64decode(meta.content || "")); } catch { remote = null; }
    if (remote && typeof remote === "object") {
      baselineKnown = true;
      applyRemote(remote, applyPosition);
      const t = new Date();
      const hh = String(t.getHours()).padStart(2, "0");
      const mm = String(t.getMinutes()).padStart(2, "0");
      syncStatusMsg("synced " + hh + ":" + mm);
      return remote;
    }
    return null;
  } catch (e) {
    baselineKnown = false;
    syncStatusMsg("network error (" + (e && e.message ? e.message : "fetch failed") + ") — will retry");
    return null;
  }
}

/* Diagnose a saved token against GitHub, step by step. Safe: the probe file
   it creates is deleted immediately after. */
async function syncTest() {
  if (!state.syncToken) { syncStatusMsg("paste a token first — ⚙ Setup"); return; }
  syncStatusMsg("testing token…");
  const parts = [];
  try {
    // 1. Is the token itself valid? Who is it?
    let r = await fetch(`${GH_API}/user`, { headers: ghHeaders() });
    if (r.ok) {
      const u = await r.json();
      parts.push("✓ token OK (“" + u.login + "”)");
    } else {
      parts.push(`✗ 401 — token invalid or revoked (${await ghErr(r)})`);
      syncStatusMsg(parts.join(" · "));
      return;
    }
    // 2. Can it see the sync repo at all?
    r = await fetch(`${GH_API}/repos/${SYNC_REPO}`, { headers: ghHeaders() });
    parts.push(r.ok ? "✓ can see lujaneyaffa/ayah-sync" : `✗ ${r.status} — repo not visible → re-create token & select 'ayah-sync' (not 'ayah')`);

    // 3. Can it read the sync file?
    r = await fetch(`${GH_API}/repos/${SYNC_REPO}/contents/${SYNC_FILE}?t=${Date.now()}`, { headers: ghHeaders() });
    if (r.ok) {
      const m = await r.json();
      syncSha = m.sha || null;
      parts.push("✓ can read sync.json");
    } else if (r.status === 404) {
      parts.push("✓ read OK (file not created yet — will be)");
    } else {
      parts.push(`✗ ${r.status} — read blocked`);
    }

    // 4. Can it write? (create a tiny probe, then delete it). Use a UNIQUE
    //    path per attempt and sweep any leftover probes first, so a prior
    //    leftover or a concurrent writer can never misreport a working token.
    const sweepProbes = async () => {
      try {
        const list = await (await fetch(`${GH_API}/repos/${SYNC_REPO}/contents/`, { headers: ghHeaders() })).json();
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item.type === "file" && /^_probe-.*\.txt$/.test(item.name || "")) {
              fetch(`${GH_API}/repos/${SYNC_REPO}/contents/${encodeURIComponent(item.name)}`, {
                method: "DELETE",
                headers: ghHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ message: "probe cleanup", sha: item.sha })
              }).catch(() => {});
            }
          }
        }
      } catch { /* best-effort sweep */ }
    };
    await sweepProbes();
    const probe = "_probe-" + deviceId().replace("dev-", "") + "-" + Date.now() + ".txt";
    r = await fetch(`${GH_API}/repos/${SYNC_REPO}/contents/${encodeURIComponent(probe)}`, {
      method: "PUT",
      headers: ghHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ message: "probe", content: b64encode("1"), branch: "main" })
    });
    if (r.ok) {
      parts.push("✓ can write (probe removed)");
      const m = await r.json();
      if (m && m.content && m.content.sha) {
        fetch(`${GH_API}/repos/${SYNC_REPO}/contents/${encodeURIComponent(probe)}`, {
          method: "DELETE",
          headers: ghHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ message: "probe cleanup", sha: m.content.sha })
        }).catch(() => {});
      }
    } else if (r.status === 403) {
      parts.push("✗ 403 — write blocked: token needs Contents permission → Read and write (it's read-only now)");
    } else if (r.status === 404) {
      parts.push("✗ 404 — write blocked: token's 'Only select repositories' doesn't include ayah-sync");
    } else if (r.status === 409 || r.status === 422) {
      // Reaching here means auth PASSED (these statuses only happen post-auth);
      // a unique fresh name means a genuine concurrent write — the token CAN write.
      parts.push("✓ can write (concurrent writer, ~" + r.status + ")");
    } else {
      parts.push(`✗ ${r.status} — write blocked (${await ghErr(r)})`);
    }
  } catch (e) {
    parts.push("network error during test (" + (e && e.message ? e.message : "fetch failed") + ")");
  }
  syncStatusMsg(parts.join(" · "));
  console.warn("[Ayah sync test]", parts.join(" · "));
}
function applyRemote(remote, applyPosition) {
  let touched = false;
  // Keep the union baseline in sync with the cloud AND persisted to disk, so a
  // later push unions against what the cloud actually holds.
  if (Array.isArray(remote.memorized)) {
    lastRemoteMemorized = new Set(remote.memorized.filter((k) => typeof k === "string"));
    saveJSON(LS_REMOTE_MEM, [...lastRemoteMemorized]);
  }
  // Memorized stars: UNION — never lose a star either device made
  if (Array.isArray(remote.memorized) && remote.memorized.length) {
    const before = state.memorized.size;
    for (const k of remote.memorized) {
      if (typeof k === "string" && indexFromKey(k) >= 0 && indexFromKey(k) < TOTAL_VERSES) {
        state.memorized.add(k);
      }
    }
    if (state.memorized.size !== before) {
      saveJSON(LS_MEMORIZED, [...state.memorized]);
      renderMemorized();
      touched = true;
    }
  }
  // Settings + position: only trust a remote that is newer than our last push
  if (remote.savedAt && remote.savedAt > (state.syncMeta.savedAt || 0)) {
    const rRec = Number(remote.reciterId);
    if (rRec && RECITERS.some((r) => r.id === rRec) && rRec !== state.reciterId) {
      state.reciterId = rRec;
      saveJSON(LS_RECITER, state.reciterId);
      populateReciterSelect();
      state.audioCache = {};
      saveJSON(LS_AUDIOCACHE, state.audioCache);
      touched = true;
    }
    const rRep = Number(remote.repeat);
    if (rRep >= 1 && rRep !== state.repeat) {
      state.repeat = rRep;
      saveJSON(LS_REPEAT, state.repeat);
      if (dom.repeatSelect) dom.repeatSelect.value = String(state.repeat);
      touched = true;
    }
    const rSpeed = Number(remote.speed);
    if (rSpeed >= 0.25 && rSpeed <= 3 && rSpeed !== state.speed) {
      state.speed = rSpeed;
      saveJSON(LS_SPEED, state.speed);
      if (dom.speedSelect) dom.speedSelect.value = String(state.speed);
      applySpeed();
      touched = true;
    }
    if (typeof remote.autoPlay === "boolean" && remote.autoPlay !== state.autoPlay) {
      state.autoPlay = remote.autoPlay;
      saveJSON(LS_AUTO, state.autoPlay);
      if (dom.btnAuto) {
        dom.btnAuto.classList.toggle("is-on", state.autoPlay);
        dom.btnAuto.setAttribute("aria-pressed", String(state.autoPlay));
      }
      touched = true;
    }
    const rLoop = normalizeLoop(remote.loop);
    if ((rLoop.on || rLoop.from || rLoop.to) &&
        JSON.stringify(rLoop) !== JSON.stringify(state.loop)) {
      state.loop = rLoop;
      saveJSON(LS_LOOP, state.loop);
      syncLoopUI();
      touched = true;
    }
    if (Array.isArray(remote.display) && remote.display.length &&
        JSON.stringify(remote.display) !== JSON.stringify(state.display)) {
      state.display = remote.display;
      saveJSON(LS_DISPLAY, state.display);
      refreshDisplayCheckboxes();
      touched = true;
    }
    // Update the position baseline whenever the cloud holds a REAL position,
    // whether or not this device adopts it right now. An empty device's next
    // push will then carry this verse forward instead of erasing it.
    if (typeof remote.lastVerse === "string" && !isDailySeed(remote.lastVerse) &&
        indexFromKey(remote.lastVerse) >= 0 && indexFromKey(remote.lastVerse) < TOTAL_VERSES) {
      lastRemotePos = { verse: remote.lastVerse, savedAt: remote.savedAt || 0 };
      saveJSON(LS_REMOTE_POS, lastRemotePos);
    }
    if (applyPosition && typeof remote.lastVerse === "string" &&
        remote.savedAt > state.lastNavAt &&
        !isDailySeed(remote.lastVerse) &&
        indexFromKey(remote.lastVerse) >= 0 && indexFromKey(remote.lastVerse) < TOTAL_VERSES &&
        remote.lastVerse !== state.currentKey) {
      state.currentKey = remote.lastVerse;
      state.lastNavAt = Math.max(state.lastNavAt, remote.savedAt);
      saveJSON(LS_NAV_AT, state.lastNavAt);
      saveJSON(LS_LAST, remote.lastVerse);
      touched = true;
    }
  }
  if (touched) renderRead();
}
function refreshSyncStatus() {
  if (!state.syncToken) {
    syncStatusMsg("setup needed — tap ⚙ Setup");
  } else if (state.syncMeta.savedAt) {
    const t = new Date(state.syncMeta.savedAt);
    const hh = String(t.getHours()).padStart(2, "0");
    const mm = String(t.getMinutes()).padStart(2, "0");
    syncStatusMsg(`on — last ${hh}:${mm}`);
  } else {
    syncStatusMsg("on — first sync pending");
  }
}
function wireSync() {
  if (dom.syncSetup) {
    dom.syncSetup.addEventListener("click", () => {
      dom.syncPanel.classList.toggle("is-open");
    });
  }
  if (dom.syncSave) {
    dom.syncSave.addEventListener("click", async () => {
      const tok = (dom.syncToken.value || "").trim();
      if (!tok) { syncStatusMsg("paste the token first"); return; }
      state.syncToken = tok;
      saveJSON(LS_SYNC_TOKEN, tok);
      dom.syncToken.value = "";
      toast("Token saved — syncing…");
      syncStatusMsg("checking…");
      // If this device has a real spot it has read before, keep it — don't let
      // another device's position teleport it. A brand-new device (no saved
      // spot) still adopts the remote position so it starts where you left off.
      const hasLocalSpot = !!(loadJSON(LS_LAST, null));
      await pullSync(!hasLocalSpot);
      await pushSync();     // then write this device's state (always)
      if (dom.syncPanel) dom.syncPanel.classList.remove("is-open");
    });
  }
  if (dom.syncTest) {
    dom.syncTest.addEventListener("click", syncTest);
  }
  if (dom.syncNow) {
    dom.syncNow.addEventListener("click", async () => {
      if (!state.syncToken) {
        if (dom.syncPanel) dom.syncPanel.classList.add("is-open");
        syncStatusMsg("paste token first — see Setup");
        toast("Add your GitHub token first");
        return;
      }
      state.syncOn = true;
      saveJSON(LS_SYNC_ON, true);
      toast("Syncing…");
      // Push this device's real state first (claims the cloud, carries forward
      // the cloud's position/stars so nothing can be erased), then pull to
      // adopt a genuinely newer real read from the other device.
      const pushed = await pushSync();
      await pullSync(true);
      refreshSyncStatus();
      if (pushed) {
        console.log("[ayah sync] Sync Now: write landed on GitHub ✓");
      } else {
        syncStatusMsg("read-only sync — write was skipped (tap ⚙ Setup → Test)");
        console.warn("[ayah sync] Sync Now: write did NOT land");
      }
    });
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) syncCycle();
  });
  setInterval(() => {
    if (!document.hidden) syncCycle();
  }, 90000);
    refreshSyncStatus();

  // Triple-tap the footer (version span) to reveal a diagnostics dump:
  // local state, current cloud sync.json, and the exact payload this device
  // is about to push. Non-intrusive — single/double taps still do nothing.
  let footClicks = 0;
  let footTimer = null;
  const foot = dom.appVersion || $("#appVersion") || document.querySelector(".foot");
  if (foot) {
    foot.addEventListener("click", (e) => {
      e.stopPropagation();
      footClicks++;
      clearTimeout(footTimer);
      footTimer = setTimeout(() => {
        if (footClicks >= 3) { footClicks = 0; debugDump(); }
        else { footClicks = 0; }
      }, 300);
    });
  }
}

/* Background cycle: pull the cloud — adopting a newer position (so devices
   converge on "last read wins") and unioning memorized — then only re-push if
   the remote was actually newer (otherwise we'd clobber it with stale data). */
function syncCycle() {
  if (!syncReady()) return;
  const prevSaved = state.syncMeta.savedAt || 0;
  pullSync(true).then((remote) => {
    if (remote && remote.savedAt && remote.savedAt > prevSaved) queuePush();
  }).catch(() => {});
}

/* ================================================================
   Memorization check — recite out loud, compare against the verse.
   Runs a Quran-tuned Whisper model (tarteel-ai/whisper-base-ar-quran,
   quantized to ONNX) entirely in the browser via transformers.js — no
   audio ever leaves the device. ~130MB total (model + WASM runtime),
   fetched once and then
   cached by the service worker like everything else offline.
   ================================================================ */
const ASR_MODEL_ID = "tarteel-whisper-quran";
// jsdelivr's "+esm" endpoint (not the plain dist file) — the raw browser
// bundle leaves onnxruntime-web's own sub-imports (webgpu backend, common)
// as unresolved bare specifiers, which only "+esm" resolves without a
// bundler or an import map.
const ASR_CDN = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/+esm";

// Pure: strip tashkeel/diacritics, tatweel, and fold letter variants that
// Whisper's output and Quran.com's script don't always agree on (hamza
// seats, alef maksura, teh marbuta) so a transcription and the reference
// verse compare on the letters that actually matter for "did you say the
// right word", not on marks.
function normalizeArabicWord(w) {
  return String(w || "")
    .replace(/[ً-ْٖ-ٰٟۖ-ࣰۭ-ࣿ]/g, "") // tashkeel/marks
    .replace(/ـ/g, "") // tatweel
    .replace(/[آأإٱ]/g, "ا") // alef variants -> bare alef
    .replace(/ة/g, "ه") // teh marbuta -> heh
    .replace(/ى/g, "ي") // alef maksura -> yeh
    .replace(/ؤ/g, "و") // waw with hamza -> waw
    .replace(/ئ/g, "ي") // yeh with hamza -> yeh
    .replace(/[^ؠ-ي٠-٩]/g, "") // drop punctuation/other
    .trim();
}
function tokenizeArabic(text) {
  return String(text || "").split(/\s+/).map(normalizeArabicWord).filter(Boolean);
}

// Pure: word-level LCS alignment between the reference verse and what the
// mic heard. Returns "said"/"missed" per reference word (index-aligned with
// refWords, so callers can zip it against the original diacritic-ed words
// for display) plus a count of words said that aren't in the verse at all.
function alignRecitation(refWords, saidWords) {
  const n = refWords.length, m = saidWords.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = refWords[i - 1] === saidWords[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const perWord = refWords.map(() => "missed");
  let i = n, j = m, extraWords = 0;
  while (i > 0 && j > 0) {
    if (refWords[i - 1] === saidWords[j - 1]) {
      perWord[i - 1] = "said";
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--; extraWords++;
    }
  }
  extraWords += j;
  const correct = perWord.filter((s) => s === "said").length;
  return {
    perWord,
    correct,
    total: refWords.length,
    accuracy: refWords.length ? correct / refWords.length : 0,
    extraWords
  };
}
// Pure: turn an accuracy score into the short verdict shown under the result.
function recitationVerdict(accuracy) {
  if (accuracy >= 0.9) return "Great job! ✅";
  if (accuracy >= 0.6) return "Almost there — check the highlighted words.";
  return "Let's practice this one more time.";
}

let asrPipelinePromise = null;
async function getAsrPipeline(onProgress) {
  if (!asrPipelinePromise) {
    asrPipelinePromise = (async () => {
      const { pipeline, env } = await import(ASR_CDN);
      env.allowRemoteModels = false; // only ever fetch our own hosted model — never HF Hub
      env.allowLocalModels = true; // browser default is false; "local" here just means "our own URL"
      env.localModelPath = "./models/";
      env.useBrowserCache = false; // the SW's own ASR_CACHE already persists these — skip transformers.js's separate cache so a ~130MB download isn't stored twice
      return pipeline("automatic-speech-recognition", ASR_MODEL_ID, {
        dtype: "q8",
        progress_callback: onProgress
      });
    })().catch((err) => { asrPipelinePromise = null; throw err; });
  }
  return asrPipelinePromise;
}

// Resample a captured Float32 PCM buffer to the 16kHz mono Whisper expects.
async function resampleTo16k(float32, fromRate) {
  if (fromRate === 16000) return float32;
  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const targetLen = Math.ceil((float32.length * 16000) / fromRate);
  const offline = new OfflineCtx(1, targetLen, 16000);
  const buf = offline.createBuffer(1, float32.length, fromRate);
  buf.copyToChannel(float32, 0);
  const src = offline.createBufferSource();
  src.buffer = buf;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

const checkRec = { ctx: null, stream: null, node: null, chunks: [], sampleRate: 16000, active: false, starting: false };
const CHECK_MAX_SECONDS = 1200; // 20 min safety cap — a full page can take a few minutes to recite
const CHECK_PERIODIC_MS = 8000; // how often the in-progress check re-transcribes while reciting
let checkPeriodicTimer = null;
let checkPeriodicBusy = false;

// Pure-ish: concatenate the Float32 chunks captured so far. Used both by the
// final stop-and-check and by each in-progress periodic peek, which must
// NOT touch checkRec.chunks itself (recording keeps running underneath it).
function mergeAudioChunks(chunks) {
  const total = chunks.reduce((a, c) => a + c.length, 0);
  const merged = new Float32Array(total);
  let off = 0;
  for (const c of chunks) { merged.set(c, off); off += c.length; }
  return merged;
}

function setCheckPageNavDisabled(disabled) {
  if (dom.checkPagePrev) dom.checkPagePrev.disabled = disabled;
  if (dom.checkPageNext) dom.checkPageNext.disabled = disabled;
  if (dom.checkPageInput) dom.checkPageInput.disabled = disabled;
}

async function startCheckRecording() {
  // Guards against a double-tap/double-click starting two overlapping
  // recordings (two live mic streams, two AudioContexts) before the first
  // getUserMedia await even resolves.
  if (checkRec.active || checkRec.starting) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    toast("Microphone not available in this browser");
    return;
  }
  checkRec.starting = true;
  try {
    checkRec.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    toast("Microphone permission denied");
    checkRec.starting = false;
    return;
  }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  checkRec.ctx = new Ctx();
  // iOS/strict browsers can create a context in "suspended" state, especially
  // after the getUserMedia permission prompt's delay eats the user-gesture
  // window — left suspended, onaudioprocess never fires and nothing gets
  // captured at all, silently. Explicitly resuming is safe to call regardless.
  await checkRec.ctx.resume().catch(() => {});
  checkRec.sampleRate = checkRec.ctx.sampleRate;
  checkRec.chunks = [];
  const source = checkRec.ctx.createMediaStreamSource(checkRec.stream);
  // ScriptProcessorNode is deprecated but is the one capture path that works
  // reliably on older iOS Safari without shipping a separate AudioWorklet
  // module file. It only fires while connected through to a destination, so
  // route through a silent gain to avoid mic feedback through the speakers.
  checkRec.node = checkRec.ctx.createScriptProcessor(4096, 1, 1);
  checkRec.node.onaudioprocess = (e) => {
    checkRec.chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  };
  const silence = checkRec.ctx.createGain();
  silence.gain.value = 0;
  source.connect(checkRec.node);
  checkRec.node.connect(silence);
  silence.connect(checkRec.ctx.destination);
  checkRec.active = true;
  checkRec.starting = false;
  setCheckPageNavDisabled(true); // the page being checked can't change mid-recording
  checkRec.autoStopTimer = setTimeout(() => {
    if (checkRec.active) runMemorizationCheck();
  }, CHECK_MAX_SECONDS * 1000);
  // Warm up the model the moment recording starts, so it's likely ready by
  // the first periodic check instead of only starting the ~130MB download
  // once the user taps Stop.
  getAsrPipeline((p) => {
    if (p.status === "progress" && p.file) {
      dom.checkStatus.textContent = `Downloading checker (one-time, ~130MB): ${p.file} ${Math.round(p.progress || 0)}%`;
    }
  }).catch(() => {});
}

function stopCheckRecordingRaw() {
  clearTimeout(checkRec.autoStopTimer);
  clearInterval(checkPeriodicTimer);
  setCheckPageNavDisabled(false);
  if (!checkRec.active) return null;
  checkRec.active = false;
  checkRec.node.disconnect();
  checkRec.ctx.close().catch(() => {});
  checkRec.stream.getTracks().forEach((t) => t.stop());
  const merged = mergeAudioChunks(checkRec.chunks);
  checkRec.chunks = [];
  return { pcm: merged, sampleRate: checkRec.sampleRate };
}

let checkPageToken = 0;

// Fetch every ayah on a Mushaf page in one call (same word shape loadVerse
// already uses) and cache it — memorization is naturally page-by-page, not
// ayah-by-ayah, so the Check tab works on a whole page at once.
async function loadPage(pageNumber) {
  const key = String(pageNumber);
  if (pageCache[key]) return pageCache[key];
  const url = `${API_BASE}/verses/by_page/${pageNumber}?words=true&word_fields=text_imlaei&fields=text_imlaei`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("page api " + res.status);
  const json = await res.json();
  const verses = (json.verses || []).map((v) => ({ key: v.verse_key, words: wordListFromApi(v.words) }));
  const data = { pageNumber, verses };
  pageCache[key] = data;
  saveJSON(LS_PAGECACHE, pageCache);
  const keys = Object.keys(pageCache);
  if (keys.length > 20) { delete pageCache[keys[0]]; saveJSON(LS_PAGECACHE, pageCache); } // pages are heavier than single verses — keep fewer
  return data;
}

async function renderCheckPage(pageNumber) {
  if (!dom.checkArabic) return;
  const token = ++checkPageToken;
  dom.checkStatus.textContent = "Loading page…";
  dom.checkResult.hidden = true;
  dom.checkArabic.textContent = "";
  state.checkRefWords = [];
  try {
    const data = await loadPage(pageNumber);
    if (token !== checkPageToken) return; // stale response — user flipped pages again
    dom.checkKey.textContent = `Page ${pageNumber}`;
    const firstSurah = data.verses.length ? surahNameFor(data.verses[0].key) : "";
    const lastSurah = data.verses.length ? surahNameFor(data.verses[data.verses.length - 1].key) : "";
    dom.checkSurah.textContent = firstSurah === lastSurah ? firstSurah : `${firstSurah} – ${lastSurah}`;
    const allWords = [];
    data.verses.forEach((v) => {
      v.words.forEach((w) => {
        const span = document.createElement("span");
        span.className = "qword";
        span.textContent = w.text;
        dom.checkArabic.appendChild(span);
        dom.checkArabic.appendChild(document.createTextNode(" "));
        allWords.push(w.text);
      });
      const badge = document.createElement("span");
      badge.className = "ayah-badge";
      badge.textContent = String(parseKey(v.key).ayah);
      dom.checkArabic.appendChild(badge);
      dom.checkArabic.appendChild(document.createTextNode(" "));
    });
    state.checkRefWords = allWords;
    dom.checkStatus.textContent = "";
  } catch (err) {
    if (token !== checkPageToken) return;
    dom.checkArabic.textContent = "—";
    dom.checkStatus.textContent = "Couldn't load this page (offline, no saved copy).";
  }
}

function goCheckPage(delta) {
  const next = Math.max(1, Math.min(TOTAL_PAGES, state.checkPage + delta));
  if (next === state.checkPage) return;
  state.checkPage = next;
  saveJSON(LS_CHECK_PAGE, next);
  if (dom.checkPageInput) dom.checkPageInput.value = String(next);
  renderCheckPage(next);
}

function renderCheckResultWords(alignment) {
  const spans = dom.checkArabic.querySelectorAll(".qword");
  spans.forEach((span, i) => {
    span.classList.remove("qword-correct", "qword-missed");
    span.classList.add(alignment.perWord[i] === "said" ? "qword-correct" : "qword-missed");
  });
}

// Pure: index of the quietest short window near targetIdx, within
// +/-searchRadius samples. Used to cut long audio on a pause instead of
// mid-word.
function findQuietCutIndex(pcm, targetIdx, searchRadius) {
  const winSize = 800; // 50ms at 16kHz
  const start = Math.max(0, targetIdx - searchRadius);
  const end = Math.min(pcm.length - winSize, targetIdx + searchRadius);
  let bestIdx = targetIdx, bestEnergy = Infinity;
  for (let i = start; i <= end; i += 400) {
    let sum = 0;
    for (let j = i; j < i + winSize; j++) sum += pcm[j] * pcm[j];
    const energy = sum / winSize;
    if (energy < bestEnergy) { bestEnergy = energy; bestIdx = i + (winSize >> 1); }
  }
  return bestIdx;
}
// Pure: split long audio into segments no longer than maxSegmentSec,
// cutting at the quietest nearby point rather than an arbitrary sample.
//
// Whisper's own long-form chunking (chunk_length_s/stride_length_s) merges
// overlapping windows using the model's timestamp tokens, which this narrow
// Quran-only fine-tune doesn't generate reliably (return_timestamps mode
// produces garbage on it) — so its automatic long-form path silently drops
// or garbles whole phrases. A single-pass call is solid up to a point, but
// beyond roughly 10s on Quranic recitation specifically (short, repetitive,
// formulaic phrases like "الرحمن الرحيم" recurring seconds apart) the model
// tends to drift and skip or repeat-suppress a phrase it just "heard"
// moments earlier — a known Whisper long-form failure mode. Splitting into
// short segments ourselves and transcribing each independently avoids both
// problems; the trade-off is an occasional clipped word right at a segment
// boundary, which a real reciter's natural pauses make rare in practice.
function splitAudioForAsr(pcm, sampleRate, maxSegmentSec) {
  const maxLen = Math.round(maxSegmentSec * sampleRate);
  if (pcm.length <= maxLen) return [pcm];
  const segments = [];
  let start = 0;
  while (start < pcm.length) {
    let end = Math.min(pcm.length, start + maxLen);
    if (end < pcm.length) end = findQuietCutIndex(pcm, end, sampleRate * 2);
    if (end <= start) end = Math.min(pcm.length, start + maxLen); // safety: never stall
    segments.push(pcm.slice(start, end));
    start = end;
  }
  return segments;
}

const ASR_SEGMENT_SECONDS = 8; // see splitAudioForAsr for why this model needs short segments

// Shared by the periodic in-progress peek and the final stop-and-check.
async function checkAudioAgainstPage(pcm, sampleRate) {
  const audio16k = await resampleTo16k(pcm, sampleRate);
  const asr = await getAsrPipeline(() => {});
  const segments = splitAudioForAsr(audio16k, 16000, ASR_SEGMENT_SECONDS);
  const texts = [];
  for (const seg of segments) {
    if (seg.length < 1600) continue; // <0.1s scrap left over from a cut — skip, avoids hallucinating on near-silence
    const out = await asr(seg);
    texts.push(out.text);
  }
  const saidWords = tokenizeArabic(texts.join(" "));
  const refWords = (state.checkRefWords || []).map(normalizeArabicWord);
  return alignRecitation(refWords, saidWords);
}

// While reciting, periodically re-transcribe everything said so far and
// update the highlighting — the closest a non-streaming model can get to
// "live" feedback. Each tick re-processes the WHOLE recording (Whisper
// can't pick up where it left off), so on a long page later ticks take
// longer; the busy-guard just skips a tick rather than piling them up, so
// it naturally slows down instead of falling behind.
function startPeriodicChecks() {
  clearInterval(checkPeriodicTimer);
  checkPeriodicTimer = setInterval(async () => {
    if (checkPeriodicBusy || !checkRec.active) return;
    const merged = mergeAudioChunks(checkRec.chunks);
    if (merged.length < checkRec.sampleRate * 2) return; // wait for ~2s of audio first
    checkPeriodicBusy = true;
    try {
      const alignment = await checkAudioAgainstPage(merged, checkRec.sampleRate);
      if (!checkRec.active) return; // stopped while this tick was running
      renderCheckResultWords(alignment);
      const pct = Math.round(alignment.accuracy * 100);
      dom.checkStatus.textContent = `Listening… ${alignment.correct}/${alignment.total} so far (${pct}%)`;
    } catch { /* transient — the next tick will just try again */ }
    finally { checkPeriodicBusy = false; }
  }, CHECK_PERIODIC_MS);
}

async function runMemorizationCheck() {
  const rec = stopCheckRecordingRaw();
  dom.checkRecordBtn.textContent = "🎙 Start Reciting";
  dom.checkRecordBtn.classList.remove("is-recording");
  if (!rec || rec.pcm.length < 1600) { // less than 0.1s — nothing was captured
    dom.checkStatus.textContent = "Didn't catch anything — try again.";
    return;
  }
  dom.checkRecordBtn.disabled = true;
  dom.checkStatus.textContent = "Checking your recitation…";
  try {
    const alignment = await checkAudioAgainstPage(rec.pcm, rec.sampleRate);
    renderCheckResultWords(alignment);
    dom.checkResult.hidden = false;
    const pct = Math.round(alignment.accuracy * 100);
    dom.checkResult.textContent = `${alignment.correct}/${alignment.total} words (${pct}%) — ${recitationVerdict(alignment.accuracy)}`;
    dom.checkStatus.textContent = "";
  } catch (err) {
    dom.checkStatus.textContent = "Couldn't run the checker (offline and not yet downloaded?).";
  } finally {
    dom.checkRecordBtn.disabled = false;
  }
}

function toggleCheckRecording() {
  if (checkRec.active) {
    dom.checkRecordBtn.disabled = true;
    dom.checkStatus.textContent = "Checking your recitation…";
    runMemorizationCheck();
  } else {
    dom.checkRecordBtn.disabled = true;
    startCheckRecording().then(() => {
      dom.checkRecordBtn.disabled = false;
      if (checkRec.active) {
        dom.checkRecordBtn.textContent = "⏹ Stop & Check";
        dom.checkRecordBtn.classList.add("is-recording");
        dom.checkStatus.textContent = "Listening…";
        dom.checkResult.hidden = true;
        startPeriodicChecks();
      }
    });
  }
}

/* ================================================================
   Init
   ================================================================ */
function dailyVerseKey(offsetDays = 0) {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + offsetDays);
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const dayIndex = Math.floor(start / 86400000);
  return keyFromIndex(dayIndex % TOTAL_VERSES).key;
}
// A verse that matches ANY of the last 7 days' auto-daily seeds is not a real
// user read — never adopt or push it, so idle daily seeds (even a few days
// stale, e.g. a seed left in the cloud by an old version) can never win.
function isDailySeed(key) {
  if (!key) return true;
  for (let off = 0; off >= -6; off--) {
    if (key === dailyVerseKey(off)) return true;
  }
  return false;
}

function init() {
  if (dom.appVersion) dom.appVersion.textContent = APP_VERSION;
  // Restore last-viewed verse, or show today's daily verse on first run
  const last = loadJSON(LS_LAST, null);
  const daily = dailyVerseKey();
  // A saved spot that is today's OR yesterday's auto-daily verse is almost
  // certainly an idle seed (not a real read) — drop it so this device behaves
  // as fresh and follows wherever you actually last read on any device.
  if (isDailySeed(last)) {
    saveJSON(LS_LAST, null);
    state.currentKey = daily;
  } else if (last && indexFromKey(last) >= 0 && indexFromKey(last) < TOTAL_VERSES) {
    state.currentKey = last;
  } else {
    state.currentKey = daily;
  }

  populateSurahSelect();
  populateReciterSelect();

  // Restore audio settings
  dom.btnAuto.classList.toggle("is-on", state.autoPlay);
  dom.btnAuto.setAttribute("aria-pressed", String(state.autoPlay));
  dom.repeatSelect.value = String(state.repeat);
  dom.speedSelect.value = String(state.speed);
  applySpeed();
  syncLoopUI();
  refreshDisplayCheckboxes();

  const initChap = parseKey(state.currentKey).chapter;
  populateAyahSelect(initChap);
  dom.readSurahSelect.value = String(initChap);
  dom.readAyahSelect.value = String(parseKey(state.currentKey).ayah);

  setView("read");
  renderMemorized();
  wireEvents();
  wireSync();
  registerSW();
  checkForUpdates(false); // quiet: keep the SW on the latest build

  // Sync flow. pushSync ALWAYS reads the cloud first (see its baseline guard),
  // so this is safe regardless of order:
  //  - Device with a real spot (e.g. your Mac at Al-Baqarah): push to claim it
  //    (the read-first guard also re-uses the cloud's star set, so nothing can
  //    be erased). No adopting pull — a stale daily seed can't yank you away.
  //  - Fresh / daily-seeded device: pull FIRST to adopt wherever you actually
  //    last read (real spots only — daily seeds are ignored), then push the
  //    union back (a fresh device pushes no daily-seed position either).
  if (syncReady()) {
    const spot = loadJSON(LS_LAST, null);
    const hasRealSpot = spot && !isDailySeed(spot);
    if (hasRealSpot) {
      pushSync().catch(() => {});
    } else {
      pullSync(true).then(() => pushSync()).catch(() => {});
    }
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", init);
}