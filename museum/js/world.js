// The architecture of the xTc Museum of Ideas.
// Five rooms, each with its own material language, ceiling, floor and light:
//   01 Entrance      travertine hall, coffered ceiling, oculus, bronze floor rotunda, brand portal
//   02 Collection    plaster and travertine galleries under a skylit barrel vault, terrazzo floor,
//                    graphite stone exhibition niches between travertine pilasters
//   03 Laboratory    board formed concrete, glass partitions, steel baffle ceiling, concrete floor
//   04 Clients       oak floor and wainscot, coffered oak ceiling, picture lights
//   05 Creator       an open air waterfront terrace: pavilion, reflecting pools, sky and water
// Geometry is plain boxes and planes with world scaled UVs, so a handful of shared materials
// cover the whole building and the scene stays light enough for phones.
import * as THREE from "three";
import { mergeGeometries } from "../vendor/BufferGeometryUtils.js";
import { ROOMS, CORRIDORS } from "./layout.js";
import { textTexture, imageTexture, IVORY, MUTED } from "./textures.js";

const WALL_T = 0.4;

export { makeMaterials } from "./materials.js";

// ------------------------------------------------------------- geometry helpers
// Box whose UVs are scaled to its size, so a texture tile is always `tile` metres wide.
function box(w, h, d, mat, tile = 2) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
    const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile);
  }
  return new THREE.Mesh(geo, mat);
}
function plane(w, h, mat, tile = 2) {
  const geo = new THREE.PlaneGeometry(w, h);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tile, uv.getY(i) * h / tile);
  return new THREE.Mesh(geo, mat);
}
function put(group, mesh, x, y, z, ry = 0) { mesh.position.set(x, y, z); if (ry) mesh.rotation.y = ry; group.add(mesh); return mesh; }
const add = (g, w, h, d, mat, x, y, z, tile) => put(g, box(w, h, d, mat, tile), x, y, z);

// A wall along x at depth z, from x0 to x1, with optional openings [{x, w, h}].
function wallX(group, x0, x1, z, height, mat, openings = [], y0 = 0) {
  const ops = [...openings].sort((a, b) => a.x - b.x);
  let cursor = x0;
  for (const o of ops) {
    const a = o.x - o.w / 2, b = o.x + o.w / 2;
    if (a > cursor) add(group, a - cursor, height, WALL_T, mat, (cursor + a) / 2, y0 + height / 2, z);
    if (height > o.h) add(group, o.w, height - o.h, WALL_T, mat, o.x, y0 + o.h + (height - o.h) / 2, z);
    cursor = b;
  }
  if (x1 > cursor) add(group, x1 - cursor, height, WALL_T, mat, (cursor + x1) / 2, y0 + height / 2, z);
}
function wallZ(group, z0, z1, x, height, mat, y0 = 0) {
  add(group, WALL_T, height, Math.abs(z0 - z1), mat, x, y0 + height / 2, (z0 + z1) / 2);
}
function floorOf(g, r, mat, y = 0) {
  const w = r.x1 - r.x0, d = r.z0 - r.z1;
  const f = plane(w, d, mat); f.rotation.x = -Math.PI / 2; f.position.set((r.x0 + r.x1) / 2, y, (r.z0 + r.z1) / 2); g.add(f); return f;
}
function ceilingOf(g, r, mat, h = r.h) {
  const w = r.x1 - r.x0, d = r.z0 - r.z1;
  const c = plane(w, d, mat, 3); c.rotation.x = Math.PI / 2; c.position.set((r.x0 + r.x1) / 2, h, (r.z0 + r.z1) / 2); g.add(c); return c;
}
const openingsNear = (r) => CORRIDORS.filter((c) => c.z1 === r.z0).map((c) => ({ x: c.x, w: c.w, h: c.h }));
const openingsFar = (r) => CORRIDORS.filter((c) => c.z0 === r.z1).map((c) => ({ x: c.x, w: c.w, h: c.h }));

// Four walls of a room in one material, with door openings.
function shell(g, r, mat, h = r.h) {
  wallX(g, r.x0, r.x1, r.z0, h, mat, openingsNear(r));
  wallX(g, r.x0, r.x1, r.z1, h, mat, openingsFar(r));
  wallZ(g, r.z0, r.z1, r.x0, h, mat);
  wallZ(g, r.z0, r.z1, r.x1, h, mat);
}
// A band of a second material laid over the inner face of the walls (dado, wainscot, skirting).
function band(g, r, mat, y0, y1, inset = 0.03, skipDoors = true) {
  const h = y1 - y0, t = 0.06, cy = y0 + h / 2;
  const fx = r.x0 + WALL_T / 2 + t / 2 + inset, fx1 = r.x1 - WALL_T / 2 - t / 2 - inset;
  const d = r.z0 - r.z1 - WALL_T;
  add(g, t, h, d, mat, fx, cy, (r.z0 + r.z1) / 2);
  add(g, t, h, d, mat, fx1, cy, (r.z0 + r.z1) / 2);
  for (const [z, ops, s] of [[r.z0 - WALL_T / 2 - t / 2 - inset, openingsNear(r), 1], [r.z1 + WALL_T / 2 + t / 2 + inset, openingsFar(r), -1]]) {
    let cursor = r.x0 + WALL_T / 2;
    const segs = [];
    for (const o of skipDoors ? ops : []) { segs.push([cursor, o.x - o.w / 2]); cursor = o.x + o.w / 2; }
    segs.push([cursor, r.x1 - WALL_T / 2]);
    for (const [a, b] of segs) if (b - a > 0.05) add(g, b - a, h, t, mat, (a + b) / 2, cy, z);
    void s;
  }
}

