// Deterministic screenshot scenes (?shot=title|play|clear|over&seed=<n>).
// Each scene builds a fixed game state from a seeded RNG and a fixed
// simulated time — no wall clock, no user input — renders one frame and
// sets window.__shotReady so the screenshot tool knows it can capture.
// The live game never runs this code path.

import { CONFIG } from './config.js';
import { createGame, startRun, startLevel, update, SCREENS } from './world.js';
import { render } from './render.js';
import { hashSeed } from './random.js';
import { createAudio } from './audio.js';

function fakeInput() {
  return {
    keys: new Set(),
    pointerX: 640,
    pointerY: 360,
    pointerDown: false,
    pointerActive: true,
    pressed: new Set(),
  };
}

// Steer the comet toward the nearest untaken shard, then the gate.
// Runs the real update loop with a scripted pointer, so the play shot
// shows genuine gameplay: a moving comet, a trail, collected shards.
function autopilot(game, input, dt, steps) {
  for (let i = 0; i < steps; i++) {
    const level = game.level;
    const c = game.comet;
    let target = null;
    let best = Infinity;
    for (const s of level.shards) {
      if (s.taken) continue;
      const d = Math.hypot(s.x - c.x, s.y - c.y);
      if (d < best) {
        best = d;
        target = s;
      }
    }
    if (!target) target = level.gate;
    // Steer around a planet that is right in the way: aim away from it
    // instead of straight through it.
    for (const p of level.planets) {
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d < p.radius + 80) {
        const away = Math.atan2(c.y - p.y, c.x - p.x);
        target = { x: c.x + Math.cos(away) * 200, y: c.y + Math.sin(away) * 200 };
        break;
      }
    }
    // Blend in repulsion from nearby asteroids so the autopilot does not
    // ram straight through the field.
    let tx = target.x - c.x;
    let ty = target.y - c.y;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    for (const a of level.asteroids) {
      const d = Math.hypot(a.x - c.x, a.y - c.y);
      if (d < 150) {
        const w = (150 - d) / 150;
        tx += ((c.x - a.x) / (d || 1)) * w * 2.2;
        ty += ((c.y - a.y) / (d || 1)) * w * 2.2;
      }
    }
    input.pointerX = c.x + tx * 200;
    input.pointerY = c.y + ty * 200;
    // Boost on long straight runs; never while the gate is the target
    // (so the comet does not overshoot the shot's framing).
    input.pointerDown = best > 320 && target !== level.gate;
    update(game, input, dt);
    if (game.screen !== SCREENS.PLAY) break;
  }
}

function buildTitle(ctx, seed) {
  const game = createGame(createAudio());
  game.audio.enabled = false;
  startLevel(game, 0, seed);
  game.screen = SCREENS.TITLE;
  game.best = 4850;
  game.time = 1.4;
  render(ctx, game);
}

function buildPlay(ctx, seed) {
  const game = createGame(createAudio());
  game.audio.enabled = false;
  startRun(game, seed);
  const input = fakeInput();
  autopilot(game, input, 1 / 60, Math.round(CONFIG.SHOT_PLAY_TIME * 60));
  // Freeze the clock at the fixed scene time so the render is stable.
  game.time = CONFIG.SHOT_PLAY_TIME;
  game.bannerTimer = 0;
  render(ctx, game);
}

function buildClear(ctx, seed) {
  const game = createGame(createAudio());
  game.audio.enabled = false;
  startRun(game, seed);
  // Fly the comet to the gate with every shard collected, then let the
  // real gate logic clear the level. The scripted pointer sits on the
  // gate so the comet holds position inside it while the gate opens.
  const level = game.level;
  for (const s of level.shards) {
    s.taken = true;
    game.shardsGot += 1;
  }
  game.score = 2450;
  game.comet.x = level.gate.x;
  game.comet.y = level.gate.y;
  game.comet.vx = 0;
  game.comet.vy = 0;
  const input = fakeInput();
  input.pointerX = level.gate.x;
  input.pointerY = level.gate.y;
  for (let i = 0; i < 120 && game.screen === SCREENS.PLAY; i++) {
    update(game, input, 1 / 60);
  }
  game.time = CONFIG.SHOT_CLEAR_TIME;
  game.bannerTimer = 0;
  render(ctx, game);
}

function buildOver(ctx, seed) {
  const game = createGame(createAudio());
  game.audio.enabled = false;
  startRun(game, seed);
  game.score = 1750;
  // Put the comet on top of an asteroid with one hull left and let the
  // real collision code end the run.
  game.hull = 1;
  const a = game.level.asteroids[0];
  game.comet.x = a.x;
  game.comet.y = a.y;
  game.comet.vx = 0;
  game.comet.vy = 0;
  const input = fakeInput();
  for (let i = 0; i < 10 && game.screen === SCREENS.PLAY; i++) {
    update(game, input, 1 / 60);
  }
  if (game.screen === SCREENS.PLAY) {
    // Safety net only: the collision above should have ended the run.
    game.totalScore = game.score;
    game.screen = SCREENS.OVER;
  }
  game.time = 1.0;
  render(ctx, game);
}

const BUILDERS = {
  title: buildTitle,
  play: buildPlay,
  clear: buildClear,
  over: buildOver,
};

// Render one ?shot= scene. Returns the scene name, or null when the URL
// carries no shot parameter (the live game should boot instead).
export function renderShot(ctx) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot || !BUILDERS[shot]) return null;
  const rawSeed = params.get('seed') || '1';
  const seed = /^\d+$/.test(rawSeed) ? Number(rawSeed) : hashSeed(rawSeed);
  BUILDERS[shot](ctx, seed);
  window.__shotReady = true;
  return shot;
}
