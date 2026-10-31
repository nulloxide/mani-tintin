# Project conventions

- Keep commit messages concise and imperative.
- Keep source comments and commit messages focused on behavior and implementation; omit tool and authorship attribution.
- Build the 3D Moon game with Babylon.js, TypeScript, and Vite.
- Keep the game playable in computer, phone, and iPad browsers with keyboard and touch controls.
- Keep GPU work and rendering resolution modest for mobile devices; use WebGL without requiring WebGPU.
- Keep assets compatible with Vite's `/mani-tintin/` base path.
- Publish only the built `dist/` directory through the Pages workflow.
- Keep credentials, local settings, and dependencies out of version control.
- Run `npm run build` and check the affected interactions before pushing to `main`; pushes publish automatically.
