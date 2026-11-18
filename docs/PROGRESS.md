# Progress

## Status: v0.1 — first playable demo (2026-11-17)

### Done
- [x] Project scaffold (Vite + Three.js + Vitest), docs, tidy folder layout
- [x] Procedural world: chunked terrain (sea, beaches, rivers, orange hills, olive/ochre
      patches, rock, snowy peaks), trees, stylized animated water, dusk sky, distant
      mountain ring, flat cream clouds, purple distance haze
- [x] Art style: low-res render (1/3) + Bayer dithering + colour quantisation
- [x] Procedural jet (twin fins, gold canopy, afterburner flames that grow with boost)
- [x] Arcade flight: mouse steer, bank-to-turn, boost, barrel roll, terrain clearance
- [x] Cameras: 01 CHASE, 02 COCKPIT, 03 OVERHEAD (Space)
- [x] HUD: camera tag, heading + knots, bottom control bar, kill counter (x/4), sound and
      fullscreen buttons, start screen
- [x] Cockpit: canopy frame, glass HUD (heading tape, pitch ladder, speed/alt boxes, G,
      MSL), panel with radar, attitude indicator, 6 gauges, throttle
- [x] Combat: 4 enemy jets, homing missiles with smoke puffs, explosions, lock brackets,
      missile magazine with reload, new wave after all 4 are down
- [x] Wingtip contrails
- [x] Synthesised sound (engine, missile, explosion, roll), off by default
- [x] 23 unit tests (noise, terrain, flight, combat, HUD text, camera cycling, input)

### Next (waiting on Ryan's playtest feedback)
- [ ] Tune feel: steering sensitivity, speeds, camera distance
- [ ] Compare look side by side with the video and adjust palette/terrain
- [ ] Acceptance criteria (Ryan to define)

### Known issues / limitations
- Terrain cliffs along rivers can look steep and purple; the original is gentler.
- No collision with enemies or crash state (demo: the jet just stays above ground).
- Performance only checked in software rendering; real GPU should be much faster.
  If it's slow, raise `RENDER.pixelScale` or lower `WORLD.chunkRadius` in `src/config.js`.
