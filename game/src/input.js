// Keyboard + mouse state. The game reads this every frame; the module owns
// no game logic, it just reports what the player is doing right now.

export function createInput(canvas) {
  const keys = new Set();
  const state = {
    // Pointer position in canvas pixels (logical 1280x720 space).
    pointerX: 640,
    pointerY: 360,
    pointerDown: false,
    // True while the pointer has moved at least once (before that, the
    // comet just drifts so the title screen stays calm).
    pointerActive: false,
    // Edge-triggered presses, consumed by the game loop each frame.
    pressed: new Set(),
    // True when the pointer went down since the last frame (a click is an
    // edge, not a level: a fast click must not be missed between frames).
    clicked: false,
    keys,
  };

  function canvasPos(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 720,
    };
  }

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
      event.preventDefault();
    }
    if (!event.repeat) state.pressed.add(key);
    keys.add(key);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.key.toLowerCase());
  });
  window.addEventListener('blur', () => {
    keys.clear();
    state.pointerDown = false;
  });

  canvas.addEventListener('pointermove', (event) => {
    const p = canvasPos(event);
    state.pointerX = p.x;
    state.pointerY = p.y;
    state.pointerActive = true;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const p = canvasPos(event);
    state.pointerX = p.x;
    state.pointerY = p.y;
    state.pointerActive = true;
    state.pointerDown = true;
    state.clicked = true;
  });
  window.addEventListener('pointerup', () => {
    state.pointerDown = false;
  });
  // Keep the context menu from popping up on a right-click hold.
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return state;
}

// Was this key pressed since the last frame? The game calls takePressed
// once per update and the set is cleared, so a press fires exactly once.
export function takePressed(input) {
  const out = input.pressed;
  input.pressed = new Set();
  return out;
}

export function keyDown(input, ...names) {
  return names.some((n) => input.keys.has(n));
}

// Steering direction from the arrow keys / WASD, as a unit vector or null.
export function keySteer(input) {
  let x = 0;
  let y = 0;
  if (keyDown(input, 'arrowleft', 'a')) x -= 1;
  if (keyDown(input, 'arrowright', 'd')) x += 1;
  if (keyDown(input, 'arrowup', 'w')) y -= 1;
  if (keyDown(input, 'arrowdown', 's')) y += 1;
  if (x === 0 && y === 0) return null;
  const len = Math.hypot(x, y);
  return { x: x / len, y: y / len };
}

export function boostHeld(input) {
  return keyDown(input, ' ') || input.pointerDown;
}
