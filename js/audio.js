/* ===== Звук: Web Audio API, только осцилляторы и шум, без файлов ===== */
const Sound = (function () {
  let ctx = null, master = null, clipper = null, sfxBus = null, musicBus = null;
  let sfxEnabled = true, musicEnabled = true;
  let noiseBuf = null;
  let musicTimer = null, musicOn = false, mStep = 0, mNext = 0;
  let trim = 1;
  const lastAt = {};

  /* Общая громкость: 0.55 × 1.3 — игра на 30% громче прежнего.
     После master стоит мягкий ограничитель: до 0.8 он прозрачен, выше плавно
     скругляет пики. DynamicsCompressor не подходит — у него автоматическая
     компенсация усиления и задержка, из-за которых короткие звуки становились
     тише, а не громче (проверено замером офлайн-рендером). */
  const MASTER_VOL = 0.715;

  function softClipCurve() {
    const n = 2048, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1, a = Math.abs(x);
      curve[i] = a < 0.8 ? x : Math.sign(x) * (0.8 + 0.2 * Math.tanh((a - 0.8) / 0.2));
    }
    return curve;
  }

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      clipper = ctx.createWaveShaper();
      clipper.curve = softClipCurve();
      clipper.oversample = "2x";
      clipper.connect(ctx.destination);
      master = ctx.createGain();
      master.gain.value = MASTER_VOL;
      master.connect(clipper);
      // отдельные шины: эффекты и музыка балансируются независимо
      sfxBus = ctx.createGain(); sfxBus.gain.value = 1;
      musicBus = ctx.createGain(); musicBus.gain.value = 0.68;
      sfxBus.connect(master); musicBus.connect(master);
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

  /* Небольшой разброс высоты: очередь выстрелов перестаёт звучать как швейная машинка. */
  function vary(f, amt) { return f * (1 + (Math.random() * 2 - 1) * (amt == null ? 0.03 : amt)); }

  function tone(o) {
    if (!sfxEnabled || !ensure()) return;
    const t0 = ctx.currentTime + (o.delay || 0);
    const dur = o.dur || 0.15;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t0 + dur);
    let node = g;
    if (o.cut) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass"; f.frequency.setValueAtTime(o.cut, t0);
      g.connect(f); node = f;
    }
    const vol = (o.vol == null ? 0.25 : o.vol) * trim;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (o.atk || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); node.connect(o.bus || sfxBus);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  }

  function noise(o) {
    if (!sfxEnabled || !ensure() || !noiseBuf) return;
    const t0 = ctx.currentTime + (o.delay || 0);
    const dur = o.dur || 0.3;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.playbackRate.value = o.rate || 1;
    const filt = ctx.createBiquadFilter();
    filt.type = o.filter || "lowpass";
    filt.frequency.setValueAtTime(o.freq || 800, t0);
    if (o.to) filt.frequency.exponentialRampToValueAtTime(Math.max(60, o.to), t0 + dur);
    if (o.q) filt.Q.setValueAtTime(o.q, t0);
    const g = ctx.createGain();
    const vol = (o.vol == null ? 0.25 : o.vol) * trim;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (o.atk || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt); filt.connect(g); g.connect(o.bus || sfxBus);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  const FX = {
    // выстрел: короткий тон плюс щелчок — звук получает «тело»
    shoot: () => {
      tone({ freq: vary(640), to: 360, type: "triangle", dur: 0.07, vol: 0.10 });
      noise({ freq: 2600, to: 900, dur: 0.035, vol: 0.05, filter: "bandpass", q: 1.2 });
    },
    // мороз: две звенящие синусоиды и воздушный шелест
    frost: () => {
      tone({ freq: vary(880), to: 1500, type: "sine", dur: 0.11, vol: 0.08 });
      tone({ freq: vary(1320), to: 1900, type: "sine", dur: 0.09, vol: 0.04, delay: 0.01 });
      noise({ freq: 4200, dur: 0.12, vol: 0.035, filter: "highpass" });
    },
    // снайпер: резкий щелчок и хлёсткий хвост
    snipe: () => {
      noise({ freq: 3600, to: 1200, dur: 0.05, vol: 0.11, filter: "bandpass", q: 0.8 });
      tone({ freq: vary(320), to: 1400, type: "square", dur: 0.05, vol: 0.08 });
      tone({ freq: vary(1700), to: 380, type: "sawtooth", dur: 0.1, vol: 0.05, delay: 0.01 });
    },
    // попадание: глухой тычок
    hit: () => {
      tone({ freq: vary(230, 0.06), to: 130, type: "square", dur: 0.05, vol: 0.06, cut: 1800 });
      noise({ freq: 1400, to: 400, dur: 0.05, vol: 0.045 });
    },
    // взрыв: низкий удар, шумовой хвост и высокий треск
    boom: () => {
      noise({ freq: 1600, to: 80, dur: 0.4, vol: 0.3 });
      tone({ freq: vary(130, 0.08), to: 42, type: "sine", dur: 0.34, vol: 0.22 });
      noise({ freq: 5000, to: 1800, dur: 0.06, vol: 0.09, filter: "highpass" });
      tone({ freq: 70, to: 35, type: "triangle", dur: 0.22, vol: 0.12, delay: 0.02 });
    },
    // монстр лопнул
    pop: () => {
      tone({ freq: vary(560, 0.07), to: 980, type: "sine", dur: 0.09, vol: 0.13 });
      noise({ freq: 2400, to: 600, dur: 0.11, vol: 0.07, filter: "bandpass", q: 0.7 });
    },
    // башня встала на клетку
    place: () => {
      tone({ freq: 170, to: 110, type: "sine", dur: 0.11, vol: 0.22, cut: 900 });
      noise({ freq: 900, to: 220, dur: 0.09, vol: 0.12 });
      tone({ freq: 440, type: "triangle", dur: 0.07, vol: 0.09, delay: 0.02 });
    },
    // прокачка: короткое арпеджио вверх
    upgrade: () => {
      [520, 660, 880].forEach((f, i) => tone({ freq: f, type: "triangle", dur: 0.16, vol: 0.15, delay: i * 0.06 }));
      tone({ freq: 1320, type: "sine", dur: 0.24, vol: 0.07, delay: 0.14 });
    },
    sell: () => {
      tone({ freq: 720, to: 300, type: "triangle", dur: 0.14, vol: 0.12 });
      tone({ freq: 480, to: 200, type: "sine", dur: 0.16, vol: 0.07, delay: 0.03 });
    },
    coin: () => {
      tone({ freq: 940, type: "square", dur: 0.05, vol: 0.1 });
      tone({ freq: 1410, type: "square", dur: 0.09, vol: 0.07, delay: 0.04 });
    },
    // потеряна жизнь: тревожный спуск
    life: () => {
      noise({ freq: 600, to: 100, dur: 0.32, vol: 0.2 });
      tone({ freq: 220, to: 70, type: "sawtooth", dur: 0.3, vol: 0.15, cut: 1200 });
      tone({ freq: 330, to: 150, type: "square", dur: 0.18, vol: 0.06, delay: 0.05 });
    },
    // сигнал волны: два «рожка»
    wave: () => {
      tone({ freq: 330, type: "triangle", dur: 0.16, vol: 0.15, cut: 2400 });
      tone({ freq: 494, type: "triangle", dur: 0.2, vol: 0.13, delay: 0.1, cut: 2600 });
      tone({ freq: 660, type: "sine", dur: 0.22, vol: 0.07, delay: 0.1 });
    },
    click: () => {
      tone({ freq: 540, to: 640, type: "square", dur: 0.045, vol: 0.08 });
      noise({ freq: 3000, dur: 0.02, vol: 0.03, filter: "highpass" });
    },
    win: () => {
      [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: "triangle", dur: 0.22, vol: 0.16, delay: i * 0.11 }));
      [523, 659, 784].forEach(f => tone({ freq: f, type: "sine", dur: 0.7, vol: 0.07, delay: 0.44 }));
    },
    lose: () => {
      [392, 330, 262, 196].forEach((f, i) => tone({ freq: f, type: "sawtooth", dur: 0.25, vol: 0.13, delay: i * 0.14, cut: 1600 }));
      tone({ freq: 98, to: 60, type: "sine", dur: 0.6, vol: 0.16, delay: 0.42 });
    },
    // комбо: чем длиннее серия, тем выше отклик
    combo: (n) => {
      const step = Math.min(n || 1, 12);
      tone({ freq: 620 * Math.pow(1.06, step), to: 980 * Math.pow(1.04, step), type: "square", dur: 0.08, vol: 0.09 });
    },
    reward: () => {
      [660, 880, 660, 1046].forEach((f, i) => tone({ freq: f, type: "triangle", dur: 0.16, vol: 0.14, delay: i * 0.09 }));
      tone({ freq: 1320, type: "sine", dur: 0.4, vol: 0.06, delay: 0.28 });
    }
  };

  /* Подгонка громкости по замеру: новые эффекты многослойные, поэтому каждый
     приведён к прежнему звучанию × 1.3 (среднее геометрическое пика и RMS). */
  const TRIM = {
    shoot: 0.97, frost: 0.77, snipe: 0.99, hit: 0.89, boom: 0.68, pop: 0.87,
    place: 0.91, upgrade: 1.0, sell: 0.88, coin: 1.36, life: 0.8, wave: 0.9,
    click: 1.06, combo: 0.88, win: 0.76, lose: 0.55, reward: 1.08
  };

  /* Минимальные паузы между повторами: на ускорении x5 десяток башен стреляет
     одновременно, и без этого выстрелы сливаются в кашу. */
  const GAP = { shoot: 0.05, hit: 0.05, frost: 0.055, snipe: 0.06, pop: 0.045, combo: 0.09, coin: 0.04 };
  function play(name, arg) {
    const f = FX[name];
    if (!f) return;
    const gap = GAP[name];
    if (gap) {
      const now = ctx ? ctx.currentTime : (performance.now() / 1000);
      if (lastAt[name] != null && now - lastAt[name] < gap) return;
      lastAt[name] = now;
    }
    trim = TRIM[name] || 1;
    try { f(arg); } finally { trim = 1; }
  }

  /* ---- Мягкая фоновая музыка (петля из осцилляторов) ---- */
  const BASS = [110, 110, 146.83, 130.81]; // A2 A2 D3 C3
  const ARP  = [
    [220, 261.63, 329.63], [220, 261.63, 329.63],
    [293.66, 349.23, 440], [261.63, 329.63, 392]
  ];
  const PAD = [
    [220, 329.63], [220, 329.63], [293.66, 440], [261.63, 392]
  ];
  function musicStep(time) {
    if (!ensure()) return;
    const bar = Math.floor(mStep / 4) % 4;
    // бас через фильтр — мягкий, без песка
    const bassOsc = ctx.createOscillator(), bg = ctx.createGain(), bf = ctx.createBiquadFilter();
    bf.type = "lowpass"; bf.frequency.setValueAtTime(420, time);
    bassOsc.type = "triangle";
    bassOsc.frequency.value = BASS[bar];
    bg.gain.setValueAtTime(0.0001, time);
    bg.gain.linearRampToValueAtTime(0.055, time + 0.02);
    bg.gain.exponentialRampToValueAtTime(0.0001, time + 0.45);
    bassOsc.connect(bg); bg.connect(bf); bf.connect(musicBus);
    bassOsc.start(time); bassOsc.stop(time + 0.5);
    // арпеджио двумя слегка расстроенными голосами — звучит шире
    const notes = ARP[bar];
    const n = notes[mStep % notes.length];
    for (const det of [1, 1.004]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = n * det;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(det === 1 ? 0.035 : 0.018, time + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.28);
      o.connect(g); g.connect(musicBus);
      o.start(time); o.stop(time + 0.32);
    }
    // тихая подложка в начале такта
    if (mStep % 4 === 0) {
      for (const f of PAD[bar]) {
        const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
        lp.type = "lowpass"; lp.frequency.setValueAtTime(1200, time);
        o.type = "triangle"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, time);
        g.gain.linearRampToValueAtTime(0.014, time + 0.25);
        g.gain.exponentialRampToValueAtTime(0.0001, time + 1.15);
        o.connect(g); g.connect(lp); lp.connect(musicBus);
        o.start(time); o.stop(time + 1.2);
      }
    }
    // лёгкий счётчик на слабую долю
    if (mStep % 2 === 1 && noiseBuf) {
      const src = ctx.createBufferSource(), hg = ctx.createGain(), hf = ctx.createBiquadFilter();
      src.buffer = noiseBuf;
      hf.type = "highpass"; hf.frequency.setValueAtTime(6500, time);
      hg.gain.setValueAtTime(0.0001, time);
      hg.gain.exponentialRampToValueAtTime(0.02, time + 0.005);
      hg.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
      src.connect(hf); hf.connect(hg); hg.connect(musicBus);
      src.start(time); src.stop(time + 0.08);
    }
    mStep++;
  }
  function scheduler() {
    if (!musicOn || !ctx) return;
    const step = 0.30;
    // вкладку могли притормозить: если таймер сильно отстал, не проигрываем
    // накопившиеся такты залпом, а подхватываем петлю с текущего момента
    if (mNext < ctx.currentTime - 0.5) mNext = ctx.currentTime + 0.05;
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
