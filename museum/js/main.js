// xTc Museum of Ideas: boot, render loop and interface.
import * as THREE from "three";
import { RoomEnvironment } from "../vendor/RoomEnvironment.js";
import { ROOMS, CORRIDORS, SPOTS, EYE, roomAt, setSolids, CLASSIC_FOR_ROOM } from "./layout.js";
import { LANGS, t, pt, setLang, initialLang, onLangChange, lang } from "./i18n.js";
import { makeMaterials, buildWorld, buildSigns, makeLightRig, architectureSolids } from "./world.js";
import { buildExhibits, animateExhibits } from "./exhibits.js";
import { createControls } from "./controls.js";
import { createAudio } from "./audio.js";
import { setAnisotropy } from "./textures.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ROOT = "../";
const PLANNED = new Set(["concept", "explore", "prototype", "dev", "ready"]);

// ------------------------------------------------------------------ preferences
const PREF_KEY = "xtc-museum-prefs";
const coarse = matchMedia("(pointer: coarse)").matches;
const prefs = Object.assign(
  { sensitivity: 1, quality: "auto", reduced: matchMedia("(prefers-reduced-motion: reduce)").matches, joystick: coarse, sound: false, ambience: true, effects: true, volume: 0.6 },
  readPrefs()
);
function readPrefs() { try { return JSON.parse(localStorage.getItem(PREF_KEY)) || {}; } catch (e) { return {}; } }
function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* storage blocked */ } }

// ------------------------------------------------------------------ app state
const app = {
  data: null, renderer: null, scene: null, camera: null, controls: null, exhibits: [], signs: [],
  rig: null, ready: false, building: null, mode: "entrance", room: "entrance",
  near: null, inspecting: null, returnPose: null, tour: null, clock: new THREE.Clock(),
  audio: createAudio(), webgl: hasWebGL(),
};

function hasWebGL() {
  try { const c = document.createElement("canvas"); return !!(window.WebGL2RenderingContext && c.getContext("webgl2")) || !!c.getContext("webgl"); }
  catch (e) { return false; }
}

// ------------------------------------------------------------------ boot
boot().catch((err) => fatal(err));

