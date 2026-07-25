/* ===== Звук: Web Audio API, только осцилляторы и шум, без файлов ===== */
const Sound = (function () {
  let ctx = null, master = null;
  let sfxEnabled = true, musicEnabled = true;
  let noiseBuf = null;
  let musicTimer = null, musicOn = false, mStep = 0, mNext = 0;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
      // буфер белого шума для взрывов
      const len = Math.floor(ctx.sampleRate * 0.4);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
    return ctx;
  }

  function unlock() {
    ensure();
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  function tone(o) {
    if (!sfxEnabled || !ensure()) return;
    const t0 = ctx.currentTime;
    const dur = o.dur || 0.15;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t0 + dur);
    const vol = o.vol == null ? 0.25 : o.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (o.atk || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  }

  function noise(o) {
    if (!sfxEnabled || !ensure() || !noiseBuf) return;
    const t0 = ctx.currentTime;
    const dur = o.dur || 0.3;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const filt = ctx.createBiquadFilter();
    filt.type = o.filter || "lowpass";
    filt.frequency.setValueAtTime(o.freq || 800, t0);
    if (o.to) filt.frequency.exponentialRampToValueAtTime(Math.max(60, o.to), t0 + dur);
    const g = ctx.createGain();
    const vol = o.vol == null ? 0.25 : o.vol;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt); filt.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  const FX = {
    shoot:  () => tone({ freq: 620, to: 380, type: "triangle", dur: 0.07, vol: 0.10 }),
    frost:  () => tone({ freq: 900, to: 1400, type: "sine", dur: 0.10, vol: 0.08 }),
    snipe:  () => { tone({ freq: 300, to: 1200, type: "square", dur: 0.05, vol: 0.09 }); tone({ freq: 1600, to: 400, type: "sawtooth", dur: 0.08, vol: 0.05 }); },
    hit:    () => tone({ freq: 220, to: 140, type: "square", dur: 0.05, vol: 0.06 }),
    boom:   () => { noise({ freq: 1200, to: 90, dur: 0.35, vol: 0.28 }); tone({ freq: 120, to: 50, type: "sine", dur: 0.3, vol: 0.18 }); },
    pop:    () => { tone({ freq: 520, to: 900, type: "sine", dur: 0.09, vol: 0.12 }); noise({ freq: 2000, to: 500, dur: 0.12, vol: 0.08 }); },
    place:  () => { tone({ freq: 180, to: 120, type: "sine", dur: 0.09, vol: 0.2 }); tone({ freq: 420, type: "triangle", dur: 0.08, vol: 0.1 }); },
    upgrade:() => { tone({ freq: 400, to: 800, type: "triangle", dur: 0.18, vol: 0.16 }); tone({ freq: 600, to: 1200, type: "sine", dur: 0.2, vol: 0.1 }); },
    sell:   () => { tone({ freq: 700, to: 300, type: "triangle", dur: 0.14, vol: 0.12 }); },
    coin:   () => { tone({ freq: 880, type: "square", dur: 0.05, vol: 0.1 }); tone({ freq: 1320, type: "square", dur: 0.08, vol: 0.08 }); },
    life:   () => { noise({ freq: 500, to: 120, dur: 0.3, vol: 0.2 }); tone({ freq: 200, to: 80, type: "sawtooth", dur: 0.28, vol: 0.14 }); },
    wave:   () => { tone({ freq: 330, type: "triangle", dur: 0.14, vol: 0.14 }); tone({ freq: 494, type: "triangle", dur: 0.16, vol: 0.12 }); },
    click:  () => tone({ freq: 520, to: 620, type: "square", dur: 0.05, vol: 0.09 }),
    win:    () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone({ freq: f, type: "triangle", dur: 0.22, vol: 0.16 }), i * 110)); },
    lose:   () => { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone({ freq: f, type: "sawtooth", dur: 0.25, vol: 0.14 }), i * 140)); },
    combo:  () => tone({ freq: 700, to: 1050, type: "square", dur: 0.08, vol: 0.08 }),
    reward: () => { [660, 880, 660, 1046].forEach((f, i) => setTimeout(() => tone({ freq: f, type: "triangle", dur: 0.16, vol: 0.14 }), i * 90)); }
  };

  function play(name) { const f = FX[name]; if (f) f(); }

  /* ---- Мягкая фоновая музыка (петля из осцилляторов) ---- */
  const BASS = [110, 110, 146.83, 130.81]; // A2 A2 D3 C3
  const ARP  = [
    [220, 261.63, 329.63], [220, 261.63, 329.63],
    [293.66, 349.23, 440], [261.63, 329.63, 392]
  ];
  function musicStep(time) {
    if (!ensure()) return;
    const bar = Math.floor(mStep / 4) % 4;
    // бас
    const bassOsc = ctx.createOscillator(), bg = ctx.createGain();
    bassOsc.type = "triangle";
    bassOsc.frequency.value = BASS[bar];
    bg.gain.setValueAtTime(0.0001, time);
    bg.gain.linearRampToValueAtTime(0.05, time + 0.02);
    bg.gain.exponentialRampToValueAtTime(0.0001, time + 0.45);
    bassOsc.connect(bg); bg.connect(master);
    bassOsc.start(time); bassOsc.stop(time + 0.5);
    // арпеджио
    const notes = ARP[bar];
    const n = notes[mStep % notes.length];
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = n;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(0.035, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.28);
    o.connect(g); g.connect(master);
    o.start(time); o.stop(time + 0.32);
    mStep++;
  }
  function scheduler() {
    if (!musicOn || !ctx) return;
    const step = 0.30;
    while (mNext < ctx.currentTime + 0.15) {
      musicStep(mNext);
      mNext += step;
    }
  }
  function startMusic() {
    if (!musicEnabled) return;
    if (!ensure()) return;
    if (musicOn) return;
    musicOn = true;
    mNext = ctx.currentTime + 0.05;
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = setInterval(scheduler, 40);
  }
  function stopMusic() {
    musicOn = false;
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }

  function setSfx(v) { sfxEnabled = v; }
  function setMusicEnabled(v) { musicEnabled = v; if (!v) stopMusic(); }

  return {
    unlock, play, startMusic, stopMusic,
    setSfx, setMusicEnabled,
    get sfxEnabled() { return sfxEnabled; },
    get musicEnabled() { return musicEnabled; }
  };
})();
