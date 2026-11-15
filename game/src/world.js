// Game state and update logic: the comet, collisions, scoring, combos,
// power-ups, level flow, hull and lives. Rendering lives in render.js;
// this module decides what happens each frame.

import { CONFIG } from './config.js';
import { buildLevel } from './levels.js';
import { totalGravity, integrate, circleHit, bounceOff, clampToBounds } from './physics.js';
import { keySteer, boostHeld, takePressed } from './input.js';
import { sfxPickup, sfxPowerup, sfxExplosion, sfxGate, sfxClick, sfxLevelClear, sfxGameOver, thrustStart, thrustStop } from './audio.js';
import { createFx, updateFx, pushTrail, clearTrail, sparkle, explosion, addPopup, addShake } from './particles.js';

export const SCREENS = {
  TITLE: 'title',
  PLAY: 'play',
  CLEAR: 'clear',
  OVER: 'over',
  WIN: 'win',
  PAUSED: 'paused',
};

export function createGame(audio) {
  return {
    audio,
    fx: createFx(),
    screen: SCREENS.TITLE,
    screenBeforePause: SCREENS.PLAY,
    levelIndex: 0,
    level: null,
    comet: null,
    score: 0,
    totalScore: 0,
    shardsGot: 0,
    hull: CONFIG.HULL_MAX,
    boost: CONFIG.BOOST_MAX,
    combo: 0,
    comboTimer: 0,
    shield: false,
    magnetTimer: 0,
    overdriveTimer: 0,
    invuln: 0,
    levelTime: 0,
    gateTimer: 0,
    bannerTimer: 0,
    clearStats: null,
    best: 0,
    runSeed: 1,
    time: 0,
    boosting: false,
  };
}

export function loadBest(game) {
  try {
    game.best = Number(localStorage.getItem('comet-courier-best') || 0) || 0;
  } catch {
    game.best = 0;
  }
}

export function saveBest(game) {
  const best = Math.max(game.best, game.totalScore);
  game.best = best;
  try {
    localStorage.setItem('comet-courier-best', String(best));
  } catch {
    // Storage unavailable (private mode): best score just isn't kept.
  }
}

export function startLevel(game, levelIndex, seed) {
  game.levelIndex = levelIndex;
  game.level = buildLevel(levelIndex, seed);
  game.comet = {
    x: game.level.start.x,
    y: game.level.start.y,
    vx: 0,
    vy: 0,
    radius: CONFIG.COMET_RADIUS,
    angle: -Math.PI / 4,
  };
  game.shardsGot = 0;
  game.hull = CONFIG.HULL_MAX;
  game.boost = CONFIG.BOOST_MAX;
  game.combo = 0;
  game.comboTimer = 0;
  game.shield = false;
  game.magnetTimer = 0;
  game.overdriveTimer = 0;
  game.invuln = 0;
  game.levelTime = 0;
  game.gateTimer = 0;
  game.bannerTimer = 2.4;
  game.time = 0;
  game.boosting = false;
  clearTrail(game.fx);
  game.fx.particles.length = 0;
  game.fx.popups.length = 0;
}

export function startRun(game, seed = 1) {
  game.runSeed = seed;
  game.totalScore = 0;
  game.score = 0;
  startLevel(game, 0, seed);
  game.screen = SCREENS.PLAY;
}

export function nextLevel(game) {
  game.totalScore += game.score;
  if (game.levelIndex + 1 >= CONFIG.LEVEL_COUNT) {
    game.screen = SCREENS.WIN;
    saveBest(game);
    sfxLevelClear(game.audio);
    return;
  }
  startLevel(game, game.levelIndex + 1, game.runSeed);
  game.screen = SCREENS.PLAY;
}

function die(game) {
  game.totalScore += game.score;
  game.screen = SCREENS.OVER;
  saveBest(game);
  sfxGameOver(game.audio);
  thrustStop(game.audio);
}

function takeHit(game, x, y) {
  if (game.invuln > 0) return;
  if (game.shield) {
    game.shield = false;
    game.invuln = CONFIG.HIT_INVULN;
    explosion(game.fx, x, y);
    addShake(game.fx, CONFIG.SHAKE_HIT);
    addPopup(game.fx, x, y - 30, 'SHIELD DOWN', '#7fd4ff', 22);
    sfxExplosion(game.audio);
    return;
  }
  game.hull -= 1;
  game.invuln = CONFIG.HIT_INVULN;
  game.combo = 0;
  game.comboTimer = 0;
  explosion(game.fx, x, y);
  addShake(game.fx, CONFIG.SHAKE_HIT);
  sfxExplosion(game.audio);
  // Knock the comet away from the hazard it hit.
  const c = game.comet;
  const d = Math.hypot(c.x - x, c.y - y) || 1;
  c.vx = ((c.x - x) / d) * CONFIG.HIT_KNOCKBACK;
  c.vy = ((c.y - y) / d) * CONFIG.HIT_KNOCKBACK;
  if (game.hull <= 0) die(game);
}

