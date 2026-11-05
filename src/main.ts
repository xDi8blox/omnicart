import './style.css';
import { GAMES, loaders } from './core/catalog';
import { getEntry, recordPlay, loadSettings } from './core/storage';
import { audio } from './audio/AudioEngine';
import { glyphFor } from './ui/thumb';
import type { GameInstance, GameMeta } from './core/types';

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <div class="boot" id="boot">
    <div class="boot-logo">
      <h1>OMNICART</h1>
      <p>30 Games · One Cartridge</p>
      <div class="boot-bar"><i id="boot-fill"></i></div>
    </div>
  </div>
  <div class="shell" id="shell" hidden>
    <div class="topbar">
      <div class="brand">OMNICART<small>PORTABLE ARCADE</small></div>
      <div class="spacer"></div>
      <button class="icon-btn" id="btn-settings" type="button">Settings</button>
    </div>
    <div class="menu-wrap" id="menu"></div>
  </div>
  <div class="play-view" id="play">
    <div class="play-bar">
      <button class="icon-btn" id="btn-quit" type="button">⟵ Quit</button>
      <div class="title" id="play-title">Game</div>
      <button class="icon-btn" id="btn-pause" type="button">Pause</button>
      <button class="icon-btn" id="btn-restart" type="button">Restart</button>
    </div>
    <div class="play-stage" id="stage">
      <canvas id="game-canvas"></canvas>
      <div class="touch-pad" id="touch-pad">
        <div class="row">
          <button class="btn" data-key="arrowleft" type="button">◀</button>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn" data-key="arrowup" type="button">▲</button>
            <button class="btn" data-key="arrowdown" type="button">▼</button>
          </div>
          <button class="btn" data-key="arrowright" type="button">▶</button>
          <div class="spacer"></div>
          <button class="btn" data-key=" " type="button" style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#00c2d4,#c40088)">A</button>
          <button class="btn" data-key="shift" type="button">B</button>
        </div>
      </div>
      <div class="loading-game" id="loading-game" hidden>Loading cartridge…</div>
    </div>
  </div>
  <div class="overlay" id="pause-overlay">
    <div class="panel">
      <h2>Paused</h2>
      <p>Take a breath. The neon will wait.</p>
      <div class="row">
        <button class="btn primary" id="resume-btn" type="button">Resume</button>
        <button class="btn" id="pause-restart" type="button">Restart</button>
        <button class="btn" id="pause-quit" type="button">Quit</button>
      </div>
    </div>
  </div>
  <div class="overlay" id="over-overlay">
    <div class="panel">
      <h2 id="over-title">Game Over</h2>
      <p id="over-score">Score: 0</p>
      <div class="row">
        <button class="btn primary" id="over-retry" type="button">Play Again</button>
        <button class="btn" id="over-quit" type="button">Menu</button>
      </div>
    </div>
  </div>
  <div class="overlay" id="settings-overlay">
    <div class="panel settings">
      <h2>Settings</h2>
      <label>SFX <input id="sfx-vol" type="range" min="0" max="1" step="0.05" /></label>
      <label>Music <input id="music-vol" type="range" min="0" max="1" step="0.05" /></label>
      <label>Mute <input id="mute" type="checkbox" /></label>
      <div class="row"><button class="btn primary" id="settings-close" type="button">Done</button></div>
    </div>
  </div>