// Portal surround for a door: a deep frame in `mat` with a fine ember line inside the reveal.
function portal(g, mats, x, z, w, h, mat, { depth = 0.9, frame = 0.5 } = {}) {
  add(g, frame, h + frame, depth, mat, x - w / 2 - frame / 2, (h + frame) / 2, z);
  add(g, frame, h + frame, depth, mat, x + w / 2 + frame / 2, (h + frame) / 2, z);
  add(g, w + frame * 2, frame, depth, mat, x, h + frame / 2, z);
  add(g, 0.03, h - 0.2, 0.03, mats.ember, x - w / 2 + 0.03, h / 2, z);
  add(g, 0.03, h - 0.2, 0.03, mats.ember, x + w / 2 - 0.03, h / 2, z);
}

// ------------------------------------------------------------- the building
export function buildWorld(scene, mats, quality) {
  const world = new THREE.Group(); world.name = "architecture"; scene.add(world);
  const updaters = [];
  const byId = Object.fromEntries(ROOMS.map((r) => [r.id, r]));
  for (const r of ROOMS) {
    const g = new THREE.Group(); g.name = r.id; world.add(g);
    const u = ROOM[r.id](g, r, mats, quality, scene);
    if (u) updaters.push(u);
  }
  for (const c of CORRIDORS) corridor(world, c, mats, byId);
  for (const g of world.children) mergeStatic(g);
  return { group: world, update: (dt, time, still) => updaters.forEach((u) => u(dt, time, still)) };
}

// The architecture is hundreds of boxes and planes but only a handful of materials. Merging the
// static ones into one mesh per material per room turns hundreds of draw calls into a few dozen,
// which is what keeps phones smooth. Animated parts live in sub groups and are left alone.
export function mergeStatic(group) {
  const buckets = new Map();
  for (const m of [...group.children]) {
    if (!m.isMesh || !m.geometry.index) continue;
    m.updateMatrix();
    const geo = m.geometry.clone().applyMatrix4(m.matrix);
    for (const name of Object.keys(geo.attributes)) if (!["position", "normal", "uv"].includes(name)) geo.deleteAttribute(name);
    if (!buckets.has(m.material)) buckets.set(m.material, []);
    buckets.get(m.material).push(geo);
    group.remove(m); m.geometry.dispose();
  }
  for (const [mat, geos] of buckets) {
    const merged = mergeGeometries(geos, false);
    geos.forEach((gg) => gg.dispose());
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat); mesh.name = `${group.name}-merged`; group.add(mesh);
  }
}

function corridor(world, c, mats) {
  const g = new THREE.Group(); g.name = `corridor-${c.from}`; world.add(g);
  const len = c.z0 - c.z1, cz = (c.z0 + c.z1) / 2;
  const outdoorEnd = c.to === "creator";
  const f = plane(c.w, len, mats.graphiteStone); f.rotation.x = -Math.PI / 2; f.position.set(c.x, 0.002, cz); g.add(f);
  // travertine side walls with a bronze shadow gap, a plaster ceiling with a warm light line
  for (const s of [-1, 1]) {
    const x = c.x + s * (c.w / 2 + WALL_T / 2);
    add(g, WALL_T, c.h, len, mats.travertine, x, c.h / 2, cz);
    add(g, 0.02, 0.05, len, mats.bronze, x - s * (WALL_T / 2 + 0.01), 1.1, cz);
  }
  if (outdoorEnd) {
    // a glazed vestibule: glass roof between bronze beams, the terrace light pours in
    for (let z = c.z0 - 0.5; z > c.z1; z -= 1.2) add(g, c.w + 0.8, 0.18, 0.12, mats.bronze, c.x, c.h, z);
    const roof = plane(c.w + 0.8, len, mats.glass); roof.rotation.x = Math.PI / 2; roof.position.set(c.x, c.h + 0.1, cz); g.add(roof);
  } else {
    const ceil = plane(c.w, len, mats.ceilingPlaster); ceil.rotation.x = Math.PI / 2; ceil.position.set(c.x, c.h, cz); g.add(ceil);
    add(g, 0.12, 0.02, len - 0.6, mats.warmLight, c.x, c.h - 0.012, cz);
  }
  // a bronze threshold strip marks the moment you step into the next room
  add(g, c.w - 0.2, 0.012, 0.08, mats.bronze, c.x, 0.008, c.z1 + 0.3);
}

