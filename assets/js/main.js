/* ============================================================
   Пригласительное — логика страницы
   ============================================================ */
(function () {
  "use strict";
  var CFG = window.WEDDING || {};

  /* -------- 0. Применить палитру из URL (для конструктора demo) -------- */
  applyPaletteFromURL();

  /* -------- 1. Конверт: плавное прогрессивное открытие -------- */
  var stage = document.getElementById("stage");
  var envelope = document.getElementById("envelope");
  var site = document.getElementById("site");
  var envFlap = document.getElementById("env-flap");
  var envCover = document.getElementById("env-cover");
  var seal = document.getElementById("seal");
  var letter = document.getElementById("letter");
  var openHint = document.getElementById("open-hint");
  var opened = false;
  var progress = 0;        // 0 = полностью закрыт, 1 = полностью открыт
  var autoAnimating = false;

  // Режим предпросмотра (?skipIntro=1) — сразу показать сайт без конверта
  var SKIP_INTRO = new URLSearchParams(location.search).get("skipIntro") === "1";
  if (SKIP_INTRO) {
    opened = true;
    progress = 1;
    if (stage) stage.classList.add("opened");
    if (site) site.classList.add("revealed");
    document.body.classList.remove("locked");
  }

  /* --- Рендеринг состояния конверта по прогрессу 0→1 --- */
  function renderEnvelope(p) {
    p = Math.max(0, Math.min(1, p));

    // Клапан: поворот 0→180°   (при p: 0→0.5)
    var flapAngle = Math.min(p / 0.5, 1) * 180;
    envFlap.style.transform = "rotateX(" + flapAngle + "deg)";
    if (flapAngle > 90) {
      envFlap.style.zIndex = "1";
    } else {
      envFlap.style.zIndex = "6";
    }

    // Печать: уменьшение + прозрачность  (при p: 0→0.35)
    var sealP = Math.min(p / 0.35, 1);
    var sealScale = 1 - sealP;
    seal.style.transform = "translate(-50%, -50%) scale(" + sealScale + ")";
    seal.style.opacity = (1 - sealP).toString();

    // Крышка (cover): исчезает  (при p: 0.25→0.55)
    var coverP = Math.max(0, Math.min((p - 0.25) / 0.3, 1));
    envCover.style.opacity = (1 - coverP).toString();

    // Письмо: выезжает вверх    (при p: 0.35→0.85)
    var letterP = Math.max(0, Math.min((p - 0.35) / 0.5, 1));
    var letterY = -58 * letterP;
    letter.style.transform = "translateY(" + letterY + "%)";
    if (letterP > 0) {
      letter.style.zIndex = "7";
    } else {
      letter.style.zIndex = "3";
    }

    // Подсказка: скрывается при начале открытия
    if (openHint) {
      openHint.style.opacity = p > 0.05 ? "0" : "1";
    }
  }

  /* --- Завершение открытия (прогресс достиг 1) --- */
  function completeOpen() {
    if (opened) return;
    opened = true;
    removeListeners();
    setTimeout(function () {
      stage.classList.add("opened");
      site.classList.add("revealed");
      document.body.classList.remove("locked");
      // Запускаем reveal-анимации ПОСЛЕ открытия конверта
      initRevealObserver();
    }, 400);
  }

  /* --- Инкремент прогресса (для скролла) --- */
  function incrementProgress(delta) {
    if (opened || autoAnimating) return;
    progress = Math.min(1, progress + delta);
    renderEnvelope(progress);
    if (progress >= 1) completeOpen();
  }

  /* --- Автоматическое открытие (по клику) — плавная анимация 2 секунды --- */
  function autoOpen() {
    if (opened || autoAnimating) return;
    autoAnimating = true;
    var startP = progress;
    var startTime = performance.now();
    var duration = 2000; // мс

    function animate(now) {
      var elapsed = now - startTime;
      var t = Math.min(elapsed / duration, 1);
      // Плавная easing-функция
      var ease = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
      progress = startP + (1 - startP) * ease;
      renderEnvelope(progress);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        progress = 1;
        autoAnimating = false;
        completeOpen();
      }
    }
    requestAnimationFrame(animate);
  }

  /* --- Обработчики событий --- */
  function onWheel(e) {
    // Каждый скролл прибавляет ~5% прогресса
    var delta = Math.abs(e.deltaY) > 50 ? 0.08 : 0.05;
    incrementProgress(delta);
  }

  function onTouchStart(e) {
    envelope._touchY = e.changedTouches[0].screenY;
  }

  function onTouchMove(e) {
    if (!envelope._touchY) return;
    var dy = envelope._touchY - e.changedTouches[0].screenY;
    if (dy > 0) { // только свайп вверх (листание вниз)
      incrementProgress(dy / 600);
      envelope._touchY = e.changedTouches[0].screenY;
    }
  }

  function removeListeners() {
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchmove", onTouchMove);
  }

  if (envelope && !opened) {
    // Рендерим начальное состояние (полностью закрыт)
    renderEnvelope(0);

    // Клик = автоматическое плавное открытие
    envelope.addEventListener("click", autoOpen);
    envelope.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); autoOpen(); }
    });

    // Скролл = ручное постепенное открытие
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
  }

  /* -------- 2. Reveal-анимации при скролле -------- */
  // Отложенный запуск — наблюдатель стартует только ПОСЛЕ открытия конверта,
  // чтобы анимации проигрывались когда пользователь скроллит, а не мгновенно.
  function initRevealObserver() {
    // Небольшая задержка чтобы элементы успели отрисоваться
    setTimeout(function () {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
        });
      }, { threshold: 0.15 });
      document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
    }, 100);
  }
  // Если конверт уже пропущен (skipIntro), запускаем сразу
  if (SKIP_INTRO) { initRevealObserver(); }

  /* -------- 3. Галерея + lightbox -------- */
  var gallery = document.getElementById("gallery");
  var photos = CFG.photos || [];
  if (gallery) {
    photos.forEach(function (src, i) {
      var fig = document.createElement("figure");
      // Каскадная задержка появления каждого фото
      fig.style.setProperty("--gd", (i * 0.1) + "s");
      var img = document.createElement("img");
      img.src = src;
      img.alt = "Фото " + (i + 1);
      // Первые 4 фото грузим сразу, остальные лениво
      if (i < 4) {
        img.loading = "eager";
      } else {
        img.loading = "lazy";
      }
      img.decoding = "async";
      img.dataset.index = i;
      fig.appendChild(img);
      gallery.appendChild(fig);
    });
  }

  var lb = document.getElementById("lightbox");
  var lbImg = document.getElementById("lb-img");
  var lbCounter = document.getElementById("lb-counter");
  var current = 0;

  function showLB(i) {
    current = (i + photos.length) % photos.length;
    // Fade-in эффект для плавной загрузки
    lbImg.classList.add("lb-loading");
    lbImg.src = photos[current];
    lbImg.onload = function () {
      lbImg.classList.remove("lb-loading");
    };
    lb.classList.add("show");
    lb.setAttribute("aria-hidden", "false");
    // Блокировка скролла body
    document.body.classList.add("locked");
    // Обновить счётчик
    if (lbCounter) {
      lbCounter.textContent = (current + 1) + " / " + photos.length;
    }
  }

  function hideLB() {
    lb.classList.remove("show");
    lb.setAttribute("aria-hidden", "true");
    document.body.classList.remove("locked");
  }

  if (gallery) {
    gallery.addEventListener("click", function (e) {
      var t = e.target;
      if (t.tagName === "IMG") showLB(+t.dataset.index);
    });
  }

  if (lb) {
    document.getElementById("lb-close").addEventListener("click", hideLB);
    document.getElementById("lb-next").addEventListener("click", function () { showLB(current + 1); });
    document.getElementById("lb-prev").addEventListener("click", function () { showLB(current - 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) hideLB(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("show")) return;
      if (e.key === "Escape") hideLB();
      if (e.key === "ArrowRight") showLB(current + 1);
      if (e.key === "ArrowLeft") showLB(current - 1);
    });

    // Touch-свайп для лайтбокса — исправление бага #7
    var touchStartX = 0;
    var touchStartY = 0;
    lb.addEventListener("touchstart", function (e) {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].screenX - touchStartX;
      var dy = e.changedTouches[0].screenY - touchStartY;
      // Свайп только если горизонтальное движение больше вертикального
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        if (dx < 0) showLB(current + 1); // свайп влево — следующее
        else showLB(current - 1);        // свайп вправо — предыдущее
      }
    }, { passive: true });
  }

  /* -------- 4. Локация: подстановка + кнопка карты -------- */
  var v = CFG.venue || {};
  setText("venue-name", v.name);
  setText("venue-addr", v.address);

  var mapBtn = document.getElementById("map-btn");
  if (mapBtn) {
    mapBtn.addEventListener("click", function () { openMaps(v); });
  }

  /* -------- 5. Таймер обратного отсчёта -------- */
  var target = CFG.date ? new Date(CFG.date).getTime() : null;
  function tick() {
    if (!target) return;
    var diff = target - Date.now();
    if (diff < 0) diff = 0;
    var d = Math.floor(diff / 86400000);
    var h = Math.floor((diff % 86400000) / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var s = Math.floor((diff % 60000) / 1000);
    setText("cd-days", d);
    setText("cd-hours", pad(h));
    setText("cd-min", pad(m));
    setText("cd-sec", pad(s));
  }
  if (target) { tick(); setInterval(tick, 1000); }

  /* -------- 6. Sparkle-частицы (мерцание хрусталя/свечей) -------- */
  var sparkleContainer = document.getElementById("sparkles");
  if (sparkleContainer && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    // Создаём 20 sparkle-частиц
    for (var si = 0; si < 20; si++) {
      var spark = document.createElement("div");
      spark.className = "sparkle";
      spark.style.left = (Math.random() * 100) + "%";
      spark.style.top = (Math.random() * 100) + "%";
      spark.style.setProperty("--dur", (2 + Math.random() * 4) + "s");
      spark.style.setProperty("--delay", (Math.random() * 5) + "s");
      spark.style.width = (3 + Math.random() * 4) + "px";
      spark.style.height = spark.style.width;
      sparkleContainer.appendChild(spark);
    }
    // Добавляем candle-glow элементы
    for (var ci = 0; ci < 8; ci++) {
      var glow = document.createElement("div");
      glow.className = "candle-glow";
      glow.style.left = (10 + Math.random() * 80) + "%";
      glow.style.top = (20 + Math.random() * 60) + "%";
      glow.style.setProperty("--dur", (2 + Math.random() * 3) + "s");
      glow.style.setProperty("--delay", (Math.random() * 4) + "s");
      sparkleContainer.appendChild(glow);
    }
  }

  /* ============================================================
     Хелперы
     ============================================================ */
  function setText(id, val) {
    var el = document.getElementById(id);
    if (el && val !== undefined && val !== null && val !== "") el.textContent = val;
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  // Открыть карты — использует geo: URI для вызова системного окна выбора приложений
  // (2GIS, Яндекс Карты, Google Maps, Apple Maps и т.д.)
  function openMaps(venue) {
    var hasCoords = venue.lat != null && venue.lng != null;
    var ua = navigator.userAgent || "";
    var isIOS = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));

    if (hasCoords) {
      // geo: URI — вызывает системное окно выбора приложений на Android
      // На iOS geo: тоже работает, но можно усилить через Apple Maps
      var label = venue.name ? encodeURIComponent(venue.name) : "";

      if (isIOS) {
        // iOS: используем geo: URI, который откроет Apple Maps с выбором
        // Если пользователь установил другие карты, iOS предложит выбор
        var iosUrl = "maps:?q=" + (label || (venue.lat + "," + venue.lng)) +
          "&ll=" + venue.lat + "," + venue.lng;
        window.location.href = iosUrl;
      } else {
        // Android + Desktop: geo: URI вызывает окно выбора приложений
        var geoUrl = "geo:" + venue.lat + "," + venue.lng + "?q=" + venue.lat + "," + venue.lng;
        if (label) geoUrl += "(" + label + ")";
        window.location.href = geoUrl;
      }
    } else {
      // Без координат — текстовый поиск через geo:
      var query = venue.query || venue.name || "";
      if (isIOS) {
        window.location.href = "maps:?q=" + encodeURIComponent(query);
      } else {
        window.location.href = "geo:0,0?q=" + encodeURIComponent(query);
      }
    }
  }

  // Применение палитры, переданной через URL (?p=base64json) — для конструктора
  function applyPaletteFromURL() {
    try {
      var params = new URLSearchParams(location.search);
      var p = params.get("p");
      if (!p) return;
      var decoded = atob(p);
      // Декодируем UTF-8
      var bytes = new Uint8Array(decoded.length);
      for (var bi = 0; bi < decoded.length; bi++) {
        bytes[bi] = decoded.charCodeAt(bi);
      }
      var text = new TextDecoder().decode(bytes);
      var obj = JSON.parse(text);
      var root = document.documentElement;
      Object.keys(obj).forEach(function (k) {
        // Принимаем только CSS-переменные вида --c-xxx
        if (/^--c-[a-z]+(-[a-z]+)*$/.test(k)) {
          root.style.setProperty(k, obj[k]);
        }
      });
    } catch (e) { /* игнор */ }
  }
})();
