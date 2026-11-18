# CLAUDE.md — instructions for Claude working on this repo

Read this file first in every session, then `docs/PROGRESS.md`.

## The project
**Dusk Patrol** — a remake of a stylized low-poly browser flight game shown in a
reference video (frames in `docs/reference/`). Goal: a **demo** that is "clearly the
same game". Not a full game; no win/lose conditions unless Ryan asks.

## Roles
- **Ryan** (owner): high-level direction, tech choices, playtesting, acceptance criteria.
- **Claude**: all development — code, tests, assets, docs. Works autonomously.

## Tech stack
- **Three.js** (WebGL 3D) · **Vite** (dev server/build) · **vanilla JavaScript (ES modules)**
- **Vitest** for unit tests (Node environment, no browser needed)
- **No asset files**: models, terrain, textures and sounds are all generated in code.

## Commands
```
npm install      # once
npm run dev      # play at http://localhost:5173
npm test         # unit tests
npm run build    # production build into dist/
```

## Layout (keep it tidy)
```
src/
  config.js        all tuning numbers + colour palette (change looks/feel here first)
  main.js          entry point
  core/            Game (main loop), Input, CameraRig
  world/           noise, heightfield (pure terrain math), Terrain, Water, Sky, Clouds
  entities/        flight.js, combat.js, mission.js (pure logic), Player, Enemies, Missiles, jetModel
  fx/              Particles (smoke/explosions), Contrails
  render/          PixelPass (low-res + dither post-process = the art style)
  ui/              Hud (DOM bars), Cockpit (canvas HUD + instruments), hud.css
  audio/           Sound (Web Audio synthesis)
tests/             *.test.js — one file per area
docs/              PROGRESS.md, DECISIONS.md, reference/ (video frames, screenshots)
```

## Conventions
- Game logic that can be pure (no Three.js/DOM) lives in its own module and gets tests:
  `flight.js`, `combat.js`, `mission.js`, `heightfield.js`, `noise.js`, formatting helpers.
- Units: 1 world unit = 1 metre. Heading 0° = north = −Z, 90° = east = +X.
- Model space for jets: nose −Z, up +Y, right wing +X.
- Magic numbers go in `src/config.js`, not inline.
- Never commit `node_modules/` or `dist/`.
- After each work session: update `docs/PROGRESS.md` (done / next / known issues) and add
  any notable choice to `docs/DECISIONS.md`.

## How Claude works on this repo
- Live: https://game-demo-1.vercel.app/ (Ryan's Vercel project, deploys from GitHub `main`).
- GitHub (public): https://github.com/RyanZhou123232/Game-demo-1 (branch `main`). Claude pushes;
  Ryan's local folder is not a git checkout, so keep the folder and GitHub in sync after changes.
- Video frames (`docs/reference/video_*.png`) are git-ignored: local reference only.
- Ryan's folder (`E:\project repo\飞机游戏`) is the source of truth. Claude edits files there
  directly, or builds in its cloud workspace and copies files back.
- Visual checks: build, then screenshot with headless Chrome (software WebGL — low FPS
  there is expected and says nothing about real performance).
- `node_modules` installed by Claude's Linux tools won't work on Windows: Ryan runs
  `npm install` himself on his laptop.