// ------------------------------------------------------------- per room architecture
const ROOM = {
  // 01 ENTRANCE: a tall travertine hall. Coffered ceiling with an oculus, a bronze rotunda
  // inlaid in the floor, and a graphite stone portal carrying the xTc brand.
  entrance(g, r, mats) {
    floorOf(g, r, mats.floorTravertine);
    // floor: graphite runner from the door to the portal, bronze rotunda rings around the centre
    const run = plane(4, 18, mats.graphiteStone); run.rotation.x = -Math.PI / 2; run.position.set(0, 0.004, -10); g.add(run);
    for (const [ri, ro] of [[3.9, 4.0], [4.6, 4.66]]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(ri, ro, 96), mats.bronze); ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.006, -9); g.add(ring);
    }
    shell(g, r, mats.travertine);
    // graphite stone skirting and an amber cove at the top of every wall
    band(g, r, mats.graphiteStone, 0, 0.35);
    band(g, r, mats.amber, r.h - 0.42, r.h - 0.38, 0.02);
    // the front of the hall is a glass curtain wall with bronze mullions and daylight behind it
    for (let x = -9; x <= 9; x += 3) add(g, 0.12, r.h, 0.22, mats.bronze, x, r.h / 2, r.z0 - 0.3);
    add(g, 20, 0.16, 0.22, mats.bronze, 0, 3.4, r.z0 - 0.3);
    const daylight = plane(20, r.h - 0.4, mats.warmLight); daylight.position.set(0, r.h / 2, r.z0 - 0.21); daylight.rotation.y = Math.PI; g.add(daylight);
    const glass = plane(20, r.h, mats.glass); glass.position.set(0, r.h / 2, r.z0 - 0.42); g.add(glass);
    // side walls: tall bronze reveals divide the travertine into panels
    for (const z of [-2.6, -5.9, -12.1, -15.4]) for (const s of [-1, 1]) add(g, 0.06, r.h - 1, 0.06, mats.bronze, s * (r.x1 - WALL_T / 2 - 0.05), (r.h - 1) / 2 + 0.4, z);
    // graphite stone niches that hold the welcome and directory walls
    for (const s of [-1, 1]) add(g, 0.1, 4.0, 6.4, mats.graphite, s * (r.x1 - WALL_T / 2 - 0.08), 2.8, -9);
    // portal into the collection: a deep graphite stone surround
    portal(g, mats, 0, r.z1 + 0.45, 6, 6, mats.graphiteStone, { depth: 1.0, frame: 1.4 });
    add(g, 9.4, r.h - 7.4, 1.0, mats.graphiteStone, 0, 7.4 + (r.h - 7.4) / 2, r.z1 + 0.45);
    // ceiling: coffers of deep plaster beams, an oculus of light in the middle
    ceilingOf(g, r, mats.ceilingPlaster);
    for (let x = r.x0 + 2.75; x < r.x1; x += 2.75) add(g, 0.3, 0.7, r.z0 - r.z1, mats.ceilingPlaster, x, r.h - 0.35, (r.z0 + r.z1) / 2);
    for (let z = r.z0 - 2.5; z > r.z1; z -= 2.5) add(g, r.x1 - r.x0, 0.7, 0.3, mats.ceilingPlaster, 0, r.h - 0.35, z);
    const oculus = new THREE.Mesh(new THREE.CircleGeometry(3.0, 64), mats.warmLight); oculus.rotation.x = Math.PI / 2; oculus.position.set(0, r.h - 0.72, -9); g.add(oculus);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(3.05, 0.08, 8, 96), mats.bronze); rim.rotation.x = Math.PI / 2; rim.position.set(0, r.h - 0.75, -9); g.add(rim);
    // a suspended sculpture under the oculus: two bronze rings, slowly turning
    const sculpt = new THREE.Group(); sculpt.position.set(0, 7.2, -9); g.add(sculpt);
    const r1 = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.045, 10, 120), mats.bronze); sculpt.add(r1);
    const r2 = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.03, 10, 120), mats.ember); r2.rotation.y = Math.PI / 2; sculpt.add(r2);
    for (const a of [0, 2.1, 4.2]) add(g, 0.01, r.h - 0.75 - 9.2, 0.01, mats.steel, Math.cos(a) * 2, (r.h - 0.75 + 9.2) / 2, -9 + Math.sin(a) * 2);
    // travertine benches along the sides
    for (const s of [-1, 1]) { add(g, 3.2, 0.45, 0.9, mats.travertine, s * 6.8, 0.225, -14.5); add(g, 3.2, 0.03, 0.04, mats.amber, s * 6.8, 0.06, -14.05); }
    return (dt, time, still) => { if (!still) { sculpt.rotation.y += dt * 0.08; r1.rotation.x = Math.sin(time * 0.2) * 0.12; } };
  },

  // 02 COLLECTION: the main gallery. Plaster walls on a travertine dado, a barrel vault with a
  // skylight along its crown and bronze ribs, graphite stone niches behind each exhibit.
  collection(g, r, mats) {
    floorOf(g, r, mats.floorTerrazzo);
    // a travertine processional path down the middle, edged in bronze
    const path = plane(6, r.z0 - r.z1, mats.floorTravertine); path.rotation.x = -Math.PI / 2; path.position.set(0, 0.004, (r.z0 + r.z1) / 2); g.add(path);
    for (const s of [-1, 1]) add(g, 0.05, 0.01, r.z0 - r.z1, mats.bronze, s * 3.03, 0.006, (r.z0 + r.z1) / 2);
    shell(g, r, mats.plaster);
    band(g, r, mats.travertine, 0, 3.2);
    band(g, r, mats.bronze, 3.2, 3.24, 0.05);
    // the vault: a flattened half cylinder springing from the walls
    const span = r.x1 - r.x0, len = r.z0 - r.z1, cz = (r.z0 + r.z1) / 2;
    const vaultGeo = new THREE.CylinderGeometry(span / 2, span / 2, len, 48, 1, true, -Math.PI / 2, Math.PI);
    const uv = vaultGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 10, uv.getY(i) * len / 3);
    const vault = new THREE.Mesh(vaultGeo, new THREE.MeshStandardMaterial({ map: mats.ceilingPlaster.map, color: 0xf3ece0, roughness: 1, side: THREE.DoubleSide, emissive: 0x6b5a45, emissiveIntensity: 0.45 })); // skylight bounce
    // the half cylinder is built on the +z side of its axis; turning it by -90 degrees about x
    // makes that half rise above the springing line (a vault), then it is flattened to r.vault
    vault.rotation.x = -Math.PI / 2; vault.scale.set(1, 1, r.vault / (span / 2)); vault.position.set(0, r.h, cz); g.add(vault);
    // fill the half moons at both ends of the vault (two sided: they are seen from the entrance too)
    const lunetteMat = mats.plaster.clone(); lunetteMat.side = THREE.DoubleSide;
    for (const [z, rot] of [[r.z0 - 0.01, Math.PI], [r.z1 + 0.01, 0]]) {
      const lun = new THREE.Mesh(new THREE.CircleGeometry(span / 2, 48, 0, Math.PI), lunetteMat); lun.scale.set(1, r.vault / (span / 2), 1); lun.position.set(0, r.h, z); lun.rotation.y = rot; g.add(lun);
    }
    // skylight along the crown, bronze ribs across the vault every bay
    add(g, 2.4, 0.04, len - 1, mats.warmLight, 0, r.h + r.vault - 0.06, cz);
    for (let z = r.z0 - 1; z >= r.z1 + 1; z -= 7) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(span / 2 - 0.05, 0.14, 6, 64, Math.PI), mats.bronze);
      rib.scale.set(1, r.vault / (span / 2), 1); rib.position.set(0, r.h, z); g.add(rib);
    }
    // travertine pilasters on the walls between the bays, crowned by amber uplights
    for (const z of [-27.5, -41, -55, -68.5]) for (const s of [-1, 1]) {
      add(g, 1.0, r.h, 1.0, mats.travertine, s * (r.x1 - WALL_T / 2 - 0.5), r.h / 2, z);
      add(g, 0.7, 0.04, 0.7, mats.amber, s * (r.x1 - WALL_T / 2 - 0.5), r.h + 0.02, z);
    }
    // graphite stone niches behind each side exhibit, with a warm light cove above
    for (const z of [-34, -48, -62]) for (const s of [-1, 1]) {
      const x = s * (r.x1 - WALL_T / 2 - 0.12);
      add(g, 0.16, 6.6, 9.4, mats.graphiteStone, x, 3.3 + 0.05, z);
      add(g, 0.3, 0.05, 9.0, mats.amber, x - s * 0.2, 6.7, z);
      add(g, 0.5, 0.12, 9.4, mats.bronze, x - s * 0.15, 6.78, z);
    }
    // two long travertine benches on the path, for looking
    for (const z of [-41, -55]) { add(g, 4.2, 0.46, 0.9, mats.travertine, 0, 0.23, z); add(g, 4.2, 0.02, 0.04, mats.amber, 0, 0.05, z + 0.46); }
  },

  // 03 LABORATORY: board formed concrete, a steel baffle ceiling, glass partitions. Experimental
  // and precise, with one electric blue line as the interactive accent.
  lab(g, r, mats) {
    floorOf(g, r, mats.floorConcrete);
    for (let x = r.x0 + 4; x < r.x1; x += 4) add(g, 0.04, 0.008, r.z0 - r.z1, mats.steel, x, 0.004, (r.z0 + r.z1) / 2);
    shell(g, r, mats.concrete);
    band(g, r, mats.graphite, 0, 0.3);
    ceilingOf(g, r, mats.graphite);
    // linear steel baffles hung below the slab, with three warm light lines between them
    const cz = (r.z0 + r.z1) / 2, d = r.z0 - r.z1 - 0.8;
    for (let x = r.x0 + 0.8; x < r.x1 - 0.5; x += 0.8) add(g, 0.05, 0.42, d, mats.steel, x, r.h - 0.45, cz);
    for (const x of [-6, 0, 6]) add(g, 0.1, 0.03, d, mats.warmLight, x + 0.4, r.h - 0.68, cz);
    add(g, 0.05, 0.02, d, mats.blue, -3.2 + 0.4, r.h - 0.68, cz);
    // glass partitions between the exhibit bays, framed in steel
    for (const z of [-87.5]) for (const s of [-1, 1]) {
      const x0 = s * 4.6, x1 = s * (r.x1 - 0.3), cx = (x0 + x1) / 2, w = Math.abs(x1 - x0);
      add(g, w, 3.4, 0.03, mats.glassTint, cx, 1.7, z);
      add(g, w, 0.05, 0.08, mats.steel, cx, 3.42, z);
      add(g, 0.06, 3.4, 0.08, mats.steel, x0, 1.7, z);
    }
    // a long concrete workbench vitrine on each side wall
    for (const s of [-1, 1]) { add(g, 0.8, 0.9, 6, mats.concrete, s * (r.x1 - 0.65), 0.45, -97.5); add(g, 0.7, 0.4, 5.8, mats.glass, s * (r.x1 - 0.65), 1.12, -97.5); }
  },

  // 04 CLIENT EXHIBITION: oak and ivory plaster, a coffered oak ceiling and picture lights.
  clients(g, r, mats) {
    floorOf(g, r, mats.floorOak);
    shell(g, r, mats.plaster);
    band(g, r, mats.oakWall, 0, 1.25);
    band(g, r, mats.bronze, 1.25, 1.28, 0.04);
    ceilingOf(g, r, mats.ceilingOak);
    const cz = (r.z0 + r.z1) / 2;
    for (let x = r.x0 + 2.4; x < r.x1; x += 2.4) add(g, 0.22, 0.5, r.z0 - r.z1, mats.ceilingOak, x, r.h - 0.25, cz);
    for (let z = r.z0 - 2.2; z > r.z1; z -= 2.2) add(g, r.x1 - r.x0, 0.5, 0.22, mats.ceilingOak, 0, r.h - 0.25, z);
    band(g, r, mats.amber, r.h - 0.08, r.h - 0.05, 0.03);
    // a long travertine bench down the middle of the room
    add(g, 1.0, 0.46, 7, mats.travertine, 0, 0.23, -119.5);
    add(g, 0.04, 0.02, 7, mats.amber, 0.52, 0.05, -119.5); add(g, 0.04, 0.02, 7, mats.amber, -0.52, 0.05, -119.5);
  },

  // 05 CREATOR'S TERRACE: the museum opens onto the water. A travertine terrace with a
  // cantilevered pavilion, two reflecting pools framing the walk to the water's edge, a low
  // bronze rail, the sea and an evening sky.
  creator(g, r, mats, quality, scene) {
    const cx = 0, cz = (r.z0 + r.z1) / 2;
    floorOf(g, r, mats.floorTerrace);
    // terrace slab edge and coping, visible from the water
    add(g, r.x1 - r.x0 + 0.6, 1.2, 0.6, mats.travertine, cx, -0.6, r.z1 - 0.3);
    for (const s of [-1, 1]) add(g, 0.6, 1.2, r.z0 - r.z1 + 0.6, mats.travertine, s * (r.x1 + 0.3), -0.6, cz - 0.3);
    // the museum facade behind the visitor: travertine with a tall glazed band
    const fz = r.z0 - 0.2;
    wallX(g, r.x0 - 0.6, r.x1 + 0.6, fz, 13, mats.travertine, [{ x: 0, w: 6, h: 5 }]);
    for (const s of [-1, 1]) {
      const gl = plane(9, 8, mats.glassTint); gl.position.set(s * 9.5, 5.5, fz - 0.22); gl.rotation.y = Math.PI; g.add(gl);
      const warm = plane(9, 8, mats.amber); warm.position.set(s * 9.5, 5.5, fz - 0.21); warm.rotation.y = Math.PI; warm.material = new THREE.MeshBasicMaterial({ color: 0xc9925a }); g.add(warm);
      for (let x = s * 5; Math.abs(x) <= 14; x += s * 3) add(g, 0.12, 8, 0.25, mats.bronze, x, 5.5, fz - 0.3);
    }
    // pavilion: a thin roof slab cantilevered over the threshold on four bronze columns
    add(g, 18, 0.35, 12, mats.graphite, 0, 4.6, r.z0 - 6);
    const under = plane(17.6, 11.6, mats.ceilingOak); under.rotation.x = Math.PI / 2; under.position.set(0, 4.42, r.z0 - 6); g.add(under);
    for (const x of [-6, 0, 6]) add(g, 0.06, 0.02, 11, mats.warmLight, x, 4.41, r.z0 - 6);
    for (const [x, z] of [[-7.5, -146], [7.5, -146]]) add(g, 0.3, 4.6, 0.3, mats.bronze, x, 2.3, z);
    // two reflecting pools framing the walk to the water, with amber edge lights
    for (const s of [-1, 1]) {
      const px = s * 5.2;
      // a travertine kerb around the pool, the water sits just inside it
      add(g, 6.4, 0.3, 0.2, mats.travertine, px, 0.15, -151.9); add(g, 6.4, 0.3, 0.2, mats.travertine, px, 0.15, -164.1);
      add(g, 0.2, 0.3, 12.4, mats.travertine, px - 3.1, 0.15, -158); add(g, 0.2, 0.3, 12.4, mats.travertine, px + 3.1, 0.15, -158);
      const pool = plane(6, 12, mats.water, 3); pool.rotation.x = -Math.PI / 2; pool.position.set(px, 0.18, -158); g.add(pool);
      add(g, 6.4, 0.02, 0.05, mats.amber, px, 0.26, -151.85); add(g, 6.4, 0.02, 0.05, mats.amber, px, 0.26, -164.15);
    }
    // travertine walls that hold the portrait and the story, and benches facing the sea
    for (const s of [-1, 1]) {
      add(g, 0.6, 6.4, 9.6, mats.travertine, s * 13.6, 3.2, -151);
      add(g, 0.62, 0.06, 9.6, mats.bronze, s * 13.6, 6.43, -151);
      add(g, 3.6, 0.46, 0.9, mats.travertine, s * 8.5, 0.23, -174.3);
    }
    // the waterfront rail: a low bronze bar on slim posts along the three open edges
    const rail = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
      const bar = box(0.06, 0.06, len, mats.bronze); bar.position.set((x0 + x1) / 2, 1.0, (z0 + z1) / 2); bar.rotation.y = ang; g.add(bar);
      const glass = plane(len, 0.9, mats.glass); glass.position.set((x0 + x1) / 2, 0.5, (z0 + z1) / 2); glass.rotation.y = ang + Math.PI / 2; g.add(glass);
      const n = Math.ceil(len / 3);
      for (let i = 0; i <= n; i++) add(g, 0.05, 1.0, 0.05, mats.bronze, x0 + (x1 - x0) * i / n, 0.5, z0 + (z1 - z0) * i / n);
    };
    rail(r.x0 + 0.2, r.z1 + 0.2, r.x1 - 0.2, r.z1 + 0.2);
    rail(r.x0 + 0.2, r.z0 - 1, r.x0 + 0.2, r.z1 + 0.2);
    rail(r.x1 - 0.2, r.z0 - 1, r.x1 - 0.2, r.z1 + 0.2);
    // amber bollards along the walk
    for (const z of [-150, -156, -162, -168]) for (const s of [-1, 1]) { add(g, 0.18, 0.7, 0.18, mats.darkBronze, s * 1.9, 0.35, z); add(g, 0.14, 0.12, 0.19, mats.amber, s * 1.9, 0.62, z); }

    // the sea: a large dark plane with scrolling ripples, below the terrace
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1200), mats.water.clone());
    sea.material.normalMap = mats.waterTex; sea.material.color.setHex(0x1b3445);
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.9, -700); scene.add(sea);
    mats.waterTex.repeat.set(220, 190);
    // sky: an evening gradient dome with a low sun, drawn without fog so it stays clear
    const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x1d2c4f) }, mid: { value: new THREE.Color(0x9c7884) }, low: { value: new THREE.Color(0xf2a865) } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "uniform vec3 top; uniform vec3 mid; uniform vec3 low; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.12 ? mix(mid, top, smoothstep(0.12, 0.6, h)) : mix(low, mid, smoothstep(-0.02, 0.12, h)); gl_FragColor = vec4(c, 1.0); }",
    }));
    sky.position.set(0, 0, -150); sky.renderOrder = -1; scene.add(sky);
    const sun = new THREE.Mesh(new THREE.CircleGeometry(16, 48), new THREE.MeshBasicMaterial({ color: 0xffd9a8, fog: false }));
    sun.position.set(-90, 22, -580); sun.lookAt(0, 2, -150); scene.add(sun);
    const halo = new THREE.Mesh(new THREE.CircleGeometry(60, 48), new THREE.MeshBasicMaterial({ color: 0xffb070, fog: false, transparent: true, opacity: 0.18, depthWrite: false }));
    halo.position.set(-90, 22, -581); halo.lookAt(0, 2, -150); scene.add(halo);
    // distant headlands on the horizon
    const hillMat = new THREE.MeshBasicMaterial({ color: 0x3a3d52, fog: false });
    for (const [x, w, h] of [[-260, 220, 26], [-60, 140, 14], [200, 260, 34], [380, 160, 18]]) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), hillMat);
      hill.scale.set(w, h, 40); hill.position.set(x, -0.9, -650); scene.add(hill);
    }
    let t = 0;
    return (dt, time, still) => { if (still) return; t += dt; mats.waterTex.offset.set(t * 0.004, t * 0.0065); };
  },
};

