# Tintin — Destination Moon

A 3D Moon adventure for computer, phone, and iPad browsers. This first preview includes a lunar scene, an orbit camera, and a short landing sequence. Full gameplay is still to come.

[Open the site](https://nulloxide.com/mani-tintin/)

## Local preview

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173/mani-tintin/ and select **Land on the Moon**. Drag to orbit, pinch or scroll to zoom, and select **Fly again** to reset. Buttons also work with a keyboard.

## Stack

- Babylon.js renders the 3D scene using WebGL.
- TypeScript keeps game code checked as it grows.
- Vite builds versioned assets for GitHub Pages.
- Native HTML controls support mouse, touch, and keyboard input.

Rendering resolution is capped and can drop on slower devices. The scene pauses when its tab is hidden. No server, sign-in, or installation is required to play. Use a recent browser with WebGL enabled.

## Validation

```sh
npm run build
npm run preview
```

Check http://127.0.0.1:4173/mani-tintin/ at desktop, phone, and tablet sizes. Test landing, resetting, orbiting, zooming, and returning from a background tab. Physical-device performance still needs checking on the intended phones and iPads.

## Publishing

The `main` branch automatically installs locked dependencies, checks TypeScript, builds, and deploys `dist/` to GitHub Pages. The workflow can also be run manually from the Actions tab.

Vite uses `/mani-tintin/` as its base path. Import assets through Vite or use `import.meta.env.BASE_URL` for public assets.

## Project structure

- `index.html`: page and accessible controls.
- `src/main.ts`: startup and loading fallback.
- `src/moon.ts`: scene, camera, and landing sequence.
- `src/style.css`: responsive layout.
- `vite.config.ts`: build and base-path configuration.
- `.github/workflows/deploy.yml`: automatic deployment.