async function boot() {
  fillLangSelects();
  if (coarse) $(".js-hint").dataset.t = "ui.touchHint";
  await setLang(initialLang(), { persist: false });
  const res = await fetch(`${ROOT}data/museum.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`museum data: HTTP ${res.status}`);
  app.data = await res.json();
  app.byId = Object.fromEntries(app.data.projects.map((p) => [p.id, p]));
  wireUi();
  applyPrefsToUi();
  qualityNote();
  onLangChange(refreshLanguage);

  const hash = parseHash();
  if (hash.view === "list") return showGallery();
  if ((hash.exhibit || hash.room) && app.webgl) {
    // Direct link or refresh: go straight back to where the visitor was.
    $("#entrance").hidden = true;
    await enterMuseum({ skipIntro: true, restore: hash });
    return;
  }
  // Start building quietly behind the entrance screen so "Enter" is instant.
  if (app.webgl && !(navigator.connection && navigator.connection.saveData)) app.building = buildScene().catch((e) => { app.buildError = e; });
}

function fatal(err) {
  console.error("[museum]", err);
  $("#entrance").hidden = true;
  const l = $("#loader"); l.hidden = false;
  $(".loader__bar", l).hidden = true;
  $(".js-loader-msg").textContent = t("loading.failedT");
  $(".loader__err", l).hidden = false;
  $(".js-loader-err").textContent = t("loading.failed");
}

// ------------------------------------------------------------------ 3D scene
async function buildScene() {
  if (app.ready) return;
  const progress = (k, key) => { $(".js-loader-bar").style.width = `${Math.round(k * 100)}%`; if (key) $(".js-loader-msg").textContent = t(key); };
  progress(0.08, "loading.building");
  const quality = resolveQuality();
  const renderer = new THREE.WebGLRenderer({ antialias: quality === "high", powerPreference: "high-performance" });
  renderer.setPixelRatio(pixelRatioFor(quality));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  setAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));
  $("#stage").appendChild(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.addEventListener("webglcontextlost", (e) => { e.preventDefault(); fatal(new Error("WebGL context lost")); });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050608);
  scene.fog = new THREE.FogExp2(0x050608, 0.03);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;
  const camera = new THREE.PerspectiveCamera(coarse ? 74 : 66, innerWidth / innerHeight, 0.05, 90);

  progress(0.3, "loading.fonts");
  // Signage is drawn on canvases, so wait (briefly) for the web fonts.
  await Promise.race([
    Promise.all([document.fonts.load("500 40px Newsreader"), document.fonts.load("700 40px Manrope"), document.fonts.load("500 40px Manrope")]),
    new Promise((r) => setTimeout(r, 2500)),
  ]).catch(() => {});

  progress(0.45, "loading.rooms");
  const mats = makeMaterials(quality);
  buildWorld(scene, mats, quality);
  app.signs = buildSigns(scene, t);
  app.rig = makeLightRig(scene);
  progress(0.7, "loading.exhibits");
  app.exhibits = buildExhibits(scene, mats, app.data, t);
  setSolids([...architectureSolids(), ...app.exhibits.filter((e) => e.solid).map((e) => e.solid)]);

  const controls = createControls(camera, renderer.domElement, {
    isTouch: () => coarse,
    usePointerLock: () => !coarse && !app.inspecting && !app.tour,
    onPointerLock: (locked) => {
      document.body.classList.toggle("is-locked", locked);
      $(".js-hint").style.opacity = locked ? 0 : 1;
      if (!locked && app.mode === "explore" && !app.inspecting && !app.suppressPause && !$("#map").open) openSheet("#settings");
      app.suppressPause = false;
    },
    onDragWhileLocked: (dx) => { if (canRotate(app.inspecting)) app.inspecting.model.rotation.y += dx * 0.01; },
    onTap: () => { if (coarse && app.near && app.mode === "explore") inspect(app.near); },
  });
  controls.state.sensitivity = prefs.sensitivity;
  controls.bindJoystick($("#joy"), $(".joy__knob"));
  Object.assign(app, { renderer, scene, camera, controls });
  controls.teleport(0, -4, 0);
  app.rig.setRoom("entrance");

  // compile shaders before the first visible frame to avoid a stutter on entry
  progress(0.9, "loading.lighting");
  renderer.compile(scene, camera);
  addEventListener("resize", onResize);
  app.ready = true;
  progress(1);
  requestAnimationFrame(loop);
}

function resolveQuality() {
  if (prefs.quality !== "auto") return prefs.quality;
  const weak = coarse || (navigator.hardwareConcurrency || 4) <= 4 || (navigator.deviceMemory || 8) <= 4;
  return weak ? "low" : "high";
}
function pixelRatioFor(q) { return q === "high" ? Math.min(devicePixelRatio, 2) : Math.min(devicePixelRatio, coarse ? 1.25 : 1); }
function onResize() {
  if (!app.renderer) return;
  app.camera.aspect = innerWidth / innerHeight; app.camera.updateProjectionMatrix();
  app.renderer.setSize(innerWidth, innerHeight);
}

// Adaptive quality: if frames are slow for a few seconds in automatic mode, render fewer pixels.
const perf = { acc: 0, n: 0, steps: 0 };
function adapt(dt) {
  if (prefs.quality !== "auto" || perf.steps > 2) return;
  perf.acc += dt; perf.n++;
  if (perf.acc < 3) return;
  const fps = perf.n / perf.acc; perf.acc = 0; perf.n = 0;
  if (fps < 40) {
    const pr = app.renderer.getPixelRatio();
    if (pr > 0.7) { app.renderer.setPixelRatio(Math.max(0.7, pr - 0.3)); perf.steps++; onResize(); console.info(`[museum] lowered resolution to ${app.renderer.getPixelRatio().toFixed(2)} (${fps.toFixed(0)} fps)`); }
  } else perf.steps = 3;
}

function loop() {
  requestAnimationFrame(loop);
  // Walking uses a small fixed cap so collisions stay reliable; camera flights follow the real clock
  // so the tour and inspect moves take the same time on slow devices.
  const rawDt = Math.min(0.25, app.clock.getDelta());
  const dt = Math.min(0.05, rawDt);
  const time = app.clock.elapsedTime;
  const c = app.controls;
  if (app.mode === "entrance" && !c.state.flight) {
    // Slow drift in front of the gate behind the entrance screen.
    const a = prefs.reduced ? 0 : time * 0.06;
    c.state.pos.set(Math.sin(a) * 2.2, 2.1, -3 + Math.cos(a) * 0.6);
    const ang = c.lookAtAngles(c.state.pos, new THREE.Vector3(0, 4.6, -17));
    c.state.yaw = ang.yaw; c.state.pitch = ang.pitch;
  }
  c.update(dt, prefs.reduced, rawDt);
  if (app.mode === "explore") {
    const room = roomAt(c.state.pos.x, c.state.pos.z);
    if (room && room !== app.room) setRoom(room);
    detectNear();
    app.audio.step(dt, c.state.walking);
    saveHashSoon();
  }
  animateExhibits(app.exhibits, time, dt, prefs.reduced, app.inspecting);
  if (app.mapOpen) drawMe();
  adapt(dt);
  if (app.mode !== "gallery") app.renderer.render(app.scene, app.camera); // the list view hides the scene, so stop drawing it
}

// ------------------------------------------------------------------ entering and leaving
async function enterMuseum({ tour = false, skipIntro = false, restore = null } = {}) {
  if (!app.webgl) { qualityNote(true); return showGallery(); }
  app.audio.tick();
  const ent = $("#entrance");
  ent.classList.add("is-leaving");
  setTimeout(() => { ent.hidden = true; ent.classList.remove("is-leaving"); }, 700);
  if (!app.ready) {
    $("#loader").hidden = false;
    try { await (app.building || (app.building = buildScene())); if (app.buildError) throw app.buildError; }
    catch (e) { return fatal(e); }
    $("#loader").hidden = true;
  }
  $("#gallery").hidden = true; document.body.classList.remove("is-gallery");
  $("#hud").hidden = false;
  const c = app.controls;
  app.mode = "intro";
  updateJoystick();
  const finish = () => {
    $("#opening").hidden = true;
    app.mode = "explore"; c.state.enabled = true;
    setRoom(roomAt(c.state.pos.x, c.state.pos.z) || "entrance", true);
    if (restore && restore.exhibit) { const ex = app.exhibits.find((e) => e.id === restore.exhibit); if (ex) inspect(ex, { instant: true }); }
    if (tour) startTour();
  };
  if (restore && restore.p) {
    const [x, z, yaw] = restore.p; c.teleport(x, z, yaw); return finish();
  }
  if (restore && (restore.room || restore.exhibit)) {
    const r = ROOMS.find((q) => q.id === (restore.room || app.byId[restore.exhibit]?.room || "entrance")) || ROOMS[0];
    c.teleport(r.entry[0], r.entry[1], r.entry[2]); return finish();
  }
  if (skipIntro || prefs.reduced) { c.teleport(0, -4, 0); return finish(); }
  // Opening sequence: a slow glide toward the gate, skippable.
  $("#opening").hidden = false;
  c.state.pos.set(0, 2.6, -1); c.state.yaw = 0; c.state.pitch = 0.12;
  app.skipIntro = () => { c.state.flight = null; c.teleport(0, -4, 0); finish(); app.skipIntro = null; };
  c.flyTo(new THREE.Vector3(0, EYE, -4.5), 0, 0.05, 4.2, () => { if (app.skipIntro) { app.skipIntro = null; finish(); } });
}

function backToEntrance() {
  closePanel(true); endTour(); closeSheets();
  app.suppressPause = true; app.controls.releasePointer();
  app.mode = "entrance"; app.controls.state.enabled = false;
  $("#hud").hidden = true; $("#prompt").hidden = true;
  $("#entrance").hidden = false;
  setRoom("entrance", true);
  history.replaceState(null, "", location.pathname);
  $(".js-enter").focus();
}

// ------------------------------------------------------------------ rooms
function setRoom(id, force) {
  if (!force && id === app.room) return;
  app.room = id;
  const r = ROOMS.find((q) => q.id === id);
  $(".js-area").textContent = r ? r.area : "";
  $(".js-room").textContent = t(`rooms.${id}.name`);
  app.rig && app.rig.setRoom(id);
  app.audio.room(id);
  updateClassicLinks();
}

function updateClassicLinks() {
  const href = app.inspecting && app.inspecting.project ? `${ROOT}${app.inspecting.project.case}` : CLASSIC_FOR_ROOM[app.room] || `${ROOT}index.html`;
  $$(".js-classic").forEach((a) => { a.href = href; });
}

// ------------------------------------------------------------------ proximity and inspect
const tmpF = new THREE.Vector3();
function detectNear() {
  if (app.inspecting || app.tour || app.controls.state.flight) {
    if (app.near) { app.near = null; $("#prompt").hidden = true; }
    return;
  }
  const p = app.controls.state.pos;
  tmpF.set(-Math.sin(app.controls.state.yaw), 0, -Math.cos(app.controls.state.yaw));
  let best = null, bestD = 4.2;
  for (const ex of app.exhibits) {
    const dx = ex.spot.x - p.x, dz = ex.spot.z - p.z, d = Math.hypot(dx, dz);
    if (d > bestD) continue;
    const facing = (dx * tmpF.x + dz * tmpF.z) / (d || 1);
    if (facing < 0.35 && d > 1.6) continue;
    best = ex; bestD = d;
  }
  if (best !== app.near) {
    app.near = best;
    const pr = $("#prompt");
    if (best) {
      $(".js-prompt-title").textContent = exhibitTitle(best);
      $(".js-prompt-verb").textContent = t(best.kind === "creator-contact" ? "ui.contactVerb" : "ui.inspect");
      $(".js-inspect kbd").hidden = coarse;
      pr.hidden = false; app.audio.tick();
    } else pr.hidden = true;
  }
}

// Only free standing objects turn under the visitor's hand; screens and walls stay put.
const canRotate = (ex) => !!(ex && ex.model && ex.model.children.length);

function exhibitTitle(ex) {
  if (ex.project) return ex.project.title;
  return t({ capabilities: "caps.title", "creator-about": "creator.aboutT", "creator-background": "creator.backgroundT", "creator-contact": "contact.title" }[ex.kind]);
}

function inspect(ex, { instant = false } = {}) {
  if (!ex) return;
  if (app.inspecting === ex) return;
  const c = app.controls;
  if (!app.inspecting) app.returnPose = { p: c.state.pos.clone(), yaw: c.state.yaw, pitch: c.state.pitch };
  app.inspecting = ex;
  document.body.classList.add("is-inspecting");
  app.suppressPause = true; c.releasePointer();
  c.state.locked = true; c.state.vel.set(0, 0); c.state.keys.clear();
  $("#prompt").hidden = true;
  const ang = c.lookAtAngles(ex.eye, ex.target);
  if (instant || prefs.reduced) { c.state.flight = null; c.state.pos.copy(ex.eye); c.state.yaw = ang.yaw; c.state.pitch = ang.pitch; }
  else c.flyTo(ex.eye, ang.yaw, ang.pitch, 1.1);
  openPanel(ex);
  $("#inspect-hint").hidden = !canRotate(ex) || (coarse && innerWidth < 700);
  app.audio.open();
  setHash({ exhibit: ex.id });
  updateClassicLinks();
}

function closePanel(silent) {
  const ex = app.inspecting;
  $("#panel").hidden = true; $("#inspect-hint").hidden = true;
  app.panelFor = null;
  document.body.classList.remove("is-inspecting");
  if (!ex) return;
  app.inspecting = null;
  if (ex.model) ex.model.rotation.y = ex.baseRotY;
  const c = app.controls;
  if (app.tour) { c.state.locked = true; return; }
  const back = () => { c.state.locked = false; };
  if (app.returnPose && !silent) {
    if (prefs.reduced) { c.state.pos.copy(app.returnPose.p); c.state.yaw = app.returnPose.yaw; c.state.pitch = app.returnPose.pitch; back(); }
    else c.flyTo(app.returnPose.p, app.returnPose.yaw, app.returnPose.pitch, 0.8, back);
  } else back();
  if (!silent) app.audio.close();
  setHash({});
  updateClassicLinks();
  if (app.mode === "gallery") return;
}

// ------------------------------------------------------------------ panel content
function openPanel(ex) {
  app.panelFor = ex;
  const body = $(".js-panel-body");
  body.innerHTML = panelHtml(ex);
  const panel = $("#panel"); panel.hidden = false;
  panel.scrollTop = 0;
  $(".js-copy-email", body)?.addEventListener("click", copyEmail);
  requestAnimationFrame(() => panel.focus({ preventScroll: true }));
}

function linkLabel(l) { const k = `links.${l.label}`; const v = t(k); return v === k ? l.label : v; }

function panelHtml(ex) {
  const d = app.data, c = d.creator;
  if (ex.project || ex.kind === "project") {
    const p = ex.project || ex;
    const plan = PLANNED.has(p.status);
    const room = t(`rooms.${p.room}.name`);
    const imgs = (p.images || []).map((u) => `<a href="${esc(ROOT + u.replace(/-(640|400|800)\.webp$/, ".webp"))}" target="_blank" rel="noopener"><img src="${esc(ROOT + u)}" alt="${esc(t("ui.screenshotOf", { title: p.title }))}" loading="lazy"></a>`).join("");
    const links = [`<a class="btn btn--line" href="${esc(ROOT + p.case)}">${esc(t("links.caseStudy"))}</a>`]
      .concat((p.links || []).map((l) => `<a class="btn ${l.kind === "play" || l.kind === "demo" ? "btn--ember" : "btn--line"}" href="${esc(l.href.startsWith("http") ? l.href : ROOT + l.href.replace(/^\.\.\//, ""))}" ${l.href.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>${esc(linkLabel(l))}</a>`)).join("");
    return `
      <p class="kicker">${esc(t(`rooms.${p.room}.area`))} · ${esc(room)}</p>
      <h2 id="panel-title">${esc(p.title)}</h2>
      <div class="meta"><span class="chip chip--status ${plan ? "is-plan" : ""}">${esc(t(`status.${p.status}`))}</span>${p.cats.map((k) => `<span class="chip chip--quiet">${esc(t(`cats.${k}`))}</span>`).join("")}${p.client ? `<span class="chip chip--quiet">${esc(t("cats.client"))}</span>` : ""}</div>
      ${pt(p, "tagline") ? `<p class="lede"><em>${esc(pt(p, "tagline"))}</em></p>` : ""}
      <p class="lede">${esc(pt(p, "lede"))}</p>
      ${plan ? `<p class="concept-note">${esc(t(p.status === "concept" || p.status === "explore" ? "ui.conceptNote" : "ui.devNote"))}</p>` : ""}
      ${p.tech && p.tech.length ? `<h3>${esc(t("ui.tech"))}</h3><ul class="tags">${p.tech.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      ${imgs ? `<h3>${esc(t(p.concept ? "ui.conceptImages" : "ui.screens"))}</h3><div class="shots ${p.phone ? "shots--phone" : ""}">${imgs}</div>${p.concept ? `<p class="concept-note">${esc(t("ui.conceptArt"))}</p>` : ""}` : `<p class="concept-note">${esc(t("ui.noImages"))}</p>`}
      <h3>${esc(t("ui.links"))}</h3><div class="links">${links}</div>`;
  }
  if (ex.kind === "capabilities") {
    const clients = d.projects.filter((p) => p.client);
    return `
      <p class="kicker">${esc(t("rooms.clients.area"))} · ${esc(t("rooms.clients.name"))}</p>
      <h2 id="panel-title">${esc(t("caps.title"))}</h2>
      <p class="lede">${esc(t("caps.lede"))}</p>
      ${["software", "product", "ai", "games", "creative"].map((k) => `<h3>${esc(t(`caps.${k}.t`))}</h3><p>${esc(t(`caps.${k}.d`))}</p>`).join("")}
      <h3>${esc(t("caps.clientWork"))}</h3>
      <ul class="timeline">${clients.map((p) => `<li><b>${esc(p.title)}</b><span>${esc(t(`status.${p.status}`))} · ${esc(pt(p, "desc"))}</span></li>`).join("")}</ul>
      <h3>${esc(t("creator.experienceT"))}</h3>
      <ul class="timeline">${c.experience.map((e, i) => `<li><b>${esc(t(`creator.exp${i}.role`))}</b><span>${esc(t(`creator.exp${i}.org`))} · ${esc(t(`creator.exp${i}.when`))}</span></li>`).join("")}</ul>
      <div class="links"><a class="btn btn--ember" href="${esc(ROOT + c.cv)}" download>${esc(t("contact.cv"))}</a><a class="btn btn--line" href="${ROOT}index.html#contact">${esc(t("contact.form"))}</a></div>`;
  }
  if (ex.kind === "creator-about") {
    return `
      <p class="kicker">${esc(t("rooms.creator.area"))} · ${esc(t("rooms.creator.name"))}</p>
      <img class="portrait-sm" src="${esc(ROOT + c.portrait.replace("1000", "640"))}" alt="${esc(t("creator.portraitAlt"))}">
      <h2 id="panel-title">${esc(c.name)}</h2>
      <p class="lede">${esc(t("creator.role"))}</p>
      <p>${esc(t("creator.intro"))}</p>
      <h3>${esc(t("creator.whatT"))}</h3><p>${esc(t("creator.what"))}</p>
      <h3>${esc(t("creator.interestsT"))}</h3><p>${esc(t("creator.interests"))}</p>
      <h3>${esc(t("creator.approachT"))}</h3><p>${esc(t("creator.approach"))}</p>
      <h3>${esc(t("creator.directionT"))}</h3><p>${esc(t("creator.direction"))}</p>
      <dl class="facts"><dt>${esc(t("creator.basedT"))}</dt><dd>${esc(t("creator.based"))}</dd><dt>${esc(t("creator.langsT"))}</dt><dd>${esc(t("creator.langs"))}</dd></dl>`;
  }
  if (ex.kind === "creator-background") {
    const live = d.projects.filter((p) => p.status === "live" || p.status === "published");
    return `
      <p class="kicker">${esc(t("rooms.creator.area"))} · ${esc(t("rooms.creator.name"))}</p>
      <h2 id="panel-title">${esc(t("creator.backgroundT"))}</h2>
      <h3>${esc(t("creator.experienceT"))}</h3>
      <ul class="timeline">${c.experience.map((e, i) => `<li><b>${esc(t(`creator.exp${i}.role`))}</b><span>${esc(t(`creator.exp${i}.org`))} · ${esc(t(`creator.exp${i}.when`))}</span></li>`).join("")}</ul>
      <h3>${esc(t("creator.educationT"))}</h3>
      <ul class="timeline">${c.education.map((e, i) => `<li><b>${esc(t(`creator.edu${i}.what`))}</b><span>${esc(e.where)} · ${esc(t(`creator.edu${i}.when`))}</span></li>`).join("")}</ul>
      <h3>${esc(t("creator.skillsT"))}</h3>
      ${Object.entries(c.skills).map(([g, list]) => `<p><b>${esc(t(`skills.${g}`))}</b>: ${esc(list.join(", "))}</p>`).join("")}
      <h3>${esc(t("creator.shippedT"))}</h3>
      <ul class="timeline">${live.map((p) => `<li><b>${esc(p.title)}</b><span>${esc(t(`status.${p.status}`))}</span></li>`).join("")}</ul>
      <div class="links"><a class="btn btn--ember" href="${esc(ROOT + c.cv)}" download>${esc(t("contact.cv"))}</a></div>`;
  }
  // contact
  return `
    <p class="kicker">${esc(t("rooms.creator.area"))} · ${esc(t("rooms.creator.name"))}</p>
    <h2 id="panel-title">${esc(t("contact.title"))}</h2>
    <p class="lede">${esc(t("contact.lede"))}</p>
    <div class="links">
      <a class="btn btn--ember" href="mailto:${esc(c.email)}">${esc(t("contact.email"))}</a>
      <button class="btn btn--line js-copy-email" type="button">${esc(t("contact.copy"))}</button>
    </div>
    <p>${esc(c.email)}</p>
    <h3>${esc(t("contact.elsewhere"))}</h3>
    <div class="links">${c.social.map((s) => `<a class="btn btn--line" href="${esc(s.href)}" target="_blank" rel="noopener">${esc(s.name)} · ${esc(s.handle)}</a>`).join("")}</div>
    <h3>${esc(t("contact.moreT"))}</h3>
    <div class="links">
      <a class="btn btn--line" href="${esc(ROOT + c.cv)}" download>${esc(t("contact.cv"))}</a>
      <a class="btn btn--line" href="${ROOT}index.html#contact">${esc(t("contact.form"))}</a>
      <a class="btn btn--quiet" href="${ROOT}index.html">${esc(t("ui.classic"))}</a>
    </div>`;
}

async function copyEmail(e) {
  const btn = e.currentTarget, email = app.data.creator.email;
  try { await navigator.clipboard.writeText(email); btn.textContent = t("contact.copied"); }
  catch (err) { location.href = `mailto:${email}`; }
}

// ------------------------------------------------------------------ map
function openMap() {
  const box = $(".js-map");
  // Horizontal plan: svg x = -z (depth), svg y = x (width).
  const rooms = ROOMS.map((r) => `
    <g class="room-g"><rect class="room ${r.id === app.room ? "is-here" : ""}" tabindex="0" role="button" data-room="${r.id}" aria-label="${esc(`${r.area} ${t(`rooms.${r.id}.name`)}`)}"
      x="${-r.z0}" y="${r.x0}" width="${r.z0 - r.z1}" height="${r.x1 - r.x0}" rx="0.6"/>
    <text class="label-area" text-anchor="middle" x="${-(r.z0 + r.z1) / 2}" y="${r.x1 + 2.2}">${r.area}</text>
    <text text-anchor="middle" x="${-(r.z0 + r.z1) / 2}" y="${r.x1 + 4.4}">${esc(t(`rooms.${r.id}.name`))}</text></g>`).join("");
  const corrs = CORRIDORS.map((c) => `<rect class="corr" x="${-c.z0}" y="${c.x - c.w / 2}" width="${c.z0 - c.z1}" height="${c.w}"/>`).join("");
  const dots = app.exhibits.map((ex) => {
    const plan = ex.project && PLANNED.has(ex.project.status);
    return `<circle class="dot ${plan ? "is-plan" : ""}" tabindex="0" role="button" data-ex="${ex.id}" aria-label="${esc(exhibitTitle(ex))}" cx="${-ex.spot.z}" cy="${ex.spot.x}" r="0.9"><title>${esc(exhibitTitle(ex))}</title></circle>`;
  }).join("");
  box.innerHTML = `<svg viewBox="-2 -16 150 37" role="img" aria-label="${esc(t("ui.mapTitle"))}">${corrs}${rooms}${dots}<path class="me" id="me" d="M0 -1.2 L0.9 1 L0 0.4 L-0.9 1 Z"/></svg>`;
  const go = (el) => {
    if (el.dataset.room) { const r = ROOMS.find((q) => q.id === el.dataset.room); travel(r.entry[0], r.entry[1], r.entry[2]); }
    if (el.dataset.ex) { const ex = app.exhibits.find((e) => e.id === el.dataset.ex); travel(ex.eye.x, ex.eye.z, app.controls.lookAtAngles(ex.eye, ex.target).yaw, () => inspect(ex, { instant: true })); }
    closeSheets();
  };
  $$("[data-room],[data-ex]", box).forEach((el) => {
    el.addEventListener("click", () => go(el));
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(el); } });
  });
  openSheet("#map");
  app.mapOpen = true;
  drawMe();
}
function drawMe() {
  const me = document.getElementById("me"); if (!me) return;
  const s = app.controls.state;
  me.setAttribute("transform", `translate(${-s.pos.z} ${s.pos.x}) rotate(${90 - (s.yaw * 180) / Math.PI})`);
}

