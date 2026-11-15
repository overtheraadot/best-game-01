// Particles, the comet trail, screen shake and floating score popups.
// Everything here is visual feedback — it never changes game logic.

import { CONFIG } from './config.js';

export function createFx() {
  return {
    particles: [],
    popups: [],
    trail: [],
    shake: 0,
    shakeX: 0,
    shakeY: 0,
  };
}

export function addShake(fx, amount) {
  fx.shake = Math.min(24, fx.shake + amount);
}

export function updateFx(fx, dt) {
  // Shake decays toward zero; the offset is re-rolled every frame.
  fx.shake = Math.max(0, fx.shake - CONFIG.SHAKE_DECAY * fx.shake * dt - 2 * dt);
  if (fx.shake > 0.2) {
    fx.shakeX = (Math.random() * 2 - 1) * fx.shake;
    fx.shakeY = (Math.random() * 2 - 1) * fx.shake;
  } else {
    fx.shakeX = 0;
    fx.shakeY = 0;
  }
  for (const p of fx.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 1.6 * dt;
    p.vy *= 1 - 1.6 * dt;
    p.size = Math.max(0, p.size - p.shrink * dt);
  }
  fx.particles = fx.particles.filter((p) => p.life > 0 && p.size > 0);
  for (const p of fx.popups) {
    p.life -= dt;
    p.y -= (CONFIG.POPUP_RISE / CONFIG.POPUP_LIFE) * dt;
  }
  fx.popups = fx.popups.filter((p) => p.life > 0);
}

export function pushTrail(fx, x, y) {
  fx.trail.push({ x, y });
  if (fx.trail.length > CONFIG.TRAIL_LENGTH) fx.trail.shift();
}

export function clearTrail(fx) {
  fx.trail.length = 0;
}

export function burst(fx, x, y, { count = 24, color = '#ffd166', speed = 260, size = 5, life = 0.8 }) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.3 + Math.random() * 0.7);
    fx.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      size: size * (0.5 + Math.random() * 0.8),
      shrink: size * 1.4,
      life: life * (0.5 + Math.random() * 0.7),
      maxLife: life,
      color,
    });
  }
}

export function sparkle(fx, x, y, color) {
  burst(fx, x, y, { count: 12, color, speed: 140, size: 3.5, life: 0.6 });
}

export function explosion(fx, x, y) {
  burst(fx, x, y, { count: 42, color: '#ff6b35', speed: 340, size: 6, life: 1.0 });
  burst(fx, x, y, { count: 24, color: '#ffd166', speed: 220, size: 4, life: 0.8 });
  burst(fx, x, y, { count: 16, color: '#ffffff', speed: 160, size: 3, life: 0.5 });
}

export function addPopup(fx, x, y, text, color = '#ffffff', size = 20) {
  fx.popups.push({ x, y, text, color, size, life: CONFIG.POPUP_LIFE, maxLife: CONFIG.POPUP_LIFE });
}
