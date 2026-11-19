// The architecture: floors, walls, thresholds, light coves, signage and the light rig.
import * as THREE from "three";
import { ROOMS, CORRIDORS } from "./layout.js";
import { textTexture, noiseTexture, IVORY, EMBER, MUTED, BLUE } from "./textures.js";

const WALL_T = 0.4;

export function makeMaterials(quality) {
  const brushed = noiseTexture(256, { base: 128, spread: 60, streak: true });
  brushed.repeat.set(1, 6);
  return {
    floor: new THREE.MeshStandardMaterial({ color: 0x0c0d11, roughness: quality === "low" ? 0.55 : 0.2, metalness: 0.35, envMapIntensity: 0.6 }),
    floorWarm: new THREE.MeshStandardMaterial({ color: 0x14100d, roughness: 0.32, metalness: 0.25, envMapIntensity: 0.5 }),
    wall: new THREE.MeshStandardMaterial({ color: 0x101116, roughness: 0.92, metalness: 0.0 }),
    wallWarm: new THREE.MeshStandardMaterial({ color: 0x17140f, roughness: 0.9, metalness: 0.0 }),
    wallLab: new THREE.MeshStandardMaterial({ color: 0x0d1016, roughness: 0.85, metalness: 0.1 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x08090c, roughness: 1 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x5b5d63, roughness: 0.38, metalness: 0.9, roughnessMap: brushed, envMapIntensity: 0.9 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x222329, roughness: 0.45, metalness: 0.85, roughnessMap: brushed, envMapIntensity: 0.7 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x1b1c21, roughness: 0.6, metalness: 0.2 }),
    ember: new THREE.MeshBasicMaterial({ color: 0xff6a3d }),
    emberSoft: new THREE.MeshBasicMaterial({ color: 0xff6a3d, transparent: true, opacity: 0.35 }),
    blue: new THREE.MeshBasicMaterial({ color: 0x4c7dff }),
    ivoryGlow: new THREE.MeshBasicMaterial({ color: 0xf2ece1 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xbfd2ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.12, envMapIntensity: 1.6, depthWrite: false }),
    screenOff: new THREE.MeshStandardMaterial({ color: 0x050608, roughness: 0.25, metalness: 0.4 }),
  };
}

function box(w, h, d, mat) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); }

// A wall along x at depth z, from x0 to x1, with optional openings [{x, w, h}].
function wallX(group, x0, x1, z, height, mat, openings = []) {
  const ops = [...openings].sort((a, b) => a.x - b.x);
  let cursor = x0;
  for (const o of ops) {
    const a = o.x - o.w / 2, b = o.x + o.w / 2;
    if (a > cursor) { const m = box(a - cursor, height, WALL_T, mat); m.position.set((cursor + a) / 2, height / 2, z); group.add(m); }
    const lintel = box(o.w, height - o.h, WALL_T, mat); lintel.position.set(o.x, o.h + (height - o.h) / 2, z); group.add(lintel);
    cursor = b;
  }
  if (x1 > cursor) { const m = box(x1 - cursor, height, WALL_T, mat); m.position.set((cursor + x1) / 2, height / 2, z); group.add(m); }
}
function wallZ(group, z0, z1, x, height, mat) {
  const m = box(WALL_T, height, Math.abs(z0 - z1), mat); m.position.set(x, height / 2, (z0 + z1) / 2); group.add(m);
}

function strip(group, mat, w, h, d, x, y, z) { const m = box(w, h, d, mat); m.position.set(x, y, z); group.add(m); return m; }

const ROOM_MAT = { entrance: "wall", collection: "wall", lab: "wallLab", clients: "wallWarm", creator: "wallWarm" };