function travel(x, z, yaw, then) {
  closePanel(true);
  const c = app.controls;
  const jump = () => { c.teleport(x, z, yaw); c.state.locked = !!app.tour; setRoom(roomAt(x, z) || app.room, true); if (then) then(); };
  if (prefs.reduced) return jump();
  const f = $("#fade"); f.classList.add("is-on");
  setTimeout(() => { jump(); f.classList.remove("is-on"); }, 450);
}

// ------------------------------------------------------------------ guided tour
const TOUR = [
  { pose: [0, 1.75, -6, 0, 4.2, -17] },
  { pose: [0, 2.3, -25.5, 0, 1.8, -44] },
  { ex: "toilet-wars" }, { ex: "haunting-mother" }, { ex: "pitchit" }, { ex: "echomind" }, { ex: "bookverse" },
  { pose: [0, 1.8, -65.5, 0, 1.3, -82] },
  { ex: "steal-the-moon" }, { ex: "ai-studio" },
  { ex: "anthony-studios" }, { ex: "capabilities" },
  { ex: "creator-portrait" }, { ex: "creator-contact" },
];
function startTour() {
  if (!app.ready) return;
  closeSheets(); closePanel(true);
  app.suppressPause = true; app.controls.releasePointer();
  app.tour = { i: 0, back: { p: app.controls.state.pos.clone(), yaw: app.controls.state.yaw } };
  app.controls.state.locked = true;
  $("#tour").hidden = false; $("#prompt").hidden = true;
  document.body.classList.add("is-touring");
  tourGo(0);
}
function tourGo(i) {
  const tr = app.tour; if (!tr) return;
  tr.i = Math.max(0, Math.min(TOUR.length - 1, i));
  const step = TOUR[tr.i], c = app.controls;
  let eye, target, ex = null;
  if (step.ex) { ex = app.exhibits.find((e) => e.id === step.ex); eye = ex.eye.clone(); target = ex.target.clone(); }
  else { eye = new THREE.Vector3(step.pose[0], step.pose[1], step.pose[2]); target = new THREE.Vector3(step.pose[3], step.pose[4], step.pose[5]); }
  const ang = c.lookAtAngles(eye, target);
  const far = c.state.pos.distanceTo(eye) > 30;
  if (prefs.reduced || far) {
    const jump = () => { c.state.pos.copy(eye); c.state.yaw = ang.yaw; c.state.pitch = ang.pitch; };
    if (far && !prefs.reduced) { const f = $("#fade"); f.classList.add("is-on"); setTimeout(() => { jump(); f.classList.remove("is-on"); }, 450); } else jump();
  } else c.flyTo(eye, ang.yaw, ang.pitch, 1.6);
  setRoom(roomAt(eye.x, eye.z) || app.room, true);
  tr.ex = ex;
  renderTour();
}
function renderTour() {
  const tr = app.tour; if (!tr) return;
  const step = TOUR[tr.i], k = `tour.s${tr.i + 1}`;
  $(".js-tour-step").textContent = t("tour.stepOf", { n: tr.i + 1, total: TOUR.length });
  $(".js-tour-title").textContent = step.ex && app.byId[step.ex] ? app.byId[step.ex].title : t(`${k}.t`);
  $(".js-tour-text").textContent = t(`${k}.d`);
  $(".js-tour-prev").disabled = tr.i === 0;
  $(".js-tour-next").textContent = t(tr.i === TOUR.length - 1 ? "tour.finish" : "tour.next");
  let open = $(".js-tour-open");
  if (tr.ex) {
    if (!open) { open = document.createElement("button"); open.type = "button"; open.className = "btn btn--line js-tour-open"; $(".tour__actions").insertBefore(open, $(".js-tour-end")); open.addEventListener("click", () => { if (app.tour && app.tour.ex) { openPanel(app.tour.ex); app.inspecting = app.tour.ex; document.body.classList.add("is-inspecting"); } }); }
    open.textContent = t("tour.open");
  } else if (open) open.remove();
}
function endTour() {
  if (!app.tour) return;
  app.tour = null;
  document.body.classList.remove("is-touring");
  $("#tour").hidden = true;
  closePanel(true);
  app.controls.state.locked = false;
  $(".js-tour-open")?.remove();
}

