# OMNICART

**30 neon arcade games. One cartridge.**

A polished browser game collection — Vite + TypeScript, Canvas 2D (Three.js for the hover-bike tunnel), lazy-loaded game chunks, procedural Web Audio, keyboard + touch, and a retro cartridge select menu with high scores.

## Play

**Live:** https://xdi8blox.github.io/omnicart/

![OMNICART menu](./screenshots/menu.png)

## Screenshots

<p>
  <img src="./screenshots/neon-coil.png" width="24%" alt="Neon Coil" />
  <img src="./screenshots/void-wing.png" width="24%" alt="Void Wing" />
  <img src="./screenshots/chrono-drop.png" width="24%" alt="Chrono Drop" />
  <img src="./screenshots/hover-tube.png" width="24%" alt="Hover Tube" />
</p>

| Arcade | Puzzle | Racing | Action |
|--------|--------|--------|--------|
| ![Neon Coil](./screenshots/neon-coil.png) Neon Coil | ![Chrono Drop](./screenshots/chrono-drop.png) Chrono Drop | ![Driftwire](./screenshots/driftwire.png) Driftwire | ![Pulse Duel](./screenshots/pulse-duel.png) Pulse Duel |
| ![Prism Breaker](./screenshots/prism-breaker.png) Prism Breaker | ![Gemfuse](./screenshots/gemfuse.png) Gemfuse | ![Horizon Drive](./screenshots/horizon-drive.png) Horizon Drive | ![Edge Parry](./screenshots/edge-parry.png) Edge Parry |
| ![Void Wing](./screenshots/void-wing.png) Void Wing | ![Helix 2048](./screenshots/helix-2048.png) Helix 2048 | ![Lane Rush](./screenshots/lane-rush.png) Lane Rush | ![Street Surge](./screenshots/street-surge.png) Street Surge |
| ![Shard Field](./screenshots/shard-field.png) Shard Field | ![Signal Sweep](./screenshots/signal-sweep.png) Signal Sweep | ![Hover Tube](./screenshots/hover-tube.png) Hover Tube | ![Ring Push](./screenshots/ring-push.png) Ring Push |
| ![Lumen Chase](./screenshots/lumen-chase.png) Lumen Chase | ![Glyph Grid](./screenshots/glyph-grid.png) Glyph Grid | ![Arena Kart](./screenshots/arena-kart.png) Arena Kart | ![Apex Gauntlet](./screenshots/apex-gauntlet.png) Apex Gauntlet |
| ![Rushline](./screenshots/rushline.png) Rushline | ![Shift-15](./screenshots/shift-15.png) Shift-15 | | |
| ![Cave Dart](./screenshots/cave-dart.png) Cave Dart | ![Conduit](./screenshots/conduit.png) Conduit | | |
| ![Fluxball](./screenshots/fluxball.png) Fluxball | ![Echo Pairs](./screenshots/echo-pairs.png) Echo Pairs | | |
| ![Aegis Grid](./screenshots/aegis-grid.png) Aegis Grid | ![Lexigrid](./screenshots/lexigrid.png) Lexigrid | | |
| ![Sky Stack](./screenshots/sky-stack.png) Sky Stack | ![Cratecraft](./screenshots/cratecraft.png) Cratecraft | | |

All captures are in [`screenshots/`](./screenshots/).

## Controls

- **Keyboard:** Arrows / WASD move · Space / Z / J action · Esc / P pause · extras per game (hold, flippers, dash, etc.)
- **Touch:** On-screen D-pad + A/B · swipe/tap where it fits
- **Mobile:** Landscape-friendly responsive canvas with `devicePixelRatio` scaling

## Tech

- Vite + TypeScript
- Shared `GameBase` shell: HUD, pause/restart/quit, settings (SFX/music/mute), localStorage highs & stats
- Three.js only for **Hover Tube**
- Each game is its own lazy chunk
- Procedural Web Audio SFX + motif music
- Playwright smoke: launches all 30 with keyboard + touch, asserts canvas render & no errors

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
