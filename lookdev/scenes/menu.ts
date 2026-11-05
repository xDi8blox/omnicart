const GAMES = [
  { id: 'hover-tube', name: 'Hover Tube', tag: 'Tunnel racer', accent: '#00e8ff' },
  { id: 'horizon-drive', name: 'Horizon Drive', tag: 'Night highway', accent: '#ff2040' },
  { id: 'void-wing', name: 'Void Wing', tag: 'Bullet hell', accent: '#ff8a1a' },
  { id: 'prism-breaker', name: 'Prism Breaker', tag: 'Brick siege', accent: '#ff2bd6' },
  { id: 'neon-coil', name: 'Neon Coil', tag: 'Serpent arena', accent: '#7cff6b' },
  { id: 'fluxball', name: 'Fluxball', tag: 'Demonic pinball', accent: '#f0c14b' },
  { id: 'chrono-drop', name: 'Chrono Drop', tag: 'Block descent', accent: '#8a5cff' },
  { id: 'gemfuse', name: 'Gemfuse', tag: 'Match cascade', accent: '#00e8ff' },
  { id: 'lumen-chase', name: 'Lumen Chase', tag: 'Maze pursuit', accent: '#ff2040' },
  { id: 'pulse-duel', name: 'Pulse Duel', tag: '1v1 bloodrite', accent: '#ff2bd6' },
];

export async function run() {
  const hud = document.getElementById('hud')!;
  hud.innerHTML = '';
  document.getElementById('c')!.style.display = 'none';

  const root = document.createElement('div');
  root.className = 'menu-root';
  root.style.width = '1280px';
  root.style.height = '720px';
  root.style.overflow = 'hidden';
  const stage = document.getElementById('stage')!;
  stage.style.width = '1280px';
  stage.style.height = '720px';
  stage.style.margin = '0 auto';

  root.innerHTML = `
    <div class="menu-hero">
      <div class="cart-mark"></div>
      <div>
        <div style="font-family:Orbitron,sans-serif;font-size:11px;letter-spacing:.4em;color:#ff2040;margin-bottom:6px">PORTABLE ARCADE · V2 LOOKDEV</div>
        <h1>OMNICART</h1>
        <p>Ten games. One cursed cartridge. Demonic neon arcade — polished mid-play visual targets for the cut.</p>
      </div>
      <div class="menu-stats">
        <div><b>10</b><span>GAMES</span></div>
        <div><b>V2</b><span>LOOKDEV</span></div>
      </div>
    </div>
    <div class="game-grid">
      ${GAMES.map(
        (g) => `
        <div class="game-card" style="border-color:${g.accent}55">
          <div class="thumb" style="background:
            linear-gradient(transparent 45%, rgba(0,0,0,.85)),
            url('/shots/${g.id}.png') center/cover no-repeat,
            linear-gradient(135deg, ${g.accent}33, #080410)"></div>
          <div class="meta">
            <strong style="color:${g.accent}">${g.name}</strong>
            <em>${g.tag}</em>
          </div>
        </div>`,
      ).join('')}
    </div>
  `;
  stage.appendChild(root);

  function frame(now: number) {
    const cards = root.querySelectorAll('.game-card') as NodeListOf<HTMLElement>;
    cards.forEach((c, i) => {
      const pulse = 0.55 + Math.sin(now * 0.002 + i) * 0.45;
      c.style.boxShadow = `0 8px 28px rgba(0,0,0,.45), 0 0 ${18 + pulse * 12}px ${GAMES[i].accent}33`;
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
