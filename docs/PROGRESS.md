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
- [x] Published to GitHub: https://github.com/RyanZhou123232/Game-demo-1
- [x] 26 unit tests (v0.2) (noise, terrain, flight, combat, HUD text, camera cycling, input)

### v0.2 visual pass (2026-11-18, from Ryan's playtest)
- [x] Dither pattern much subtler (strength 0.45, 22 colour levels) and crisp on scaled
      (150%/HiDPI) screens: art pixels are now whole device pixels, no browser blur
- [x] Anti-flicker: scene rendered at 2x and averaged per art pixel
- [x] Distant mountains no longer flicker (snowcaps drawn as a separate layer, no depth fight)
- [x] Water foam strokes fade out with distance and move slower (no far-away sparkle)
- [x] Overhead camera closer to the jet

### v0.3 combat loop (2026-11-18)
- [x] Enemies engage inside 3.8 km, lead the player, break off when too close, fire homing missiles
- [x] Dodging: hard turns out-turn missiles; a barrel roll within 900 m breaks lock (80%)
- [x] Hull (3 hits), slow repair after 6 s out of combat; terrain/sea crashes
- [x] MISSILE / PULL UP warnings with beeps; HIT / EVADED toasts
- [x] SHOT DOWN and MISSION COMPLETE screens; waves get faster and more aggressive
- [x] Wreck camera orbits the crash site; hull bar + wave label in the bottom bar
- [x] Live on Vercel: https://game-demo-1.vercel.app/
- [x] 37 unit tests (+ mission rules); scripted headless playtest of fire/crash/wave flow

### Next (waiting on Ryan's playtest feedback)
- [ ] Balance: enemy fire rate, missile turn rate, damage (all in `THREAT` in `src/config.js`)
- [ ] Tune feel: steering sensitivity, speeds, camera distance
- [ ] Compare look side by side with the video and adjust palette/terrain
- [ ] Acceptance criteria (Ryan to define)

### Known issues / limitations
- Terrain cliffs along rivers can look steep and purple; the original is gentler.
- Performance only checked in software rendering; real GPU should be much faster.
  If it's slow, raise `RENDER.pixelScale` or lower `WORLD.chunkRadius` in `src/config.js`.