// ------------------------------------------------------------------ 2D gallery mode
function showGallery() {
  app.mode = "gallery";
  if (app.controls) { app.controls.state.enabled = false; app.suppressPause = true; app.controls.releasePointer(); }
  $("#entrance").hidden = true; $("#hud").hidden = true; $("#loader").hidden = true;
  $("#gallery").hidden = false; document.body.classList.add("is-gallery");
  renderGallery();
  setHash({ view: "list" });
}
function renderGallery() {
  const d = app.data;
  const card = (id, title, sub, img) => `<button class="g-card" type="button" data-open="${id}">${img ? `<img src="${esc(ROOT + img)}" alt="" loading="lazy">` : `<span class="mono">${esc(title[0])}</span>`}<div><b>${esc(title)}</b><span>${esc(sub)}</span></div></button>`;
  const rooms = ROOMS.filter((r) => r.id !== "entrance").map((r) => {
    let cards = d.projects.filter((p) => p.room === r.id).map((p) => card(p.id, p.title, `${t(`status.${p.status}`)} · ${pt(p, "desc")}`, p.images[0]));
    if (r.id === "clients") cards.push(card("capabilities", t("caps.title"), t("caps.lede")));
    if (r.id === "creator") cards = [card("creator-portrait", d.creator.name, t("creator.role"), d.creator.portrait.replace("1000", "640")), card("creator-story", t("creator.backgroundT"), t("creator.backgroundSub")), card("creator-contact", t("contact.title"), d.creator.email)];
    return `<section class="g-room"><p class="kicker">${esc(r.area)}</p><h2>${esc(t(`rooms.${r.id}.name`))}</h2><p>${esc(t(`rooms.${r.id}.sub`))}</p><div class="g-grid">${cards.join("")}</div></section>`;
  }).join("");
  const body = $(".js-gallery-body");
  body.innerHTML = rooms;
  $$("[data-open]", body).forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.open;
    const ex = app.exhibits.find((e) => e.id === id) || galleryExhibit(id);
    openPanel(ex);
  }));
}
// Panel stand-ins when the 3D scene was never built (no WebGL or list mode).
function galleryExhibit(id) {
  if (app.byId[id]) return { id, project: app.byId[id], kind: "project" };
  return { id, kind: { capabilities: "capabilities", "creator-portrait": "creator-about", "creator-story": "creator-background", "creator-contact": "creator-contact" }[id] };
}

