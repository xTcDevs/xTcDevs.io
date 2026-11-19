// Exhibition installations. Each project gets its own installation style; all text on the
// plaques comes from data/museum.json and the locale files, so nothing is hard coded here.
import * as THREE from "three";
import { SPOTS, ROOMS } from "./layout.js";
import { textTexture, imageTexture, noiseTexture, IVORY, EMBER, MUTED, BLUE } from "./textures.js";
import { mergeStatic } from "./world.js";

const ROOT = "../";
const GOLD = new THREE.MeshStandardMaterial({ color: 0xd8a63a, roughness: 0.28, metalness: 1, envMapIntensity: 1.2 });

function box(w, h, d, mat) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); }
function cyl(rt, rb, h, mat, seg = 32) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); }
function plane(w, h, mat) { return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); }

// A screen that slowly crossfades through images. Returns {mesh, update}.
function slideScreen(w, h, urls, { interval = 5.5, frameMat } = {}) {
  const group = new THREE.Group();
  const matA = new THREE.MeshBasicMaterial({ color: 0x0b0c10, toneMapped: false }); // dark until the first image arrives
  const matB = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0 });
  const a = plane(w, h, matA), b = plane(w, h, matB); b.position.z = 0.002;
  group.add(a, b);
  if (frameMat) { const f = box(w + 0.12, h + 0.12, 0.06, frameMat); f.position.z = -0.04; group.add(f); }
  const tex = urls.map((u) => imageTexture(ROOT + u));
  const fit = (m, t) => {
    // cover-fit the image to the screen without stretching
    const img = t.image; if (!img || !img.width) return;
    const sr = w / h, ir = img.width / img.height;
    t.repeat.set(1, 1); t.offset.set(0, 0);
    if (ir > sr) { t.repeat.x = sr / ir; t.offset.x = (1 - t.repeat.x) / 2; } else { t.repeat.y = ir / sr; t.offset.y = (1 - t.repeat.y) / 2; }
    m.map = t; m.color.set(0xffffff); m.needsUpdate = true;
  };
  let i = 0, clock = 0, fading = -1;
  const ready = (k, m) => { const t = tex[k]; if (t.image && t.image.width) fit(m, t); else imageTexture(ROOT + urls[k], (tt) => fit(m, tt)); };
  if (tex.length) ready(0, matA); else matA.color.set(0x07080b);
  return {
    mesh: group,
    update(dt, still) {
      if (tex.length < 2 || still) return;
      clock += dt;
      if (fading < 0 && clock > interval) { fading = 0; ready((i + 1) % tex.length, matB); }
      if (fading >= 0) {
        fading += dt / 1.2; matB.opacity = Math.min(1, fading);
        if (fading >= 1) { i = (i + 1) % tex.length; fit(matA, tex[i]); matB.opacity = 0; fading = -1; clock = 0; }
      }
    },
  };
}

function plaqueLines(p, t) {
  const status = t(`status.${p.status}`);
  return [
    { text: t(`rooms.${p.room}.area`), size: 0.05, weight: 700, color: EMBER, tracking: 0.2, upper: true, gap: 0.03 },
    { text: p.title, size: 0.13, weight: 500, font: "serif", color: IVORY, gap: 0.035, lh: 1.05 },
    { text: `${status}  ·  ${p.cats.map((c) => t(`cats.${c}`)).join(", ")}`, size: 0.045, weight: 600, color: p.concept || p.status === "concept" || p.status === "explore" ? "#9db6ff" : "#ffb08f", gap: 0.03 },
  ];
}

function makePlaque(p, t, w = 1.0, h = 0.42) {
  const tex = textTexture(w, h, plaqueLines(p, t), { bg: "#0b0c10" });
  const mesh = plane(w, h, new THREE.MeshBasicMaterial({ map: tex }));
  return { mesh, redraw: () => tex.redraw(plaqueLines(p, t)) };
}

function pedestal(mats, r = 0.6, h = 1.0) {
  const g = new THREE.Group();
  const body = cyl(r, r * 1.05, h, mats.graphiteStone, 48); body.position.y = h / 2; g.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 1.0, 0.012, 8, 64), mats.ember); rim.rotation.x = Math.PI / 2; rim.position.y = h + 0.002; g.add(rim);
  return g;
}