export function buildWorld(scene, mats, quality) {
  const world = new THREE.Group(); world.name = "architecture"; scene.add(world);
  const signs = [];

  for (const r of ROOMS) {
    const g = new THREE.Group(); g.name = r.id; world.add(g);
    const w = r.x1 - r.x0, d = r.z0 - r.z1, cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), r.id === "creator" ? mats.floorWarm : mats.floor);
    floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0, cz); g.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mats.ceiling);
    ceil.rotation.x = Math.PI / 2; ceil.position.set(cx, r.h, cz); g.add(ceil);
    const wm = mats[ROOM_MAT[r.id]];
    const near = CORRIDORS.filter((c) => c.z1 === r.z0).map((c) => ({ x: c.x, w: c.w, h: c.h }));
    const far = CORRIDORS.filter((c) => c.z0 === r.z1).map((c) => ({ x: c.x, w: c.w, h: c.h }));
    wallX(g, r.x0, r.x1, r.z0, r.h, wm, near);
    wallX(g, r.x0, r.x1, r.z1, r.h, wm, far);
    wallZ(g, r.z0, r.z1, r.x0, r.h, wm);
    wallZ(g, r.z0, r.z1, r.x1, r.h, wm);
    // ember skirting light along both long walls, a calm horizontal line that guides the eye
    strip(g, mats.ember, 0.04, 0.03, d - 0.6, r.x0 + 0.24, 0.06, cz);
    strip(g, mats.ember, 0.04, 0.03, d - 0.6, r.x1 - 0.24, 0.06, cz);
    ROOM_DETAIL[r.id](g, r, mats, quality);
  }

  for (const c of CORRIDORS) {
    const g = new THREE.Group(); g.name = `corridor-${c.from}`; world.add(g);
    const len = c.z0 - c.z1, cz = (c.z0 + c.z1) / 2;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(c.w, len), mats.floor);
    floor.rotation.x = -Math.PI / 2; floor.position.set(c.x, 0.001, cz); g.add(floor);
    wallZ(g, c.z0, c.z1, c.x - c.w / 2 - WALL_T / 2, c.h, mats.darkMetal);
    wallZ(g, c.z0, c.z1, c.x + c.w / 2 + WALL_T / 2, c.h, mats.darkMetal);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(c.w, len), mats.ceiling);
    ceil.rotation.x = Math.PI / 2; ceil.position.set(c.x, c.h, cz); g.add(ceil);
    // floor light rails and an illuminated portal frame at each end
    strip(g, mats.ember, 0.05, 0.02, len, c.x - c.w / 2 + 0.15, 0.02, cz);
    strip(g, mats.ember, 0.05, 0.02, len, c.x + c.w / 2 - 0.15, 0.02, cz);
    for (const z of [c.z0, c.z1]) portalFrame(g, mats, c.x, z, c.w, c.h);
    // a blue threshold line marks the moment you step into the next room
    strip(g, mats.blue, c.w - 0.4, 0.015, 0.06, c.x, 0.012, c.z1 + 0.4);
  }

  return { group: world, signs };
}

function portalFrame(g, mats, x, z, w, h) {
  const t = 0.12;
  strip(g, mats.ember, t, h, t, x - w / 2 - 0.02, h / 2, z);
  strip(g, mats.ember, t, h, t, x + w / 2 + 0.02, h / 2, z);
  strip(g, mats.ember, w + t * 2, t, t, x, h + 0.02, z);
}

