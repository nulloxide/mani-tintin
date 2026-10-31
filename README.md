# Tintin & Mani — Destination Moon

A browser adventure made for Commander Mani, inspired by *Destination Moon* and *Explorers on the Moon*. Play as Tintin, rescue Captain Haddock near Adonis, explore the Moon, find Snowy at the ice cave, and bring the crew home.

**[Play the game](https://nulloxide.com/mani-tintin/)**

## The adventure

- Time three tether pulls to rescue Haddock from his accidental orbit.
- Land the red-and-white rocket and explore a cratered 3D landscape.
- Collect five samples, including ice near the cave, and rescue Snowy.
- Drive the **Mani Express** lunar tank, leave footprints, and try low-gravity jumps.
- Open **★ Moon games** for a rover rally, three jump hoops, and Snowy's biscuit-fetch game. Each badge adds 250 points; repeats are welcome without duplicating the bonus.
- Return to base, repair the launch sequence, and fly home.
- Earn a mission rating and save a personal best on the current browser.

**Explorer** has unlimited oxygen, no meteor hazards, and no time penalty for points or stars. **Expedition** adds oxygen management and telegraphed impacts. Base camp refills oxygen. If oxygen runs out, Tintin returns safely to base with discoveries intact. Pausing, opening a game menu, or leaving the tab stops mission time and rendering.

The first-steps checklist teaches movement, jumping, and collecting a sample. The opening rescue can be skipped to reach the Moon quickly. Challenge instructions and the compass guide each game; Snowy's game unlocks after his rescue. Cancelling or retrying a game preserves samples and earned badges.

The short adventure adapts selected events from the books with original dialogue and a lighthearted ending. Mani's name appears in mission control, radio banter, vehicle markings, and the mission report. It is a personal fan project, not an official Tintin release.

## Controls

| Action | Computer | Phone / tablet |
| --- | --- | --- |
| Move | WASD or arrow keys | Left thumb stick |
| Look around | Drag scene | Swipe scene |
| Zoom | Scroll | Pinch |
| Moon jump | Space | Jump button |
| Collect / rescue / drive / exit / throw biscuit | E or action button | Gold action button |
| Run | Shift + move | Use rover for faster travel |
| Pause | Escape or Pause | Pause button |

The rover's jump button becomes its horn. The compass points to the nearest unfinished objective; the map shows samples, cave, rover, and base. Sound and graphics controls are available throughout play. The pause screen contains control instructions.

## Development

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173/mani-tintin/.

```sh
npm test
npm run build
npm run preview
```

Tests cover collection rules, story progression, launch puzzle recovery, oxygen, rescue preservation, replay reset, ratings, challenge ordering and retries, badge awards, render budgets, and timer formatting. Before publishing, also play the browser mission and inspect desktop, phone, and tablet layouts. Physical-device frame rates still need checking on the intended phones and iPads.

## Rendering

Babylon.js, TypeScript, and Vite. The 3D models, terrain, textures, and radio portraits are built in the project. Clean outlines, warm lunar colors, clear helmets, orange spacesuits, and the checkerboard rocket give the scene its comic look. Audio uses quiet synthesized cues, unlocked by a player interaction.

The astronaut has a shaped suit, curved quiff, rounded boots, and detailed gloves. The rocket uses a smooth silhouette, the rover has beveled tracks and bodywork, and the cave and mountain ridge use custom geometry.

WebGL is required; WebGPU is not. Active play is capped at 60 rendered frames per second; the cover and light mode use 30. Rendering stops during pause, dialogs, and background inactivity. The high-quality buffer is limited to 2.1 million pixels and light mode to 850,000, including after resizing. Rigid model parts are batched by material; footprints and dust reuse instanced geometry. Shadow resolution and caster counts are limited, and the game switches to lighter graphics if initial frames are consistently slow.

For local profiling, open the development URL with `?profile=1`. A five-second report shows rendered FPS, CPU scene-frame work, draw calls, and buffer size. CPU scene work is not whole-browser CPU utilization or GPU time. The report and its instrumentation are omitted from production builds. Compare the same viewport, quality setting, camera, and scene after warm-up; check a full paused interval as well.

Desktop Chrome spot-check on October 31, 2026, at the landing spawn, high graphics, 1920 × 902 CSS pixels and device density 2:

| Measurement | Previous build | Updated build |
| --- | ---: | ---: |
| Rendered frames/second | 120 | 60 |
| Draw calls/frame | 547 | 305 |
| CPU scene work/wall time | 22.5% | 12.1% |
| Render buffer | 3264 × 1533 | 2114 × 993 |

These are short local samples, not a device-wide CPU benchmark. A full five-second paused sample in the updated build recorded zero rendered frames and draw calls. The browser walkthrough also completed all three games and the mission, with phone portrait/landscape and tablet layouts checked separately.

No account, server, installation, or external asset service is required. Personal bests use local storage when available.

## Publishing

Pushes to `main` run tests, check TypeScript, build, and publish only `dist/` through GitHub Pages. Vite uses `/mani-tintin/` as its base path. Keep credentials and local settings out of the repository.

## Files

- `src/game.ts`: chapter flow, interactions, movement, HUD, and lifecycle.
- `src/mission.ts`: mission progression and scoring.
- `src/challenges.ts`: optional games, timers, and badges.
- `src/world.ts`: terrain, scenery, lighting, markers, and effects.
- `src/models.ts`: characters, rocket, rover, and materials.
- `src/rendering.ts`, `src/diagnostics.ts`: pixel budgets and local performance reporting.
- `src/input.ts`, `src/audio.ts`, `src/portraits.ts`: controls, sound, and radio portraits.
- `index.html`, `src/style.css`: responsive interface and dialogs.
- `tests/mission.test.ts`, `tests/challenges.test.ts`: mission rules, recovery, challenges, and render budgets.

## References

- [Destination Moon — Tintin.com](https://www.tintin.com/en/albums/destination-moon)
- [Explorers on the Moon — Tintin.com](https://www.tintin.com/en/albums/explorers-on-the-moon)
- [Babylon.js shadows](https://doc.babylonjs.com/features/featuresDeepDive/lights/shadows)
- [Babylon.js camera inputs](https://doc.babylonjs.com/features/featuresDeepDive/cameras/customizingCameraInputs/)
