// The 5 asteroid fields. Each level is a deterministic layout built from
// its seed: planets (gravity), suns (gravity + deadly), asteroids (drifting
// hazards), star shards (collect), a power-up or two, the warp gate, and
// the comet's start spot. Layouts are hand-shaped per level and then
// jittered by the seeded RNG so every seed plays a little differently.

import { CONFIG } from './config.js';
import { makeRng } from './random.js';

const LEVEL_THEMES = [
  { name: 'Drift Field', sub: 'Learn the pull — slingshot past the first world', hue: 210, sky: '#0b1026' },
  { name: 'Twin Suns', sub: 'Two suns, one narrow lane', hue: 28, sky: '#160d1e' },
  { name: 'The Belt', sub: 'Dense rock. Thread it or bounce off it', hue: 150, sky: '#071a16' },
  { name: 'Giant’s Wake', sub: 'A gas giant bends every line you fly', hue: 265, sky: '#120e26' },
  { name: 'Eventide Run', sub: 'The last gate. Everything at once', hue: 330, sky: '#1c0a18' },
];

// Keep things out of the comet's spawn corner and out of the gate.
function farFrom(x, y, spots, minDist) {
  return spots.every((s) => Math.hypot(s.x - x, s.y - y) >= minDist);
}

export function buildLevel(levelIndex, seed) {
  const rng = makeRng(seed * 7919 + levelIndex * 104729 + 13);
  const W = CONFIG.WIDTH;
  const H = CONFIG.HEIGHT;
  const theme = LEVEL_THEMES[levelIndex];
  const shardTarget = CONFIG.SHARDS_PER_LEVEL[levelIndex];

  const start = { x: 90, y: H - 90 };
  const gate = { x: W - 110, y: 96, radius: CONFIG.GATE_RADIUS };

  const planets = [];
  const suns = [];
  const asteroids = [];
  const shards = [];
  const powerups = [];

  const placed = [start, gate];

  // --- planets: the slingshot anchors -----------------------------------
  const planetSpecs = [
    [{ x: 0.42, y: 0.42, r: 52, mass: 1.0 }],
    [
      { x: 0.34, y: 0.6, r: 44, mass: 0.9 },
      { x: 0.66, y: 0.34, r: 48, mass: 1.0 },
    ],
    [{ x: 0.5, y: 0.5, r: 46, mass: 0.95 }],
    [
      { x: 0.5, y: 0.46, r: 86, mass: 2.1 },
      { x: 0.78, y: 0.72, r: 36, mass: 0.7 },
    ],
    [
      { x: 0.3, y: 0.4, r: 54, mass: 1.1 },
      { x: 0.62, y: 0.62, r: 62, mass: 1.4 },
      { x: 0.85, y: 0.28, r: 40, mass: 0.8 },
    ],
  ][levelIndex];
  for (const spec of planetSpecs) {
    const p = {
      x: spec.x * W + rng.range(-24, 24),
      y: spec.y * H + rng.range(-20, 20),
      radius: spec.r,
      mass: spec.mass,
      hue: (theme.hue + rng.range(-30, 30) + 360) % 360,
      ring: rng.chance(0.45),
    };
    planets.push(p);
    placed.push(p);
  }

  // --- suns: hot, deadly, strong pull ------------------------------------
  const sunSpecs = [
    [],
    [{ x: 0.52, y: 0.3, r: 40 }],
    [],
    [{ x: 0.24, y: 0.2, r: 34 }],
    [
      { x: 0.48, y: 0.24, r: 38 },
      { x: 0.82, y: 0.6, r: 34 },
    ],
  ][levelIndex];
  for (const spec of sunSpecs) {
    const s = {
      x: spec.x * W,
      y: spec.y * H,
      radius: spec.r,
      mass: 1.6,
      hue: 38,
    };
    suns.push(s);
    placed.push(s);
  }

  // --- asteroids: drifting rock ------------------------------------------
  const asteroidCount = [7, 9, 14, 11, 15][levelIndex];
  let tries = 0;
  while (asteroids.length < asteroidCount && tries < 400) {
    tries++;
    const x = rng.range(70, W - 70);
    const y = rng.range(70, H - 70);
    if (!farFrom(x, y, placed, 110)) continue;
    const r = rng.range(CONFIG.ASTEROID_MIN_RADIUS, CONFIG.ASTEROID_MAX_RADIUS);
    asteroids.push({
      x,
      y,
      radius: r,
      vx: rng.range(-CONFIG.ASTEROID_DRIFT, CONFIG.ASTEROID_DRIFT),
      vy: rng.range(-CONFIG.ASTEROID_DRIFT, CONFIG.ASTEROID_DRIFT),
      angle: rng.range(0, Math.PI * 2),
      spin: rng.range(-CONFIG.ASTEROID_SPIN, CONFIG.ASTEROID_SPIN),
      verts: 7 + rng.int(0, 3),
      jag: rng.range(0.72, 1.0),
      shade: rng.range(0.75, 1.15),
    });
  }

  // --- star shards: the score --------------------------------------------
  tries = 0;
  while (shards.length < shardTarget && tries < 500) {
    tries++;
    const x = rng.range(80, W - 80);
    const y = rng.range(80, H - 80);
    if (!farFrom(x, y, placed, 90)) continue;
    if (shards.some((s) => Math.hypot(s.x - x, s.y - y) < 80)) continue;
    shards.push({ x, y, radius: CONFIG.SHARD_RADIUS, taken: false, phase: rng.range(0, Math.PI * 2) });
  }

  // --- power-ups ----------------------------------------------------------
  const powerupKinds = [
    ['shield'],
    ['magnet', 'shield'],
    ['overdrive'],
    ['magnet', 'shield'],
    ['overdrive', 'shield', 'magnet'],
  ][levelIndex];
  tries = 0;
  let pi = 0;
  while (pi < powerupKinds.length && tries < 300) {
    tries++;
    const x = rng.range(100, W - 100);
    const y = rng.range(100, H - 100);
    if (!farFrom(x, y, placed, 100)) continue;
    if (shards.some((s) => Math.hypot(s.x - x, s.y - y) < 70)) continue;
    powerups.push({ x, y, radius: CONFIG.POWERUP_RADIUS, kind: powerupKinds[pi], taken: false, phase: rng.range(0, Math.PI * 2) });
    pi++;
  }

  // --- background stars (decorative, seeded) ------------------------------
  const stars = [];
  for (let i = 0; i < 130; i++) {
    stars.push({
      x: rng.range(0, W),
      y: rng.range(0, H),
      r: rng.range(0.6, 2.2),
      twinkle: rng.range(0, Math.PI * 2),
    });
  }

  return {
    index: levelIndex,
    name: theme.name,
    sub: theme.sub,
    hue: theme.hue,
    sky: theme.sky,
    seed,
    start,
    gate,
    planets,
    suns,
    asteroids,
    shards,
    powerups,
    stars,
    shardTarget,
    parTime: CONFIG.LEVEL_PAR_TIME,
  };
}

export function levelCount() {
  return CONFIG.LEVEL_COUNT;
}
