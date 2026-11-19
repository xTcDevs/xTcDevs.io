// Museum translations. Strings live in museum/locales/<lang>.json; project text in English
// comes from data/museum.json and each locale may override it under projects.<id>.
// Adding a language = add a JSON file and one entry to LANGS. Missing keys fall back to English.

export const LANGS = [
  { code: "en", name: "English" },
  { code: "fr", name: "Français" },
  { code: "es", name: "Español" },
  { code: "pt", name: "Português" },
  { code: "de", name: "Deutsch" },
];
const STORE_KEY = "xtc-lang"; // shared with the Classic portfolio

const cache = {};
let current = "en";
let dict = {};
let fallback = {};
const listeners = new Set();

async function load(code) {
  if (cache[code]) return cache[code];
  const res = await fetch(`locales/${code}.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`locale ${code}: HTTP ${res.status}`);
  cache[code] = await res.json();
  return cache[code];
}

function lookup(obj, key) {
  return key.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

export function t(key, vars) {
  let s = lookup(dict, key);
  if (s === undefined) s = lookup(fallback, key);
  if (s === undefined) return key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
  return s;
}

// Project text: translated override when present, otherwise the English source data.
export function pt(project, field) {
  const v = lookup(dict, `projects.${project.id}.${field}`);
  return v !== undefined ? v : project[field];
}

export function lang() { return current; }

export function initialLang() {
  let stored = null;
  try { stored = localStorage.getItem(STORE_KEY); } catch (e) { /* storage blocked */ }
  if (stored && LANGS.some((l) => l.code === stored)) return stored;
  const nav = (navigator.language || "en").slice(0, 2).toLowerCase();
  return LANGS.some((l) => l.code === nav) ? nav : "en";
}

export async function setLang(code, { persist = true } = {}) {
  if (!LANGS.some((l) => l.code === code)) code = "en";
  try {
    fallback = await load("en");
    dict = code === "en" ? fallback : await load(code);
    current = code;
  } catch (err) {
    console.warn("[museum] could not load language, using English", err);
    dict = fallback; current = "en";
  }
  document.documentElement.lang = current;
  if (persist) { try { localStorage.setItem(STORE_KEY, current); } catch (e) { /* storage blocked */ } }
  applyDom();
  listeners.forEach((fn) => fn(current));
  return current;
}

export function onLangChange(fn) { listeners.add(fn); }

// Static DOM: data-t="key", data-t-attr="attr:key;attr2:key2"
export function applyDom(root = document) {
  root.querySelectorAll("[data-t]").forEach((el) => { el.textContent = t(el.dataset.t); });
  root.querySelectorAll("[data-t-attr]").forEach((el) => {
    el.dataset.tAttr.split(";").forEach((pair) => {
      const [attr, key] = pair.split(":");
      if (attr && key) el.setAttribute(attr.trim(), t(key.trim()));
    });
  });
}
