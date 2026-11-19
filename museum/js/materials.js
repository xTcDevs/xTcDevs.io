// The architectural material palette, drawn procedurally on canvases (nothing to download).
// Travertine, ivory plaster, warm board formed concrete, terrazzo, oak, graphite, bronze and glass.
// Textures are small and tile in world space (see uvBox in world.js), and every material is
// shared by every surface that uses it, so the GPU sees a handful of materials, not hundreds.
import * as THREE from "three";

// Deterministic random numbers so the stone looks the same on every visit.
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function canvas(size) { const c = document.createElement("canvas"); c.width = c.height = size; return [c, c.getContext("2d")]; }

function finish(c, { srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Travertine: warm ivory with horizontal banding, long soft veins and small pores. 1 tile = 2 m.
function travertine(size, seed = 7, tint = [233, 220, 198]) {
  const [c, g] = canvas(size); const r = rng(seed);
  g.fillStyle = `rgb(${tint})`; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 46; i++) { // bands
    const y = r() * size, h = 2 + r() * size * 0.05, d = (r() - 0.5) * 26;
    g.fillStyle = `rgba(${tint[0] + d},${tint[1] + d - 4},${tint[2] + d - 10},${0.25 + r() * 0.35})`;
    g.fillRect(0, y, size, h); g.fillRect(0, y - size, size, h);
  }
  g.strokeStyle = "rgba(150,120,85,.18)"; g.lineWidth = 1;
  for (let i = 0; i < 14; i++) { // veins
    let y = r() * size; g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= size; x += size / 16) { y += (r() - 0.5) * 6; g.lineTo(x, y); }
    g.stroke();
  }
  for (let i = 0; i < size * 1.4; i++) { // pores
    g.fillStyle = `rgba(120,95,65,${0.12 + r() * 0.25})`;
    g.fillRect(r() * size, r() * size, 1 + r() * 2.5, 0.6 + r() * 1.2);
  }
  return c;
}

// Large format stone floor tiles with fine joints. tiles = tiles per texture edge.
function tiled(base, tiles, joint = "rgba(60,48,36,.55)", w = 2) {
  const size = base.width; const [c, g] = canvas(size);
  g.drawImage(base, 0, 0);
  g.fillStyle = joint;
  for (let i = 0; i <= tiles; i++) { const p = Math.round((i * size) / tiles); g.fillRect(p - w / 2, 0, w, size); g.fillRect(0, p - w / 2, size, w); }
  return c;
}

function plaster(size, seed = 3, tint = [226, 218, 204]) {
  const [c, g] = canvas(size); const r = rng(seed);
  g.fillStyle = `rgb(${tint})`; g.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 6; i++) {
    const d = (r() - 0.5) * 18; g.fillStyle = `rgba(${tint[0] + d},${tint[1] + d},${tint[2] + d},.35)`;
    g.beginPath(); g.arc(r() * size, r() * size, 2 + r() * 10, 0, Math.PI * 2); g.fill();
  }
  return c;
}

// Board formed concrete: warm grey, horizontal board marks and tie holes. 1 tile = 2.4 m.
function concrete(size, seed = 11, tint = [150, 143, 133]) {
  const [c, g] = canvas(size); const r = rng(seed);
  g.fillStyle = `rgb(${tint})`; g.fillRect(0, 0, size, size);
  const img = g.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) { const d = (r() - 0.5) * 22; img.data[i] += d; img.data[i + 1] += d; img.data[i + 2] += d; }
  g.putImageData(img, 0, 0);
  const boards = 8;
  for (let i = 0; i < boards; i++) {
    const y = (i * size) / boards, d = (r() - 0.5) * 16;
    g.fillStyle = `rgba(${tint[0] + d},${tint[1] + d},${tint[2] + d},.5)`; g.fillRect(0, y, size, size / boards);
    g.fillStyle = "rgba(70,64,56,.35)"; g.fillRect(0, y, size, 1.5);
  }
  g.fillStyle = "rgba(60,55,48,.55)";
  for (let x = size / 6; x < size; x += size / 3) for (let y = size / 8; y < size; y += size / 2) { g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); }
  return c;
}

// Terrazzo: warm grey ground with marble chips, in 1.2 m tiles with brass joints.
function terrazzo(size, seed = 5) {
  const [c, g] = canvas(size); const r = rng(seed);
  g.fillStyle = "rgb(122,112,100)"; g.fillRect(0, 0, size, size);
  const chips = ["#a89a86", "#8e8070", "#6f6356", "#b6a995", "#9a8b78", "#c1b4a0"];
  for (let i = 0; i < size * 3; i++) {
    g.fillStyle = chips[(r() * chips.length) | 0]; const s = 0.6 + r() * 2.0;
    g.beginPath(); g.ellipse(r() * size, r() * size, s, s * (0.5 + r() * 0.6), r() * 3, 0, Math.PI * 2); g.fill();
  }
  return tiled(c, 2, "rgba(176,132,74,.9)", 2);
}

// Oak planks, warm and matte. 1 tile = 2 m, 8 boards.
function oak(size, seed = 9) {
  const [c, g] = canvas(size); const r = rng(seed);
  const boards = 8, bw = size / boards;
  for (let b = 0; b < boards; b++) {
    const d = (r() - 0.5) * 30;
    g.fillStyle = `rgb(${150 + d},${104 + d * 0.8},${66 + d * 0.6})`; g.fillRect(b * bw, 0, bw, size);
    for (let k = 0; k < 26; k++) { // grain
      g.strokeStyle = `rgba(${90 + d},${58 + d},${34},${0.15 + r() * 0.2})`; g.lineWidth = 0.6 + r();
      const x = b * bw + r() * bw; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 6, size / 3, x + (r() - 0.5) * 6, (2 * size) / 3, x + (r() - 0.5) * 4, size); g.stroke();
    }
    const cut = r() * size; g.fillStyle = "rgba(50,32,18,.6)"; g.fillRect(b * bw, cut, bw, 1.5);
    g.fillStyle = "rgba(45,30,16,.7)"; g.fillRect(b * bw, 0, 1.5, size);
  }
  return c;
}

