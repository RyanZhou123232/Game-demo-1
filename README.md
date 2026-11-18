# Dusk Patrol

A small stylized flight demo for the browser: fly a low-poly jet over a procedurally
generated dusk landscape, switch cameras, barrel-roll and shoot down enemy jets.

## Run it
You need **Node.js 18+** (check with `node -v`; get the LTS from https://nodejs.org).

```bash
npm install     # first time only
npm run dev     # opens http://localhost:5173 in your browser
```

## Controls
| Input | Action |
|---|---|
| Mouse position | Steer (the jet follows the cursor: left/right banks, up/down pitches) |
| Click (quick) | Barrel roll (also Q / E) |
| Hold left mouse | Boost (also Shift) |
| Space | Switch camera: Chase → Cockpit → Overhead |
| F / right-click | Fire missile (locks the bracketed enemy ahead) |
| M | Sound on/off (also the button in the bottom bar) |

## Tests
```bash
npm test
```

See `docs/PROGRESS.md` for status and `CLAUDE.md` for how the project is organised.
