// Physics: gravity, movement and circle-based collision. Pure functions
// over plain objects — no canvas, no audio, no game state in here.

import { CONFIG } from './config.js';

// Acceleration a body exerts on a point: inverse-square pull toward the
// body's centre, softened inside its radius so a close pass slingshots
// instead of snapping the comet into the planet.
export function gravityAccel(body, x, y) {
  const dx = body.x - x;
  const dy = body.y - y;
  const distSq = dx * dx + dy * dy;
  const soft = body.radius * body.radius * 0.55;
  const d = Math.sqrt(distSq + soft);
  const pull = Math.min(
    (CONFIG.GRAVITY_G * body.mass) / (d * d),
    CONFIG.GRAVITY_MAX_PULL,
  );
  return { x: (dx / d) * pull, y: (dy / d) * pull };
}

// Sum the pull of every gravity body (planets and suns).
export function totalGravity(bodies, x, y) {
  let ax = 0;
  let ay = 0;
  for (const body of bodies) {
    const a = gravityAccel(body, x, y);
    ax += a.x;
    ay += a.y;
  }
  return { x: ax, y: ay };
}

// Integrate one body for dt seconds with semi-implicit Euler, then clamp
// its speed to maxSpeed.
export function integrate(body, ax, ay, dt, maxSpeed) {
  body.vx += ax * dt;
  body.vy += ay * dt;
  const speed = Math.hypot(body.vx, body.vy);
  if (speed > maxSpeed) {
    body.vx = (body.vx / speed) * maxSpeed;
    body.vy = (body.vy / speed) * maxSpeed;
  }
  body.x += body.vx * dt;
  body.y += body.vy * dt;
}

// Circle overlap test. Returns the overlap depth, or 0 when apart.
export function circleOverlap(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const min = a.radius + b.radius;
  return dist < min ? min - dist : 0;
}

export function circleHit(a, b) {
  return circleOverlap(a, b) > 0;
}

// Push `mover` out of `solid` along the line between their centres and
// reflect the velocity component that points into the solid (a bounce).
// Returns true when a collision happened.
export function bounceOff(mover, solid, restitution = 0.55) {
  const dx = mover.x - solid.x;
  const dy = mover.y - solid.y;
  const dist = Math.hypot(dx, dy) || 0.001;
  const min = mover.radius + solid.radius;
  if (dist >= min) return false;
  const nx = dx / dist;
  const ny = dy / dist;
  mover.x = solid.x + nx * min;
  mover.y = solid.y + ny * min;
  const into = mover.vx * nx + mover.vy * ny;
  if (into < 0) {
    mover.vx -= (1 + restitution) * into * nx;
    mover.vy -= (1 + restitution) * into * ny;
  }
  return true;
}

// Keep a body inside the playfield, bouncing softly off the walls.
export function clampToBounds(body, width, height, restitution = 0.4) {
  if (body.x < body.radius) {
    body.x = body.radius;
    if (body.vx < 0) body.vx = -body.vx * restitution;
  } else if (body.x > width - body.radius) {
    body.x = width - body.radius;
    if (body.vx > 0) body.vx = -body.vx * restitution;
  }
  if (body.y < body.radius) {
    body.y = body.radius;
    if (body.vy < 0) body.vy = -body.vy * restitution;
  } else if (body.y > height - body.radius) {
    body.y = height - body.radius;
    if (body.vy > 0) body.vy = -body.vy * restitution;
  }
}