function bench(mats, w = 2.4, d = 1.0, h = 0.92) {
  const g = new THREE.Group();
  const top = box(w, 0.08, d, mats.travertine); top.position.y = h; g.add(top);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = box(0.05, h, 0.05, mats.bronze); leg.position.set(sx * (w / 2 - 0.08), h / 2, sz * (d / 2 - 0.08)); g.add(leg); }
  const edge = box(w, 0.012, 0.02, mats.ember); edge.position.set(0, h + 0.045, d / 2); g.add(edge);
  return g;
}

function lectern(mats, plaque) {
  const g = new THREE.Group();
  const post = box(0.5, 1.0, 0.36, mats.travertine); post.position.y = 0.5; g.add(post);
  plaque.mesh.scale.setScalar(0.62); plaque.mesh.position.set(0, 1.05, 0.05); plaque.mesh.rotation.x = -0.75; g.add(plaque.mesh);
  return g;
}


// ------------------------------------------------------------- project branding
// The real logo or icon of a project, mounted as a backlit panel in a bronze frame. The image
// is fitted inside the panel at its original proportions (never stretched, cropped or recoloured)
// on the brand's own background colour. Projects without an official logo get a typographic
// nameplate instead: their title and status, set in the museum's type. Returns {group, w, h}.
function brandInstallation(p, mats, t, { maxW = 2.0, maxH = 1.7 } = {}) {
  const g = new THREE.Group();
  const b = p.brand || { kind: "type" };
  if (b.kind === "logo" || b.kind === "icon") {
    const bg = new THREE.MeshBasicMaterial({ color: new THREE.Color(b.bg || "#0b0b0c"), toneMapped: false });
    const backing = plane(maxW, maxH, bg); g.add(backing);
    const frame = box(maxW + 0.14, maxH + 0.14, 0.08, mats.bronze); frame.position.z = -0.05; g.add(frame);
    const glow = box(maxW + 0.3, maxH + 0.3, 0.02, mats.amber); glow.position.z = -0.1; g.add(glow);
    const logoMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, toneMapped: false, opacity: 0 });
    const logo = plane(1, 1, logoMat); logo.position.z = 0.004; g.add(logo);
    imageTexture(ROOT + b.src, (tx) => {
      const img = tx.image; if (!img || !img.width) return;
      // contain fit with a margin so the mark breathes inside its panel
      const pad = b.kind === "icon" ? 0.06 : 0.14;
      const aw = maxW * (1 - pad * 2), ah = maxH * (1 - pad * 2), ir = img.width / img.height;
      const w = ir > aw / ah ? aw : ah * ir, h = ir > aw / ah ? aw / ir : ah;
      logo.scale.set(w, h, 1); logoMat.map = tx; logoMat.opacity = 1; logoMat.needsUpdate = true;
    });
    return { group: g, redraw: () => {} };
  }
  // typographic nameplate (projects without an official logo)
  const lines = () => [
    { text: p.title, size: 0.2, weight: 500, font: "serif", color: IVORY, gap: 0.05, lh: 1.05 },
    { text: t(`status.${p.status}`), size: 0.07, weight: 700, color: PLANNED_STATUS.has(p.status) ? "#9db6ff" : "#ff9a6b", tracking: 0.16, upper: true },
  ];
  const tex = textTexture(maxW, maxH * 0.62, lines(), { bg: "#17171a", pad: 0.14, align: "center" });
  const plate = plane(maxW, maxH * 0.62, new THREE.MeshBasicMaterial({ map: tex })); g.add(plate);
  const frame = box(maxW + 0.1, maxH * 0.62 + 0.1, 0.06, mats.bronze); frame.position.z = -0.04; g.add(frame);
  return { group: g, redraw: () => tex.redraw(lines()) };
}
const PLANNED_STATUS = new Set(["concept", "explore", "prototype", "dev", "ready"]);

// Distance from an exhibit spot back to the wall behind it (for mounting niches and branding).
function wallBehind(spot) {
  const room = ROOMS.find((r) => spot.x >= r.x0 && spot.x <= r.x1 && spot.z <= r.z0 && spot.z >= r.z1);
  if (!room) return 4.6;
  const bx = -Math.sin(spot.face), bz = -Math.cos(spot.face);
  if (Math.abs(bx) > 0.5) return (bx > 0 ? room.x1 - spot.x : spot.x - room.x0) - 0.22;
  return (bz > 0 ? room.z0 - spot.z : spot.z - room.z1) - 0.22;
}

