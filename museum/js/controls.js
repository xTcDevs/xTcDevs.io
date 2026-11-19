// First person movement: keyboard + mouse (pointer lock, or drag to look as a fallback),
// touch (on-screen joystick + drag to look) and smooth camera flights for inspect and tour.
import * as THREE from "three";
import { EYE, walkable } from "./layout.js";

export function createControls(camera, canvas, opts) {
  const state = {
    pos: new THREE.Vector3(0, EYE, -4),
    yaw: 0, pitch: 0,
    vel: new THREE.Vector2(),
    keys: new Set(),
    joy: { x: 0, y: 0, active: false },
    enabled: false,
    sensitivity: 1,
    flight: null,      // active camera flight
    locked: false,     // camera held by inspect / tour
    walking: 0,
    travelled: 0,      // metres walked, for footsteps
  };
  // Visitor selectable walking speeds (metres per second). Shift multiplies by RUN.
  const SPEEDS = { relaxed: 2.0, normal: 3.4, fast: 5.6, express: 9.5 };
  const RUN = 1.5;
  let walkSpeed = SPEEDS.normal;
  // Movement is split into steps no longer than this, so even Express speed cannot carry the
  // visitor through a thin wall, a glass partition or an exhibit in a single frame.
  const MAX_STEP = 0.12;

  // ------------------------------------------------------------------ keyboard
  const KEYMAP = { KeyW: "f", ArrowUp: "f", KeyS: "b", ArrowDown: "b", KeyA: "l", KeyD: "r", ArrowLeft: "tl", ArrowRight: "tr", ShiftLeft: "run", ShiftRight: "run", KeyQ: "tl", KeyE2: "" };
  function onKey(e, down) {
    // typing in a field or choosing in a dropdown is not walking; a focused button is no reason to stop
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) && e.code !== "Escape") return;
    const k = KEYMAP[e.code];
    if (!k) return;
    if (!state.enabled) return;
    if (down) state.keys.add(k); else state.keys.delete(k);
    if (e.code.startsWith("Arrow")) e.preventDefault();
  }
  window.addEventListener("keydown", (e) => onKey(e, true));
  window.addEventListener("keyup", (e) => onKey(e, false));
  window.addEventListener("blur", () => state.keys.clear());

  // ------------------------------------------------------------------ mouse look
  const look = (dx, dy, scale) => {
    if (state.locked) return opts.onDragWhileLocked && opts.onDragWhileLocked(dx, dy);
    const s = 0.0022 * state.sensitivity * scale;
    state.yaw -= dx * s;
    state.pitch = THREE.MathUtils.clamp(state.pitch - dy * s, -1.1, 1.1);
  };
  canvas.addEventListener("click", () => {
    if (!state.enabled || state.locked || opts.isTouch()) return;
    if (opts.usePointerLock() && document.pointerLockElement !== canvas) {
      try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* not supported: drag to look */ }
    }
  });
  document.addEventListener("pointerlockchange", () => opts.onPointerLock && opts.onPointerLock(document.pointerLockElement === canvas));
  document.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement === canvas && state.enabled) look(e.movementX, e.movementY, 1);
  });

  // drag to look (mouse without pointer lock, and touch on the right side of the screen)
  let drag = null;
  canvas.addEventListener("pointerdown", (e) => {
    if (!state.enabled || document.pointerLockElement === canvas) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nicety; dragging still works */ }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
    look(dx, dy, e.pointerType === "touch" ? 1.6 : 1.2);
  });
  const endDrag = (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    if (drag.moved < 6 && opts.onTap) opts.onTap(e);
    drag = null;
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  // ------------------------------------------------------------------ joystick
  function bindJoystick(base, knob) {
    let id = null, cx = 0, cy = 0;
    const R = 48;
    const set = (x, y) => {
      const len = Math.hypot(x, y), k = len > R ? R / len : 1;
      knob.style.transform = `translate(${x * k}px, ${y * k}px)`;
      state.joy.x = (x * k) / R; state.joy.y = (y * k) / R;
    };
    base.addEventListener("pointerdown", (e) => {
      id = e.pointerId;
      try { base.setPointerCapture(id); } catch (err) { /* capture is a nicety; the joystick still works */ }
      const r = base.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      state.joy.active = true; set(e.clientX - cx, e.clientY - cy); e.preventDefault();
    });
    base.addEventListener("pointermove", (e) => { if (e.pointerId === id) set(e.clientX - cx, e.clientY - cy); });
    const end = (e) => { if (e.pointerId !== id) return; id = null; state.joy.active = false; set(0, 0); };
    base.addEventListener("pointerup", end); base.addEventListener("pointercancel", end);
  }

  // ------------------------------------------------------------------ flights
  function flyTo(eye, yaw, pitch, duration, done) {
    const from = { p: state.pos.clone(), yaw: state.yaw, pitch: state.pitch };
    let dyaw = yaw - from.yaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
    state.flight = { from, to: { p: eye.clone(), yaw: from.yaw + dyaw, pitch }, t: 0, d: Math.max(0.0001, duration), done };
  }
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  function lookAtAngles(from, target) {
    const d = new THREE.Vector3().subVectors(target, from);
    return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) };
  }

  // ------------------------------------------------------------------ per frame
  const fwd = new THREE.Vector3(), right = new THREE.Vector3();
  function update(dt, reducedMotion, flightDt = dt) {
    if (state.flight) {
      const f = state.flight;
      f.t += flightDt / f.d;
      const k = ease(Math.min(1, f.t));
      state.pos.lerpVectors(f.from.p, f.to.p, k);
      state.yaw = f.from.yaw + (f.to.yaw - f.from.yaw) * k;
      state.pitch = f.from.pitch + (f.to.pitch - f.from.pitch) * k;
      if (f.t >= 1) { state.flight = null; if (f.done) f.done(); }
    } else if (state.enabled && !state.locked) {
      const k = state.keys;
      if (k.has("tl")) state.yaw += 1.8 * dt * state.sensitivity;
      if (k.has("tr")) state.yaw -= 1.8 * dt * state.sensitivity;
      let mx = (k.has("r") ? 1 : 0) - (k.has("l") ? 1 : 0) + state.joy.x;
      let mz = (k.has("f") ? 1 : 0) - (k.has("b") ? 1 : 0) - state.joy.y;
      const len = Math.hypot(mx, mz); if (len > 1) { mx /= len; mz /= len; }
      const max = k.has("run") ? walkSpeed * RUN : walkSpeed;
      // smooth acceleration so movement feels deliberate, not twitchy
      const target = new THREE.Vector2(mx * max, mz * max);
      state.vel.lerp(target, 1 - Math.exp(-dt * 9));
      fwd.set(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
      right.set(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
      const dx = (fwd.x * state.vel.y + right.x * state.vel.x) * dt;
      const dz = (fwd.z * state.vel.y + right.z * state.vel.x) * dt;
      const p = state.pos;
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / MAX_STEP));
      const sx = dx / steps, sz = dz / steps;
      const x0 = p.x, z0 = p.z;
      for (let i = 0; i < steps; i++) {
        if (walkable(p.x + sx, p.z + sz)) { p.x += sx; p.z += sz; }
        else if (walkable(p.x + sx, p.z)) p.x += sx;      // slide along walls
        else if (walkable(p.x, p.z + sz)) p.z += sz;
        else break;
      }
      // distance actually covered (after collisions); footsteps are timed from this
      state.travelled += Math.hypot(p.x - x0, p.z - z0);
      const moving = state.vel.length();
      state.walking = moving;
      state.speedRatio = moving / SPEEDS.normal;
      // head bob follows the stride (distance walked), and calms down at the faster speeds
      const bob = 0.018 * Math.min(1, moving / 3) * Math.min(1, 4 / Math.max(4, moving));
      p.y = EYE + (reducedMotion ? 0 : Math.sin(state.travelled * Math.PI * 1.35) * bob);
    }
    camera.position.copy(state.pos);
    camera.rotation.set(state.pitch, state.yaw, 0, "YXZ");
  }

  return {
    state, update, flyTo, bindJoystick, lookAtAngles,
    setSpeed(name) { if (SPEEDS[name]) walkSpeed = SPEEDS[name]; },
    speedOf: (name) => SPEEDS[name] || SPEEDS.normal,
    teleport(x, z, yaw = 0) { state.flight = null; state.pos.set(x, EYE, z); state.yaw = yaw; state.pitch = 0; state.vel.set(0, 0); },
    releasePointer() { if (document.pointerLockElement === canvas) document.exitPointerLock(); },
  };
}