// ------------------------------------------------------------- per room character
const ROOM_DETAIL = {
  entrance(g, r, mats) {
    // Monumental gate: two brushed pillars and a lintel framing the way into the collection.
    const gz = r.z1 + 0.6;
    for (const sx of [-1, 1]) {
      const p = box(1.4, r.h, 1.4, mats.metal); p.position.set(sx * 3.4, r.h / 2, gz); g.add(p);
      strip(g, mats.ember, 0.06, r.h - 1, 0.06, sx * (3.4 - 0.73), (r.h - 1) / 2 + 0.5, gz + 0.7);
    }
    const lintel = box(8.2, 1.1, 1.6, mats.metal); lintel.position.set(0, 6.6, gz); g.add(lintel);
    strip(g, mats.ember, 6.6, 0.05, 0.05, 0, 6.02, gz + 0.82);
    // ember line on the floor leading to the gate
    strip(g, mats.emberSoft, 0.08, 0.01, 12, 0, 0.006, -10);
    // two low benches of dark stone for scale
    for (const sx of [-1, 1]) { const b = box(3, 0.45, 0.8, mats.stone); b.position.set(sx * 6, 0.225, -8); g.add(b); }
    // vertical light fins on the side walls
    // (they frame the welcome and directory walls hung at z = -9)
    for (const z of [-2.6, -5.9, -12.1, -15.4]) for (const sx of [-1, 1]) strip(g, mats.ember, 0.05, 6, 0.05, sx * (r.x1 - 0.25), 4, z);
  },
  collection(g, r, mats) {
    // Skylight strips across the ceiling and tall fins between installations.
    for (let z = r.z0 - 3; z > r.z1 + 2; z -= 5) strip(g, mats.ivoryGlow, 20, 0.04, 0.25, 0, r.h - 0.05, z);
    for (let z = r.z0 - 4; z > r.z1 + 2; z -= 6.5) for (const sx of [-1, 1]) {
      const fin = box(0.25, r.h - 2, 1.2, mats.darkMetal); fin.position.set(sx * (r.x1 - 0.6), (r.h - 2) / 2 + 1, z); g.add(fin);
    }
  },
  lab(g, r, mats) {
    // Low ceiling grid in electric blue and a technical floor grid: the room where things are tried.
    for (let x = r.x0 + 2; x < r.x1; x += 3) strip(g, mats.blue, 0.03, 0.03, r.z0 - r.z1 - 1, x, r.h - 0.06, (r.z0 + r.z1) / 2);
    for (let z = r.z0 - 2; z > r.z1; z -= 4) strip(g, mats.blue, r.x1 - r.x0 - 1, 0.03, 0.03, 0, r.h - 0.06, z);
    const gridMat = new THREE.MeshBasicMaterial({ color: 0x4c7dff, transparent: true, opacity: 0.12 });
    for (let x = r.x0 + 3; x < r.x1; x += 3) strip(g, gridMat, 0.02, 0.004, r.z0 - r.z1 - 1, x, 0.004, (r.z0 + r.z1) / 2);
  },
  clients(g, r, mats) {
    // Picture lights above the frames and a warm wainscot band: a calmer, professional gallery.
    const band = new THREE.MeshStandardMaterial({ color: 0x1d1912, roughness: 0.7 });
    for (const sx of [-1, 1]) { const b = box(0.06, 1.1, r.z0 - r.z1 - 1, band); b.position.set(sx * (r.x1 - 0.23), 0.55, (r.z0 + r.z1) / 2); g.add(b); }
    for (let z = r.z0 - 3; z > r.z1 + 1; z -= 4.5) strip(g, mats.ivoryGlow, 16, 0.03, 0.12, 0, r.h - 0.05, z);
  },
  creator(g, r, mats) {
    // Ember backlight behind where the portrait hangs, and a soft halo on the back wall.
    strip(g, mats.ember, 0.04, 6.2, 0.04, r.x0 + 0.26, 3.4, -134 - 2.4);
    strip(g, mats.ember, 0.04, 6.2, 0.04, r.x0 + 0.26, 3.4, -134 + 2.4);
    strip(g, mats.emberSoft, 6, 0.02, 0.02, 0, r.h - 0.3, r.z1 + 0.25);
  },
};

// Room signs on the wall beside each entrance. Redrawn when the language changes.
export function buildSigns(scene, t) {
  const signs = [];
  const make = (room, x, z, ry) => {
    const lines = () => [
      { text: t(`rooms.${room.id}.area`), size: 0.09, weight: 700, color: "#ff6a3d", tracking: 0.25, upper: true, gap: 0.05 },
      { text: t(`rooms.${room.id}.name`), size: 0.32, weight: 500, font: "serif", color: IVORY, gap: 0.06, lh: 1.05 },
      { text: t(`rooms.${room.id}.sub`), size: 0.085, weight: 500, color: MUTED, lh: 1.35 },
    ];
    const tex = textTexture(3.2, 1.6, lines());
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    m.position.set(x, 2.9, z); m.rotation.y = ry; scene.add(m);
    signs.push({ redraw: () => tex.redraw(lines()) });
  };
  const byId = Object.fromEntries(ROOMS.map((r) => [r.id, r]));
  make(byId.collection, -13.78, -28.5, Math.PI / 2);
  make(byId.lab, -11.78, -66.5, Math.PI / 2);
  make(byId.clients, -11.78, -98.4, Math.PI / 2);
  make(byId.creator, 4.6, -126.22, Math.PI);
  // The entrance title above the gate.
  const titleLines = () => [
    { text: "xTc", size: 1.25, weight: 700, font: "serif", color: IVORY, lh: 0.9, gap: 0.02 },
    { text: t("entrance.museumName"), size: 0.26, weight: 700, color: "#ff6a3d", tracking: 0.32, upper: true },
  ];
  const tt = textTexture(6.4, 2.2, titleLines(), { align: "center" });
  const title = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.2), new THREE.MeshBasicMaterial({ map: tt, transparent: true }));
  title.position.set(0, 7.75, -16.75); scene.add(title);
  signs.push({ redraw: () => tt.redraw(titleLines()) });
  // Entrance hall walls: a welcome on the left, the building directory and controls on the right.
  const wall = (w, h, lines, x, z, ry) => {
    const tex = textTexture(w, h, lines(), { bg: "#0c0d11", pad: 0.3 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
    m.position.set(x, 2.75, z); m.rotation.y = ry; scene.add(m);
    signs.push({ redraw: () => tex.redraw(lines()) });
  };
  wall(5.6, 3.3, () => [
    { text: t("entrance.kicker"), size: 0.12, weight: 700, color: "#ff6a3d", tracking: 0.18, upper: true, gap: 0.12, lh: 1.3 },
    { text: t("opening.line"), size: 0.46, weight: 500, font: "serif", color: IVORY, gap: 0.16, lh: 1.08 },
    { text: t("entrance.intro"), size: 0.17, weight: 500, color: MUTED, lh: 1.45 },
  ], -8.7, -9, Math.PI / 2);
  wall(5.6, 3.3, () => [
    { text: t("entrance.roomsT"), size: 0.12, weight: 700, color: "#ff6a3d", tracking: 0.18, upper: true, gap: 0.12 },
    ...ROOMS.map((r) => ({ text: `${r.area}   ${t(`rooms.${r.id}.name`)}`, size: 0.24, weight: 500, font: "serif", color: IVORY, gap: 0.08 })),
    { text: "", size: 0.06, gap: 0.04 },
    { text: t("entrance.help"), size: 0.15, weight: 500, color: MUTED, lh: 1.45 },
  ], 8.7, -9, -Math.PI / 2);
  // The way on: a small sign over each threshold, readable from the room before it.
  for (const c of CORRIDORS) {
    const signLines = () => [{ text: `→  ${t(`rooms.${c.to}.name`)}`, size: 0.13, weight: 600, color: IVORY, tracking: 0.05 }];
    const tx = textTexture(3, 0.36, signLines(), { align: "center", pad: 0.05 });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.36), new THREE.MeshBasicMaterial({ map: tx, transparent: true }));
    s.position.set(c.x, c.h + 0.45, c.z0 + 0.22); scene.add(s);
    signs.push({ redraw: () => tx.redraw(signLines()) });
  }
  return signs;
}