// ------------------------------------------------------------------ sheets, prefs, language
function openSheet(sel) {
  closeSheets();
  const d = $(sel);
  if (app.controls) { app.suppressPause = true; app.controls.releasePointer(); app.controls.state.keys.clear(); }
  if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
}
function closeSheets() {
  $$("dialog.sheet").forEach((d) => { if (d.open) d.close(); });
  app.mapOpen = false;
}

function fillLangSelects() {
  $$(".js-lang").forEach((s) => {
    s.innerHTML = LANGS.map((l) => `<option value="${l.code}">${l.name}</option>`).join("");
    s.addEventListener("change", () => { app.audio.tick(); setLang(s.value); });
  });
}

function refreshLanguage(code) {
  $$(".js-lang").forEach((s) => { s.value = code; });
  app.signs.forEach((s) => s.redraw());
  app.exhibits.forEach((ex) => ex.plaque && ex.plaque.redraw && ex.plaque.redraw());
  setRoom(app.room, true);
  if (app.near) $(".js-prompt-title").textContent = exhibitTitle(app.near);
  if (app.panelFor) { const top = $("#panel").scrollTop; $(".js-panel-body").innerHTML = panelHtml(app.panelFor); $("#panel").scrollTop = top; $(".js-copy-email")?.addEventListener("click", copyEmail); }
  if (app.tour) renderTour();
  if (app.mapOpen) { openMap(); }
  if (app.mode === "gallery") renderGallery();
  qualityNote();
}

