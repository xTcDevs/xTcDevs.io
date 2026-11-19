// Floor plan of the xTc Museum of Ideas, in metres. The visitor walks toward -z.
// Rooms and corridors are axis aligned rectangles; the walls, the collision system
// and the 2D map all read this one plan so they can never disagree.

export const EYE = 1.65;

// x0 < x1, z0 > z1 (z0 is the near edge, z1 the far edge). outdoor rooms have no roof.
export const ROOMS = [
  { id: "entrance",   area: "01", x0: -11, x1: 11, z0: 0,    z1: -20,  h: 11, entry: [0, -4, 0] },
  { id: "collection", area: "02", x0: -15, x1: 15, z0: -26,  z1: -70,  h: 8,  vault: 3.6, entry: [0, -29, 0] },
  { id: "lab",        area: "03", x0: -13, x1: 13, z0: -76,  z1: -102, h: 6.5, entry: [0, -79, 0] },
  { id: "clients",    area: "04", x0: -12, x1: 12, z0: -108, z1: -130, h: 7.5, entry: [0, -111, 0] },
  { id: "creator",    area: "05", x0: -22, x1: 22, z0: -136, z1: -178, h: 12, outdoor: true, entry: [0, -139.5, 0] },
];

// Thresholds between rooms. w is the opening width.
export const CORRIDORS = [
  { from: "entrance",   to: "collection", x: 0, z0: -20,  z1: -26,  w: 6, h: 6 },
  { from: "collection", to: "lab",        x: 0, z0: -70,  z1: -76,  w: 5, h: 5 },
  { from: "lab",        to: "clients",    x: 0, z0: -102, z1: -108, w: 5, h: 5 },
  { from: "clients",    to: "creator",    x: 0, z0: -130, z1: -136, w: 6, h: 5 },
];

// Where each exhibit stands. face = yaw the installation faces (radians, 0 looks toward +z,
// i.e. back at the visitor walking in). Wall exhibits stand 5.5 m out from their wall.
export const SPOTS = {
  // Area 02, the main collection: three bays per side, BookVerse on the axis.
  "toilet-wars":     { x: -9.5, z: -34, face: Math.PI / 2 },
  "haunting-mother": { x: 9.5,  z: -34, face: -Math.PI / 2 },
  "pitchit":         { x: -9.5, z: -48, face: Math.PI / 2 },
  "echomind":        { x: 9.5,  z: -48, face: -Math.PI / 2 },
  "steal-the-moon":  { x: 9.5,  z: -62, face: -Math.PI / 2 },
  "bookverse":       { x: -9.5, z: -62, face: Math.PI / 2 },
  // Area 03, the laboratory
  "ai-studio":       { x: -8,   z: -82, face: Math.PI / 2 },
  "personal-ai":     { x: 8,    z: -82, face: -Math.PI / 2 },
  "ai-land":         { x: -8,   z: -93, face: Math.PI / 2 },
  "drawing-board":   { x: 8,    z: -93, face: -Math.PI / 2 },
  "fintech":         { x: 0,    z: -98.5, face: 0 },
  // Area 04, client exhibition
  "anthony-studios": { x: -9.5, z: -114, face: Math.PI / 2 },
  "princess-uc":     { x: 9.5,  z: -114, face: -Math.PI / 2 },
  "zaga":            { x: -9.5, z: -125, face: Math.PI / 2 },
  "capabilities":    { x: 9.5,  z: -125, face: -Math.PI / 2 },
  // Area 05, the waterfront terrace
  "creator-portrait": { x: -11, z: -151, face: Math.PI / 2 },
  "creator-story":    { x: 11,  z: -151, face: -Math.PI / 2 },
  "creator-contact":  { x: 0,   z: -169, face: 0 },
};

export function roomAt(x, z) {
  for (const r of ROOMS) if (x >= r.x0 && x <= r.x1 && z <= r.z0 && z >= r.z1) return r.id;
  for (const c of CORRIDORS) if (Math.abs(x - c.x) <= c.w / 2 && z <= c.z0 && z >= c.z1) return c.to;
  return null;
}

// Walkable test with a body radius. Exhibit bases are solid discs or boxes.
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