// ------------------------------------------------------------- signage
// Room signs beside each entrance, the brand over the entrance portal, the welcome and
// directory walls, and a small sign over each threshold. All redrawn on a language change.
export function buildSigns(scene, t, mats) {
  const signs = [];
  const stele = (x, y, z, w = 3.6, h = 2.6) => { const m = box(w, h, 0.35, mats.travertine); m.position.set(x, y, z); scene.add(m); };
  const panel = (w, h, lines, opts, x, y, z, ry, transparent = true) => {
    const tex = textTexture(w, h, lines(), opts);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent }));
    m.position.set(x, y, z); m.rotation.y = ry; scene.add(m);
    signs.push({ redraw: () => tex.redraw(lines()) });
    return m;
  };
  const roomLines = (id) => () => [
    { text: t(`rooms.${id}.area`), size: 0.09, weight: 700, color: "#c2410c", tracking: 0.25, upper: true, gap: 0.05 },
    { text: t(`rooms.${id}.name`), size: 0.32, weight: 500, font: "serif", color: "#1c1a17", gap: 0.06, lh: 1.05 },
    { text: t(`rooms.${id}.sub`), size: 0.085, weight: 600, color: "#4a4339", lh: 1.35 },
  ];
  // dark ink on the light walls; the lab and terrace signs sit on stone and concrete
  stele(-4.8, 1.3, -28.75); panel(3.2, 1.6, roomLines("collection"), {}, -4.8, 1.55, -28.56, 0);
  panel(3.2, 1.6, roomLines("lab"), { bg: "#e8e2d8", pad: 0.12 }, -12.75, 2.4, -79.8, Math.PI / 2, false);
  panel(3.2, 1.6, roomLines("clients"), {}, -11.73, 2.6, -110.3, Math.PI / 2);
  stele(-4.6, 1.3, -141.2); panel(3.2, 1.6, roomLines("creator"), {}, -4.6, 1.55, -141.01, 0);

  // entrance: the xTc Corp brand mounted in the portal surround, the museum name beneath it
  const brandMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  imageTexture("../assets/img/brand/xtc-corp-600.webp", (tx) => { brandMat.map = tx; brandMat.needsUpdate = true; });
  const brand = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 2.9), brandMat); brand.position.set(0, 8.85, -18.99); scene.add(brand);
  const nameLines = () => [{ text: t("entrance.museumName"), size: 0.24, weight: 700, color: "#f2d7b8", tracking: 0.34, upper: true }];
  panel(6.4, 0.5, nameLines, { align: "center", pad: 0.1 }, 0, 6.95, -18.99, 0);
  // entrance hall walls: a welcome on the left, the building directory and controls on the right
  const wall = (lines, x, ry) => panel(5.6, 3.3, lines, { bg: "#16161a", pad: 0.3 }, x, 2.8, -9, ry, false);
  wall(() => [
    { text: t("entrance.kicker"), size: 0.12, weight: 700, color: "#ff8a5c", tracking: 0.18, upper: true, gap: 0.12, lh: 1.3 },
    { text: t("opening.line"), size: 0.46, weight: 500, font: "serif", color: IVORY, gap: 0.16, lh: 1.08 },
    { text: t("entrance.intro"), size: 0.17, weight: 500, color: MUTED, lh: 1.45 },
  ], -10.6, Math.PI / 2);
  wall(() => [
    { text: t("entrance.roomsT"), size: 0.12, weight: 700, color: "#ff8a5c", tracking: 0.18, upper: true, gap: 0.12 },
    ...ROOMS.map((r) => ({ text: `${r.area}   ${t(`rooms.${r.id}.name`)}`, size: 0.24, weight: 500, font: "serif", color: IVORY, gap: 0.08 })),
    { text: "", size: 0.06, gap: 0.04 },
    { text: t("entrance.help"), size: 0.15, weight: 500, color: MUTED, lh: 1.45 },
  ], 10.6, -Math.PI / 2);
  // the way on: a small sign above each threshold
  for (const c of CORRIDORS) {
    if (c.from === "entrance") continue; // the portal already carries the museum name
    const lines = () => [{ text: `→  ${t(`rooms.${c.to}.name`)}`, size: 0.13, weight: 600, color: "#2a251f", tracking: 0.05 }];
    panel(3, 0.36, lines, { align: "center", pad: 0.05, bg: "#efe7da" }, c.x, c.h + 0.3, c.z0 + 0.22, 0, false);
  }
  return signs;
}

