import './style.css';
import { GAMES, loaders } from './core/catalog';
import { getEntry, recordPlay, loadSettings, loadStats } from './core/storage';
import { audio } from './audio/AudioEngine';
import { thumbSvg } from './ui/thumb';
import { input } from './input/Input';
import type { GameInstance, GameMeta, TouchLayout } from './core/types';

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <div class="boot" id="boot">
    <div class="boot-logo">
      <div class="boot-cart" aria-hidden="true"></div>
      <h1>OMNICART</h1>
      <p>10 Games · One Cartridge</p>
      <div class="boot-bar"><i id="boot-fill"></i></div>
    </div>
  </div>
  <div class="shell" id="shell" hidden>
    <div class="topbar">
      <div class="brand">
        <span class="brand-mark"><i></i></span>
        <div><span class="brand-text">OMNICART</span><small>DEMONIC ARCADE</small></div>
      </div>
      <div class="spacer"></div>
      <button class="icon-btn" id="btn-settings" type="button">Settings</button>
    </div>
    <div class="menu-wrap" id="menu"></div>
  </div>
  <div class="play-view" id="play">
    <div class="play-bar">
      <button class="icon-btn" id="btn-quit" type="button">⟵ Quit</button>
      <div class="title" id="play-title">Game</div>
      <button class="icon-btn" id="btn-howto-play" type="button">How to</button>
      <button class="icon-btn" id="btn-pause" type="button">Pause</button>
      <button class="icon-btn" id="btn-restart" type="button">Restart</button>
    </div>
    <div class="play-stage" id="stage">
      <canvas id="game-canvas"></canvas>
      <div class="touch-pad" id="touch-pad"></div>
      <div class="loading-game" id="loading-game" hidden>Loading cartridge…</div>
    </div>
  </div>
  <div class="overlay" id="howto-overlay">
    <div class="panel">
      <h2 id="howto-title">How to Play</h2>
      <div class="howto"><strong>Briefing</strong><span id="howto-body"></span></div>
      <p id="howto-controls" style="font-size:0.8rem"></p>
      <div class="diff-row" id="diff-row" hidden>
        <button class="btn" data-diff="easy" type="button">Easy</button>
        <button class="btn active" data-diff="normal" type="button">Normal</button>
        <button class="btn" data-diff="hard" type="button">Hard</button>
      </div>
      <div class="row">
        <button class="btn primary" id="howto-start" type="button">Play</button>
        <button class="btn" id="howto-cancel" type="button">Cancel</button>
      </div>
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
let canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const playTitle = document.getElementById('play-title')!;
const loadingGame = document.getElementById('loading-game')!;
const pauseOverlay = document.getElementById('pause-overlay')!;
const overOverlay = document.getElementById('over-overlay')!;
const settingsOverlay = document.getElementById('settings-overlay')!;
const howtoOverlay = document.getElementById('howto-overlay')!;
const touchPad = document.getElementById('touch-pad')!;
const stage = document.getElementById('stage')!;

let current: GameInstance | null = null;
let currentMeta: GameMeta | null = null;
let activeTab: 'all' | 'arcade' | 'puzzle' | 'racing' | 'action' | 'recent' = 'all';
let pendingId: string | null = null;
let selectedDiff: 'easy' | 'normal' | 'hard' = 'normal';
(window as unknown as { __OMNICART_DIFF__: string }).__OMNICART_DIFF__ = selectedDiff;

function cartHtml(g: GameMeta): string {
  const st = getEntry(g.id);
  return `<button class="cart" data-id="${g.id}" style="--accent:${g.accent}" type="button">
    <div class="cart-thumb"><img src="./screenshots/${g.id}.png" alt="" loading="lazy" /></div>
    <h3>${g.name}</h3>
    <p>${g.subtitle}</p>
    <div class="best">BEST ${st.best} · PLAYS ${st.plays}</div>
  </button>`;
}

function recentGames(): GameMeta[] {
  const stats = loadStats();
  return GAMES
    .filter((g) => (stats[g.id]?.lastPlayed ?? 0) > 0)
    .sort((a, b) => (stats[b.id]?.lastPlayed ?? 0) - (stats[a.id]?.lastPlayed ?? 0))
    .slice(0, 6);
}

