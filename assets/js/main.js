(function () {
  var html = document.documentElement;
  var I18N = window.XTC_I18N;
  var t = function (k, fb) { var v = I18N && I18N.t(k); return v == null ? (fb || "") : v; };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---------- Loader ---------- */
  var loader = document.getElementById("loader");
  var started = performance.now();
  function finishLoading() {
    var wait = Math.max(0, 550 - (performance.now() - started));
    setTimeout(function () {
      if (loader) loader.classList.add("is-done");
      html.classList.add("is-ready");
      try { sessionStorage.setItem("xtc-seen", "1"); } catch (e) {}
    }, html.classList.contains("no-loader") ? 0 : wait);
  }
  var safety = setTimeout(finishLoading, 1800);
  Promise.resolve(I18N && I18N.ready).then(function () {
    if (document.readyState === "complete") { clearTimeout(safety); finishLoading(); }
    else window.addEventListener("load", function () { clearTimeout(safety); finishLoading(); }, { once: true });
  });

  /* ---------- Theme ---------- */
  var toggle = document.getElementById("theme-toggle");
  function setTheme(theme, persist) {
    html.classList.add("theme-anim");
    html.setAttribute("data-theme", theme);
    if (persist) { try { localStorage.setItem("xtc-theme", theme); } catch (e) {} }
    document.dispatchEvent(new CustomEvent("xtc:theme", { detail: { theme: theme } }));
    setTimeout(function () { html.classList.remove("theme-anim"); }, 500);
  }
  if (toggle) toggle.addEventListener("click", function () {
    setTheme(html.getAttribute("data-theme") === "light" ? "dark" : "light", true);
  });
  var sys = window.matchMedia("(prefers-color-scheme: light)");
  var onSys = function (e) {
    var stored = null; try { stored = localStorage.getItem("xtc-theme"); } catch (x) {}
    if (!stored) setTheme(e.matches ? "light" : "dark", false);
  };
  if (sys.addEventListener) sys.addEventListener("change", onSys); else if (sys.addListener) sys.addListener(onSys);

  /* ---------- Navigation ---------- */
  var nav = document.getElementById("nav");
  var menuBtn = document.getElementById("menu-toggle");
  var links = document.getElementById("nav-links");
  function closeMenu() {
    if (!nav) return;
    nav.classList.remove("is-open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
  }
  if (menuBtn) menuBtn.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  if (links) links.addEventListener("click", function (e) { if (e.target.closest("a")) { closeMenu(); closeDd(false); } });

  // Projects dropdown: click or Enter/Space toggles, ArrowDown opens and focuses the first item,
  // arrows move between items, Escape closes and returns focus to the button, Tab out closes it.
  var dd = document.querySelector(".navdd"), ddBtn = dd && dd.querySelector(".navdd__btn");
  var ddItems = dd ? Array.prototype.slice.call(dd.querySelectorAll(".navdd__menu a")) : [];
  function openDd(focusFirst) {
    if (!dd) return;
    dd.classList.add("is-open"); ddBtn.setAttribute("aria-expanded", "true");
    // the menu is still visibility:hidden in this frame, so move focus once it has rendered
    if (focusFirst && ddItems[0]) requestAnimationFrame(function () { requestAnimationFrame(function () { ddItems[0].focus(); }); });
  }
  function closeDd(returnFocus) {
    if (!dd || !dd.classList.contains("is-open")) return;
    dd.classList.remove("is-open"); ddBtn.setAttribute("aria-expanded", "false");
    if (returnFocus) ddBtn.focus();
  }
  if (ddBtn) {
    ddBtn.addEventListener("click", function () { dd.classList.contains("is-open") ? closeDd(false) : openDd(false); });
    ddBtn.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); openDd(true); }
    });
    dd.addEventListener("keydown", function (e) {
      var i = ddItems.indexOf(document.activeElement);
      if (e.key === "Escape") { e.stopPropagation(); closeDd(true); }
      else if (i > -1 && e.key === "ArrowDown") { e.preventDefault(); ddItems[(i + 1) % ddItems.length].focus(); }
      else if (i > -1 && e.key === "ArrowUp") { e.preventDefault(); (i === 0 ? ddBtn : ddItems[i - 1]).focus(); }
      else if (i > -1 && e.key === "Home") { e.preventDefault(); ddItems[0].focus(); }
      else if (i > -1 && e.key === "End") { e.preventDefault(); ddItems[ddItems.length - 1].focus(); }
    });
    dd.addEventListener("focusout", function (e) { if (!dd.contains(e.relatedTarget) && window.innerWidth > 960) closeDd(false); });
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeDd(true); closeMenu(); } });
  document.addEventListener("click", function (e) {
    if (dd && dd.classList.contains("is-open") && !dd.contains(e.target)) closeDd(false);
    if (nav && nav.classList.contains("is-open") && !nav.contains(e.target)) closeMenu();
  });

  // active section indicator
  var navAnchors = links ? Array.prototype.slice.call(links.querySelectorAll('a[href^="#"]')) : [];
  var sectionMap = { home: "home", work: "work", building: "building", capabilities: "capabilities", playground: "playground", about: "about", experience: "about", contact: "contact" };
  if (navAnchors.length && "IntersectionObserver" in window) {
    var visible = {};
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting ? en.intersectionRatio : 0; });
      var best = null, bestR = 0;
      Object.keys(visible).forEach(function (id) { if (visible[id] > bestR) { bestR = visible[id]; best = id; } });
      if (!best) return;
      var target = "#" + (sectionMap[best] || best);
      navAnchors.forEach(function (a) {
        var on = a.getAttribute("href") === target;
        a.classList.toggle("is-active", on);
        if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
    }, { rootMargin: "-35% 0px -55% 0px", threshold: [0, .01, .2, .5] });
    Object.keys(sectionMap).forEach(function (id) { var el = document.getElementById(id); if (el) spy.observe(el); });
  }

  /* ---------- Scroll: nav state, progress, back-to-top ---------- */
  var progress = document.getElementById("progress");
  var toTop = document.getElementById("to-top");
  var ticking = false;
  function onScroll() {
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (nav) nav.classList.toggle("is-scrolled", y > 12);
    if (progress) progress.style.transform = "scaleX(" + (max > 0 ? Math.min(y / max, 1) : 0) + ")";
    if (toTop) toTop.classList.toggle("is-visible", y > window.innerHeight * 0.9);
    ticking = false;
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    var first = document.querySelector(".skip"); if (first) first.focus({ preventScroll: true });
  });

  /* ---------- Reveal on scroll ---------- */
  function observeReveals(scope) {
    var els = (scope || document).querySelectorAll(".reveal:not(.is-in)");
    if (reduce || !("IntersectionObserver" in window)) { els.forEach(function (el) { el.classList.add("is-in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  }
  observeReveals();

  /* ---------- Project index: hover previews ---------- */
  var preview = document.getElementById("preview");
  var index = document.getElementById("project-index");
  if (preview && index && window.matchMedia("(hover: hover)").matches) {
    var px = 0, py = 0, raf = 0;
    var place = function () { raf = 0; preview.style.setProperty("--px", (px + 28) + "px"); preview.style.setProperty("--py", (py - 150) + "px"); };
    index.addEventListener("pointermove", function (e) { px = Math.min(e.clientX, window.innerWidth - 270); py = Math.max(e.clientY, 170); if (!raf) raf = requestAnimationFrame(place); });
    index.querySelectorAll(".index__row").forEach(function (row) {
      row.addEventListener("pointerenter", function () {
        var src = row.getAttribute("data-preview");
        if (src) preview.innerHTML = '<img src="' + src + '" alt="">';
        else preview.innerHTML = '<div class="preview__none"><b>' + esc(row.querySelector(".index__name").textContent) + "</b><span>" + esc(t("ui.noVisual", "Visuals not published yet")) + "</span></div>";
        preview.classList.add("is-on");
      });
      row.addEventListener("pointerleave", function () { preview.classList.remove("is-on"); });
    });
  }

  /* ---------- Case files (dialogs, deep linkable as #case-id) ---------- */
  var openCase = null;
  function showCase(id, push) {
    var dlg = document.getElementById("case-" + id);
    if (!dlg || !dlg.showModal) return false;
    if (openCase && openCase !== dlg) openCase.close();
    if (!dlg.open) dlg.showModal();
    openCase = dlg;
    dlg.querySelector(".casefile__body").scrollTop = 0;
    if (push !== false && location.hash !== "#case-" + id) history.pushState(null, "", "#case-" + id);
    return true;
  }
  document.addEventListener("click", function (e) {
    var trg = e.target.closest && e.target.closest("[data-case]");
    if (trg && showCase(trg.getAttribute("data-case"))) { e.preventDefault(); return; }
    var close = e.target.closest && e.target.closest(".casefile [data-close]");
    if (close) close.closest("dialog").close();
  });
  document.querySelectorAll(".casefile").forEach(function (dlg) {
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", function () {
      if (openCase === dlg) openCase = null;
      if (location.hash === "#" + dlg.id) history.replaceState(null, "", location.pathname + location.search);
    });
  });
  var MOVED = { "steal-the-moon": "steal-the-moon", "ai-studio": "ai-studio", "bookverse": "bookverse", "land": "ai-land", "anthony": "anthony-studios", "fintech": "fintech" };
  function caseFromHash() {
    var m = /^#case-(.+)$/.exec(location.hash);
    if (m && !document.getElementById("case-" + m[1]) && MOVED[m[1]]) { location.replace((html.getAttribute("data-root") || "./") + "projects/" + MOVED[m[1]] + ".html"); return; }
    if (m) showCase(m[1], false);
    else if (openCase) openCase.close();
  }
  window.addEventListener("hashchange", caseFromHash);
  window.addEventListener("popstate", caseFromHash);
  caseFromHash();

  /* ---------- PitchIT live demo (loads only on request) ---------- */
  document.querySelectorAll("[data-demo]").forEach(function (wrap) {
    var shell = wrap.querySelector(".demo"), screen = wrap.querySelector(".demo__screen");
    var shots = Array.prototype.slice.call(screen.querySelectorAll(":scope > img"));
    var dots = wrap.querySelector(".demo__dots"), cur = 0, timer = null, frame = null;
    function go(i) {
      cur = (i + shots.length) % shots.length;
      shots.forEach(function (im, k) { im.classList.toggle("is-on", k === cur); });
      if (dots) dots.querySelectorAll("button").forEach(function (b, k) { b.setAttribute("aria-pressed", String(k === cur)); });
    }
    if (dots && shots.length > 1) {
      shots.forEach(function (im, k) {
        var b = document.createElement("button"); b.type = "button";
        b.setAttribute("aria-label", im.alt); b.setAttribute("aria-pressed", String(k === 0));
        b.addEventListener("click", function () { go(k); stopCycle(); });
        dots.appendChild(b);
      });
      document.addEventListener("xtc:lang", function () { dots.querySelectorAll("button").forEach(function (b, k) { b.setAttribute("aria-label", shots[k].alt); }); });
    }
    function stopCycle() { clearInterval(timer); timer = null; }
    if (!reduce && shots.length > 1 && "IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        if (en[0].isIntersecting && !frame && !timer) timer = setInterval(function () { go(cur + 1); }, 3200);
        else if (!en[0].isIntersecting) stopCycle();
      }, { threshold: 0.3 }).observe(shell);
    }
    var start = wrap.querySelector(".demo__start"), stop = wrap.querySelector(".demo__stop");
    if (start) start.addEventListener("click", function () {
      stopCycle();
      shell.classList.add("is-loading");
      frame = document.createElement("iframe");
      frame.src = wrap.getAttribute("data-demo");
      frame.title = t("pitchit.frameTitle", "PitchIT interactive demo");
      frame.setAttribute("allow", "clipboard-write");
      var loading = wrap.querySelector(".demo__loading");
      var failed = function () {
        if (!frame) return;
        frame.remove(); frame = null;
        shell.classList.remove("is-loading", "is-live"); wrap.classList.remove("is-live");
        var note = wrap.querySelector(".demo__launch small");
        if (note) note.textContent = t("pitchit.loadErr", "The demo could not start here. Try again, or open it full screen.");
        if (start) start.focus();
      };
      var guard = setTimeout(failed, 25000);
      frame.addEventListener("load", function () {
        clearTimeout(guard);
        setTimeout(function () { shell.classList.remove("is-loading"); shell.classList.add("is-live"); wrap.classList.add("is-live"); }, 900);
      });
      frame.addEventListener("error", function () { clearTimeout(guard); failed(); });
      screen.appendChild(frame);
    });
    if (stop) stop.addEventListener("click", function () {
      if (frame) { frame.remove(); frame = null; }
      shell.classList.remove("is-live", "is-loading"); wrap.classList.remove("is-live");
      if (start) start.focus();
    });
  });

  /* ---------- Playground: echo button ---------- */
  var echoBtn = document.getElementById("send-echo");
  if (echoBtn) echoBtn.addEventListener("click", function () {
    var r = echoBtn.getBoundingClientRect();
    if (window.XTC_ECHO) window.XTC_ECHO(r.left + r.width / 2, r.top + r.height / 2, 1.6);
  });

  /* ---------- Playground: noughts and crosses ---------- */
  var ttt = document.getElementById("ttt");
  if (ttt) {
    var board = ttt.querySelector(".ttt__board"), statusEl = ttt.querySelector(".ttt__status");
    var cells = [], state, over, level = "easy", score = { x: 0, o: 0, d: 0 }, msgKey = "play.yourMove";
    var LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (var c = 0; c < 9; c++) {
      var b = document.createElement("button"); b.type = "button"; b.setAttribute("data-i", c);
      board.appendChild(b); cells.push(b);
    }
    var winner = function (s) {
      for (var i = 0; i < LINES.length; i++) { var l = LINES[i]; if (s[l[0]] && s[l[0]] === s[l[1]] && s[l[1]] === s[l[2]]) return { p: s[l[0]], line: l }; }
      return s.indexOf(null) < 0 ? { p: "d" } : null;
    };
    var minimax = function (s, player) {
      var w = winner(s);
      if (w) return { v: w.p === "O" ? 10 : w.p === "X" ? -10 : 0 };
      var best = { v: player === "O" ? -99 : 99, i: -1 };
      for (var i = 0; i < 9; i++) if (!s[i]) {
        s[i] = player; var r = minimax(s, player === "O" ? "X" : "O"); s[i] = null;
        var v = r.v - (r.v > 0 ? 1 : r.v < 0 ? -1 : 0);
        if (player === "O" ? v > best.v : v < best.v) best = { v: v, i: i };
      }
      return best;
    };
    var label = function (i) { return t("play.cell", "Square") + " " + (i + 1) + (state[i] ? ", " + state[i] : ""); };
    var render = function () {
      cells.forEach(function (b, i) { b.textContent = state[i] || ""; b.setAttribute("data-v", state[i] || ""); b.disabled = over || !!state[i]; b.setAttribute("aria-label", label(i)); });
      statusEl.textContent = t(msgKey);
      ["x", "o", "d"].forEach(function (k) { ttt.querySelector('[data-score="' + k + '"]').textContent = score[k]; });
    };
    var finish = function (w) {
      over = true;
      if (w.line) w.line.forEach(function (i) { cells[i].classList.add("win"); });
      if (w.p === "X") { score.x++; msgKey = "play.win"; } else if (w.p === "O") { score.o++; msgKey = "play.lose"; } else { score.d++; msgKey = "play.draw"; }
    };
    var reset = function () { state = [null,null,null,null,null,null,null,null,null]; over = false; msgKey = "play.yourMove"; cells.forEach(function (b) { b.classList.remove("win"); }); render(); };
    board.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b || over) return;
      var i = +b.getAttribute("data-i"); if (state[i]) return;
      state[i] = "X"; var w = winner(state);
      if (w) { finish(w); render(); return; }
      over = true; msgKey = "play.thinking"; render();
      setTimeout(function () {
        var free = []; state.forEach(function (v, k) { if (!v) free.push(k); });
        var move = level === "easy" && Math.random() < 0.55 ? free[Math.floor(Math.random() * free.length)] : minimax(state.slice(), "O").i;
        state[move] = "O"; over = false; msgKey = "play.yourMove";
        var w2 = winner(state); if (w2) finish(w2);
        render();
        var next = cells.filter(function (c) { return !c.disabled; })[0]; if (next && document.activeElement && document.activeElement.disabled) next.focus();
      }, reduce ? 0 : 380);
    });
    ttt.querySelectorAll("[data-level]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        level = btn.getAttribute("data-level");
        ttt.querySelectorAll("[data-level]").forEach(function (o) { o.setAttribute("aria-pressed", String(o === btn)); });
        reset();
      });
    });
    ttt.querySelector("[data-ttt-reset]").addEventListener("click", reset);
    document.addEventListener("xtc:lang", render);
    reset();
  }

  /* ---------- Page transition between internal pages ---------- */
  if (!reduce) {
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || a.target || a.hasAttribute("download")) return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin || /\.(pdf|png|webp|jpg)$/i.test(url.pathname) || url.pathname.indexOf("/demo/") >= 0) return;
      if (url.pathname === location.pathname) return;
      e.preventDefault();
      html.classList.add("is-leaving");
      setTimeout(function () { location.href = url.href; }, 280);
    });
    window.addEventListener("pageshow", function () { html.classList.remove("is-leaving"); });
  }

  /* ---------- Contact form (Netlify Forms) ---------- */
  var form = document.getElementById("contact-form");
  if (form) {
    var status = document.getElementById("form-status");
    var submit = form.querySelector('[type="submit"]');
    var setStatus = function (msg, kind, allowHtml) {
      status.className = "form__status" + (kind ? " is-" + kind : "");
      if (allowHtml) status.innerHTML = msg; else status.textContent = msg;
    };
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var bad = null;
      ["name", "email", "message"].forEach(function (n) {
        var f = form.elements[n];
        var ok = f.value.trim() !== "" && (n !== "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim()));
        f.setAttribute("aria-invalid", String(!ok));
        if (!ok && !bad) bad = f;
      });
      if (bad) { setStatus(t("contact.errFields", "Please fill in every field with a valid email."), "err"); bad.focus(); return; }
      submit.setAttribute("aria-busy", "true");
      setStatus(t("contact.sending", "Sending…"), "");
      var body = new URLSearchParams(new FormData(form)).toString();
      var ctrl = window.AbortController ? new AbortController() : null;
      var limit = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
      fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body, signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) { clearTimeout(limit); if (!r.ok) throw new Error(r.status); })
        .then(function () { form.reset(); setStatus(t("contact.ok", "Message sent. I'll reply by email soon."), "ok"); form.classList.add("is-sent"); setTimeout(function () { form.classList.remove("is-sent"); }, 1600); })
        .catch(function () {
          var mail = "mailto:obichukwudavid15@gmail.com?subject=" + encodeURIComponent("Portfolio enquiry from " + form.elements.name.value) + "&body=" + encodeURIComponent(form.elements.message.value);
          setStatus(esc(t("contact.err", "The message couldn't be sent from this page.")) + ' <a href="' + mail + '">' + esc(t("contact.errMail", "Send it by email instead")) + "</a>.", "err", true);
        })
        .finally(function () { clearTimeout(limit); submit.removeAttribute("aria-busy"); });
    });
    form.addEventListener("input", function (e) { if (e.target.getAttribute("aria-invalid") === "true" && e.target.value.trim()) e.target.removeAttribute("aria-invalid"); });
  }

  /* ---------- Lightbox for screenshots ---------- */
  var shotLinks = document.querySelectorAll("a[data-lightbox]");
  if (shotLinks.length && window.HTMLDialogElement) {
    var sprite = (html.getAttribute("data-root") || "./") + "assets/img/icons.svg#";
    var lb = document.createElement("dialog");
    lb.className = "lb";
    lb.innerHTML =
      '<div class="lb__bar"><button type="button" class="icon-btn lb__close" data-i18n-attr="aria-label:ui.close" aria-label="Close"><svg aria-hidden="true"><use href="' + sprite + 'i-close"/></svg></button></div>' +
      '<div class="lb__stage"><button type="button" class="icon-btn lb__prev" data-i18n-attr="aria-label:ui.prev" aria-label="Previous image"><svg aria-hidden="true"><use href="' + sprite + 'i-arrow"/></svg></button>' +
      '<figure class="lb__fig"><img class="lb__img" alt=""></figure>' +
      '<button type="button" class="icon-btn lb__next" data-i18n-attr="aria-label:ui.next" aria-label="Next image"><svg aria-hidden="true"><use href="' + sprite + 'i-arrow"/></svg></button></div>' +
      '<p class="lb__cap" aria-live="polite"></p>';
    document.body.appendChild(lb);
    if (I18N) I18N.apply(lb);
    var lbImg = lb.querySelector(".lb__img"), lbCap = lb.querySelector(".lb__cap");
    var group = [], idx = 0, opener = null;
    var captionFor = function (a) {
      var li = a.closest("li, figure");
      var cap = li && li.querySelector(".screens__cap, .house__phase, .haunt-cap");
      var house = a.closest(".house");
      var parts = [];
      if (house) parts.push(house.querySelector(".house__name").textContent.trim());
      if (cap) parts.push(cap.textContent.replace(/\s+/g, " ").trim());
      return parts.join(" · ");
    };
    var show = function (i) {
      idx = (i + group.length) % group.length;
      var a = group[idx], thumb = a.querySelector("img");
      lbImg.src = a.getAttribute("href");
      lbImg.alt = thumb ? thumb.alt : "";
      lbCap.textContent = captionFor(a) + (group.length > 1 ? "  (" + (idx + 1) + "/" + group.length + ")" : "");
    };
    shotLinks.forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        opener = a;
        group = Array.prototype.slice.call(document.querySelectorAll('a[data-lightbox="' + a.getAttribute("data-lightbox") + '"]'));
        if (group.length > 1) lb.removeAttribute("data-single"); else lb.setAttribute("data-single", "");
        show(group.indexOf(a));
        lb.showModal();
      });
    });
    lb.querySelector(".lb__close").addEventListener("click", function () { lb.close(); });
    lb.querySelector(".lb__prev").addEventListener("click", function () { show(idx - 1); });
    lb.querySelector(".lb__next").addEventListener("click", function () { show(idx + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("lb__fig")) lb.close(); });
    lb.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") show(idx + 1);
      if (e.key === "ArrowLeft") show(idx - 1);
    });
    var sx = null;
    lb.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 50 && group.length > 1) show(idx + (dx < 0 ? 1 : -1));
    });
    lb.addEventListener("close", function () { lbImg.removeAttribute("src"); if (opener) opener.focus(); });
  }

  /* ---------- Loading states for images: a skeleton until each one arrives ---------- */
  document.querySelectorAll(".wcard__thumb img, .frame img, .screens img, .gallery img, .phone img").forEach(function (img) {
    var box = img.parentElement;
    if (img.complete && img.naturalWidth) return;
    box.classList.add("is-loading");
    var done = function () { box.classList.remove("is-loading"); };
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", function () { box.classList.remove("is-loading"); box.classList.add("is-broken"); }, { once: true });
  });

  /* ---------- Copy email, with visible feedback ---------- */
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var label = btn.querySelector("span");
      var ok = function () {
        btn.classList.add("is-done");
        if (label) label.textContent = t("contact.copied", "Copied");
        setTimeout(function () { btn.classList.remove("is-done"); if (label) label.textContent = t("contact.copy", "Copy email"); }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, function () { location.href = "mailto:" + text; });
      else location.href = "mailto:" + text;
    });
  });

  /* ---------- Language switch: show progress while the new language loads ---------- */
  var langSel = document.getElementById("lang-select");
  if (langSel) {
    var switchGuard = 0;
    var endSwitch = function () { clearTimeout(switchGuard); html.classList.remove("is-switching"); };
    langSel.addEventListener("change", function () {
      html.classList.add("is-switching");
      clearTimeout(switchGuard);
      switchGuard = setTimeout(endSwitch, 8000); // never leave the bar running if a language file fails to load
    });
    document.addEventListener("xtc:lang", endSwitch);
  }

  /* ---------- Misc ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
