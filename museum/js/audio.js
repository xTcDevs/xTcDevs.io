// Optional sound, synthesised with the Web Audio API (no audio files to download, nothing to license).
// Muted by default: nothing is created until the visitor turns sound on.
//
//   ambience   each room's own tone and acoustics, a soft swell when you cross into the next room,
//              and water and wind on the waterfront terrace
//   movement   footsteps timed by the distance actually walked, on stone, concrete, oak or terrace
//              paving, plus a gentle rush of air that only rises at the faster walking speeds
//   effects    quiet interaction sounds when opening and closing exhibits
//
// If the browser cannot start audio, `available` becomes false and every call is a no op, so the
// museum keeps working; the settings sheet shows that sound is unavailable.

// per room: drone root (Hz), reverb length (s) and wet level, footstep surface
const ROOMS = {
  entrance:   { tone: 55,    reverb: 2.8, wet: 0.32, floor: "stone" },
  collection: { tone: 49,    reverb: 2.4, wet: 0.3,  floor: "stone" },
  lab:        { tone: 65.4,  reverb: 1.2, wet: 0.2,  floor: "concrete" },
  clients:    { tone: 58.3,  reverb: 0.9, wet: 0.16, floor: "oak" },
  creator:    { tone: 43.65, reverb: 0.4, wet: 0.04, floor: "terrace", outdoor: true },
};
const SURFACE = {
  stone:    { freq: 2100, q: 1.1, thud: 120, decay: 0.07, level: 0.22 },
  concrete: { freq: 1500, q: 0.9, thud: 105, decay: 0.08, level: 0.22 },
  oak:      { freq: 760,  q: 1.4, thud: 85,  decay: 0.11, level: 0.26 },
  terrace:  { freq: 1700, q: 0.7, thud: 110, decay: 0.06, level: 0.16 },
};

