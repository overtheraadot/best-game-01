// Comet Courier — make.fun best-game-01 entry (Node 22, standard library
// only). The game is the plain static files in game/ beside this file: a
// desktop browser loads game/index.html offline, no network, no build step.
// This program hands the entry in: it copies game/ and screenshots/ into
// the output directory ($MAKEFUN_OUTPUT_DIR, else /output) and writes
// /output/dossier.json, the summary the judge reads, using the vendored
// make.fun library (vendor/makefun-game.ts, copied unchanged from the kit).
//
// The output is deterministic: the same repository always writes the same
// bytes, so two runs into two directories diff clean.
//
// Serve the game locally while developing with a plain static server, e.g.
//   python3 -m http.server 8080 --directory game
// then open http://localhost:8080 (or ?shot=title&seed=1 for a fixed scene).

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The directory this file lives in — the repository root.
const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps are the bounty's own gate caps, so this program refuses exactly
// where the scorer would: at most 4 screenshots of at most 256 KiB each,
// at most 993 files and directories under game/ totalling at most 48 MiB,
// no game/ path over 1000 bytes, and a dossier text of at most 160 KiB
// (the dossier file itself is capped at 1.5 MiB by the gate).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
