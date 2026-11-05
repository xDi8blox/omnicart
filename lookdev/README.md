# OMNICART V2 Lookdev

Visual targets for the cut-to-10 demonic-neon collection. **Look-dev only — not deployed.**

## Run

```bash
# from repo root
npx vite --config lookdev/vite.config.ts --host 127.0.0.1 --port 4600
# open http://127.0.0.1:4600/?scene=hover-tube
```

Scenes: `menu`, `hover-tube`, `horizon-drive`, `void-wing`, `prism-breaker`, `neon-coil`, `fluxball`, `chrono-drop`, `gemfuse`, `lumen-chase`, `pulse-duel`.

## Screenshots

Saved under `lookdev/shots/*.png` at 1280×720 via Playwright headless Chromium.

```bash
node lookdev/scripts/capture.mjs   # needs server on :4600
```

## Assets

- Quaternius CC0 fighters from BLOODRITE (`public/assets/*.glb`)
- Procedural textures + Three.js UnrealBloom
- Google Fonts: Cinzel / Orbitron / Rajdhani
