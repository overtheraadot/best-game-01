// Canvas drawing: the starfield, planets, suns, asteroids, shards, the
// comet and its trail, the HUD, and every screen (title, banner, clear,
// game over, victory, pause). Pure drawing over the game state — it never
// changes the state.

import { CONFIG } from './config.js';
import { SCREENS } from './world.js';

const TAU = Math.PI * 2;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'center', weight = '700', font = 'system-ui, sans-serif') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function glowText(ctx, str, x, y, size, color, glow, align = 'center', weight = '800') {
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 18;
  text(ctx, str, x, y, size, color, align, weight);
  ctx.restore();
}

function drawStars(ctx, level, time) {
  ctx.save();
  for (const s of level.stars) {
    const a = 0.35 + 0.65 * Math.abs(Math.sin(time * 0.7 + s.twinkle));
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = '#dfe8ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlanet(ctx, p, time) {
  ctx.save();
  ctx.translate(p.x, p.y);
  const grad = ctx.createRadialGradient(-p.radius * 0.35, -p.radius * 0.35, p.radius * 0.1, 0, 0, p.radius);
  grad.addColorStop(0, `hsl(${p.hue} 70% 62%)`);
  grad.addColorStop(0.55, `hsl(${p.hue} 60% 42%)`);
  grad.addColorStop(1, `hsl(${p.hue} 65% 22%)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, p.radius, 0, TAU);
  ctx.fill();
  // Surface bands.
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, -p.radius * 0.25, p.radius * 0.85, p.radius * 0.16, 0.15, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, p.radius * 0.35, p.radius * 0.7, p.radius * 0.13, -0.1, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (p.ring) {
    ctx.strokeStyle = 'rgba(220, 230, 255, 0.55)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.radius * 1.55, p.radius * 0.42, -0.35, 0, TAU);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, p.radius, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawSun(ctx, s, time) {
  const pulse = 1 + 0.06 * Math.sin(time * 3);
  ctx.save();
  ctx.translate(s.x, s.y);
  const glow = ctx.createRadialGradient(0, 0, s.radius * 0.2, 0, 0, s.radius * 2.6);
  glow.addColorStop(0, 'rgba(255, 180, 60, 0.55)');
  glow.addColorStop(0.4, 'rgba(255, 120, 30, 0.22)');
  glow.addColorStop(1, 'rgba(255, 120, 30, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, s.radius * 2.6, 0, TAU);
  ctx.fill();
  const core = ctx.createRadialGradient(-s.radius * 0.2, -s.radius * 0.2, 2, 0, 0, s.radius * pulse);
  core.addColorStop(0, '#fff7cc');
  core.addColorStop(0.5, '#ffb347');
  core.addColorStop(1, '#ff6b1a');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, s.radius * pulse, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawAsteroid(ctx, a) {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.angle);
  ctx.beginPath();
  for (let i = 0; i < a.verts; i++) {
    const ang = (i / a.verts) * TAU;
    const r = a.radius * (i % 2 === 0 ? 1 : a.jag);
    if (i === 0) ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
    else ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
  }
  ctx.closePath();
  ctx.fillStyle = `rgb(${Math.round(122 * a.shade)}, ${Math.round(110 * a.shade)}, ${Math.round(104 * a.shade)})`;
  ctx.fill();
  ctx.strokeStyle = 'rgba(30, 24, 20, 0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Craters.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.arc(-a.radius * 0.3, -a.radius * 0.2, a.radius * 0.22, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(a.radius * 0.35, a.radius * 0.3, a.radius * 0.16, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawShard(ctx, s, time) {
  const bob = Math.sin(time * 2.4 + s.phase) * 3;
  const tw = 0.75 + 0.25 * Math.sin(time * 5 + s.phase);
  ctx.save();
  ctx.translate(s.x, s.y + bob);
  ctx.scale(tw, 1);
  ctx.shadowColor = '#ffe066';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#ffe066';
  ctx.beginPath();
  ctx.moveTo(0, -13);
  ctx.lineTo(4, -4);
  ctx.lineTo(13, 0);
  ctx.lineTo(4, 4);
  ctx.lineTo(0, 13);
  ctx.lineTo(-4, 4);
  ctx.lineTo(-13, 0);
  ctx.lineTo(-4, -4);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff8d6';
  ctx.beginPath();
  ctx.arc(0, 0, 3.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawPowerup(ctx, p, time) {
  const bob = Math.sin(time * 2 + p.phase) * 3;
  const colors = { shield: '#7fd4ff', magnet: '#c77dff', overdrive: '#ff6b35' };
  const labels = { shield: 'S', magnet: 'M', overdrive: 'O' };
  const color = colors[p.kind] || '#ffffff';
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.fillStyle = 'rgba(10, 16, 36, 0.85)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  text(ctx, labels[p.kind], 0, 1, 20, color, 'center', '900');
  ctx.restore();
}

function drawGate(ctx, gate, open, time) {
  ctx.save();
  ctx.translate(gate.x, gate.y);
  const pulse = open ? 1 + 0.08 * Math.sin(time * 4) : 1;
  const ring = open ? '#7dffb2' : '#5a6b8a';
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, gate.radius * 1.9);
  glow.addColorStop(0, open ? 'rgba(125, 255, 178, 0.5)' : 'rgba(90, 107, 138, 0.25)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, gate.radius * 1.9, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = ring;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, gate.radius * pulse, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = open ? '#c8ffe0' : '#3a4763';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, gate.radius * 0.68 * pulse, 0, TAU);
  ctx.stroke();
  if (open) {
    ctx.fillStyle = 'rgba(125, 255, 178, 0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, gate.radius * 0.68 * pulse, 0, TAU);
    ctx.fill();
    // Swirl dashes.
    ctx.strokeStyle = '#eafff3';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const a0 = time * 1.6 + (i * TAU) / 3;
      ctx.beginPath();
      ctx.arc(0, 0, gate.radius * 0.45, a0, a0 + 0.9);
      ctx.stroke();
    }
  }
  ctx.restore();
  text(ctx, open ? 'WARP GATE OPEN' : 'GATE LOCKED', gate.x, gate.y + gate.radius + 22, 13, open ? '#7dffb2' : '#8a97b5', 'center', '800');
}

function drawComet(ctx, game) {
  const c = game.comet;
  const fx = game.fx;
  // Trail: fading ribbon behind the comet.
  if (fx.trail.length > 1) {
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 1; i < fx.trail.length; i++) {
      const t = i / fx.trail.length;
      ctx.strokeStyle = `rgba(125, 211, 252, ${t * 0.75})`;
      ctx.lineWidth = 2 + t * 9;
      ctx.beginPath();
      ctx.moveTo(fx.trail[i - 1].x, fx.trail[i - 1].y);
      ctx.lineTo(fx.trail[i].x, fx.trail[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.save();
  ctx.translate(c.x, c.y);
  // Invulnerability blink.
  if (game.invuln > 0 && Math.floor(game.time * 12) % 2 === 0) ctx.globalAlpha = 0.35;
  // Shield bubble.
  if (game.shield) {
    ctx.strokeStyle = 'rgba(127, 212, 255, 0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, c.radius + 12, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = 'rgba(127, 212, 255, 0.12)';
    ctx.beginPath();
    ctx.arc(0, 0, c.radius + 12, 0, TAU);
    ctx.fill();
  }
  // Glow.
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, c.radius * 2.4);
  glow.addColorStop(0, 'rgba(165, 243, 252, 0.9)');
  glow.addColorStop(0.45, 'rgba(56, 189, 248, 0.4)');
  glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, c.radius * 2.4, 0, TAU);
  ctx.fill();
  // Body, pointed along the flight angle.
  ctx.rotate(c.angle);
  const body = ctx.createLinearGradient(-c.radius, 0, c.radius, 0);
  body.addColorStop(0, '#fef9c3');
  body.addColorStop(0.55, '#fde68a');
  body.addColorStop(1, '#f97316');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, c.radius + 4, c.radius * 0.78, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff7d6';
  ctx.beginPath();
  ctx.arc(c.radius * 0.35, 0, c.radius * 0.42, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawParticles(ctx, fx) {
  for (const p of fx.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const p of fx.popups) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    text(ctx, p.text, p.x, p.y, p.size, p.color, 'center', '800');
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, game) {
  const level = game.level;
  const W = CONFIG.WIDTH;
  ctx.save();
  // Top bar.
  ctx.fillStyle = 'rgba(6, 10, 24, 0.55)';
  rr(ctx, 0, 0, W, 64, 0);
  ctx.fill();
  text(ctx, `SCORE  ${game.totalScore + game.score}`, 24, 32, 24, '#ffffff', 'left', '800');
  text(ctx, `LEVEL ${game.levelIndex + 1} / ${CONFIG.LEVEL_COUNT} — ${level.name}`, W / 2, 24, 20, '#a5f3fc', 'center', '700');
  text(ctx, `TIME ${Math.floor(game.levelTime)}s`, W / 2, 48, 14, '#8a97b5', 'center', '600');
  // Hull hearts.
  for (let i = 0; i < CONFIG.HULL_MAX; i++) {
    const x = W - 40 - i * 34;
    const y = 32;
    ctx.fillStyle = i < game.hull ? '#ff5d73' : 'rgba(255,255,255,0.28)';
    ctx.beginPath();
    ctx.moveTo(x, y + 8);
    ctx.bezierCurveTo(x - 12, y - 4, x - 6, y - 14, x, y - 5);
    ctx.bezierCurveTo(x + 6, y - 14, x + 12, y - 4, x, y + 8);
    ctx.fill();
    if (i >= game.hull) {
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  // Shards progress.
  const shardText = `SHARDS ${game.shardsGot} / ${level.shardTarget}`;
  text(ctx, shardText, W - 170, 32, 18, game.shardsGot >= level.shardTarget ? '#7dffb2' : '#ffe066', 'right', '800');
  // Boost meter, bottom left.
  const bw = 220;
  const bx = 24;
  const by = CONFIG.HEIGHT - 36;
  ctx.fillStyle = 'rgba(6, 10, 24, 0.6)';
  rr(ctx, bx - 8, by - 14, bw + 16, 28, 8);
  ctx.fill();
  const over = game.overdriveTimer > 0;
  const frac = over ? 1 : game.boost / CONFIG.BOOST_MAX;
  ctx.fillStyle = over ? '#ff6b35' : game.boosting ? '#38bdf8' : '#0ea5e9';
  rr(ctx, bx, by - 8, bw * frac, 16, 6);
  ctx.fill();
  text(ctx, over ? 'OVERDRIVE!' : 'BOOST — hold SPACE / mouse', bx + bw / 2, by + 1, 12, '#ffffff', 'center', '800');
  // Combo, bottom right.
  if (game.combo > 1) {
    text(ctx, `COMBO x${game.combo}`, W - 24, CONFIG.HEIGHT - 28, 22, '#ff9f1c', 'right', '900');
  }
  // Active power-up timers.
  let py = CONFIG.HEIGHT - 66;
  if (game.magnetTimer > 0) {
    text(ctx, `MAGNET ${Math.ceil(game.magnetTimer)}s`, W - 24, py, 15, '#c77dff', 'right', '700');
    py -= 22;
  }
  if (game.shield) {
    text(ctx, 'SHIELD READY', W - 24, py, 15, '#7fd4ff', 'right', '700');
  }
  ctx.restore();
}

function drawBanner(ctx, game) {
  if (game.bannerTimer <= 0) return;
  const a = Math.min(1, game.bannerTimer / 0.5);
  ctx.save();
  ctx.globalAlpha = a;
  glowText(ctx, `LEVEL ${game.levelIndex + 1} — ${game.level.name}`, CONFIG.WIDTH / 2, 150, 44, '#ffffff', 'rgba(56,189,248,0.8)');
  text(ctx, game.level.sub, CONFIG.WIDTH / 2, 196, 20, '#cbd5e1', 'center', '600');
  text(ctx, `Collect ${game.level.shardTarget} star shards, then fly through the warp gate`, CONFIG.WIDTH / 2, 226, 17, '#ffe066', 'center', '600');
  ctx.restore();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8, 13, 30, 0.82)';
  rr(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(148, 197, 255, 0.35)';
  ctx.lineWidth = 2;
  rr(ctx, x, y, w, h, 18);
  ctx.stroke();
}

function drawTitle(ctx, game) {
  const W = CONFIG.WIDTH;
  const H = CONFIG.HEIGHT;
  ctx.save();
  // A decorative comet streaking across the title.
  const t = game.time;
  const sx = ((t * 260) % (W + 400)) - 200;
  const sy = 120 + Math.sin(t * 0.8) * 40;
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.8)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(sx - 140, sy + 60);
  ctx.lineTo(sx, sy);
  ctx.stroke();
  ctx.fillStyle = '#fef9c3';
  ctx.beginPath();
  ctx.arc(sx, sy, 12, 0, TAU);
  ctx.fill();
  glowText(ctx, 'COMET COURIER', W / 2, 190, 76, '#ffffff', 'rgba(56,189,248,0.9)');
  text(ctx, 'A gravity-slingshot arcade run through five asteroid fields', W / 2, 258, 22, '#cbd5e1', 'center', '600');
  panel(ctx, W / 2 - 330, 300, 660, 190);
  text(ctx, 'STEER  mouse or WASD / arrows', W / 2, 336, 19, '#e2e8f0', 'center', '700');
  text(ctx, 'BOOST  hold SPACE or mouse button', W / 2, 370, 19, '#e2e8f0', 'center', '700');
  text(ctx, 'SLINGSHOT around planets — dodge asteroids & suns', W / 2, 404, 19, '#e2e8f0', 'center', '700');
  text(ctx, 'Collect shards, reach the warp gate. 3 hull.', W / 2, 438, 19, '#e2e8f0', 'center', '700');
  const blink = 0.6 + 0.4 * Math.sin(t * 4);
  ctx.globalAlpha = blink;
  glowText(ctx, 'CLICK OR PRESS ENTER TO FLY', W / 2, 540, 28, '#ffe066', 'rgba(255, 224, 102, 0.7)');
  ctx.globalAlpha = 1;
  if (game.best > 0) {
    text(ctx, `BEST SCORE  ${game.best}`, W / 2, 592, 20, '#7dffb2', 'center', '800');
  }
  text(ctx, 'P pause   •   M mute', W / 2, 640, 15, '#8a97b5', 'center', '600');
  ctx.restore();
}

function drawClear(ctx, game) {
  const s = game.clearStats;
  const W = CONFIG.WIDTH;
  ctx.save();
  ctx.fillStyle = 'rgba(4, 8, 20, 0.55)';
  ctx.fillRect(0, 0, W, CONFIG.HEIGHT);
  panel(ctx, W / 2 - 320, 150, 640, 400);
  glowText(ctx, 'LEVEL CLEAR!', W / 2, 210, 48, '#7dffb2', 'rgba(125,255,178,0.8)');
  text(ctx, `Level ${s.level} — ${s.name}`, W / 2, 262, 22, '#cbd5e1', 'center', '700');
  text(ctx, `Shards  ${s.shards} / ${s.shardTarget}`, W / 2, 316, 22, '#ffe066', 'center', '700');
  text(ctx, `Time  ${s.time.toFixed(1)}s   •   Hull left  ${s.hull}`, W / 2, 352, 20, '#e2e8f0', 'center', '600');
  text(ctx, `Time bonus  +${s.timeBonus}`, W / 2, 388, 20, '#e2e8f0', 'center', '600');
  text(ctx, `LEVEL SCORE  ${s.score}`, W / 2, 432, 26, '#ffffff', 'center', '800');
  const blink = 0.6 + 0.4 * Math.sin(game.time * 4);
  ctx.globalAlpha = blink;
  text(ctx, 'CLICK OR PRESS ANY KEY FOR THE NEXT LEVEL', W / 2, 500, 20, '#ffe066', 'center', '800');
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawOver(ctx, game) {
  const W = CONFIG.WIDTH;
  ctx.save();
  ctx.fillStyle = 'rgba(20, 4, 8, 0.6)';
  ctx.fillRect(0, 0, W, CONFIG.HEIGHT);
  panel(ctx, W / 2 - 320, 150, 640, 400);
  glowText(ctx, 'GAME OVER', W / 2, 210, 52, '#ff5d73', 'rgba(255,93,115,0.8)');
  text(ctx, `Your comet broke apart in Level ${game.levelIndex + 1}`, W / 2, 266, 21, '#cbd5e1', 'center', '600');
  text(ctx, `RUN SCORE  ${game.totalScore}`, W / 2, 330, 30, '#ffffff', 'center', '800');
  text(ctx, `Shards this level  ${game.shardsGot} / ${game.level.shardTarget}`, W / 2, 378, 20, '#ffe066', 'center', '700');
  if (game.totalScore >= game.best && game.totalScore > 0) {
    text(ctx, 'NEW BEST SCORE!', W / 2, 420, 22, '#7dffb2', 'center', '900');
  } else if (game.best > 0) {
    text(ctx, `Best  ${game.best}`, W / 2, 420, 20, '#8a97b5', 'center', '700');
  }
  const blink = 0.6 + 0.4 * Math.sin(game.time * 4);
  ctx.globalAlpha = blink;
  text(ctx, 'CLICK OR PRESS ANY KEY TO FLY AGAIN', W / 2, 500, 20, '#ffe066', 'center', '800');
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawWin(ctx, game) {
  const W = CONFIG.WIDTH;
  ctx.save();
  ctx.fillStyle = 'rgba(4, 10, 24, 0.6)';
  ctx.fillRect(0, 0, W, CONFIG.HEIGHT);
  panel(ctx, W / 2 - 340, 140, 680, 420);
  glowText(ctx, 'COURIER COMPLETE!', W / 2, 200, 46, '#7dffb2', 'rgba(125,255,178,0.9)');
  text(ctx, 'All five asteroid fields cleared. The stars are yours.', W / 2, 252, 21, '#cbd5e1', 'center', '600');
  text(ctx, `TOTAL SCORE  ${game.totalScore}`, W / 2, 322, 32, '#ffffff', 'center', '800');
  if (game.totalScore >= game.best && game.totalScore > 0) {
    text(ctx, 'NEW BEST SCORE!', W / 2, 368, 22, '#7dffb2', 'center', '900');
  } else if (game.best > 0) {
    text(ctx, `Best  ${game.best}`, W / 2, 368, 20, '#8a97b5', 'center', '700');
  }
  const blink = 0.6 + 0.4 * Math.sin(game.time * 4);
  ctx.globalAlpha = blink;
  text(ctx, 'CLICK OR PRESS ANY KEY TO PLAY AGAIN', W / 2, 500, 20, '#ffe066', 'center', '800');
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawPaused(ctx, game) {
  const W = CONFIG.WIDTH;
  ctx.save();
  ctx.fillStyle = 'rgba(4, 8, 20, 0.6)';
  ctx.fillRect(0, 0, W, CONFIG.HEIGHT);
  panel(ctx, W / 2 - 260, 240, 520, 200);
  glowText(ctx, 'PAUSED', W / 2, 300, 46, '#ffffff', 'rgba(56,189,248,0.8)');
  text(ctx, 'Press P or Esc to keep flying', W / 2, 360, 20, '#cbd5e1', 'center', '600');
  text(ctx, 'M — mute', W / 2, 392, 16, '#8a97b5', 'center', '600');
  ctx.restore();
}

function drawWorld(ctx, game) {
  const level = game.level;
  drawStars(ctx, level, game.time);
  for (const s of level.suns) drawSun(ctx, s, game.time);
  for (const p of level.planets) drawPlanet(ctx, p, game.time);
  drawGate(ctx, level.gate, game.shardsGot >= level.shardTarget, game.time);
  for (const a of level.asteroids) drawAsteroid(ctx, a);
  for (const s of level.shards) if (!s.taken) drawShard(ctx, s, game.time);
  for (const p of level.powerups) if (!p.taken) drawPowerup(ctx, p, game.time);
  drawComet(ctx, game);
  drawParticles(ctx, game.fx);
}

// The one entry point the loop calls each frame.
export function render(ctx, game) {
  const W = CONFIG.WIDTH;
  const H = CONFIG.HEIGHT;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = game.level ? game.level.sky : '#0b1026';
  ctx.fillRect(0, 0, W, H);

  if (game.screen === SCREENS.TITLE) {
    // Title over a calm demo field (level 1, comet parked at spawn).
    drawStars(ctx, game.level, game.time);
    for (const p of game.level.planets) drawPlanet(ctx, p, game.time);
    for (const a of game.level.asteroids) drawAsteroid(ctx, a);
    for (const s of game.level.shards) if (!s.taken) drawShard(ctx, s, game.time);
    drawTitle(ctx, game);
    ctx.restore();
    return;
  }

  // All other screens keep the world visible behind their panel.
  ctx.translate(game.fx.shakeX, game.fx.shakeY);
  drawWorld(ctx, game);
  ctx.restore();
  ctx.save();
  if (game.screen === SCREENS.PLAY || game.screen === SCREENS.PAUSED) {
    drawHud(ctx, game);
    drawBanner(ctx, game);
  }
  if (game.screen === SCREENS.PAUSED) drawPaused(ctx, game);
  if (game.screen === SCREENS.CLEAR) drawClear(ctx, game);
  if (game.screen === SCREENS.OVER) drawOver(ctx, game);
  if (game.screen === SCREENS.WIN) drawWin(ctx, game);
  ctx.restore();
}
