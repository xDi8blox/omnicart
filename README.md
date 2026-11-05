# OMNICART

**10 demonic-neon arcade games. One cursed cartridge.**

Vite + TypeScript · Canvas 2D + Three.js · lazy-loaded games · procedural Web Audio · keyboard + iPhone Safari landscape touch · localStorage highs.

## Play

**Live:** https://xdi8blox.github.io/omnicart/

![OMNICART menu](./screenshots/menu.png)

## The Ten

| | | |
|---|---|---|
| ![Hover Tube](./screenshots/hover-tube.png) **Hover Tube** — anti-gravity tunnel racer | ![Horizon Drive](./screenshots/horizon-drive.png) **Horizon Drive** — night highway | ![Void Wing](./screenshots/void-wing.png) **Void Wing** — bullet hell + bosses |
| ![Prism Breaker](./screenshots/prism-breaker.png) **Prism Breaker** — glossy bricks | ![Neon Coil](./screenshots/neon-coil.png) **Neon Coil** — occult snake | ![Fluxball](./screenshots/fluxball.png) **Fluxball** — demonic pinball |
| ![Chrono Drop](./screenshots/chrono-drop.png) **Chrono Drop** — SRS tetris | ![Gemfuse](./screenshots/gemfuse.png) **Gemfuse** — match-3 cascades | ![Lumen Chase](./screenshots/lumen-chase.png) **Lumen Chase** — maze chase |
| ![Pulse Duel](./screenshots/pulse-duel.png) **Pulse Duel** — Quaternius 1v1 fighter | | |

Mobile landscape:

<p>
  <img src="./screenshots/mobile-hover-tube.png" width="48%" alt="Hover Tube mobile" />
  <img src="./screenshots/mobile-pulse-duel.png" width="48%" alt="Pulse Duel mobile" />
</p>

## Controls

- **Keyboard:** Arrows / WASD · Space / J / K actions · Esc / P pause · C hold (Chrono) · Z/M flippers
- **Touch:** On-screen D-pad + A/B · swipe where it fits · landscape recommended
- **Fighter:** ←/→ move · ↑ jump · J punch · K kick · Shift block

## Tech

- Vite + TypeScript
- Shared `GameBase` / HUD / pause / restart / game-over / settings
- Three.js only for Hover Tube, Horizon Drive, Pulse Duel (bloom scaled down on mobile)
- Quaternius CC0 fighters (from BLOODRITE)
- Each game is a lazy chunk
- Procedural Web Audio SFX + motif music
- Playwright smoke: every game boots, 5s simulated input, no console errors

## Develop

```bash
npm install
npm run dev          # http://localhost:4500
npm run build && npm run preview
npm run test:smoke
npm run screenshots
```

## License

MIT © Death / xDi8blox
