// Optional sound, synthesised with the Web Audio API (no audio files to download).
// Muted by default; nothing plays until the visitor turns sound on.
const ROOM_TONE = { entrance: 55, collection: 49, lab: 65.4, clients: 58.3, creator: 43.65 };

export function createAudio() {
  let ctx = null, master, ambBus, fxBus, drones = [], filter;
  const settings = { on: false, ambience: true, effects: true, volume: 0.6 };

  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
      ambBus = ctx.createGain(); fxBus = ctx.createGain();
      filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 420;
      ambBus.connect(filter); filter.connect(master); fxBus.connect(master);
      // architectural air: soft brown noise
      const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3; }
      const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
      const ng = ctx.createGain(); ng.gain.value = 0.22; noise.connect(ng); ng.connect(ambBus); noise.start();
      // a low, slowly beating drone tuned per room
      [1, 1.5, 2.003].forEach((m, k) => {
        const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = 55 * m;
        const g = ctx.createGain(); g.gain.value = [0.06, 0.025, 0.018][k];
        o.connect(g); g.connect(ambBus); o.start(); drones.push({ o, m });
      });
      return true;
    } catch (err) { console.warn("[museum] audio unavailable", err); ctx = null; return false; }
  }

  function apply() {
    if (!ctx) return;
    const now = ctx.currentTime;
    master.gain.setTargetAtTime(settings.on ? settings.volume * 0.7 : 0, now, 0.4);
    ambBus.gain.setTargetAtTime(settings.ambience ? 1 : 0, now, 0.4);
    fxBus.gain.setTargetAtTime(settings.effects ? 1 : 0, now, 0.1);
  }

  function blip(freq, dur, type = "sine", vol = 0.12) {
    if (!ctx || !settings.on || !settings.effects) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(fxBus); o.start(t); o.stop(t + dur + 0.05);
  }

  let stepClock = 0;
  return {
    settings,
    set(patch) {
      Object.assign(settings, patch);
      if (settings.on && init()) { if (ctx.state === "suspended") ctx.resume().catch(() => {}); }
      apply();
    },
    room(id) {
      if (!ctx) return;
      const base = ROOM_TONE[id] || 55, t = ctx.currentTime;
      drones.forEach(({ o, m }) => o.frequency.setTargetAtTime(base * m, t, 1.5));
      filter.frequency.setTargetAtTime(id === "lab" ? 700 : id === "creator" ? 320 : 440, t, 1.5);
    },
    open() { blip(660, 0.35); setTimeout(() => blip(990, 0.4, "sine", 0.08), 70); },
    close() { blip(520, 0.25, "sine", 0.07); },
    tick() { blip(1200, 0.06, "triangle", 0.04); },
    step(dt, speed) {
      if (speed < 0.6) { stepClock = 0; return; }
      stepClock += dt * speed;
      if (stepClock > 1.9) { stepClock = 0; blip(140 + Math.random() * 30, 0.08, "triangle", 0.05); }
    },
  };
}