function collectShard(game, shard) {
  shard.taken = true;
  game.shardsGot += 1;
  game.combo = Math.min(game.combo + 1, CONFIG.COMBO_MAX);
  game.comboTimer = CONFIG.COMBO_WINDOW;
  const gained = CONFIG.SHARD_SCORE * game.combo;
  game.score += gained;
  sparkle(game.fx, shard.x, shard.y, '#ffe066');
  addPopup(game.fx, shard.x, shard.y - 18, `+${gained}`, '#ffe066', game.combo > 1 ? 24 : 19);
  if (game.combo > 1) {
    addPopup(game.fx, shard.x, shard.y - 46, `COMBO x${game.combo}`, '#ff9f1c', 16);
  }
  sfxPickup(game.audio, game.combo);
}

function collectPowerup(game, powerup) {
  powerup.taken = true;
  sparkle(game.fx, powerup.x, powerup.y, '#7fd4ff');
  if (powerup.kind === 'shield') {
    game.shield = true;
    addPopup(game.fx, powerup.x, powerup.y - 20, 'SHIELD!', '#7fd4ff', 22);
  } else if (powerup.kind === 'magnet') {
    game.magnetTimer = CONFIG.MAGNET_DURATION;
    addPopup(game.fx, powerup.x, powerup.y - 20, 'MAGNET!', '#c77dff', 22);
  } else {
    game.overdriveTimer = CONFIG.OVERDRIVE_DURATION;
    addPopup(game.fx, powerup.x, powerup.y - 20, 'OVERDRIVE!', '#ff6b35', 22);
  }
  sfxPowerup(game.audio);
}

function updatePlay(game, input, dt) {
  const level = game.level;
  const c = game.comet;
  game.time += dt;
  game.levelTime += dt;
  if (game.bannerTimer > 0) game.bannerTimer -= dt;
  if (game.invuln > 0) game.invuln -= dt;
  if (game.comboTimer > 0) {
    game.comboTimer -= dt;
    if (game.comboTimer <= 0) game.combo = 0;
  }
  if (game.magnetTimer > 0) game.magnetTimer -= dt;
  if (game.overdriveTimer > 0) game.overdriveTimer -= dt;

  // --- steering -----------------------------------------------------------
  let steer = keySteer(input);
  if (!steer && input.pointerActive) {
    const dx = input.pointerX - c.x;
    const dy = input.pointerY - c.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 8) steer = { x: dx / dist, y: dy / dist };
  }
  const wantBoost = boostHeld(input) && (game.boost > 0 || game.overdriveTimer > 0);
  const boosting = wantBoost && game.boost > CONFIG.BOOST_MIN_TO_START - 1 || (wantBoost && game.overdriveTimer > 0);
  game.boosting = boosting;
  if (boosting && game.overdriveTimer <= 0) {
    game.boost = Math.max(0, game.boost - CONFIG.BOOST_DRAIN * dt);
  } else if (!boosting) {
    game.boost = Math.min(CONFIG.BOOST_MAX, game.boost + CONFIG.BOOST_REFILL * dt);
  }

  // --- physics ------------------------------------------------------------
  const gravityBodies = [...level.planets, ...level.suns];
  const g = totalGravity(gravityBodies, c.x, c.y);
  let ax = g.x;
  let ay = g.y;
  if (steer) {
    const accel = boosting ? CONFIG.BOOST_ACCEL : CONFIG.COMET_ACCEL;
    ax += steer.x * accel;
    ay += steer.y * accel;
    c.angle = Math.atan2(steer.y, steer.x);
  } else {
    // Gentle drag when the player lets go.
    c.vx *= 1 - CONFIG.COMET_DRAG * dt;
    c.vy *= 1 - CONFIG.COMET_DRAG * dt;
  }
  const maxSpeed = boosting ? CONFIG.BOOST_MAX_SPEED : CONFIG.COMET_MAX_SPEED;
  integrate(c, ax, ay, dt, maxSpeed);
  clampToBounds(c, CONFIG.WIDTH, CONFIG.HEIGHT);

  // Asteroids drift and spin.
  for (const a of level.asteroids) {
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.angle += a.spin * dt;
    if (a.x < a.radius || a.x > CONFIG.WIDTH - a.radius) a.vx *= -1;
    if (a.y < a.radius || a.y > CONFIG.HEIGHT - a.radius) a.vy *= -1;
    a.x = Math.max(a.radius, Math.min(CONFIG.WIDTH - a.radius, a.x));
    a.y = Math.max(a.radius, Math.min(CONFIG.HEIGHT - a.radius, a.y));
  }

  // Magnet pulls nearby shards toward the comet.
  if (game.magnetTimer > 0) {
    for (const s of level.shards) {
      if (s.taken) continue;
      const dx = c.x - s.x;
      const dy = c.y - s.y;
      const d = Math.hypot(dx, dy);
      if (d < CONFIG.MAGNET_RADIUS && d > 1) {
        const pull = 420 * (1 - d / CONFIG.MAGNET_RADIUS);
        s.x += (dx / d) * pull * dt;
        s.y += (dy / d) * pull * dt;
      }
    }
  }

  // --- collisions ---------------------------------------------------------
  for (const p of level.planets) {
    if (bounceOff(c, p, 0.6)) {
      if (game.invuln <= 0) {
        // A hard bounce off a planet still hurts — planets are rock.
        takeHit(game, c.x, c.y);
      }
    }
  }
  for (const s of level.suns) {
    if (circleHit(c, s)) {
      takeHit(game, s.x, s.y);
      // Push out of the sun so one touch is not a multi-hit.
      const d = Math.hypot(c.x - s.x, c.y - s.y) || 1;
      c.x = s.x + ((c.x - s.x) / d) * (s.radius + c.radius + 2);
      c.y = s.y + ((c.y - s.y) / d) * (s.radius + c.radius + 2);
    }
  }
  if (game.screen !== SCREENS.PLAY) return; // a hit may have ended the run
  for (const a of level.asteroids) {
    if (circleHit(c, a)) {
      takeHit(game, a.x, a.y);
      if (game.screen !== SCREENS.PLAY) return;
      bounceOff(c, a, 0.6);
    }
  }
  for (const s of level.shards) {
    if (!s.taken && circleHit(c, s)) collectShard(game, s);
  }
  for (const p of level.powerups) {
    if (!p.taken && circleHit(c, p)) collectPowerup(game, p);
  }

  // --- warp gate ----------------------------------------------------------
  const gate = level.gate;
  const gateOpen = game.shardsGot >= level.shardTarget;
  if (gateOpen && circleHit(c, gate)) {
    game.gateTimer += dt;
    if (game.gateTimer > CONFIG.GATE_OPEN_DELAY) {
      const timeBonus = Math.max(0, Math.round((level.parTime - game.levelTime) * CONFIG.LEVEL_TIME_BONUS));
      game.score += CONFIG.GATE_SCORE + timeBonus;
      game.clearStats = {
        level: game.levelIndex + 1,
        name: level.name,
        score: game.score,
        timeBonus,
        shards: game.shardsGot,
        shardTarget: level.shardTarget,
        time: game.levelTime,
        hull: game.hull,
      };
      sfxGate(game.audio);
      sfxLevelClear(game.audio);
      addShake(game.fx, CONFIG.SHAKE_GATE);
      game.screen = SCREENS.CLEAR;
      thrustStop(game.audio);
      return;
    }
  } else {
    game.gateTimer = 0;
  }

  // --- trail + thrust audio ------------------------------------------------
  pushTrail(game.fx, c.x, c.y);
  if (boosting) thrustStart(game.audio);
  else thrustStop(game.audio);

  updateFx(game.fx, dt);
}

