// Boot and the main loop. Loads the canvas, wires input and audio, then
// either renders one deterministic ?shot= scene (screenshot mode) or runs
// the live game at requestAnimationFrame with a clamped delta time.

import { CONFIG } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createGame, loadBest, startLevel, update, SCREENS } from './world.js';
import { render } from './render.js';
import { renderShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Fixed logical resolution; CSS scales the canvas to fit the window.
canvas.width = CONFIG.WIDTH;
canvas.height = CONFIG.HEIGHT;

const input = createInput(canvas);
const audio = createAudio();
const game = createGame(audio);
loadBest(game);

// A level is needed as the backdrop behind the title screen.
startLevel(game, 0, 1);
game.screen = SCREENS.TITLE;

// First gesture unlocks audio (browsers require a user gesture).
window.addEventListener('pointerdown', () => audio.unlock(), { once: true });
window.addEventListener('keydown', () => audio.unlock(), { once: true });

// Screenshot mode: one fixed scene, no loop, no audio, no wall clock.
if (renderShot(ctx) !== null) {
  // Nothing else to do — renderShot already drew the frame and flagged
  // window.__shotReady for the capture tool.
} else {
  let last = performance.now();
  function frame(now) {
    // Clamp the step so a tab that was hidden does not jump the physics.
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    update(game, input, dt);
    render(ctx, game);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Expose the game for debugging in the console (handy, harmless).
window.__cometCourier = game;