export function createAudio() {
  let ctx = null, failed = false;
  let master, ambBus, moveBus, fxBus, dry, wet, convolver, roomTone, drones = [], outdoorGain, airGain, airFilter, noiseBuf;
  const settings = { on: false, ambience: true, movement: true, effects: true, volume: 0.6 };
  let room = "entrance";

  function noiseBuffer(seconds, brown = false) {
    const len = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; } else d[i] = w; }
    return buf;
  }
  function loopingSource(buf) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; }
  function impulse(seconds) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds)), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    return buf;
  }

  function init() {
    if (ctx) return true;
    if (failed) return false;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { failed = true; return false; }
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
      dry = ctx.createGain(); wet = ctx.createGain(); convolver = ctx.createConvolver();
      dry.connect(master); convolver.connect(wet); wet.connect(master);
      ambBus = ctx.createGain(); moveBus = ctx.createGain(); fxBus = ctx.createGain();
      for (const b of [ambBus, moveBus, fxBus]) { b.connect(dry); b.connect(convolver); }
      noiseBuf = noiseBuffer(2);
      // room tone: soft brown noise through a low pass, and a quiet drone tuned per room
      roomTone = ctx.createBiquadFilter(); roomTone.type = "lowpass"; roomTone.frequency.value = 380;
      const rtGain = ctx.createGain(); rtGain.gain.value = 0.16;
      loopingSource(noiseBuffer(3, true)).connect(roomTone); roomTone.connect(rtGain); rtGain.connect(ambBus);
      [1, 1.5, 2.003].forEach((m, k) => {
        const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = 55 * m;
        const g = ctx.createGain(); g.gain.value = [0.035, 0.014, 0.009][k];
        o.connect(g); g.connect(ambBus); o.start(); drones.push({ o, m });
      });
      // the waterfront: lapping water (brown noise, low passed, swelling slowly) and a soft wind
      outdoorGain = ctx.createGain(); outdoorGain.gain.value = 0; outdoorGain.connect(ambBus);
      const water = ctx.createBiquadFilter(); water.type = "lowpass"; water.frequency.value = 520;
      const waterAmp = ctx.createGain(); waterAmp.gain.value = 0.32;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.18; const lfoDepth = ctx.createGain(); lfoDepth.gain.value = 0.18;
      lfo.connect(lfoDepth); lfoDepth.connect(waterAmp.gain); lfo.start();
      loopingSource(noiseBuffer(4, true)).connect(water); water.connect(waterAmp); waterAmp.connect(outdoorGain);
      const wind = ctx.createBiquadFilter(); wind.type = "bandpass"; wind.frequency.value = 420; wind.Q.value = 0.6;
      const windAmp = ctx.createGain(); windAmp.gain.value = 0.05;
      const wlfo = ctx.createOscillator(); wlfo.frequency.value = 0.07; const wDepth = ctx.createGain(); wDepth.gain.value = 180;
      wlfo.connect(wDepth); wDepth.connect(wind.frequency); wlfo.start();
      loopingSource(noiseBuf).connect(wind); wind.connect(windAmp); windAmp.connect(outdoorGain);
      // movement air: band passed noise whose level follows walking speed (only audible when fast)
      airFilter = ctx.createBiquadFilter(); airFilter.type = "bandpass"; airFilter.frequency.value = 900; airFilter.Q.value = 0.5;
      airGain = ctx.createGain(); airGain.gain.value = 0;
      loopingSource(noiseBuf).connect(airFilter); airFilter.connect(airGain); airGain.connect(moveBus);
      applyRoom(room, true);
      return true;
    } catch (err) {
      console.warn("[museum] audio unavailable", err);
      ctx = null; failed = true; return false;
    }
  }

  function apply() {
    if (!ctx) return;
    const now = ctx.currentTime;
    master.gain.setTargetAtTime(settings.on ? settings.volume * 0.8 : 0, now, 0.35);
    ambBus.gain.setTargetAtTime(settings.ambience ? 1 : 0, now, 0.35);
    moveBus.gain.setTargetAtTime(settings.movement ? 1 : 0, now, 0.15);
    fxBus.gain.setTargetAtTime(settings.effects ? 1 : 0, now, 0.1);
  }

  function applyRoom(id, instant) {
    const cfg = ROOMS[id] || ROOMS.entrance, t = ctx.currentTime, tc = instant ? 0.01 : 1.4;
    drones.forEach(({ o, m }) => o.frequency.setTargetAtTime(cfg.tone * m, t, tc));
    roomTone.frequency.setTargetAtTime(cfg.outdoor ? 220 : id === "lab" ? 560 : 380, t, tc);
    outdoorGain.gain.setTargetAtTime(cfg.outdoor ? 1 : 0, t, instant ? 0.01 : 2.2);
    convolver.buffer = impulse(cfg.reverb);
    wet.gain.setTargetAtTime(cfg.wet, t, 0.6);
  }

  // a short soft swell of filtered air as the visitor crosses into another room
  function swell() {
    if (!ctx || !settings.on || !settings.ambience) return;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 0.8;
    const g = ctx.createGain(); const t = ctx.currentTime;
    f.frequency.setValueAtTime(260, t); f.frequency.exponentialRampToValueAtTime(900, t + 1.6);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07, t + 0.7); g.gain.linearRampToValueAtTime(0, t + 2.2);
    s.connect(f); f.connect(g); g.connect(ambBus); s.start(t); s.stop(t + 2.3);
  }

  function blip(freq, dur, type = "sine", vol = 0.1) {
    if (!ctx || !settings.on || !settings.effects) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(fxBus); o.start(t); o.stop(t + dur + 0.05);
  }

  // one footstep: a filtered noise tick for the surface plus a soft low thud
  function footstep(surfaceName, loud) {
    const sf = SURFACE[surfaceName] || SURFACE.stone, t = ctx.currentTime, lv = sf.level * loud * (0.85 + Math.random() * 0.3);
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = 0.9 + Math.random() * 0.2;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = sf.freq * (0.9 + Math.random() * 0.2); f.Q.value = sf.q;
    const g = ctx.createGain(); g.gain.setValueAtTime(lv, t); g.gain.exponentialRampToValueAtTime(0.0001, t + sf.decay);
    s.connect(f); f.connect(g); g.connect(moveBus); s.start(t, Math.random() * 1.5); s.stop(t + sf.decay + 0.02);
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(sf.thud, t); o.frequency.exponentialRampToValueAtTime(sf.thud * 0.55, t + 0.09);
    const og = ctx.createGain(); og.gain.setValueAtTime(lv * 0.9, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(og); og.connect(moveBus); o.start(t); o.stop(t + 0.14);
  }

  let lastStepAt = 0, sinceStep = 0;
  return {
    settings,
    get available() { return !failed; },
    // Returns false when the browser could not start audio.
    set(patch) {
      Object.assign(settings, patch);
      if (settings.on && !init()) { settings.on = false; return false; }
      if (ctx && ctx.state === "suspended" && settings.on) ctx.resume().catch(() => {});
      apply();
      return true;
    },
    room(id) {
      if (id === room) return;
      room = id;
      if (!ctx) return;
      applyRoom(id, false);
      swell();
    },
    open() { blip(660, 0.35); setTimeout(() => blip(990, 0.4, "sine", 0.07), 70); },
    close() { blip(520, 0.25, "sine", 0.06); },
    tick() { blip(1200, 0.06, "triangle", 0.035); },
    // Called every frame while exploring. travelled = metres walked so far; speed in m/s.
    step(dt, speed, travelled) {
      if (!ctx || !settings.on) return;
      const t = ctx.currentTime;
      // air rush: silent at walking pace, a soft presence at Fast, clearer at Express
      airGain.gain.setTargetAtTime(settings.movement ? Math.max(0, (speed - 4) / 6) * 0.06 : 0, t, 0.25);
      airFilter.frequency.setTargetAtTime(700 + speed * 60, t, 0.3);
      if (!settings.movement || speed < 0.6) { sinceStep = travelled; return; }
      // a stride lengthens with speed, and steps never fire faster than about 6 per second
      const stride = 0.72 + speed * 0.05;
      if (travelled - sinceStep >= stride && t - lastStepAt > 0.16) {
        sinceStep = travelled; lastStepAt = t;
        footstep((ROOMS[room] || ROOMS.entrance).floor, Math.min(1, 0.55 + speed / 8));
      }
    },
  };
}
