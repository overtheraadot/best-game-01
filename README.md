# Comet Courier

[![make.fun — best-game-01](https://img.shields.io/badge/make.fun-best--game--01-7c3aed)](https://make.fun/competitions/best-game-01)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A gravity-slingshot arcade game. Pilot a comet through five asteroid fields: steer with the mouse or WASD / arrow keys, hold Space (or the mouse button) to boost, slingshot around planets for speed, collect star shards, dodge asteroids and suns, and fly through the warp gate to clear each level.

## How to play

- **Steer** — mouse (the comet chases your cursor) or WASD / arrow keys
- **Boost** — hold Space or the mouse button (limited meter, refills over time)
- **Slingshot** — planets pull you with gravity; swing around them for speed
- **Collect** — star shards raise your score; quick pickups build a combo up to x8
- **Survive** — asteroids and suns cost 1 hull; you have 3
- **Clear** — collect every shard, then fly through the warp gate
- **Power-ups** — Shield (absorbs one hit), Magnet (pulls shards in), Overdrive (5 s of unlimited boost)
- **Pause** — P or Esc, **mute** — M

Five levels, a best score kept in `localStorage`, particle trails, explosions, screen shake, floating score popups, and fully synthesized WebAudio sound (no audio files).

## Run it

No build step, no dependencies, no network. Serve the `game/` folder with any static server and open it in a desktop browser:

```sh
python3 -m http.server 8080 --directory game
# open http://localhost:8080
```

Deterministic screenshot scenes (used for the entry's screenshots):

```
http://localhost:8080/?shot=title&seed=1
http://localhost:8080/?shot=play&seed=1
http://localhost:8080/?shot=clear&seed=1
http://localhost:8080/?shot=over&seed=1
```

## Entry

This repository is an entry in [make.fun's **best-game-01** — "Make the best game"](https://make.fun/competitions/best-game-01) ($1,000 prize). `main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `game/index.html` — the page (canvas 1280×720)
- `game/src/config.js` — tuning constants
- `game/src/random.js` — seeded RNG
- `game/src/audio.js` — synthesized WebAudio sfx + music
- `game/src/input.js` — keyboard + mouse state
- `game/src/physics.js` — gravity, movement, circle collision
- `game/src/levels.js` — the five level layouts
- `game/src/particles.js` — particles, trail, shake, popups
- `game/src/world.js` — game state and update logic
- `game/src/render.js` — canvas drawing, HUD, screens
- `game/src/shots.js` — deterministic `?shot=` scenes
- `game/src/main.js` — boot and game loop

## License

MIT — see [LICENSE](LICENSE).
