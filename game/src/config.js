// Comet Courier — tuning constants. One place for every number that shapes
// how the game feels: speeds, gravity, levels pacing, scoring, power-ups.

export const CONFIG = {
  // Canvas (logical) size. The page canvas is 1280x720.
  WIDTH: 1280,
  HEIGHT: 720,

  // The comet.
  COMET_RADIUS: 14,
  COMET_ACCEL: 620, // px/s^2 while steering toward the pointer / keys
  COMET_MAX_SPEED: 340,
  COMET_DRAG: 0.35, // per-second velocity damping when no input
  COMET_TURN: 8.0, // how fast velocity chases the desired direction

  // Boost (Space / hold mouse button).
  BOOST_ACCEL: 1050,
  BOOST_MAX_SPEED: 560,
  BOOST_MAX: 100,
  BOOST_DRAIN: 38, // per second while boosting
  BOOST_REFILL: 16, // per second while not boosting
  BOOST_MIN_TO_START: 12,

  // Hull / damage.
  HULL_MAX: 3,
  HIT_INVULN: 1.6, // seconds of invulnerability after a hit
  HIT_KNOCKBACK: 260,

  // Gravity: planets pull the comet. G is tuned so a close pass slingshots
  // you around instead of swallowing you.
  GRAVITY_G: 52000,
  GRAVITY_MAX_PULL: 900, // clamp on a single body's pull

  // Shards and scoring.
  SHARD_RADIUS: 11,
  SHARD_SCORE: 100,
  COMBO_WINDOW: 2.5, // seconds between pickups to keep the combo alive
  COMBO_MAX: 8, // combo multiplier caps at x8
  GATE_SCORE: 500,
  LEVEL_TIME_BONUS: 10, // points per second left on the par time
  LEVEL_PAR_TIME: 75, // seconds; beating it pays a time bonus

  // Power-ups.
  POWERUP_RADIUS: 16,
  SHIELD_DURATION: 0, // shield lasts until it absorbs one hit
  MAGNET_DURATION: 12, // seconds
  MAGNET_RADIUS: 260, // shards inside this radius get pulled in
  OVERDRIVE_DURATION: 5, // seconds of unlimited boost

  // Asteroids.
  ASTEROID_MIN_RADIUS: 16,
  ASTEROID_MAX_RADIUS: 42,
  ASTEROID_DRIFT: 26, // max drift speed px/s
  ASTEROID_SPIN: 1.2, // max spin rad/s

  // Warp gate.
  GATE_RADIUS: 34,
  GATE_OPEN_DELAY: 0.8, // seconds of "gate opening" before the level clears

  // Feel.
  TRAIL_LENGTH: 26, // comet trail points
  SHAKE_DECAY: 3.2,
  SHAKE_HIT: 14,
  SHAKE_GATE: 6,
  POPUP_RISE: 46, // px a floating score popup rises
  POPUP_LIFE: 1.1, // seconds

  // Levels.
  LEVEL_COUNT: 5,
  SHARDS_PER_LEVEL: [6, 8, 10, 12, 14],

  // Deterministic shot mode: fixed simulated time per scene (seconds).
  SHOT_PLAY_TIME: 9.5,
  SHOT_CLEAR_TIME: 2.0,
};
