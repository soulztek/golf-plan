# Golf Speed Plan (PWA)

Installable, offline-capable golf speed and skill plan: daily check-ins, guided mobility timer, drills, speed log, Testing Days.

Live: https://soulztek.github.io/golf-plan/

- `npm install && npm run build` → `dist/` (Vite + React; `scripts/gen-sw.mjs` writes the service worker).
- Deploys to GitHub Pages via `.github/workflows/pages.yml` on push to `main`.
- Data is stored in the browser (localStorage) on each device; use Log → Backup to export/import.