function applyPrefsToUi() {
  $(".js-sens").value = prefs.sensitivity;
  $(".js-quality").value = prefs.quality;
  $(".js-reduced").checked = prefs.reduced;
  $(".js-joy").checked = prefs.joystick;
  $(".js-sound").checked = prefs.sound;
  $(".js-amb").checked = prefs.ambience;
  $(".js-fx").checked = prefs.effects;
  $(".js-vol").value = prefs.volume;
  document.body.classList.toggle("is-reduced", prefs.reduced);
}
function updateJoystick() {
  const show = prefs.joystick && app.mode !== "entrance" && app.mode !== "gallery";
  $("#joy").hidden = !show; document.body.classList.toggle("has-joy", show);
}

function qualityNote(force) {
  const n = $(".js-quality-note"); if (!n) return;
  if (!app.webgl || force) n.textContent = t("entrance.noWebgl");
  else n.textContent = resolveQuality() === "low" ? t("entrance.lightMode") : "";
}

// ------------------------------------------------------------------ hash state
function parseHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  const p = h.get("p") ? h.get("p").split(",").map(Number) : null;
  return { room: h.get("room"), exhibit: h.get("exhibit"), view: h.get("view"), p: p && p.length === 3 && p.every(Number.isFinite) ? p : null };
}
function setHash(obj) {
  const q = new URLSearchParams(obj).toString();
  history.replaceState(null, "", q ? `#${q}` : location.pathname);
}
let hashTimer = 0;
function saveHashSoon() {
  if (app.inspecting || app.tour) return;
  const now = performance.now(); if (now - hashTimer < 1200) return; hashTimer = now;
  const s = app.controls.state;
  setHash({ room: app.room, p: `${s.pos.x.toFixed(1)},${s.pos.z.toFixed(1)},${s.yaw.toFixed(2)}` });
}