// ------------------------------------------------------------- light
// A fixed pool of four point lights moves to the visitor's room (constant light count means no
// shader recompiles); a sun and a hemisphere light change colour and strength per room.
const RIG = {
  entrance:   { hemi: [0xfff3e2, 0x4a3a2a, 1.25], sun: 0, points: [[0, 9, -9, 0xffe2c4, 60], [0, 6, -17, 0xffb27a, 30], [-7, 5, -4, 0xfff1dc, 22], [7, 5, -4, 0xfff1dc, 22]] },
  collection: { hemi: [0xfff6ea, 0x4b3d2e, 1.2], sun: 0, points: [[-9, 7, -34, 0xffe8d0, 46], [9, 7, -48, 0xffe8d0, 46], [-9, 7, -62, 0xffe8d0, 46], [0, 9, -48, 0xfff4e6, 40]] },
  lab:        { hemi: [0xe8eef7, 0x2c2a2a, 1.0], sun: 0, points: [[-6, 5, -82, 0xf3f6ff, 30], [6, 5, -82, 0xf3f6ff, 30], [-6, 5, -93, 0xf3f6ff, 30], [6, 5, -95, 0xffd9b8, 30]] },
  clients:    { hemi: [0xfff0dc, 0x4a3420, 1.15], sun: 0, points: [[-8, 6, -114, 0xffe2c0, 34], [8, 6, -114, 0xffe2c0, 34], [-8, 6, -125, 0xffe2c0, 34], [8, 6, -125, 0xffe2c0, 30]] },
  creator:    { hemi: [0x9fb0d6, 0x5a3d28, 0.75], sun: 1.5, points: [[-11, 4, -150, 0xffc890, 26], [11, 4, -150, 0xffc890, 26], [0, 3.6, -166, 0xffb070, 22], [0, 4.2, -141, 0xffe0c0, 18]] },
};
export function makeLightRig(scene) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x333333, 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc68f, 0); sun.position.set(-60, 25, -330); sun.target.position.set(0, 0, -150); scene.add(sun, sun.target);
  const pool = [0, 1, 2, 3].map(() => { const l = new THREE.PointLight(0xffffff, 0, 26, 1.5); scene.add(l); return l; });
  let current = null;
  return {
    setRoom(id) {
      const cfg = RIG[id]; if (!cfg || id === current) return;
      current = id;
      hemi.color.setHex(cfg.hemi[0]); hemi.groundColor.setHex(cfg.hemi[1]); hemi.intensity = cfg.hemi[2];
      sun.intensity = cfg.sun;
      cfg.points.forEach(([x, y, z, c, i], k) => { pool[k].position.set(x, y, z); pool[k].color.setHex(c); pool[k].intensity = i; });
    },
  };
}