// ------------------------------------------------------------- installation styles
const STYLES = {
  plunger(p, mats, ctx) {
    const g = new THREE.Group();
    g.add(pedestal(mats, 0.62, 1.0));
    const model = new THREE.Group();
    const handle = cyl(0.045, 0.045, 1.0, GOLD); handle.position.y = 0.55; model.add(handle);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), GOLD); cap.position.y = 1.06; model.add(cap);
    const cup = new THREE.Mesh(new THREE.SphereGeometry(0.3, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), GOLD); cup.rotation.x = Math.PI; cup.position.y = 0.26; model.add(cup);
    model.position.y = 1.05; model.rotation.z = 0.18; g.add(model);
    const scr = slideScreen(6.0, 3.375, p.images, { frameMat: mats.darkMetal }); scr.mesh.position.set(0, 2.9, -4.4); g.add(scr.mesh);
    for (const sx of [-1, 1]) { const l = box(0.04, 3.6, 0.04, mats.ember); l.position.set(sx * 3.15, 2.9, -4.35); g.add(l); }
    return { group: g, model, screens: [scr], spin: 0.45, solid: { r: 0.7 }, view: { dist: 3.9, y: 1.9, look: 2.0 } };
  },
  candle(p, mats, ctx) {
    const g = new THREE.Group();
    const base = box(1.2, 1.0, 1.2, mats.stone); base.position.y = 0.5; g.add(base);
    const glass = box(1.0, 1.1, 1.0, mats.glass); glass.position.y = 1.56; g.add(glass);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.0, 1.1, 1.0)), new THREE.LineBasicMaterial({ color: 0xf2ece1, transparent: true, opacity: 0.35 }));
    edges.position.y = 1.56; g.add(edges);
    const model = new THREE.Group();
    const wax = cyl(0.08, 0.09, 0.42, new THREE.MeshStandardMaterial({ color: 0xe9dfcc, roughness: 0.8 })); wax.position.y = 0.21; model.add(wax);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 16), new THREE.MeshBasicMaterial({ color: 0xffb35c })); flame.position.y = 0.5; model.add(flame);
    const dish = cyl(0.17, 0.2, 0.03, mats.metal); model.add(dish);
    model.position.y = 1.02; g.add(model);
    const glow = new THREE.PointLight(0xff9a50, 1.6, 4, 2); glow.position.y = 1.55; g.add(glow);
    // three stills on the wall behind, like evidence photos in a dark corridor
    const shots = p.images.slice(0, 3);
    shots.forEach((u, k) => {
      const s = slideScreen(2.4, 1.11, [u], { frameMat: mats.darkMetal });
      s.mesh.position.set((k - 1) * 2.7, 2.6 + (k === 1 ? 0.35 : 0), -4.4); g.add(s.mesh);
    });
    return { group: g, model, spin: 0, solid: { hw: 0.65, hd: 0.65 }, view: { dist: 2.6, y: 1.7, look: 1.4 },
      update(time) { const f = 1 + Math.sin(time * 13) * 0.08 + Math.sin(time * 7.3) * 0.05; flame.scale.set(1, f, 1); glow.intensity = 1.4 * f; } };
  },
  pin(p, mats) {
    const g = new THREE.Group();
    g.add(pedestal(mats, 0.55, 0.9));
    const model = new THREE.Group();
    const orange = new THREE.MeshStandardMaterial({ color: 0xff6b00, roughness: 0.35, metalness: 0.3 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 32, 24), orange); head.position.y = 0.62; model.add(head);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 32), orange); tip.rotation.x = Math.PI; tip.position.y = 0.3; model.add(tip);
    const hole = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 16), new THREE.MeshStandardMaterial({ color: 0xfff8f0 })); hole.position.set(0, 0.64, 0.19); model.add(hole);
    model.position.y = 0.92; g.add(model);
    // four app screens suspended on thin wires in an arc behind the pin
    const screens = [];
    p.images.slice(0, 4).forEach((u, k) => {
      const s = slideScreen(0.82, 1.6, [u], { frameMat: mats.darkMetal });
      const a = (k - 1.5) * 0.42;
      s.mesh.position.set(Math.sin(a) * 3.2, 2.5 + (k % 2) * 0.3, -2.6 - Math.cos(a) * 1.2); s.mesh.rotation.y = -a * 0.8; g.add(s.mesh);
      // a slim bronze stand under each screen (no wires crossing the logo on the niche behind)
      const stand = box(0.025, s.mesh.position.y - 0.8, 0.025, mats.bronze); stand.position.set(s.mesh.position.x, (s.mesh.position.y - 0.8) / 2, s.mesh.position.z - 0.03); g.add(stand);
      screens.push(s);
    });
    return { group: g, model, screens, spin: 0.6, bob: 0.06, solid: { r: 0.62 }, view: { dist: 3.2, y: 1.75, look: 1.6 } };
  },
  orbs(p, mats) {
    const g = new THREE.Group();
    g.add(pedestal(mats, 0.55, 0.9));
    const model = new THREE.Group();
    const cols = [0x9ccfbe, 0xc8b6f5, 0xf2b48c, 0x9db9e2, 0xeb978b, 0xcdb4e6];
    const orbs = cols.map((c, k) => {
      const o = new THREE.Mesh(new THREE.SphereGeometry(0.11 + (k % 3) * 0.03, 32, 24), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.55, roughness: 0.3 }));
      model.add(o); return o;
    });
    model.position.y = 1.5; g.add(model);
    const screens = [];
    p.images.slice(0, 3).forEach((u, k) => {
      const s = slideScreen(0.82, 1.6, [u], { frameMat: mats.darkMetal });
      s.mesh.position.set((k - 1) * 1.6, 2.4, -3.4 + (k === 1 ? -0.4 : 0)); s.mesh.rotation.y = (1 - k) * 0.22; g.add(s.mesh); screens.push(s);
    });
    return { group: g, model, screens, spin: 0.25, solid: { r: 0.62 }, view: { dist: 3.0, y: 1.75, look: 1.5 },
      update(time, still) { orbs.forEach((o, k) => { const a = (still ? 0 : time * 0.5) + k * (Math.PI * 2 / orbs.length); o.position.set(Math.cos(a) * 0.55, Math.sin(a * 2 + k) * 0.12, Math.sin(a) * 0.55); }); } };
  },
  books(p, mats) {
    const g = new THREE.Group();
    const mono = box(3.4, 4.8, 0.36, mats.darkMetal); mono.position.y = 2.4; g.add(mono);
    const front = slideScreen(3.0, 1.83, p.images.slice(0, 3)); front.mesh.position.set(0, 2.9, 0.19); g.add(front.mesh);
    const back = slideScreen(3.0, 1.83, p.images.slice(3).length ? p.images.slice(3) : p.images); back.mesh.position.set(0, 2.9, -0.19); back.mesh.rotation.y = Math.PI; g.add(back.mesh);
    const ember = box(3.4, 0.03, 0.4, mats.ember); ember.position.y = 4.81; g.add(ember);
    // a small stack of books on a low plinth in front of the monolith
    const plinth = box(1.4, 0.55, 0.8, mats.stone); plinth.position.set(0, 0.275, 1.1); g.add(plinth);
    const model = new THREE.Group();
    const bookCols = [0x2c4a3e, 0x7a3b62, 0xe8dcc6, 0x3d4a7a, 0x8a5a2b];
    bookCols.forEach((c, k) => { const b = box(0.62 - k * 0.04, 0.08, 0.44, new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 })); b.position.y = 0.04 + k * 0.085; b.rotation.y = (k % 2 ? 0.12 : -0.08); model.add(b); });
    model.position.set(0, 0.56, 1.1); g.add(model);
    return { group: g, model, screens: [front, back], spin: 0, solid: { hw: 1.75, hd: 1.55, oz: 0.55 }, view: { dist: 4.4, y: 1.8, look: 2.2 } };
  },
  moon(p, mats) {
    const g = new THREE.Group();
    g.add(bench(mats));
    const model = new THREE.Group();
    const moonTex = noiseTexture(256, { base: 190, spread: 70 });
    const moon = new THREE.Mesh(new THREE.SphereGeometry(0.42, 48, 32), new THREE.MeshStandardMaterial({ color: 0xf2e6b0, roughness: 0.95, bumpMap: moonTex, bumpScale: 0.6, emissive: 0x3a3320, emissiveIntensity: 0.4 }));
    model.add(moon);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.008, 8, 80), mats.blue); ring.rotation.x = 1.2; model.add(ring);
    model.position.set(-0.5, 1.5, 0); g.add(model);
    const scr = slideScreen(1.6, 1.0, p.images, { frameMat: mats.darkMetal }); scr.mesh.position.set(0.55, 1.55, -0.3); scr.mesh.rotation.y = -0.15; g.add(scr.mesh);
    return { group: g, model, screens: [scr], spin: 0.35, solid: { hw: 1.25, hd: 0.55 }, view: { dist: 2.8, y: 1.7, look: 1.4 } };
  },
  timeline(p, mats) {
    const g = new THREE.Group();
    g.add(bench(mats));
    const scr = slideScreen(2.0, 1.25, p.images, { frameMat: mats.darkMetal }); scr.mesh.position.set(0, 1.7, -0.3); g.add(scr.mesh);
    const model = new THREE.Group();
    const cols = [0x7c9cff, 0x9a8cff, 0xff8a3d, 0xf5c451, 0x7df3c2];
    cols.forEach((c, k) => { const b = box(0.28 + (k % 2) * 0.12, 0.06, 0.12, new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 })); b.position.set(-0.8 + k * 0.4, 0, 0); model.add(b); });
    model.position.set(0, 0.99, 0.25); g.add(model);
    return { group: g, model, screens: [scr], spin: 0, solid: { hw: 1.25, hd: 0.55 }, view: { dist: 2.7, y: 1.7, look: 1.4 },
      update(time, still) { if (!still) model.children.forEach((b, k) => { b.position.y = Math.max(0, Math.sin(time * 2 + k)) * 0.05; }); } };
  },
  core(p, mats) {
    const g = new THREE.Group();
    g.add(bench(mats, 1.8, 1.0));
    const model = new THREE.Group();
    [0, 1, 2].forEach((k) => {
      const tor = new THREE.Mesh(new THREE.TorusGeometry(0.42 - k * 0.08, 0.025, 12, 96), k === 1 ? mats.ember : mats.metal);
      tor.rotation.set(k * 1.1, k * 0.7, 0); model.add(tor);
    });
    const heart = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 1), mats.blue); model.add(heart);
    model.position.y = 1.55; g.add(model);
    return { group: g, model, spin: 0.5, tumble: true, solid: { hw: 0.95, hd: 0.55 }, view: { dist: 2.6, y: 1.7, look: 1.5 } };
  },
  land(p, mats) {
    const g = new THREE.Group();
    g.add(bench(mats, 2.2, 1.6));
    const model = new THREE.Group();
    const ground = box(1.8, 0.04, 1.3, new THREE.MeshStandardMaterial({ color: 0x3f7a4c, roughness: 0.9 })); model.add(ground);
    const road = box(1.8, 0.045, 0.14, new THREE.MeshStandardMaterial({ color: 0x3a4152 })); model.add(road);
    const blocks = [[-0.6, -0.35, 0.3, 0xe9ecf4], [0.5, -0.4, 0.18, 0xf5d48a], [-0.55, 0.35, 0.14, 0xf2b5a0], [0.55, 0.38, 0.4, 0xc8d6ff]];
    blocks.forEach(([x, z, h, c]) => { const b = box(0.32, h, 0.32, new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 })); b.position.set(x, h / 2 + 0.02, z); model.add(b); });
    const ghost = box(0.26, 0.22, 0.26, new THREE.MeshStandardMaterial({ color: 0x7df3ff, transparent: true, opacity: 0.45, emissive: 0x2a8aa0 }));
    ghost.position.set(0.05, 0.13, 0.36); model.add(ghost);
    model.position.y = 0.97; g.add(model);
    const scr = slideScreen(1.6, 1.0, p.images, { frameMat: mats.darkMetal }); scr.mesh.position.set(0, 2.15, -0.75); g.add(scr.mesh);
    return { group: g, model, spin: 0, solid: { hw: 1.15, hd: 0.85 }, view: { dist: 2.9, y: 1.9, look: 1.3 },
      update(time, still) { if (!still) ghost.position.x = 0.05 + Math.sin(time * 0.8) * 0.18; } };
  },
  board(p, mats) {
    const g = new THREE.Group();
    const frame = box(2.6, 1.7, 0.06, mats.darkMetal); frame.position.y = 1.75; g.add(frame);
    const c = document.createElement("canvas"); c.width = 1024; c.height = 660;
    const x = c.getContext("2d"); x.fillStyle = "#121418"; x.fillRect(0, 0, 1024, 660);
    x.strokeStyle = "rgba(76,125,255,.7)"; x.lineWidth = 3;
    const notes = [[90, 90, "#f5c451"], [420, 60, "#ff8a5c"], [760, 120, "#9db6ff"], [250, 380, "#7df3c2"], [620, 400, "#f2ece1"]];
    x.beginPath(); notes.forEach(([a, b], k) => { const [na, nb] = notes[(k + 1) % notes.length]; x.moveTo(a + 90, b + 60); x.lineTo(na + 90, nb + 60); }); x.stroke();
    notes.forEach(([a, b, col]) => { x.fillStyle = col; x.fillRect(a, b, 180, 120); });
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const surf = plane(2.5, 1.6, new THREE.MeshBasicMaterial({ map: tex })); surf.position.set(0, 1.75, 0.035); g.add(surf);
    for (const sx of [-1, 1]) { const leg = box(0.05, 1.0, 0.05, mats.metal); leg.position.set(sx * 1.1, 0.5, 0); g.add(leg); }
    const model = new THREE.Group(); model.position.y = 1.75; g.add(model);
    return { group: g, model, spin: 0, solid: { hw: 1.3, hd: 0.3 }, view: { dist: 2.8, y: 1.75, look: 1.7 } };
  },
  card(p, mats) {
    const g = new THREE.Group();
    g.add(bench(mats, 1.8, 1.0));
    const model = new THREE.Group();
    const cardMat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.25, metalness: 0.6 });
    const c1 = box(0.86, 0.54, 0.02, cardMat(0x1a1d2a)); c1.position.set(-0.1, 0, 0); model.add(c1);
    const c2 = box(0.86, 0.54, 0.02, cardMat(0x8a5a2b)); c2.position.set(0.12, -0.08, -0.12); c2.rotation.z = -0.12; model.add(c2);
    const chip = box(0.12, 0.09, 0.025, GOLD); chip.position.set(-0.36, 0.06, 0.012); model.add(chip);
    model.position.y = 1.5; g.add(model);
    return { group: g, model, spin: 0.55, solid: { hw: 0.95, hd: 0.55 }, view: { dist: 2.5, y: 1.65, look: 1.45 } };
  },
  frame(p, mats) {
    const g = new THREE.Group();
    const scr = slideScreen(4.2, 2.625, p.images, { frameMat: mats.metal }); scr.mesh.position.set(0, 2.55, -2.1); g.add(scr.mesh);
    const light = box(2.2, 0.06, 0.18, mats.ivoryGlow); light.position.set(0, 4.05, -1.95); g.add(light);
    const model = new THREE.Group(); model.position.set(0, 2.55, -2.1); g.add(model);
    return { group: g, model, screens: [scr], spin: 0, lecternOnly: true, solid: { hw: 0.3, hd: 0.25 }, view: { dist: 2.4, y: 1.8, look: 2.35, target: -2.1 } };
  },
};