// ------------------------------------------------------------------ wiring
function wireUi() {
  $(".js-enter").addEventListener("click", () => enterMuseum());
  $(".js-enter-tour").addEventListener("click", () => enterMuseum({ tour: true, skipIntro: true }));
  $$(".js-gallery").forEach((b) => b.addEventListener("click", showGallery));
  $(".js-gallery-to-3d").addEventListener("click", () => { closePanel(true); $("#gallery").hidden = true; document.body.classList.remove("is-gallery"); if (!app.webgl) { qualityNote(true); return showGallery(); } enterMuseum({ skipIntro: true }); });
  $(".js-skip-intro").addEventListener("click", () => app.skipIntro && app.skipIntro());
  $(".js-inspect").addEventListener("click", () => inspect(app.near));
  $(".js-close-panel").addEventListener("click", () => closePanel());
  $(".js-open-map").addEventListener("click", openMap);
  $(".js-start-tour").addEventListener("click", startTour);
  $(".js-open-settings").addEventListener("click", () => openSheet("#settings"));
  $$(".sheet .js-close").forEach((b) => b.addEventListener("click", closeSheets));
  $$("dialog.sheet").forEach((d) => d.addEventListener("close", () => { app.mapOpen = false; }));
  $(".js-resume").addEventListener("click", closeSheets);
  $(".js-to-entrance").addEventListener("click", backToEntrance);
  $(".js-tour-next").addEventListener("click", () => { if (!app.tour) return; closePanel(true); app.inspecting = null; if (app.tour.i === TOUR.length - 1) endTour(); else tourGo(app.tour.i + 1); });
  $(".js-tour-prev").addEventListener("click", () => { if (!app.tour) return; closePanel(true); app.inspecting = null; tourGo(app.tour.i - 1); });
  $(".js-tour-end").addEventListener("click", endTour);

  $(".js-sens").addEventListener("input", (e) => { prefs.sensitivity = +e.target.value; if (app.controls) app.controls.state.sensitivity = prefs.sensitivity; savePrefs(); });
  $(".js-quality").addEventListener("change", (e) => {
    prefs.quality = e.target.value; savePrefs(); perf.steps = 0;
    if (app.renderer) { app.renderer.setPixelRatio(pixelRatioFor(resolveQuality())); onResize(); }
  });
  $(".js-reduced").addEventListener("change", (e) => { prefs.reduced = e.target.checked; savePrefs(); applyPrefsToUi(); });
  $(".js-joy").addEventListener("change", (e) => { prefs.joystick = e.target.checked; savePrefs(); updateJoystick(); });
  const sound = () => { app.audio.set({ on: prefs.sound, ambience: prefs.ambience, effects: prefs.effects, volume: prefs.volume }); savePrefs(); };
  $(".js-sound").addEventListener("change", (e) => { prefs.sound = e.target.checked; sound(); });
  $(".js-amb").addEventListener("change", (e) => { prefs.ambience = e.target.checked; sound(); });
  $(".js-fx").addEventListener("change", (e) => { prefs.effects = e.target.checked; sound(); });
  $(".js-vol").addEventListener("input", (e) => { prefs.volume = +e.target.value; sound(); });
  // Sound stays off until the visitor asks for it; the saved choice applies only after a click.
  if (prefs.sound) addEventListener("pointerdown", () => sound(), { once: true });

  addEventListener("keydown", (e) => {
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (app.mode !== "explore" && app.mode !== "intro") return;
    if (e.code === "KeyE" || e.code === "Enter" && app.near && document.activeElement === document.body) {
      if (app.inspecting && !app.tour) closePanel(); else if (app.near && !app.tour) inspect(app.near);
    } else if (e.code === "KeyM") { $("#map").open ? closeSheets() : openMap(); }
    else if (e.code === "KeyT" && !app.tour && app.mode === "explore") startTour();
    else if (e.code === "Escape") {
      if ($$("dialog.sheet").some((d) => d.open)) return; // the dialog closes itself
      if (app.inspecting && !app.tour) { e.preventDefault(); closePanel(); }
      else if (app.tour) endTour();
      else if (document.pointerLockElement == null) openSheet("#settings");
    } else if (e.code === "Space" && app.mode === "intro" && app.skipIntro) app.skipIntro();
  });
  addEventListener("hashchange", () => {
    const h = parseHash();
    if (h.view === "list" && app.mode !== "gallery") { closePanel(true); endTour(); closeSheets(); return showGallery(); }
    if (app.mode === "gallery" && (h.room || h.exhibit) && app.webgl) { closePanel(true); $("#gallery").hidden = true; document.body.classList.remove("is-gallery"); return enterMuseum({ skipIntro: true, restore: h }); }
    if (!h.exhibit && (h.p || h.room) && app.ready && app.mode === "explore" && !app.tour) {
      // A pasted room or position link: walk there (the address is rewritten as the visitor moves, which fires no event).
      const r = ROOMS.find((q) => q.id === h.room);
      const [x, z, yaw] = h.p || (r ? r.entry : [null]);
      if (x != null) return travel(x, z, yaw || 0);
    }
    if (h.exhibit && app.ready && app.mode === "explore") { const ex = app.exhibits.find((x) => x.id === h.exhibit); if (ex && app.inspecting !== ex) travel(ex.eye.x, ex.eye.z, 0, () => inspect(ex, { instant: true })); }
  });
}
