/* ============================================================
   Конструктор палитры
   ============================================================ */
(function () {
  "use strict";

  // Переменные палитры: [css-переменная, подпись, значение по умолчанию]
  var VARS = [
    ["--c-bg",     "Фон",            "#faf5f0"],
    ["--c-bg-alt", "Фон секций",     "#f3ebe2"],
    ["--c-card",   "Карточки",       "#fdf9f5"],
    ["--c-ink",    "Основной текст", "#3d2b2b"],
    ["--c-muted",  "Второй текст",   "#8c7070"],
    ["--c-accent", "Акцент / марсала","#8b2d3a"],
    ["--c-sage",   "Пыльная роза",   "#c9a0a0"],
    ["--c-blush",  "Нежный розовый", "#e8c4b8"],
    ["--c-line",   "Линии / рамки",  "#d4b8a8"]
  ];

  // Готовые гаммы
  var PRESETS = {
    "Роза и марсала (под декор)": { "--c-bg":"#faf5f0","--c-bg-alt":"#f3ebe2","--c-card":"#fdf9f5","--c-ink":"#3d2b2b","--c-muted":"#8c7070","--c-accent":"#8b2d3a","--c-sage":"#c9a0a0","--c-blush":"#e8c4b8","--c-line":"#d4b8a8" },
    "Пыльная роза": { "--c-bg":"#f7eee9","--c-bg-alt":"#f0e0d8","--c-card":"#fdf7f3","--c-ink":"#5a3f3a","--c-muted":"#9b7d75","--c-accent":"#c08a73","--c-sage":"#b9a394","--c-blush":"#e6c9bd","--c-line":"#dcc2b6" },
    "Крем и шалфей": { "--c-bg":"#f6f1e7","--c-bg-alt":"#efe7d7","--c-card":"#fbf8f1","--c-ink":"#3a4233","--c-muted":"#7c7561","--c-accent":"#b8995a","--c-sage":"#97a585","--c-blush":"#d8c2b6","--c-line":"#c9bda6" },
    "Изумруд и золото": { "--c-bg":"#f3f1ea","--c-bg-alt":"#e7e6dc","--c-card":"#fbfaf4","--c-ink":"#1f3a31","--c-muted":"#5d6b5f","--c-accent":"#c2a14e","--c-sage":"#4f7a63","--c-blush":"#cdd4c2","--c-line":"#bcc2ad" },
    "Лаванда": { "--c-bg":"#f4f1f6","--c-bg-alt":"#e8e3ee","--c-card":"#fbf9fc","--c-ink":"#3f3651","--c-muted":"#7d7390","--c-accent":"#9a82b8","--c-sage":"#a9a2c0","--c-blush":"#d8cce0","--c-line":"#c8bdd6" },
    "Терракота": { "--c-bg":"#f7f0e8","--c-bg-alt":"#efe1d3","--c-card":"#fdf8f1","--c-ink":"#4a3327","--c-muted":"#8a6c58","--c-accent":"#c06b3e","--c-sage":"#a3895f","--c-blush":"#e3c3a6","--c-line":"#d6b896" },
    "Сумерки (тёмная)": { "--c-bg":"#23271f","--c-bg-alt":"#2c3127","--c-card":"#2f342a","--c-ink":"#ece7d8","--c-muted":"#a8a48f","--c-accent":"#cdab63","--c-sage":"#7d9070","--c-blush":"#b09a8c","--c-line":"#4a4f3f" },
    "Бордо и золото": { "--c-bg":"#faf6f1","--c-bg-alt":"#f0e8de","--c-card":"#fdf9f4","--c-ink":"#2d1a1a","--c-muted":"#7a5c5c","--c-accent":"#7a1b2d","--c-sage":"#c4a265","--c-blush":"#dbb8a8","--c-line":"#ccb49e" }
  };

  var state = {};
  VARS.forEach(function (v) { state[v[0]] = v[2]; });

  var iframe = document.getElementById("preview");
  var fieldsEl = document.getElementById("fields");
  var presetsEl = document.getElementById("presets");
  var panel = document.getElementById("panel");
  var toast = document.getElementById("toast");

  /* ---- построить поля цветов (без innerHTML — безопасно) ---- */
  VARS.forEach(function (v) {
    var key = v[0];
    var row = document.createElement("div");
    row.className = "field";

    var label = document.createElement("label");
    label.textContent = v[1];

    var br = document.createElement("br");
    label.appendChild(br);

    var code = document.createElement("span");
    code.className = "code";
    code.dataset.code = key;
    code.textContent = v[2];
    label.appendChild(code);

    var input = document.createElement("input");
    input.type = "color";
    input.value = v[2];
    input.addEventListener("input", function () {
      state[key] = input.value;
      code.textContent = input.value;
      applyVar(key, input.value);
    });
    input.dataset.key = key;

    row.appendChild(label);
    row.appendChild(input);
    fieldsEl.appendChild(row);
  });

  /* ---- готовые гаммы (без innerHTML — безопасно) ---- */
  Object.keys(PRESETS).forEach(function (name) {
    var p = PRESETS[name];
    var dot = document.createElement("div");
    dot.className = "preset";
    dot.title = name;

    // Создаём элемент <i> с градиентом безопасно через style
    var indicator = document.createElement("i");
    indicator.style.background = "linear-gradient(135deg," +
      p["--c-bg"] + " 0 33%," + p["--c-accent"] + " 33% 66%," + p["--c-ink"] + " 66%)";
    dot.appendChild(indicator);

    dot.addEventListener("click", function () { applyPreset(p); });
    presetsEl.appendChild(dot);
  });

  /* ---- применение цветов ---- */
  function applyVar(key, val) {
    var doc = iframe.contentDocument;
    if (doc) doc.documentElement.style.setProperty(key, val);
  }
  function applyAll() {
    Object.keys(state).forEach(function (k) { applyVar(k, state[k]); });
  }
  function applyPreset(p) {
    Object.keys(p).forEach(function (k) {
      state[k] = p[k];
      applyVar(k, p[k]);
      var inp = fieldsEl.querySelector('input[data-key="' + k + '"]');
      if (inp) { inp.value = p[k]; }
      var codeEl = fieldsEl.querySelector('.code[data-code="' + k + '"]');
      if (codeEl) codeEl.textContent = p[k];
    });
  }

  // применить, когда iframe загрузится
  iframe.addEventListener("load", applyAll);

  /* ---- текст палитры ---- */
  function paletteText() {
    var lines = ["Палитра свадьбы (Сергей и Юлия):", ""];
    VARS.forEach(function (v) { lines.push(v[1] + ": " + state[v[0]] + "  (" + v[0] + ")"); });
    lines.push("", "Превью с этой палитрой:");
    lines.push(location.origin + location.pathname.replace(/demo\.html$/, "index.html") + "?p=" + encodePalette());
    return lines.join("\n");
  }
  function encodePalette() {
    var json = JSON.stringify(state);
    // Кодируем UTF-8 в base64
    var bytes = new TextEncoder().encode(json);
    var binary = "";
    for (var i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.classList.remove("show"); }, 3200);
  }

  /* ---- кнопки ---- */
  document.getElementById("reset").addEventListener("click", function () {
    var def = {};
    VARS.forEach(function (v) { def[v[0]] = v[2]; });
    applyPreset(def);
    showToast("Сброшено к исходной палитре");
  });

  document.getElementById("copy").addEventListener("click", function () {
    var text = paletteText();
    copyText(text);
    showToast("Коды цветов скопированы");
  });

  var reopen = document.getElementById("reopen");
  document.getElementById("hide").addEventListener("click", function () {
    panel.classList.add("hidden");
    reopen.classList.add("show");
  });
  reopen.addEventListener("click", function () {
    panel.classList.remove("hidden");
    reopen.classList.remove("show");
  });

  /* ---- отправка в Telegram ---- */
  // TODO(security): Telegram bot token exposed in client-side code.
  // This is acceptable for a static wedding invitation site where the bot
  // only sends messages to the organizer. For production apps, use a BFF proxy.
  document.getElementById("send").addEventListener("click", function () {
    var TG = window.TG || {};
    var text = paletteText();

    if (TG.botToken && TG.chatId) {
      var url = "https://api.telegram.org/bot" + TG.botToken + "/sendMessage";
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TG.chatId, text: text, disable_web_page_preview: false })
      })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.ok) showToast("Отправлено в Telegram ✓");
        else { copyText(text); showToast("Не удалось отправить. Палитра скопирована."); }
      })
      .catch(function () { copyText(text); showToast("Нет связи. Палитра скопирована."); });
    } else {
      // запасной вариант: скопировать + открыть Telegram
      copyText(text);
      if (TG.fallbackUsername) {
        showToast("Палитра скопирована — вставьте её в чат");
        window.open("https://t.me/" + TG.fallbackUsername, "_blank", "noopener");
      } else {
        showToast("Палитра скопирована. Настройте Telegram в demo-config.js");
      }
    }
  });

  /* ---- копирование с фолбэком ---- */
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () { legacyCopy(text); });
    } else { legacyCopy(text); }
  }
  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) { /* игнор */ }
    document.body.removeChild(ta);
  }
})();