function renderMenu(): void {
  const totals = loadStats();
  const plays = Object.values(totals).reduce((s, e) => s + e.plays, 0);
  const recent = recentGames();
  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: 'all', label: 'All 10' },
    { id: 'arcade', label: 'Arcade' },
    { id: 'puzzle', label: 'Puzzle' },
    { id: 'racing', label: 'Racing' },
    { id: 'action', label: 'Action' },
    { id: 'recent', label: 'Continue' },
  ];

  let body = `
    <div class="hero">
      <div class="hero-logo" aria-hidden="true"></div>
      <div class="hero-copy">
        <h1>OMNICART</h1>
        <p>Snap in a cartridge. Ten cursed neon arcade games. One cartridge — keyboard and touch ready for landscape play.</p>
      </div>
      <div class="hero-stats"><span>PLAYS ${plays}</span><span>CARTS 10</span></div>
    </div>
    <div class="tabs">${tabs.map((t) => `<button class="tab ${activeTab === t.id ? 'active' : ''}" data-tab="${t.id}" type="button">${t.label}</button>`).join('')}</div>
  `;

  if (recent.length && activeTab !== 'recent') {
    body += `<div class="section-title">Continue / Recently Played</div><div class="recent-row">${recent.map(cartHtml).join('')}</div>`;
  }

  if (activeTab === 'recent') {
    body += `<div class="section-title">Continue</div><div class="grid">${(recent.length ? recent : GAMES.slice(0, 5)).map(cartHtml).join('')}</div>`;
  } else if (activeTab === 'all') {
    const cats: Record<string, string> = { arcade: 'Arcade', puzzle: 'Puzzle', racing: 'Racing', action: 'Fighting / Action' };
    for (const cat of ['arcade', 'puzzle', 'racing', 'action'] as const) {
      const items = GAMES.filter((g) => g.category === cat);
      body += `<div class="section-title">${cats[cat]}</div><div class="grid">${items.map(cartHtml).join('')}</div>`;
    }
  } else {
    const items = GAMES.filter((g) => g.category === activeTab);
    body += `<div class="section-title">${activeTab}</div><div class="grid">${items.map(cartHtml).join('')}</div>`;
  }

  menu.innerHTML = body;
  menu.querySelectorAll<HTMLButtonElement>('.tab').forEach((btn) => {
    btn.onclick = () => {
      activeTab = btn.dataset.tab as typeof activeTab;
      audio.click();
      renderMenu();
    };
  });
  menu.querySelectorAll<HTMLButtonElement>('.cart').forEach((btn) => {
    btn.addEventListener('click', () => openHowto(btn.dataset.id!));
  });
}

function openHowto(id: string): void {
  const meta = GAMES.find((g) => g.id === id);
  if (!meta) return;
  pendingId = id;
  audio.click();
  (document.getElementById('howto-title')!).textContent = meta.name;
  (document.getElementById('howto-body')!).textContent = meta.howto;
  (document.getElementById('howto-controls')!).textContent = `Controls: ${meta.controls}`;
  const diffRow = document.getElementById('diff-row')!;
  const needsDiff = id === 'chrono-drop' || id === 'gemfuse' || id === 'void-wing' || id === 'pulse-duel';
  diffRow.hidden = !needsDiff;
  diffRow.querySelectorAll<HTMLButtonElement>('.btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.diff === selectedDiff);
    b.onclick = () => {
      selectedDiff = (b.dataset.diff as typeof selectedDiff) || 'normal';
      (window as unknown as { __OMNICART_DIFF__: string }).__OMNICART_DIFF__ = selectedDiff;
      diffRow.querySelectorAll('.btn').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
    };
  });
  howtoOverlay.classList.add('show');
}

