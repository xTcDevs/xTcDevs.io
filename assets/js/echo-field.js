/*
 * Echo field — the animated background.
 * A quiet dot lattice that ripples outward like sonar.
 * - Echoes fire every few seconds and wherever the visitor clicks empty space.
 * - Only animates while an echo is travelling or the pointer moves; otherwise idle.
 * - Lower density and frame rate on low-power devices; static under reduced motion;
 *   pauses when the tab is hidden.
 */
(function () {
  var canvas = document.getElementById("echo-field");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var lowPower = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  var dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.5);
  var W = 0, H = 0, spacing = 34, dots = [], echoes = [];
  var pointer = { x: -9999, y: -9999, active: false };
  var dotRGB = "196,204,255", ringRGB = "127,227,255", baseAlpha = 0.12;
  var raf = 0, lastFrame = 0, frameGap = lowPower ? 1000 / 30 : 1000 / 60;
  var autoTimer = 0;

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    dotRGB = (cs.getPropertyValue("--dot") || dotRGB).trim();
    ringRGB = (cs.getPropertyValue("--ring") || ringRGB).trim();
    baseAlpha = document.documentElement.getAttribute("data-theme") === "light" ? 0.16 : 0.12;
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    spacing = W < 640 ? 40 : lowPower ? 42 : 34;
    dots = [];
    var ox = (W % spacing) / 2, oy = (H % spacing) / 2;
    for (var y = oy; y <= H; y += spacing) {
      for (var x = ox; x <= W; x += spacing) dots.push(x, y);
    }
    draw(performance.now());
  }

  function echo(x, y, strength) {
    if (reduce.matches) return;
    echoes.push({ x: x, y: y, born: performance.now(), amp: strength || 1 });
    if (echoes.length > 5) echoes.shift();
    kick();
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    var speed = 0.32; // px per ms
    var live = [];
    for (var e = 0; e < echoes.length; e++) {
      var ec = echoes[e];
      var r = Math.max(0, (now - ec.born) * speed);
      var life = 1 - r / (Math.max(W, H) * 0.9);
      if (life > 0) { ec.r = r; ec.life = life; live.push(ec); }
    }
    echoes = live;

    for (var i = 0; i < dots.length; i += 2) {
      var bx = dots[i], by = dots[i + 1], dx = 0, dy = 0, glow = 0;
      for (var k = 0; k < echoes.length; k++) {
        var ex = echoes[k];
        var vx = bx - ex.x, vy = by - ex.y;
        var d = Math.sqrt(vx * vx + vy * vy) || 1;
        var band = d - ex.r;
        if (band > -60 && band < 60) {
          var w = Math.exp(-(band * band) / 700) * ex.life * ex.amp;
          dx += (vx / d) * w * 9;
          dy += (vy / d) * w * 9;
          glow += w;
        }
      }
      if (pointer.active) {
        var px = bx - pointer.x, py = by - pointer.y;
        var pd = px * px + py * py;
        if (pd < 18000) glow += (1 - pd / 18000) * 0.6;
      }
      var a = Math.min(baseAlpha + glow * 0.55, 0.85);
      var s = 1.4 + glow * 1.6;
      ctx.fillStyle = "rgba(" + (glow > 0.05 ? ringRGB : dotRGB) + "," + a.toFixed(3) + ")";
      ctx.fillRect(bx + dx - s / 2, by + dy - s / 2, s, s);
    }

    for (var j = 0; j < echoes.length; j++) {
      var q = echoes[j];
      if (q.r < 1) continue;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(" + ringRGB + "," + (q.life * 0.16 * q.amp).toFixed(3) + ")";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function loop(now) {
    raf = 0;
    if (document.hidden) return;
    if (now - lastFrame >= frameGap) { lastFrame = now; draw(now); }
    if (echoes.length || pointer.moving) raf = requestAnimationFrame(loop);
    pointer.moving = false;
  }

  function kick() { if (!raf && !reduce.matches) raf = requestAnimationFrame(loop); }

  function scheduleAuto() {
    clearTimeout(autoTimer);
    if (reduce.matches) return;
    autoTimer = setTimeout(function () {
      if (!document.hidden) {
        var x = W * (0.15 + Math.random() * 0.7);
        var y = H * (0.15 + Math.random() * 0.6);
        echo(x, y, 0.75);
      }
      scheduleAuto();
    }, 5200 + Math.random() * 2600);
  }

  var interactive = "a,button,input,select,textarea,label,summary,dialog,[role='button'],.card,.showcase,.build,.index,.play__card,.form,.portrait,.ttt";
  document.addEventListener("pointerdown", function (e) {
    if (e.button !== 0 || (e.target.closest && e.target.closest(interactive))) return;
    echo(e.clientX, e.clientY, 1.15);
  }, { passive: true });

  if (window.matchMedia("(hover: hover)").matches) {
    window.addEventListener("pointermove", function (e) {
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; pointer.moving = true;
      kick();
    }, { passive: true });
    document.addEventListener("pointerleave", function () { pointer.active = false; pointer.moving = true; kick(); });
  }

  var rT;
  window.addEventListener("resize", function () { clearTimeout(rT); rT = setTimeout(resize, 150); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) kick(); });
  document.addEventListener("xtc:theme", function () { readColors(); draw(performance.now()); });
  (reduce.addEventListener ? reduce.addEventListener.bind(reduce, "change") : reduce.addListener.bind(reduce))(function () {
    echoes = []; draw(performance.now()); scheduleAuto();
  });

  readColors();
  resize();
  window.XTC_ECHO = echo;
  // first echo from the hero name, after the page has settled
  setTimeout(function () {
    var h = document.querySelector(".hero__title, .pj-title, .nf__code");
    if (h) { var b = h.getBoundingClientRect(); echo(b.left + b.width * 0.3, b.top + b.height / 2, 1); }
    scheduleAuto();
  }, 1100);
})();
