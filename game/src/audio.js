// WebAudio synthesis: every sound is generated, no audio files. A tiny
// arpeggio loop plays behind the game; one-shots cover thrust, pickups,
// explosions and the warp gate. Audio starts only after the first user
// gesture (browser autoplay rule) and stays silent in shot mode.

const NOTES = [220.0, 261.63, 329.63, 392.0, 440.0, 523.25, 659.25, 784.0];

export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    musicGain: null,
    muted: false,
    musicTimer: null,
    musicStep: 0,
    thrustOsc: null,
    thrustGain: null,
    enabled: true,
  };

  // Call from a user gesture (click / keypress). Safe to call repeatedly.
  audio.unlock = function unlock() {
    if (!audio.enabled) return;
    if (audio.ctx) {
      if (audio.ctx.state === 'suspended') audio.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audio.ctx = new Ctx();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.5;
      audio.master.connect(audio.ctx.destination);
      audio.musicGain = audio.ctx.createGain();
      audio.musicGain.gain.value = 0.16;
      audio.musicGain.connect(audio.master);
      startMusic(audio);
    } catch {
      // No audio device / unsupported: the game plays silently.
      audio.ctx = null;
    }
  };

  audio.setMuted = function setMuted(muted) {
    audio.muted = muted;
    if (audio.master && audio.ctx) {
      audio.master.gain.setTargetAtTime(muted ? 0 : 0.5, audio.ctx.currentTime, 0.05);
    }
  };

  return audio;
}

function tone(audio, { freq, freqEnd, type = 'sine', dur = 0.2, vol = 0.3, when = 0, slide = 'exp' }) {
  if (!audio.ctx || audio.muted) return;
  const t0 = audio.ctx.currentTime + when;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== undefined) {
    if (slide === 'lin') osc.frequency.linearRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    else osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
  }
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(audio.master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(audio, { dur = 0.4, vol = 0.4, low = 400, high = 4000 }) {
  if (!audio.ctx || audio.muted) return;
  const t0 = audio.ctx.currentTime;
  const len = Math.max(1, Math.floor(audio.ctx.sampleRate * dur));
  const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = audio.ctx.createBufferSource();
  src.buffer = buffer;
  const filter = audio.ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = (low + high) / 2;
  filter.Q.value = 0.8;
  const gain = audio.ctx.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(audio.master);
  src.start(t0);
}

// --- one-shots -----------------------------------------------------------

export function sfxPickup(audio, combo = 1) {
  const base = NOTES[Math.min(3 + combo, NOTES.length - 1)];
  tone(audio, { freq: base, type: 'sine', dur: 0.16, vol: 0.28 });
  tone(audio, { freq: base * 1.5, type: 'sine', dur: 0.2, vol: 0.2, when: 0.05 });
}

export function sfxPowerup(audio) {
  tone(audio, { freq: 392, freqEnd: 784, type: 'triangle', dur: 0.28, vol: 0.3 });
  tone(audio, { freq: 784, freqEnd: 1174, type: 'triangle', dur: 0.3, vol: 0.22, when: 0.09 });
}

export function sfxExplosion(audio) {
  noiseBurst(audio, { dur: 0.5, vol: 0.5, low: 120, high: 900 });
  tone(audio, { freq: 160, freqEnd: 40, type: 'sawtooth', dur: 0.45, vol: 0.35 });
}

export function sfxGate(audio) {
  tone(audio, { freq: 523.25, type: 'sine', dur: 0.22, vol: 0.28 });
  tone(audio, { freq: 659.25, type: 'sine', dur: 0.22, vol: 0.28, when: 0.1 });
  tone(audio, { freq: 880, type: 'sine', dur: 0.4, vol: 0.3, when: 0.2 });
}

export function sfxClick(audio) {
  tone(audio, { freq: 660, type: 'square', dur: 0.06, vol: 0.12 });
}

export function sfxLevelClear(audio) {
  [523.25, 659.25, 784.0, 1046.5].forEach((f, i) => {
    tone(audio, { freq: f, type: 'triangle', dur: 0.3, vol: 0.26, when: i * 0.11 });
  });
}

export function sfxGameOver(audio) {
  [392.0, 329.63, 261.63, 196.0].forEach((f, i) => {
    tone(audio, { freq: f, type: 'triangle', dur: 0.35, vol: 0.24, when: i * 0.16 });
  });
}

// --- thrust loop ---------------------------------------------------------

export function thrustStart(audio) {
  if (!audio.ctx || audio.muted || audio.thrustOsc) return;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = 70;
  gain.gain.value = 0.0001;
  gain.gain.setTargetAtTime(0.06, audio.ctx.currentTime, 0.08);
  const filter = audio.ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 320;
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audio.master);
  osc.start();
  audio.thrustOsc = osc;
  audio.thrustGain = gain;
}

export function thrustStop(audio) {
  if (!audio.thrustOsc) return;
  const osc = audio.thrustOsc;
  const gain = audio.thrustGain;
  audio.thrustOsc = null;
  audio.thrustGain = null;
  gain.gain.setTargetAtTime(0.0001, audio.ctx.currentTime, 0.06);
  osc.stop(audio.ctx.currentTime + 0.3);
}

// --- background arpeggio -------------------------------------------------

function startMusic(audio) {
  if (audio.musicTimer) return;
  // A slow A-minor arpeggio: one soft pluck every 240 ms, cycling the
  // pattern. setInterval is fine here — music is decoration, never logic.
  const pattern = [0, 2, 4, 7, 4, 2, 5, 3, 0, 2, 4, 7, 6, 4, 3, 2];
  audio.musicTimer = setInterval(() => {
    if (!audio.ctx || audio.muted) return;
    const note = NOTES[pattern[audio.musicStep % pattern.length] % NOTES.length];
    const t0 = audio.ctx.currentTime;
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = note / 2;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.5, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
    osc.connect(gain);
    gain.connect(audio.musicGain);
    osc.start(t0);
    osc.stop(t0 + 0.6);
    audio.musicStep++;
  }, 240);
}
