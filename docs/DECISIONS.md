# Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-11-17 | Three.js + Vite + vanilla JS + Vitest | Standard browser 3D stack; matches the original (real-time WebGL); zero-config dev server; Ryan delegated the choice to Claude. |
| 2026-11-17 | Everything procedural (no asset files) | The original's style is flat-coloured low-poly + post-processing, so code-built models look the same. Keeps the repo small. A `.glb` model can replace the jet later if wanted. |
| 2026-11-17 | Art style = low-res render + Bayer dither post-pass | One shader produces most of the original's painterly pixel look. |
| 2026-11-17 | Arcade flight model with Euler angles (yaw/pitch/bank), pitch clamped to ±70° | Simple, testable, no gimbal problems inside the clamp; a demo doesn't need loops. |
| 2026-11-17 | Click = barrel roll, hold = boost (Shift also boosts) | Matches the original's control bar ("Click Roll", "Hold Boost"); Ryan approved barrel roll. |
| 2026-11-17 | 3 cameras (Chase, Cockpit, Overhead) | Those are the ones visible in the video. |
| 2026-11-17 | Pure logic split from rendering (`flight.js`, `combat.js`, `heightfield.js`) | Lets us unit-test the game rules without a browser. |
| 2026-11-17 | Sound synthesised with Web Audio, off by default | No audio files; the original also starts with "SOUND OFF". |
| 2026-11-18 | 2x supersample + device-pixel-aligned upscale; dither strength 0.45 | Ryan found the dots harsh and the mountains/water flickering; averaging removes sub-pixel popping, integer device-pixel blocks keep pixels crisp on Windows display scaling. |