// Fine ripple normal map for water, scrolled each frame.
function ripples(size, seed = 13) {
  const [c, g] = canvas(size); const r = rng(seed);
  g.fillStyle = "rgb(128,128,255)"; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 260; i++) {
    const x = r() * size, y = r() * size, rad = 4 + r() * 22, nx = 128 + (r() - 0.5) * 70, ny = 128 + (r() - 0.5) * 70;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, `rgba(${nx | 0},${ny | 0},255,.35)`); grd.addColorStop(1, "rgba(128,128,255,0)");
    g.fillStyle = grd; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  return c;
}

export function makeMaterials(quality) {
  const S = quality === "low" ? 256 : 512;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const trav = travertine(S);
  const travTex = finish(trav);
  const travFloor = finish(tiled(travertine(S, 21, [226, 211, 186]), 2));
  const darkTrav = finish(travertine(S, 31, [96, 86, 74]));
  const plasterTex = finish(plaster(S));
  const concreteTex = finish(concrete(S));
  const terr = finish(terrazzo(S));
  const oakTex = finish(oak(S));
  const water = finish(ripples(256), { srgb: false });
  const brushed = (() => { const [c, g] = canvas(128); const r = rng(17); for (let y = 0; y < 128; y++) { g.fillStyle = `rgb(${110 + r() * 60 | 0},0,0)`; g.fillRect(0, y, 128, 1); } return finish(c, { srgb: false }); })();
  brushed.repeat.set(1, 4);

  const m = {
    // walls
    travertine: std({ map: travTex, roughness: 0.78, metalness: 0 }),
    plaster: std({ map: plasterTex, roughness: 0.95, metalness: 0 }),
    concrete: std({ map: concreteTex, roughness: 0.9, metalness: 0 }),
    graphite: std({ color: 0x2b2c30, roughness: 0.7, metalness: 0.05 }),
    graphiteStone: std({ map: darkTrav, color: 0x9a9590, roughness: 0.55, metalness: 0.05 }),
    oakWall: std({ map: oakTex, roughness: 0.62, metalness: 0 }),
    // floors (world tiled: 1 texture tile = 2 m unless noted)
    floorTravertine: std({ map: travFloor, roughness: quality === "low" ? 0.6 : 0.42, metalness: 0, envMapIntensity: 0.6 }),
    floorTerrazzo: std({ map: terr, roughness: quality === "low" ? 0.5 : 0.24, metalness: 0.05, envMapIntensity: 0.8 }),
    floorConcrete: std({ map: concreteTex, color: 0xb9b2a8, roughness: 0.68, metalness: 0 }),
    floorOak: std({ map: oakTex, roughness: 0.55, metalness: 0, envMapIntensity: 0.4 }),
    floorTerrace: std({ map: travFloor, color: 0xc9b9a4, roughness: 0.8, metalness: 0 }),
    // ceilings
    ceilingPlaster: std({ map: plasterTex, color: 0xf3ece0, roughness: 1, metalness: 0 }),
    ceilingOak: std({ map: oakTex, color: 0xd7c0a5, roughness: 0.7 }),
    // metals and accents
    bronze: std({ color: 0xa47a4c, roughness: 0.34, metalness: 0.9, roughnessMap: brushed, envMapIntensity: 1.0 }),
    darkBronze: std({ color: 0x4a3828, roughness: 0.42, metalness: 0.85, roughnessMap: brushed, envMapIntensity: 0.8 }),
    steel: std({ color: 0x9aa0a8, roughness: 0.32, metalness: 0.9, roughnessMap: brushed, envMapIntensity: 1.0 }),
    metal: null, darkMetal: null, stone: null,
    glass: std({ color: 0xdfe8ee, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.16, envMapIntensity: 1.6, depthWrite: false }),
    glassTint: std({ color: 0x9fb7c4, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.22, envMapIntensity: 1.4, depthWrite: false }),
    // light: these glow and need no real light
    ember: new THREE.MeshBasicMaterial({ color: 0xff6a3d }),
    emberSoft: new THREE.MeshBasicMaterial({ color: 0xff6a3d, transparent: true, opacity: 0.35 }),
    amber: new THREE.MeshBasicMaterial({ color: 0xffc58a }),
    warmLight: new THREE.MeshBasicMaterial({ color: 0xfff1dc }),
    blue: new THREE.MeshBasicMaterial({ color: 0x4c7dff }),
    ivoryGlow: new THREE.MeshBasicMaterial({ color: 0xf2ece1 }),
    screenOff: std({ color: 0x0b0b0c, roughness: 0.25, metalness: 0.4 }),
    water: std({ color: 0x1f3b4d, roughness: 0.08, metalness: 0.35, normalMap: water, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.4 }),
    waterTex: water,
  };
  // Older installation code asks for these names; map them onto the new palette.
  m.metal = m.steel; m.darkMetal = m.darkBronze; m.stone = m.graphiteStone;
  m.wall = m.travertine; m.floor = m.floorTerrazzo;
  return m;
}
