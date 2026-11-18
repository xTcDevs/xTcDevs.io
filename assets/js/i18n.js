/*
 * Lightweight i18n for a static site.
 * - Language resources live in /locales/<code>.json (nested keys).
 * - Elements opt in with:
 *     data-i18n="key"            -> textContent
 *     data-i18n-html="key"       -> innerHTML (only for trusted locale strings)
 *     data-i18n-attr="attr:key;attr2:key2"
 * - To add a language: create /locales/<code>.json and add it to LANGUAGES below.
 */
(function () {
  // code: file name in /locales · name: shown in the selector (in its own language)
  // tag: value for <html lang> · dir: "rtl" for right to left scripts
  var LANGUAGES = [
    { code: "en", name: "English" },
    { code: "fr", name: "Français" },
    { code: "es", name: "Español" },
    { code: "pt", name: "Português" },
    { code: "de", name: "Deutsch" },
    { code: "ig", name: "Igbo" },
    { code: "yo", name: "Yorùbá" },
    { code: "ha", name: "Hausa" },
    { code: "ar", name: "العربية", dir: "rtl" },
    { code: "hi", name: "हिन्दी" },
    { code: "zh", name: "中文（简体）", tag: "zh-Hans" }
  ];
  function info(code) {
    for (var i = 0; i < LANGUAGES.length; i++) if (LANGUAGES[i].code === code) return LANGUAGES[i];
    return LANGUAGES[0];
  }
  var DEFAULT = "en";
  var STORE_KEY = "xtc-lang";
  var root = document.documentElement.getAttribute("data-root") || "./";
  var cache = {};
  var current = DEFAULT;
  var dict = {};
  var fallback = {};

  function supported(code) {
    return LANGUAGES.some(function (l) { return l.code === code; });
  }

  function flatten(obj, prefix, out) {
    out = out || {};
    Object.keys(obj).forEach(function (k) {
      var key = prefix ? prefix + "." + k : k;
      if (obj[k] && typeof obj[k] === "object" && !Array.isArray(obj[k])) flatten(obj[k], key, out);
      else out[key] = obj[k];
    });
    return out;
  }

  function load(code) {
    if (cache[code]) return Promise.resolve(cache[code]);
    return fetch(root + "locales/" + code + ".json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (json) { cache[code] = flatten(json); return cache[code]; });
  }

  function t(key, vars) {
    var s = dict[key];
    if (s == null) s = fallback[key];
    if (s == null) return null;
    if (vars) Object.keys(vars).forEach(function (v) { s = s.split("{" + v + "}").join(vars[v]); });
    return s;
  }

  function apply(scope) {
    scope = scope || document;
    scope.querySelectorAll("[data-i18n]").forEach(function (el) {
      var v = t(el.getAttribute("data-i18n"));
      if (v != null) el.textContent = v;
    });
    scope.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var v = t(el.getAttribute("data-i18n-html"));
      if (v != null) el.innerHTML = v;
    });
    scope.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var p = pair.split(":");
        var v = t((p[1] || "").trim());
        if (p[0] && v != null) el.setAttribute(p[0].trim(), v);
      });
    });
    var page = document.documentElement.getAttribute("data-page") || "home";
    var title = t("meta." + page + ".title");
    var desc = t("meta." + page + ".description");
    if (title) document.title = title;
    if (desc) {
      var m = document.querySelector('meta[name="description"]');
      if (m) m.setAttribute("content", desc);
    }
  }

  function detect() {
    var stored = null;
    try { stored = localStorage.getItem(STORE_KEY); } catch (e) {}
    if (stored && supported(stored)) return stored;
    var prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || DEFAULT];
    for (var i = 0; i < prefs.length; i++) {
      var base = String(prefs[i]).toLowerCase().split("-")[0];
      if (supported(base)) return base;
    }
    return DEFAULT;
  }

  function setLanguage(code, persist) {
    if (!supported(code)) code = DEFAULT;
    return Promise.all([load(DEFAULT), code === DEFAULT ? null : load(code)])
      .then(function (res) {
        fallback = res[0];
        dict = res[1] || res[0];
        current = code;
        var meta = info(code);
        document.documentElement.lang = meta.tag || code;
        document.documentElement.dir = meta.dir || "ltr";
        if (persist) { try { localStorage.setItem(STORE_KEY, code); } catch (e) {} }
        apply();
        var sel = document.getElementById("lang-select");
        if (sel) sel.value = code;
        document.dispatchEvent(new CustomEvent("xtc:lang", { detail: { lang: code } }));
      })
      .catch(function (err) {
        console.warn("[i18n] could not load language '" + code + "':", err.message);
        if (code !== DEFAULT) return setLanguage(DEFAULT, false);
      });
  }

  function buildSelect() {
    var sel = document.getElementById("lang-select");
    if (!sel) return;
    sel.innerHTML = "";
    LANGUAGES.forEach(function (l) {
      var o = document.createElement("option");
      o.value = l.code;
      o.textContent = l.name;
      o.lang = l.tag || l.code;
      if (l.dir) o.dir = l.dir;
      sel.appendChild(o);
    });
    sel.addEventListener("change", function () { setLanguage(sel.value, true); });
  }

  window.XTC_I18N = {
    t: t,
    apply: apply,
    setLanguage: setLanguage,
    get lang() { return current; },
    languages: LANGUAGES
  };

  buildSelect();
  window.XTC_I18N.ready = setLanguage(detect(), false);
})();
