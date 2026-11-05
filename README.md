# OMNICART

**30 neon arcade games. One cartridge.**

A polished browser game collection built as a public portfolio piece — Vite + TypeScript, Canvas 2D (Three.js for the hover-bike tunnel), lazy-loaded game chunks, procedural Web Audio, keyboard + touch, and a retro cartridge select menu.

## Play

**Live:** https://xdi8blox.github.io/omnicart/

## Games

| # | ID | Name | Genre |
|---|----|------|-------|
| 1 | neon-coil | Neon Coil | Arcade |
| 2 | prism-breaker | Prism Breaker | Arcade |
| 3 | void-wing | Void Wing | Arcade |
| 4 | shard-field | Shard Field | Arcade |
| 5 | lumen-chase | Lumen Chase | Arcade |
| 6 | rushline | Rushline | Arcade |
| 7 | cave-dart | Cave Dart | Arcade |
| 8 | fluxball | Fluxball | Arcade |
| 9 | aegis-grid | Aegis Grid | Arcade |
| 10 | sky-stack | Sky Stack | Arcade |
| 11 | chrono-drop | Chrono Drop | Puzzle |
| 12 | gemfuse | Gemfuse | Puzzle |
| 13 | helix-2048 | Helix 2048 | Puzzle |
| 14 | signal-sweep | Signal Sweep | Puzzle |
| 15 | glyph-grid | Glyph Grid | Puzzle |
| 16 | shift-15 | Shift-15 | Puzzle |
| 17 | conduit | Conduit | Puzzle |
| 18 | echo-pairs | Echo Pairs | Puzzle |
| 19 | lexigrid | Lexigrid | Puzzle |
| 20 | cratecraft | Cratecraft | Puzzle |
| 21 | driftwire | Driftwire | Racing |
| 22 | horizon-drive | Horizon Drive | Racing |
| 23 | lane-rush | Lane Rush | Racing |
| 24 | hover-tube | Hover Tube | Racing (Three.js) |
| 25 | arena-kart | Arena Kart | Racing |
| 26 | pulse-duel | Pulse Duel | Action |
| 27 | edge-parry | Edge Parry | Action |
| 28 | street-surge | Street Surge | Action |
| 29 | ring-push | Ring Push | Action |
| 30 | apex-gauntlet | Apex Gauntlet | Action |

Screenshots live in [`screenshots/`](./screenshots/) (menu + per-game captures from the Playwright suite).

## Controls

- **Keyboard:** Arrows / WASD move · Space / Z / J action · Esc / P pause · game-specific extras in each cartridge subtitle
- **Touch:** On-screen D-pad + A/B · swipe/tap where it fits the genre
- **Mobile:** Landscape-friendly responsive canvas with `devicePixelRatio` scaling

## Tech

- Vite + TypeScript
- Canvas 2D game loop shell (`GameBase`) with shared HUD, pause/restart/quit, settings, localStorage highs
- Three.js only for **Hover Tube**
- Each game is a separate lazy chunk
- Procedural Web Audio SFX + looped motif music
- Playwright smoke test launches all 30 games with simulated input

## Develop

```bash
npm install
npm run dev          # http://localhost:4500
npm run build
npm run preview
npm run test:smoke
npm run screenshots
```

## License

MIT © Death / xDi8blox
