# Tintin & Mani — Destination Moon

A browser adventure made for Commander Mani, inspired by *Destination Moon* and *Explorers on the Moon*. Play as Tintin, rescue Captain Haddock near Adonis, explore the Moon, find Snowy at the ice cave, and bring the crew home.

**[Play the game](https://nulloxide.com/mani-tintin/)**

## The adventure

- Time three tether pulls to rescue Haddock from his accidental orbit.
- Land the red-and-white rocket and explore a cratered 3D landscape.
- Collect five samples, including ice near the cave, and rescue Snowy.
- Drive the **Mani Express** lunar tank, leave footprints, and try low-gravity jumps.
- Return to base, repair the launch sequence, and fly home.
- Earn a mission rating and save a personal best on the current browser.

**Explorer** has unlimited oxygen and no meteor hazards. **Expedition** adds oxygen management and telegraphed impacts. Base camp refills oxygen. If oxygen runs out, Tintin returns safely to base with discoveries intact. Pausing or leaving the tab stops mission time.

The short adventure adapts selected events from the books with original dialogue and a lighthearted ending. Mani's name appears in mission control, radio banter, vehicle markings, and the mission report. It is a personal fan project, not an official Tintin release.

## Controls

| Action | Computer | Phone / tablet |
| --- | --- | --- |
| Move | WASD or arrow keys | Left thumb stick |
| Look around | Drag scene | Swipe scene |
| Zoom | Scroll | Pinch |
| Moon jump | Space | Jump button |
| Collect / rescue / drive / exit | E or action button | Gold action button |
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

Tests cover collection rules, story progression, launch puzzle recovery, oxygen, rescue preservation, replay reset, ratings, and timer formatting. Before publishing, also play the browser mission and inspect desktop, phone, and tablet layouts. Physical-device frame rates still need checking on the intended phones and iPads.

## Rendering

Babylon.js, TypeScript, and Vite. The 3D models, terrain, textures, and radio portraits are built in the project. Clean outlines, warm lunar colors, clear helmets, orange spacesuits, and the checkerboard rocket give the scene its comic look. Audio uses quiet synthesized cues, unlocked by a player interaction.

WebGL is required; WebGPU is not. Rendering resolution is capped, shadow resolution can be reduced, and the game switches to lighter graphics if initial frames are consistently slow. No account, server, installation, or external asset service is required. Personal bests use local storage when available.

## Publishing

Pushes to `main` run tests, check TypeScript, build, and publish only `dist/` through GitHub Pages. Vite uses `/mani-tintin/` as its base path. Keep credentials and local settings out of the repository.

## Files

- `src/game.ts`: chapter flow, interactions, movement, HUD, and lifecycle.
- `src/mission.ts`: mission progression and scoring.
- `src/world.ts`: terrain, scenery, lighting, markers, and effects.
- `src/models.ts`: characters, rocket, rover, and materials.
- `src/input.ts`, `src/audio.ts`, `src/portraits.ts`: controls, sound, and radio portraits.
- `index.html`, `src/style.css`: responsive interface and dialogs.
- `tests/mission.test.ts`: mission rules and recovery checks.

## References

- [Destination Moon — Tintin.com](https://www.tintin.com/en/albums/destination-moon)
- [Explorers on the Moon — Tintin.com](https://www.tintin.com/en/albums/explorers-on-the-moon)
- [Babylon.js shadows](https://doc.babylonjs.com/features/featuresDeepDive/lights/shadows)
- [Babylon.js camera inputs](https://doc.babylonjs.com/features/featuresDeepDive/cameras/customizingCameraInputs/)