// A small fixed pool of real lights that moves to the room the visitor is in. Keeping the
// count constant avoids shader recompiles; everything else glows with emissive materials.
const RIG = {
  entrance:   [[0, 7, -8, 0xffd2b0, 30], [0, 6, -15, 0xff7a45, 26], [-6, 5, -3, 0xf2ece1, 10], [6, 5, -3, 0xf2ece1, 10]],
  collection: [[-8, 7, -33, 0xffe4cc, 34], [8, 7, -33, 0xffd2b0, 30], [-8, 7, -46, 0xffe4cc, 34], [8, 7, -46, 0xffd2b0, 30]],
  lab:        [[-6, 5, -70, 0xbcd0ff, 18], [6, 5, -70, 0xbcd0ff, 18], [-6, 5, -84, 0xbcd0ff, 18], [6, 5, -84, 0xffcfae, 16]],
  clients:    [[-8, 6, -102, 0xffe6cc, 26], [8, 6, -102, 0xffe6cc, 26], [-8, 6, -113, 0xffe6cc, 26], [8, 6, -113, 0xffe6cc, 22]],
  creator:    [[-5, 5.5, -134, 0xffd8b8, 30], [5, 5, -131, 0xffe6cc, 18], [0, 5, -139, 0xff8a55, 18], [0, 5.5, -128, 0xf2ece1, 8]],
};
export function makeLightRig(scene) {
  scene.add(new THREE.HemisphereLight(0x9aa6c4, 0x120c08, 0.55));
  const pool = [0, 1, 2, 3].map(() => { const l = new THREE.PointLight(0xffffff, 0, 22, 1.6); scene.add(l); return l; });
  let current = null;
  return {
    setRoom(id) {
      if (!RIG[id] || id === current) return;
      current = id;
      RIG[id].forEach(([x, y, z, c, i], k) => { pool[k].position.set(x, y, z); pool[k].color.setHex(c); pool[k].intensity = i; });
    },
  };
}

// Solid architecture the visitor cannot walk through (pillars, benches, wall fins).
export function architectureSolids() {
  const s = [];
  for (const sx of [-1, 1]) {
    s.push({ x: sx * 3.4, z: -17.4, hw: 0.7, hd: 0.7 });
    s.push({ x: sx * 6, z: -8, hw: 1.5, hd: 0.4 });
  }
  for (let z = -24 - 4; z > -58 + 2; z -= 6.5) for (const sx of [-1, 1]) s.push({ x: sx * 13.4, z, hw: 0.13, hd: 0.6 });
  return s;
}
