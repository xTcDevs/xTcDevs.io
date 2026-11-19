// Floor plan of the xTc Museum of Ideas, in metres. The visitor walks toward -z.
// Rooms and corridors are axis aligned rectangles; the walls, the collision system
// and the 2D map all read this one plan so they can never disagree.

export const EYE = 1.65;

// x0 < x1, z0 > z1 (z0 is the near edge, z1 the far edge)
export const ROOMS = [
  { id: "entrance",   area: "01", x0: -9,  x1: 9,  z0: 0,    z1: -18,  h: 9,  entry: [0, -4, 0] },
  { id: "collection", area: "02", x0: -14, x1: 14, z0: -24,  z1: -58,  h: 10, entry: [0, -27, 0] },
  { id: "lab",        area: "03", x0: -12, x1: 12, z0: -64,  z1: -90,  h: 6,  entry: [0, -67, 0] },
  { id: "clients",    area: "04", x0: -12, x1: 12, z0: -96,  z1: -120, h: 8,  entry: [0, -99, 0] },
  { id: "creator",    area: "05", x0: -9,  x1: 9,  z0: -126, z1: -144, h: 7,  entry: [0, -129, 0] },
];

// Thresholds between rooms. w is the opening width.
export const CORRIDORS = [
  { from: "entrance",   to: "collection", x: 0, z0: -18,  z1: -24,  w: 5, h: 5.5 },
  { from: "collection", to: "lab",        x: 0, z0: -58,  z1: -64,  w: 4, h: 4.5 },
  { from: "lab",        to: "clients",    x: 0, z0: -90,  z1: -96,  w: 4, h: 4.5 },
  { from: "clients",    to: "creator",    x: 0, z0: -120, z1: -126, w: 3, h: 4 },
];

// Where each exhibit stands. focus = the point the visitor walks up to; face = yaw the
// installation faces (radians, 0 looks toward +z, i.e. back at the visitor walking in).
// view = camera pose when inspecting [x, y, z, yaw, pitch].
export const SPOTS = {
  // Area 02, the main collection
  "toilet-wars":     { x: -8.5, z: -33, face: Math.PI / 2 },
  "haunting-mother": { x: 8.5,  z: -33, face: -Math.PI / 2 },
  "pitchit":         { x: -8.5, z: -46, face: Math.PI / 2 },
  "echomind":        { x: 8.5,  z: -46, face: -Math.PI / 2 },
  "bookverse":       { x: 0,    z: -40, face: 0 },
  // Area 03, the laboratory
  "steal-the-moon":  { x: -8,   z: -69, face: Math.PI / 2 },
  "ai-studio":       { x: 8,    z: -69, face: -Math.PI / 2 },
  "personal-ai":     { x: -8,   z: -77, face: Math.PI / 2 },
  "ai-land":         { x: 8,    z: -77, face: -Math.PI / 2 },
  "drawing-board":   { x: -8,   z: -85, face: Math.PI / 2 },
  "fintech":         { x: 8,    z: -85, face: -Math.PI / 2 },
  // Area 04, client exhibition
  "anthony-studios": { x: -9.5, z: -102, face: Math.PI / 2 },
  "princess-uc":     { x: 9.5,  z: -102, face: -Math.PI / 2 },
  "zaga":            { x: -9.5, z: -113, face: Math.PI / 2 },
  "capabilities":    { x: 9.5,  z: -113, face: -Math.PI / 2 },
  // Area 05, the creator's room
  "creator-portrait": { x: -6.6, z: -134, face: Math.PI / 2 },
  "creator-story":    { x: 6.6,  z: -131, face: -Math.PI / 2 },
  "creator-contact":  { x: 0,    z: -139, face: 0 },
};

export function roomAt(x, z) {
  for (const r of ROOMS) if (x >= r.x0 && x <= r.x1 && z <= r.z0 && z >= r.z1) return r.id;
  for (const c of CORRIDORS) if (Math.abs(x - c.x) <= c.w / 2 && z <= c.z0 && z >= c.z1) return c.to;
  return null;
}

// Walkable test with a body radius. Exhibit bases are solid discs.
const MARGIN = 0.45;
let solids = [];
export function setSolids(list) { solids = list; }
export function walkable(x, z) {
  let inside = false;
  for (const r of ROOMS) {
    if (x >= r.x0 + MARGIN && x <= r.x1 - MARGIN && z <= r.z0 - MARGIN && z >= r.z1 + MARGIN) { inside = true; break; }
  }
  if (!inside) {
    for (const c of CORRIDORS) {
      // corridors overlap the rooms by the margin so the threshold is never a wall
      if (Math.abs(x - c.x) <= c.w / 2 - MARGIN && z <= c.z0 + 1 && z >= c.z1 - 1) { inside = true; break; }
    }
  }
  if (!inside) return false;
  for (const s of solids) {
    const dx = x - s.x, dz = z - s.z;
    if (s.r) { if (dx * dx + dz * dz < (s.r + MARGIN) * (s.r + MARGIN)) return false; }
    else if (Math.abs(dx) < s.hw + MARGIN && Math.abs(dz) < s.hd + MARGIN) return false;
  }
  return true;
}

// Classic portfolio address that matches each part of the museum.
export const CLASSIC_FOR_ROOM = {
  entrance: "../index.html",
  collection: "../index.html#work",
  lab: "../index.html#stage-dev",
  clients: "../index.html#clients",
  creator: "../index.html#about",
};