// One frame of the state machine. Returns nothing; the game object is the state.
export function update(game, input, dt) {
  const pressed = takePressed(input);
  // A click is an edge: consume it here so a fast click is never missed
  // between frames, and a button still held from play does not skip a
  // results screen by itself.
  const clicked = input.clicked;
  input.clicked = false;
  const anyKey = pressed.size > 0 || clicked;

  if (game.screen === SCREENS.TITLE) {
    updateFx(game.fx, dt);
    if (pressed.has('enter') || pressed.has(' ') || clicked) {
      game.audio.unlock();
      sfxClick(game.audio);
      startRun(game, game.runSeed);
    }
    return;
  }

  if (game.screen === SCREENS.PLAY) {
    if (pressed.has('p') || pressed.has('escape')) {
      game.screenBeforePause = SCREENS.PLAY;
      game.screen = SCREENS.PAUSED;
      thrustStop(game.audio);
      return;
    }
    if (pressed.has('m')) game.audio.setMuted(!game.audio.muted);
    updatePlay(game, input, dt);
    return;
  }

  if (game.screen === SCREENS.PAUSED) {
    if (pressed.has('p') || pressed.has('escape') || pressed.has('enter')) {
      game.screen = SCREENS.PLAY;
    }
    return;
  }

  if (game.screen === SCREENS.CLEAR) {
    updateFx(game.fx, dt);
    if (anyKey) {
      game.audio.unlock();
      sfxClick(game.audio);
      nextLevel(game);
    }
    return;
  }

  if (game.screen === SCREENS.OVER || game.screen === SCREENS.WIN) {
    updateFx(game.fx, dt);
    if (anyKey) {
      game.audio.unlock();
      sfxClick(game.audio);
      startRun(game, game.runSeed + 1);
    }
    return;
  }
}