// Per room atmosphere for the renderer (background and haze).
export const ATMOSPHERE = {
  entrance: { fog: 0xe9dfd0, density: 0.006 },
  collection: { fog: 0xe6dccd, density: 0.006 },
  lab: { fog: 0xd8dade, density: 0.008 },
  clients: { fog: 0xe3d6c3, density: 0.008 },
  creator: { fog: 0xb99a8c, density: 0.0035 },
};

// Solid architecture the visitor cannot walk through.
export function architectureSolids() {
  const s = [];
  // entrance benches and the portal surround cheeks
  for (const sx of [-1, 1]) s.push({ x: sx * 6.8, z: -14.5, hw: 1.6, hd: 0.45 });
  // collection pilasters and the two benches on the path
  for (const z of [-27.5, -41, -55, -68.5]) for (const sx of [-1, 1]) s.push({ x: sx * 14.3, z, hw: 0.5, hd: 0.5 });
  for (const z of [-41, -55]) s.push({ x: 0, z, hw: 2.1, hd: 0.45 });
  // lab glass partitions and workbench vitrines
  for (const sx of [-1, 1]) { s.push({ x: sx * 8.7, z: -87.5, hw: 4.1, hd: 0.05 }); s.push({ x: sx * 12.35, z: -97.5, hw: 0.4, hd: 3 }); }
  // clients centre bench
  s.push({ x: 0, z: -119.5, hw: 0.5, hd: 3.5 });
  // terrace: pavilion columns, pools, the portrait and story walls, benches
  for (const sx of [-1, 1]) {
    s.push({ x: sx * 7.5, z: -146, hw: 0.15, hd: 0.15 });
    s.push({ x: sx * 5.2, z: -158, hw: 3.2, hd: 6.2 });
    s.push({ x: sx * 13.6, z: -151, hw: 0.3, hd: 4.8 });
    s.push({ x: sx * 8.5, z: -174.3, hw: 1.8, hd: 0.45 });
    for (const z of [-150, -156, -162, -168]) s.push({ x: sx * 1.9, z, hw: 0.09, hd: 0.09 });
  }
  return s;
}