`;

const boot = document.getElementById('boot')!;
const bootFill = document.getElementById('boot-fill') as HTMLElement;
const shell = document.getElementById('shell')!;
const menu = document.getElementById('menu')!;
const play = document.getElementById('play')!;
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const playTitle = document.getElementById('play-title')!;
const loadingGame = document.getElementById('loading-game')!;
const pauseOverlay = document.getElementById('pause-overlay')!;
const overOverlay = document.getElementById('over-overlay')!;
const settingsOverlay = document.getElementById('settings-overlay')!;

let current: GameInstance | null = null;
let currentMeta: GameMeta | null = null;

function renderMenu(): void {
  const cats: Record<string, string> = {
    arcade: 'Arcade',
    puzzle: 'Puzzle',
    racing: 'Racing',
    action: 'Fighting / Action',
  };
  const order = ['arcade', 'puzzle', 'racing', 'action'] as const;
  menu.innerHTML = order
    .map((cat) => {
      const items = GAMES.filter((g) => g.category === cat);
      return `<div class="cat-title">${cats[cat]}</div><div class="grid">${items
        .map((g) => {
          const st = getEntry(g.id);
          return `<button class="cart" data-id="${g.id}" style="--accent:${g.accent}" type="button">
            <div class="cart-thumb"><span class="glyph">${glyphFor(g.id)}</span></div>
            <h3>${g.name}</h3>
            <p>${g.subtitle}</p>
            <div class="best">BEST ${st.best} · PLAYS ${st.plays}</div>
          </button>`;
        })
        .join('')}</div>`;
    })
    .join('');
  menu.querySelectorAll<HTMLButtonElement>('.cart').forEach((btn) => {
    btn.addEventListener('click', () => void launch(btn.dataset.id!));
  });
}

async function launch(id: string): Promise<void> {
  const meta = GAMES.find((g) => g.id === id);
  if (!meta) return;
  audio.ensure();
  audio.click();
  audio.startMusic(GAMES.indexOf(meta));
  currentMeta = meta;
  playTitle.textContent = meta.name;
  play.classList.add('active');
  shell.hidden = true;
  loadingGame.hidden = false;
  if (current) {
    current.destroy();
    current = null;
  }
  try {
    const mod = await loaders[id]();
    loadingGame.hidden = true;
    current = await mod.create(canvas, {
      onScore: () => {},
      onGameOver: (score, won) => {
        recordPlay(id, score, !!won);
        (document.getElementById('over-title')!).textContent = won ? 'You Win!' : 'Game Over';
        (document.getElementById('over-score')!).textContent = `Score: ${score} · Best: ${getEntry(id).best}`;
        overOverlay.classList.add('show');
        renderMenu();
      },
      onPauseChange: (p) => {
        if (p) pauseOverlay.classList.add('show');
      },
    });
    current.start();
  } catch (err) {
    console.error(err);
    loadingGame.textContent = 'Failed to load game';
  }
}

function quitToMenu(): void {
  overOverlay.classList.remove('show');
  pauseOverlay.classList.remove('show');
  if (current) {
    current.destroy();
    current = null;
  }
  audio.stopMusic();
  play.classList.remove('active');
  shell.hidden = false;
  renderMenu();
}

document.getElementById('btn-quit')!.onclick = quitToMenu;
document.getElementById('pause-quit')!.onclick = quitToMenu;
document.getElementById('over-quit')!.onclick = quitToMenu;
document.getElementById('btn-pause')!.onclick = () => {
  current?.pause();
  pauseOverlay.classList.add('show');
};
document.getElementById('resume-btn')!.onclick = () => {
  pauseOverlay.classList.remove('show');
  current?.resume();
};
document.getElementById('pause-restart')!.onclick = () => {
  pauseOverlay.classList.remove('show');
  current?.restart();
};
document.getElementById('btn-restart')!.onclick = () => current?.restart();
document.getElementById('over-retry')!.onclick = () => {
  overOverlay.classList.remove('show');
  current?.restart();
};

const s = loadSettings();
const sfx = document.getElementById('sfx-vol') as HTMLInputElement;
const mus = document.getElementById('music-vol') as HTMLInputElement;
const mute = document.getElementById('mute') as HTMLInputElement;
sfx.value = String(s.sfxVolume);
mus.value = String(s.musicVolume);
mute.checked = s.muted;
document.getElementById('btn-settings')!.onclick = () => settingsOverlay.classList.add('show');
document.getElementById('settings-close')!.onclick = () => settingsOverlay.classList.remove('show');
sfx.oninput = () => audio.updateSettings({ sfxVolume: Number(sfx.value) });
mus.oninput = () => audio.updateSettings({ musicVolume: Number(mus.value) });
mute.onchange = () => audio.updateSettings({ muted: mute.checked });

// Touch pad virtual keys
import { input } from './input/Input';
document.querySelectorAll<HTMLButtonElement>('#touch-pad .btn').forEach((b) => {
  const key = b.dataset.key!;
  const down = (e: Event) => {
    e.preventDefault();
    input.setVirtual(key, true);
  };
  const up = (e: Event) => {
    e.preventDefault();
    input.setVirtual(key, false);
  };
  b.addEventListener('pointerdown', down);
  b.addEventListener('pointerup', up);
  b.addEventListener('pointerleave', up);
  b.addEventListener('pointercancel', up);
});

// Boot animation then show menu
let prog = 0;
const bootTimer = setInterval(() => {
  prog = Math.min(100, prog + 8 + Math.random() * 12);
  bootFill.style.width = `${prog}%`;
  if (prog >= 100) {
    clearInterval(bootTimer);
    setTimeout(() => {
      boot.style.opacity = '0';
      boot.style.transition = 'opacity 0.4s';
      setTimeout(() => {
        boot.remove();
        shell.hidden = false;
        renderMenu();
      }, 400);
    }, 200);
  }
}, 80);

// Expose for smoke tests
(window as unknown as { __OMNICART__: unknown }).__OMNICART__ = {
  games: GAMES,
  launch,
  quitToMenu,
};
