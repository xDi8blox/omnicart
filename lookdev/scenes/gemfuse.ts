import { makeCanvas2d, fillBg, glowCircle, roundRect } from '../shared/canvas2d';
import { mountStandardHud } from '../shared/hud';

const GEM_COLORS = [
  { a: '#ff2040', b: '#ff8a9a', c: '#6a0010' },
  { a: '#00e8ff', b: '#a8f7ff', c: '#003344' },
  { a: '#f0c14b', b: '#fff0b0', c: '#5a4000' },
  { a: '#ff2bd6', b: '#ffb0f0', c: '#5a0048' },
  { a: '#7cff6b', b: '#d0ffc4', c: '#1a4a10' },
  { a: '#8a5cff', b: '#d4c0ff', c: '#2a1060' },
];

export async function run() {
  mountStandardHud({
    title: 'Gemfuse',
    tag: 'Faceted Match Cascade',
    stats: [
      { label: 'SCORE', value: '128K', tone: 'gold' },
      { label: 'CHAIN', value: 'x4', tone: 'warn' },
      { label: 'MOVES', value: '18', tone: 'cyan' },
    ],
  });
  const { ctx, w, h } = makeCanvas2d();
  const n = 8;
  const cell = 64;
  const ox = (w - n * cell) / 2;
  const oy = (h - n * cell) / 2 + 18;
  const board: number[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => (Math.random() * GEM_COLORS.length) | 0),
  );
  // force a match-3 mid board
  board[3][3] = board[3][4] = board[3][5] = 0;
  board[5][2] = board[6][2] = board[7][2] = 2;

  type Spark = { x: number; y: number; vx: number; vy: number; life: number; c: string };
  const sparks: Spark[] = [];
  let pulse: { x: number; y: number; t: number }[] = [
    { x: 3, y: 3, t: 1 },
    { x: 4, y: 3, t: 1 },
    { x: 5, y: 3, t: 1 },
  ];
  let t0 = performance.now();
  let cascadeAcc = 0;

  function drawGem(cx: number, cy: number, idx: number, scale = 1, glow = false) {
    const col = GEM_COLORS[idx];
    const r = 24 * scale;
    ctx.save();
    ctx.translate(cx, cy);
    if (glow) glowCircle(ctx, 0, 0, r * 2.2, col.a + '99');
    // faceted hex
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, col.b);
    g.addColorStop(0.45, col.a);
    g.addColorStop(1, col.c);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // facet lines
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(0, r);
    ctx.moveTo(-r * 0.85, -r * 0.4);
    ctx.lineTo(r * 0.85, r * 0.4);
    ctx.stroke();
    // highlight
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.25, -r * 0.35, r * 0.35, r * 0.2, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - t0) / 1000);
    t0 = now;
    cascadeAcc += dt;
    fillBg(ctx, w, h);

    // ornate frame
    ctx.save();
    roundRect(ctx, ox - 18, oy - 18, n * cell + 36, n * cell + 36, 14);
    const fg = ctx.createLinearGradient(ox, oy, ox, oy + n * cell);
    fg.addColorStop(0, 'rgba(40,10,24,0.95)');
    fg.addColorStop(1, 'rgba(12,6,18,0.95)');
    ctx.fillStyle = fg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(240,193,75,0.55)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,32,64,0.35)';
    ctx.lineWidth = 1;
    roundRect(ctx, ox - 10, oy - 10, n * cell + 20, n * cell + 20, 10);
    ctx.stroke();
    ctx.restore();

    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const cx = ox + x * cell + cell / 2;
        const cy = oy + y * cell + cell / 2;
        // socket
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.arc(cx, cy, 27, 0, Math.PI * 2);
        ctx.fill();
        const glowing = pulse.some((p) => p.x === x && p.y === y && p.t > 0);
        drawGem(cx, cy, board[y][x], glowing ? 1.08 : 1, glowing);
      }
    }

    for (const p of pulse) {
      p.t -= dt * 0.6;
      if (p.t > 0) {
        const cx = ox + p.x * cell + cell / 2;
        const cy = oy + p.y * cell + cell / 2;
        glowCircle(ctx, cx, cy, 40, `rgba(255,32,64,${p.t * 0.5})`);
      }
    }

    if (cascadeAcc > 1.4) {
      cascadeAcc = 0;
      // burst match
      for (const p of [
        [3, 3],
        [4, 3],
        [5, 3],
      ]) {
        const [x, y] = p;
        const col = GEM_COLORS[board[y][x]];
        for (let i = 0; i < 16; i++) {
          sparks.push({
            x: ox + x * cell + cell / 2,
            y: oy + y * cell + cell / 2,
            vx: (Math.random() - 0.5) * 280,
            vy: (Math.random() - 0.5) * 280,
            life: 0.6 + Math.random() * 0.4,
            c: col.a,
          });
        }
        board[y][x] = (Math.random() * GEM_COLORS.length) | 0;
      }
      pulse = [
        { x: 3, y: 3, t: 1 },
        { x: 4, y: 3, t: 1 },
        { x: 5, y: 3, t: 1 },
      ];
      // gravity refill visual
      for (let x = 0; x < n; x++) {
        const stack: number[] = [];
        for (let y = n - 1; y >= 0; y--) stack.push(board[y][x]);
        for (let y = n - 1; y >= 0; y--) board[y][x] = stack[n - 1 - y];
      }
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      glowCircle(ctx, s.x, s.y, 8, s.c);
    }

    // selected cursor
    const selX = 4;
    const selY = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    roundRect(ctx, ox + selX * cell + 4, oy + selY * cell + 4, cell - 8, cell - 8, 8);
    ctx.stroke();

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
