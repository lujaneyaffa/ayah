// Builds widget-install.html with the widget code embedded statically
// (no runtime fetch → works everywhere). Re-run after editing
// scriptable-widget.js:  node build_install_page.js
const fs = require("fs");

const js = fs.readFileSync(__dirname + "/scriptable-widget.js", "utf8");
const esc = js.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>12 Years iPhone Widget — Setup</title>
  <style>
    :root { --accent: #22c55e; --ink: #1c2a24; --muted: #6b7f75; --line: #e2e8e5; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, system-ui, sans-serif; background: #f6f8f7; color: var(--ink); }
    main { max-width: 640px; margin: 0 auto; padding: 28px 18px 60px; }
    h1 { font-size: 24px; margin: 0 0 4px; }
    .sub { color: var(--muted); margin: 0 0 24px; font-size: 14px; }
    ol { line-height: 1.7; padding-left: 22px; font-size: 15px; }
    li { margin-bottom: 10px; }
    code { background: #eaf2ee; border-radius: 6px; padding: 2px 7px; font-size: 13.5px; }
    .btn {
      display: inline-block; border: 0; border-radius: 999px; cursor: pointer;
      background: var(--accent); color: #fff; font-weight: 700; font-size: 16px;
      padding: 13px 30px; margin: 4px 0 18px; -webkit-tap-highlight-color: transparent;
    }
    .btn:active { transform: scale(0.98); }
    textarea {
      width: 100%; height: 240px; border: 1px solid var(--line); border-radius: 12px;
      font-family: ui-monospace, Menlo, monospace; font-size: 11px; padding: 12px;
      background: #fff; color: var(--ink); resize: vertical;
    }
    .note { font-size: 13px; color: var(--muted); margin-top: 14px; }
  </style>
</head>
<body>
  <main>
    <h1>📱 12 Years iPhone Widget</h1>
    <p class="sub">A real, live home-screen widget showing the same daily ayah as your app — 100% free.</p>

    <ol>
      <li>Install the free app <strong>Scriptable</strong> from the App Store.</li>
      <li>Tap the button below to <strong>copy the widget code</strong>.</li>
      <li>Open <strong>Scriptable</strong> → tap <code>+</code> (top right) → paste → name it <code>12 Years Widget</code> → tap the ▶ play button once (you should see a green preview).</li>
      <li>Go to your Home Screen → long-press an empty spot → <code>+</code> → search <strong>Scriptable</strong> → pick a size (Medium looks best).</li>
      <li>With the widget selected, tap it → set <strong>Script</strong> = <code>12 Years Widget</code> → tap outside → <strong>Done</strong>.</li>
    </ol>

    <button class="btn" id="copyBtn">📋 Copy widget code</button>

    <textarea id="code" readonly spellcheck="false">${esc}</textarea>

    <p class="note">
      The verse updates by itself (iOS refreshes it every ~15–60 min; it changes at midnight UTC like the app).
      Tap the widget to open the full app. Works offline — it shows the last verse it fetched.
    </p>
  </main>

  <script>
    (function () {
      var ta = document.getElementById("code");
      document.getElementById("copyBtn").addEventListener("click", function () {
        var btn = this;
        function fallback() {
          ta.focus(); ta.select();
          try { document.execCommand("copy"); btn.textContent = "✅ Copied! Now paste it in Scriptable"; }
          catch (e) { btn.textContent = "Press-and-hold the code below → Select All → Copy"; }
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(ta.value).then(function () {
            btn.textContent = "✅ Copied! Now paste it in Scriptable";
          }, fallback);
        } else { fallback(); }
      });
    })();
  </script>
</body>
</html>
`;

fs.writeFileSync(__dirname + "/widget-install.html", html);
console.log("widget-install.html built with embedded code (" + js.length + " chars of JS)");