// Generic wall-of-text installation (capabilities, creator story).
function textWall(w, h, lines) {
  const tex = textTexture(w, h, lines, { bg: "#0d0e12", pad: 0.22 });
  return { mesh: plane(w, h, new THREE.MeshBasicMaterial({ map: tex })), tex };
}

export function buildExhibits(scene, mats, data, t) {
  const list = [];
  const place = (id, built, plaque) => {
    const s = SPOTS[id];
    built.group.position.set(s.x, 0, s.z); built.group.rotation.y = s.face;
    scene.add(built.group);
    const fx = Math.sin(s.face), fz = Math.cos(s.face);
    const v = built.view || { dist: 2.8, y: 1.7, look: 1.4 };
    const tz = v.target || 0;
    const target = new THREE.Vector3(s.x + fx * tz, v.look, s.z + fz * tz);
    const eye = new THREE.Vector3(s.x + fx * (v.dist + tz * 0.3), v.y, s.z + fz * (v.dist + tz * 0.3));
    let solid = null;
    if (built.solid) {
      const oz = built.solid.oz || 0;
      solid = built.solid.r ? { x: s.x, z: s.z, r: built.solid.r } :
        { x: s.x + fx * oz, z: s.z + fz * oz, hw: Math.abs(fz) > 0.5 ? built.solid.hw : built.solid.hd, hd: Math.abs(fz) > 0.5 ? built.solid.hd : built.solid.hw };
    }
    const ex = { id, ...built, plaque, spot: s, eye, target, solid, baseRotY: built.model ? built.model.rotation.y : 0 };
    list.push(ex);
    return ex;
  };

  for (const p of data.projects) {
    const make = STYLES[p.style];
    if (!make) { console.warn("[museum] no installation style for", p.id); continue; }
    const built = make(p, mats);
    const plaque = makePlaque(p, t);
    if (built.lecternOnly || ["moon", "timeline", "core", "land", "card"].includes(p.style)) {
      const lec = lectern(mats, plaque); lec.position.set(built.lecternOnly ? 0 : 1.6, 0, built.lecternOnly ? 0 : 0.5); built.group.add(lec);
    } else if (p.style === "books") {
      plaque.mesh.position.set(0, 0.42, 1.51); built.group.add(plaque.mesh);
    } else if (p.style === "candle") {
      plaque.mesh.position.set(0, 0.55, 0.61); built.group.add(plaque.mesh);
    } else if (p.style === "board") {
      const lec = lectern(mats, plaque); lec.position.set(1.7, 0, 0.4); built.group.add(lec);
    } else {
      plaque.mesh.position.set(0, 0.62, 0.66); plaque.mesh.scale.setScalar(0.95); built.group.add(plaque.mesh);
    }
    // Branding and wall media, mounted on the wall (or niche) behind the installation.
    const spot = SPOTS[p.id], back = wallBehind(spot);
    const iconLike = p.brand && p.brand.kind === "icon";
    let bi;
    if (p.room === "collection") {
      if (p.style === "moon" && p.images.length) { // the bench installation gets a full niche screen
        const big = slideScreen(5.4, 3.04, p.images, { frameMat: mats.darkMetal }); big.mesh.position.set(0, 2.85, -(back - 0.25)); built.group.add(big.mesh);
        (built.screens ||= []).push(big);
      }
      bi = brandInstallation(p, mats, t, iconLike ? { maxW: 1.9, maxH: 1.9 } : { maxW: 2.6, maxH: 1.7 });
      bi.group.position.set(0, iconLike ? 5.55 : 5.45, -(back - 0.2));
    } else if (p.room === "lab") {
      const hasWallMedia = p.images.length && !["moon", "timeline", "land"].includes(p.style);
      if (p.images.length && !hasWallMedia) { // repeat the featured image large on the wall behind the bench
        const wallScr = slideScreen(3.6, 2.03, p.images, { frameMat: mats.darkMetal }); wallScr.mesh.position.set(0, 2.5, -(back - 0.12)); built.group.add(wallScr.mesh);
        (built.screens ||= []).push(wallScr);
      }
      bi = brandInstallation(p, mats, t, { maxW: 2.8, maxH: 1.6 });
      bi.group.position.set(0, p.images.length ? 4.35 : 2.9, -(back - 0.12));
    } else {
      bi = brandInstallation(p, mats, t, p.brand && p.brand.kind === "logo" ? { maxW: 1.5, maxH: 1.6 } : { maxW: 2.4, maxH: 1.4 });
      bi.group.position.set(0, 5.0, -(back - 0.1));
    }
    built.group.add(bi.group);
    const plaqueRedraw = plaque.redraw; plaque.redraw = () => { plaqueRedraw(); bi.redraw(); };
    mergeStatic(built.group); // pedestals, frames and stands: one draw call per material
    const ex = place(p.id, built, plaque);
    ex.project = p;
    ex.kind = "project";
  }

  // Capabilities wall in the client exhibition
  {
    const lines = () => [
      { text: t("rooms.clients.area"), size: 0.12, weight: 700, color: EMBER, tracking: 0.2, upper: true, gap: 0.08 },
      { text: t("caps.title"), size: 0.36, weight: 500, font: "serif", color: IVORY, gap: 0.16, lh: 1.05 },
      ...["software", "product", "ai", "games", "creative"].flatMap((k) => [
        { text: t(`caps.${k}.t`), size: 0.15, weight: 700, color: IVORY, gap: 0.03 },
        { text: t(`caps.${k}.d`), size: 0.105, weight: 500, color: MUTED, gap: 0.12, lh: 1.3 },
      ]),
    ];
    const wall = textWall(4.0, 4.6, lines());
    const g = new THREE.Group(); wall.mesh.position.set(0, 2.6, -2.15); g.add(wall.mesh);
    const lightBar = box(2.4, 0.05, 0.16, mats.ivoryGlow); lightBar.position.set(0, 5.05, -2.05); g.add(lightBar);
    const plaque = { tex: null, redraw: () => wall.tex.redraw(lines()) };
    const lecPlaque = makePlaque({ id: "capabilities", title: t("caps.title"), status: "live", cats: [], room: "clients" }, t);
    const ex = place("capabilities", { group: g, view: { dist: 2.6, y: 2.1, look: 2.6, target: -2.15 } }, plaque);
    ex.kind = "capabilities";
    ex.extraRedraw = [];
    void lecPlaque;
  }

  // The creator's room
  {
    const c = data.creator;
    // Portrait: the real photograph, large, with an ember backlight.
    const g = new THREE.Group();
    const frame = box(3.2, 4.7, 0.12, mats.darkMetal); frame.position.set(0, 3.05, -2.15); g.add(frame);
    const photoMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    imageTexture(ROOT + c.portrait, (tx) => { photoMat.map = tx; photoMat.needsUpdate = true; });
    const photo = plane(3.0, 4.5, photoMat); photo.position.set(0, 3.05, -2.08); g.add(photo);
    const nameLines = () => [
      { text: c.name, size: 0.1, weight: 700, color: IVORY, gap: 0.02 },
      { text: `${c.handle} · ${t("creator.founder")}`, size: 0.06, weight: 600, color: EMBER, tracking: 0.08 },
    ];
    const nameTex = textTexture(1.6, 0.36, nameLines(), { bg: "#0b0c10" });
    const nameMesh = plane(1.6, 0.36, new THREE.MeshBasicMaterial({ map: nameTex })); nameMesh.position.set(0, 0.55, -2.06); g.add(nameMesh);
    const ex = place("creator-portrait", { group: g, view: { dist: 4.2, y: 2.4, look: 2.9, target: -2.1 } }, { redraw: () => nameTex.redraw(nameLines()) });
    ex.kind = "creator-about";

    // Story wall: who I am and what I do, large and typographic
    const storyLines = () => [
      { text: t("rooms.creator.area"), size: 0.12, weight: 700, color: EMBER, tracking: 0.2, upper: true, gap: 0.08 },
      { text: t("creator.hello"), size: 0.42, weight: 500, font: "serif", color: IVORY, gap: 0.14, lh: 1.05 },
      { text: t("creator.intro"), size: 0.14, weight: 500, color: IVORY, gap: 0.14, lh: 1.4 },
      { text: t("creator.approachT"), size: 0.12, weight: 700, color: EMBER, gap: 0.04, upper: true, tracking: 0.12 },
      { text: t("creator.approach"), size: 0.12, weight: 500, color: MUTED, gap: 0.1, lh: 1.4 },
      { text: t("creator.directionT"), size: 0.12, weight: 700, color: EMBER, gap: 0.04, upper: true, tracking: 0.12 },
      { text: t("creator.direction"), size: 0.12, weight: 500, color: MUTED, lh: 1.4 },
    ];
    const story = textWall(4.4, 4.4, storyLines());
    const sg = new THREE.Group(); story.mesh.position.set(0, 2.6, -2.15); sg.add(story.mesh);
    const ex2 = place("creator-story", { group: sg, view: { dist: 3.0, y: 2.2, look: 2.6, target: -2.15 } }, { redraw: () => story.tex.redraw(storyLines()) });
    ex2.kind = "creator-background";

    // Contact plinth: a glowing ring you walk up to
    const cg = new THREE.Group();
    const base = cyl(0.7, 0.75, 0.9, mats.darkMetal, 64); base.position.y = 0.45; cg.add(base);
    const model = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 16, 96), mats.ember); model.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 8, 96), mats.blue); ring2.rotation.y = Math.PI / 2; model.add(ring2);
    model.position.y = 1.55; cg.add(model);
    const cLines = () => [
      { text: t("contact.cta"), size: 0.12, weight: 700, color: IVORY, tracking: 0.1, upper: true, gap: 0.03 },
      { text: c.email, size: 0.07, weight: 500, color: MUTED },
    ];
    const cTex = textTexture(1.5, 0.34, cLines(), { bg: "#0b0c10", align: "center" });
    const cPl = plane(1.5, 0.34, new THREE.MeshBasicMaterial({ map: cTex })); cPl.position.set(0, 0.62, 0.72); cg.add(cPl);
    const ex3 = place("creator-contact", { group: cg, model, spin: 0.6, tumble: true, solid: { r: 0.78 }, view: { dist: 3.0, y: 1.75, look: 1.4 } }, { redraw: () => cTex.redraw(cLines()) });
    ex3.kind = "creator-contact";
  }

  return list;
}

// Per frame animation of all exhibits; `still` = reduced motion.
export function animateExhibits(list, time, dt, still, inspecting) {
  for (const ex of list) {
    if (ex.screens) ex.screens.forEach((s) => s.update(dt, still));
    if (ex.update) ex.update(time, still);
    if (!ex.model || still || ex === inspecting) continue;
    if (ex.spin) ex.model.rotation.y += ex.spin * dt;
    if (ex.tumble) ex.model.rotation.x = Math.sin(time * 0.4) * 0.35;
    if (ex.bob) ex.model.position.y = (ex.model.userData.y0 ??= ex.model.position.y) + Math.sin(time * 1.6) * ex.bob;
  }
}
