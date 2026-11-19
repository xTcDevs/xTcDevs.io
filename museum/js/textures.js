// Canvas drawn signage and cached image textures.
import * as THREE from "three";

export const INK = "#0b0c10";
export const IVORY = "#f2ece1";
export const EMBER = "#ff6a3d";
export const BLUE = "#4c7dff";
export const MUTED = "#a9a296";

const loader = new THREE.TextureLoader();
const imageCache = new Map();
let maxAniso = 4;
export function setAnisotropy(n) { maxAniso = n; }

// Loads an image texture once. Failed images resolve to a dark placeholder, never throw.
// One texture per URL. Callers that ask while the image is still loading are queued
// and called once it arrives (or once the placeholder replaces a failed image).
const waiting = new Map();
export function imageTexture(url, onReady) {
  if (imageCache.has(url)) {
    const t = imageCache.get(url);
    if (onReady) { if (t.userData.done) onReady(t); else waiting.get(url).push(onReady); }
    return t;
  }
  waiting.set(url, onReady ? [onReady] : []);
  const settle = (t) => { t.userData.done = true; t.needsUpdate = true; const q = waiting.get(url) || []; waiting.delete(url); q.forEach((fn) => fn(t)); };
  const tex = loader.load(
    url,
    (t) => settle(t),
    undefined,
    () => { console.warn("[museum] image failed:", url); tex.image = placeholderCanvas(); settle(tex); }
  );
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  imageCache.set(url, tex);
  return tex;
}

function placeholderCanvas() {
  const c = document.createElement("canvas"); c.width = 64; c.height = 40;
  const g = c.getContext("2d"); g.fillStyle = "#17181f"; g.fillRect(0, 0, 64, 40);
  return c;
}

// Text panel. lines = [{text, size, weight, color, font, gap, tracking}], drawn top-down.
// Returns a mesh-ready texture; call redraw(lines) after a language change.
export function textTexture(w, h, lines, { bg = null, pad = 0.07, align = "left", scale = 512 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  const draw = (ls) => {
    const g = canvas.getContext("2d");
    g.clearRect(0, 0, canvas.width, canvas.height);
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, canvas.width, canvas.height); }
    const px = (m) => m * scale;
    let y = px(pad);
    const left = px(pad), right = canvas.width - px(pad), maxW = right - left;
    g.textBaseline = "top";
    g.textAlign = align;
    const x = align === "center" ? canvas.width / 2 : align === "right" ? right : left;
    for (const l of ls) {
      const size = px(l.size || 0.1);
      const fam = l.font === "serif" ? "'Newsreader', Georgia, serif" : "'Manrope', 'Segoe UI', Arial, sans-serif";
      g.font = `${l.italic ? "italic " : ""}${l.weight || 500} ${size}px ${fam}`;
      g.fillStyle = l.color || IVORY;
      if ("letterSpacing" in g) g.letterSpacing = `${(l.tracking || 0) * size}px`;
      const text = l.upper ? String(l.text).toUpperCase() : String(l.text);
      for (const row of wrap(g, text, maxW)) {
        g.fillText(row, x, y);
        y += size * (l.lh || 1.18);
      }
      y += px(l.gap || 0.04);
      if (l.rule) { g.fillStyle = l.rule; g.fillRect(left, y, Math.min(maxW, px(l.ruleW || 0.6)), Math.max(2, px(0.006))); y += px(0.05); }
    }
    tex.needsUpdate = true;
  };
  draw(lines);
  tex.redraw = draw;
  return tex;
}

function wrap(g, text, maxW) {
  const out = [];
  for (const para of text.split("\n")) {
    const words = para.split(" ");
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (g.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test;
    }
    out.push(line);
  }
  return out;
}

// Noise texture for brushed metal and the moon surface.
export function noiseTexture(size = 256, { base = 120, spread = 40, streak = false } = {}) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  const g = c.getContext("2d");
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    const row = streak ? (Math.random() - 0.5) * spread * 0.6 : 0;
    for (let x = 0; x < size; x++) {
      const v = base + row + (Math.random() - 0.5) * spread;
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
