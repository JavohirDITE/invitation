/* ============================================================
   Пригласительное — логика страницы
   ============================================================ */
(function () {
  "use strict";
  var CFG = window.WEDDING || {};

  /* -------- 0. Применить палитру из URL (для конструктора demo) -------- */
  applyPaletteFromURL();

  /* -------- 1. Конверт: полноэкранный, открытие ТОЛЬКО по нажатию -------- */
  var stage = document.getElementById("stage");
  var site = document.getElementById("site");
  var opened = false;

  // Режим предпросмотра (?skipIntro=1) — сразу показать сайт без конверта
  var SKIP_INTRO = new URLSearchParams(location.search).get("skipIntro") === "1";
  if (SKIP_INTRO) {
    opened = true;
    if (stage) stage.classList.add("opened");
    if (site) site.classList.add("revealed");
    document.body.classList.remove("locked");
  }

  /* --- Открытие конверта по клику (никакого свайпа) --- */
  function openEnvelope() {
    if (opened) return;
    opened = true;

    // Сайт начинает проявляться сразу — виднеется за раскрывающимся конвертом
    site.classList.add("revealed");
    // Красивая CSS-анимация раскрытия (клапаны отгибаются — класс .is-open)
    stage.classList.add("is-open");
    // Музыка стартует по клику (это разрешённый жест для автоплея)
    revealMusic(true);

    // После завершения раскрытия — прячем сцену и разблокируем скролл
    setTimeout(function () {
      stage.classList.add("opened");
      document.body.classList.remove("locked");
      initRevealObserver();
    }, 1600);
  }

  if (stage && !opened) {
    stage.setAttribute("role", "button");
    stage.setAttribute("tabindex", "0");
    stage.setAttribute("aria-label", "Открыть приглашение");
    stage.addEventListener("click", openEnvelope);
    stage.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEnvelope(); }
    });
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
  if (SKIP_INTRO) { initRevealObserver(); revealMusic(false); }

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

  /* -------- 7. Hero: фото-обложка, имена, дата -------- */
  (function initHero() {
    var hp = document.getElementById("hero-photo");
    if (hp && CFG.heroPhoto) hp.style.backgroundImage = "url('" + CFG.heroPhoto + "')";
    var hn = document.getElementById("hero-names");
    if (hn && CFG.groom && CFG.bride) {
      hn.innerHTML = CFG.groom + ' <span class="amp">&amp;</span> ' + CFG.bride;
    }
    setText("hero-date", CFG.dateShort);
  })();

  /* -------- 8. Календарь -------- */
  (function initCalendar() {
    var cal = document.getElementById("calendar");
    if (!cal || !CFG.calendar) return;
    var mon = CFG.calendar.monthLabel || "";
    (CFG.calendar.days || []).forEach(function (d) {
      var cell = document.createElement("div");
      cell.className = "cal-day" + (d.highlight ? " is-wed" : "");
      cell.innerHTML =
        '<div class="dow">' + (d.dow || "") + '</div>' +
        '<div class="mon">' + mon + '</div>' +
        '<div class="num">' + (d.num || "") + '</div>' +
        (d.highlight
          ? '<svg class="cal-ring" viewBox="0 0 200 150" preserveAspectRatio="none">' +
            '<path d="M158 34 C120 14 70 16 44 42 C20 66 22 104 60 122 C104 142 168 130 178 86 C185 54 152 28 120 26 C150 30 172 50 168 80"/>' +
            '</svg>'
          : '');
      cal.appendChild(cell);
    });
    // Прорисовка круга по реальной длине пути, когда календарь появляется
    var wed = cal.querySelector(".cal-day.is-wed");
    var ringPath = cal.querySelector(".cal-ring path");
    if (ringPath) {
      var len = ringPath.getTotalLength();
      ringPath.style.strokeDasharray = len;
      ringPath.style.strokeDashoffset = len;
    }
    if (wed) {
      var co = new IntersectionObserver(function (ents) {
        ents.forEach(function (e) {
          if (e.isIntersecting) { setTimeout(function () { wed.classList.add("drawn"); }, 400); co.disconnect(); }
        });
      }, { threshold: 0.4 });
      co.observe(cal);
    }
  })();

  /* -------- 9. Тайм-лайн (сердечко едет по линии) -------- */
  (function initTimeline() {
    var tl = document.getElementById("timeline");
    var svg = document.getElementById("timeline-svg");
    var pathBg = document.getElementById("tl-path-bg");
    var path = document.getElementById("tl-path");
    var heart = document.getElementById("tl-heart");
    var eventsBox = document.getElementById("tl-events");
    var data = CFG.timeline || [];
    if (!tl || !data.length) return;

    // создаём блоки событий
    data.forEach(function (ev, i) {
      var el = document.createElement("div");
      el.className = "tl-event " + (i % 2 === 0 ? "left" : "right");
      el.innerHTML =
        '<div class="t-title">' + (ev.title || "") + '</div>' +
        '<div class="t-time">' + (ev.time || "") + '</div>' +
        (ev.note ? '<div class="t-note">' + ev.note + '</div>' : '');
      eventsBox.appendChild(el);
    });
    var eventEls = Array.prototype.slice.call(eventsBox.children);

    var N = data.length;
    var W = 0, H = 0, cx = 0, A = 0, pathLen = 0;

    function waveX(t) { return cx + A * Math.sin(Math.PI * N * t); }

    function layout() {
      W = tl.clientWidth;
      var step = W < 480 ? 150 : 170;
      H = N * step;
      cx = W / 2;
      A = Math.min(W * 0.26, 140);
      tl.style.height = H + "px";
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);

      // строим путь синусоидой
      var d = "", steps = 80;
      for (var k = 0; k <= steps; k++) {
        var t = k / steps;
        var x = waveX(t).toFixed(1);
        var y = (t * H).toFixed(1);
        d += (k === 0 ? "M" : "L") + x + " " + y + " ";
      }
      pathBg.setAttribute("d", d);
      path.setAttribute("d", d);
      pathLen = path.getTotalLength();
      path.style.strokeDasharray = pathLen;

      // позиционируем события по вертикали
      eventEls.forEach(function (el, i) {
        el.style.top = (((i + 0.5) / N) * H - 28) + "px";
      });

      update();
    }

    function update() {
      var rect = tl.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      // Сердечко «ждёт» в начале: прогресс стартует только когда верх
      // тайм-лайна поднимется чуть выше середины экрана (45% vh),
      // и завершается, когда низ дойдёт до 75% vh — сердце плавно опускается.
      var startTop = vh * 0.45;
      var L = H - vh * 0.30;
      if (L < 240) L = 240;
      var p = (startTop - rect.top) / L;
      p = Math.max(0, Math.min(1, p));

      // сердечко
      heart.style.top = (p * H) + "px";
      heart.style.left = waveX(p) + "px";
      // линия рисуется до позиции сердца
      path.style.strokeDashoffset = (pathLen * (1 - p)).toString();

      // появление событий — когда сердце поравнялось с ними
      eventEls.forEach(function (el, i) {
        var thr = (i + 0.5) / N;
        if (p >= thr - 0.06) el.classList.add("in");
      });
    }

    layout();
    window.addEventListener("resize", debounce(layout, 150));
    window.addEventListener("scroll", update, { passive: true });
  })();

  /* -------- 10. Фото площадки -------- */
  (function initVenuePhoto() {
    var vp = document.getElementById("venue-photo");
    if (vp && v && v.photo) vp.style.backgroundImage = "url('" + v.photo + "')";
    else if (vp) vp.style.display = "none";
  })();

  /* -------- 11. Дресс-код -------- */
  (function initDresscode() {
    var dc = CFG.dresscode || {};
    setText("dc-text", dc.text);
    var box = document.getElementById("dc-colors");
    if (box && dc.colors) {
      dc.colors.forEach(function (c) {
        var dot = document.createElement("div");
        dot.className = "dc-dot";
        dot.style.background = c;
        dot.title = c;
        box.appendChild(dot);
      });
    }
  })();

  /* -------- 12. Музыка -------- */
  var audio = document.getElementById("bg-music");
  var musicBtn = document.getElementById("music-toggle");
  var musicIcon = document.getElementById("music-icon");
  var ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';

  function setMusicUI(playing) {
    if (!musicBtn) return;
    if (playing) { musicBtn.classList.remove("paused"); musicIcon.innerHTML = ICON_PAUSE; }
    else { musicBtn.classList.add("paused"); musicIcon.innerHTML = ICON_PLAY; }
  }
  function playMusic() {
    if (!audio || !CFG.music) return Promise.reject();
    return audio.play();
  }

  function revealMusic(tryAutoplay) {
    if (!musicBtn) return;
    musicBtn.hidden = false;
    if (!CFG.music) {
      // музыки нет — показываем кнопку в состоянии «выключено», без действия звука
      musicBtn.classList.add("show", "paused");
      musicIcon.innerHTML = ICON_PLAY;
      return;
    }
    audio.src = CFG.music;
    musicBtn.classList.add("show");
    if (tryAutoplay && CFG.musicOnByDefault) {
      playMusic().then(function () { setMusicUI(true); })
                 .catch(function () { setMusicUI(false); });
    } else {
      setMusicUI(false);
    }
  }

  if (musicBtn) {
    musicBtn.addEventListener("click", function () {
      if (!CFG.music) return; // нечего играть
      if (audio.paused) { playMusic().then(function () { setMusicUI(true); }).catch(function () {}); }
      else { audio.pause(); setMusicUI(false); }
    });
  }
  // В режиме предпросмотра (skipIntro) показываем кнопку музыки без автоплея
  if (SKIP_INTRO) revealMusic(false);

  /* ============================================================
     Хелперы
     ============================================================ */
  function setText(id, val) {
    var el = document.getElementById(id);
    if (el && val !== undefined && val !== null && val !== "") el.textContent = val;
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function debounce(fn, ms) {
    var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  // Открыть карты — на телефоне через geo:/maps: (системный выбор приложений),
  // на десктопе — Google Maps в новой вкладке (geo: на ПК не обрабатывается)
  function openMaps(venue) {
    // Если задана прямая ссылка на место — открываем именно её (самый точный вариант)
    if (venue.mapUrl) {
      window.open(venue.mapUrl, "_blank", "noopener");
      return;
    }

    var hasCoords = venue.lat != null && venue.lng != null;
    var ua = navigator.userAgent || "";
    var isIOS = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
    var isAndroid = /Android/.test(ua);
    var isMobile = isIOS || isAndroid;

    // --- Десктоп: открываем веб-карту в новой вкладке ---
    if (!isMobile) {
      var q = venue.query
        ? encodeURIComponent(venue.query)
        : hasCoords ? (venue.lat + "," + venue.lng)
        : encodeURIComponent(venue.name || "");
      window.open("https://www.google.com/maps/search/?api=1&query=" + q, "_blank", "noopener");
      return;
    }

    // --- Мобильные ---
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
        // Android: geo: URI вызывает окно выбора приложений
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