function buildTouchPad(layout: TouchLayout): void {
  touchPad.className = `touch-pad layout-${layout}`;
  stage.classList.toggle('has-touch', layout !== 'none');
  const mk = (key: string, label: string, cls = '') =>
    `<button class="btn ${cls}" data-key="${key}" type="button">${label}</button>`;
  let html = '';
  if (layout === 'none') {
    html = '';
  } else if (layout === 'tap') {
    html = `<div class="row"><div class="spacer"></div>${mk(' ', 'TAP', 'action')}<div class="spacer"></div></div>`;
  } else if (layout === 'aim') {
    html = `<div class="row"><div class="spacer"></div>${mk(' ', 'FIRE', 'action')}<div class="spacer"></div></div>`;
  } else if (layout === 'lanes') {
    html = `<div class="row">${mk('arrowleft', '◀ LANE')}<div class="spacer"></div>${mk('arrowright', 'LANE ▶')}</div>`;
  } else if (layout === 'flippers') {
    html = `<div class="row">${mk('z', '◀ L')}${mk(' ', 'LAUNCH', 'action')}${mk('m', 'R ▶')}<div class="spacer"></div></div>`;
  } else if (layout === 'fighter') {
    html = `<div class="row">${mk('arrowleft', '◀')}${mk('arrowup', '▲')}${mk('arrowright', '▶')}<div class="spacer"></div>${mk('j', 'PUNCH')}${mk('k', 'KICK')}${mk('shift', 'BLOCK', 'action')}</div>`;
  } else if (layout === 'dpad-only') {
    html = `<div class="row">${mk('arrowleft', '◀')}<div style="display:flex;flex-direction:column;gap:8px">${mk('arrowup', '▲')}${mk('arrowdown', '▼')}</div>${mk('arrowright', '▶')}<div class="spacer"></div></div>`;
  } else {
    // dpad-ab
    html = `<div class="row">${mk('arrowleft', '◀')}<div style="display:flex;flex-direction:column;gap:8px">${mk('arrowup', '▲')}${mk('arrowdown', '▼')}</div>${mk('arrowright', '▶')}<div class="spacer"></div>${mk(' ', 'A', 'action')}${mk('shift', 'B')}</div>`;
  }
  touchPad.innerHTML = html;
  touchPad.querySelectorAll<HTMLButtonElement>('.btn').forEach((b) => {
    const key = b.dataset.key!;
    const down = (e: Event) => { e.preventDefault(); input.setVirtual(key, true); };
    const up = (e: Event) => { e.preventDefault(); input.setVirtual(key, false); };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointerleave', up);
    b.addEventListener('pointercancel', up);
  });
}

async function launch(id: string): Promise<void> {
  const meta = GAMES.find((g) => g.id === id);
  if (!meta) return;
  howtoOverlay.classList.remove('show');
  audio.ensure();
  audio.click();
  audio.startMusic(GAMES.indexOf(meta));
  currentMeta = meta;
  playTitle.textContent = meta.name;
  play.classList.add('active');
  shell.hidden = true;
  loadingGame.hidden = false;
  buildTouchPad(meta.touch);
  if (current) {
    current.destroy();
    current = null;
  }
  // Fresh canvas each launch so 2D and WebGL games can alternate
  const fresh = document.createElement('canvas');
  fresh.id = 'game-canvas';
  canvas.replaceWith(fresh);
  canvas = fresh;
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
  howtoOverlay.classList.remove('show');
  if (current) {
    current.destroy();
    current = null;
  }
  audio.stopMusic();
  play.classList.remove('active');
  shell.hidden = false;
  renderMenu();
}

document.getElementById('howto-start')!.onclick = () => {
  if (pendingId) void launch(pendingId);
};
document.getElementById('howto-cancel')!.onclick = () => {
  howtoOverlay.classList.remove('show');
  pendingId = null;
};
document.getElementById('btn-howto-play')!.onclick = () => {
  if (currentMeta) openHowto(currentMeta.id);
};
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

let prog = 0;
const bootTimer = setInterval(() => {
  prog = Math.min(100, prog + 7 + Math.random() * 10);
  bootFill.style.width = `${prog}%`;
  if (prog >= 100) {
    clearInterval(bootTimer);
    setTimeout(() => {
      boot.style.opacity = '0';
      boot.style.transition = 'opacity 0.45s';
      setTimeout(() => {
        boot.remove();
        shell.hidden = false;
        renderMenu();
      }, 450);
    }, 180);
  }
}, 70);

(window as unknown as { __OMNICART__: unknown }).__OMNICART__ = {
  games: GAMES,
  launch,
  quitToMenu,
  openHowto,
};
