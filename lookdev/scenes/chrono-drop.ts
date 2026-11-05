import { makeCanvas2d, fillBg, glowCircle, roundRect } from '../shared/canvas2d';
import { mountStandardHud } from '../shared/hud';

const SHAPES: number[][][] = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
  [[1, 1, 0], [0, 1, 1]],
];
const COLORS = ['#00e8ff', '#ff2040', '#f0c14b', '#ff2bd6', '#7cff6b', '#8a5cff', '#ff8a1a'];

export async function run() {
  mountStandardHud({
    title: 'Chrono Drop',
    tag: 'Beveled Block Descent',
    stats: [
      { label: 'SCORE', value: '96,400', tone: 'gold' },
      { label: 'LINES', value: '42', tone: 'cyan' },
      { label: 'LVL', value: '09', tone: 'warn' },
    ],
  });
  const { ctx, w, h } = makeCanvas2d();
  const cols = 10;
  const rows = 18;
  const cell = 30;
  const boardW = cols * cell;
  const boardH = rows * cell;
  const ox = (w - boardW) / 2 - 40;
  const oy = (h - boardH) / 2 + 24;
  const grid: (string | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));

  // prefill some stacked blocks for mid-play
  for (let y = rows - 6; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (Math.random() > 0.35 || (y === rows - 3 && x > 1 && x < 8)) {
        grid[y][x] = COLORS[(x + y) % COLORS.length];
      }
    }
  }
  // clear a gap for playability look
  for (let x = 3; x < 7; x++) grid[rows - 3][x] = null;

  let piece = { shape: SHAPES[2], color: COLORS[2], x: 3, y: 1 };
  let ghostY = 0;
  let hold = SHAPES[5];
  let holdColor = COLORS[5];
  const next = [
    { s: SHAPES[0], c: COLORS[0] },
    { s: SHAPES[3], c: COLORS[3] },
    { s: SHAPES[6], c: COLORS[6] },
  ];
  let flashRows: number[] = [];
  let flashT = 0;
  let acc = 0;
  let t0 = performance.now();

  function drawBlock(x: number, y: number, color: string, alpha = 1, ghost = false) {
    const px = ox + x * cell;
    const py = oy + y * cell;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (ghost) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      roundRect(ctx, px + 2, py + 2, cell - 4, cell - 4, 4);
      ctx.stroke();
    } else {
      const g = ctx.createLinearGradient(px, py, px + cell, py + cell);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.2, color);
      g.addColorStop(0.7, color);
      g.addColorStop(1, '#100818');
      ctx.fillStyle = g;
      roundRect(ctx, px + 1, py + 1, cell - 2, cell - 2, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      roundRect(ctx, px + 4, py + 3, cell - 10, 6, 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMini(shape: number[][], color: string, cx: number, cy: number) {
    const s = 18;
    const pw = shape[0].length * s;
    const ph = shape.length * s;
    const sx = cx - pw / 2;
    const sy = cy - ph / 2;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;
        const g = ctx.createLinearGradient(sx + x * s, sy + y * s, sx + x * s + s, sy + y * s + s);
        g.addColorStop(0, '#fff');
        g.addColorStop(0.3, color);
        g.addColorStop(1, '#1a0810');
        ctx.fillStyle = g;
        roundRect(ctx, sx + x * s + 1, sy + y * s + 1, s - 2, s - 2, 3);
        ctx.fill();
      }
    }
  }

  function collides(px: number, py: number, shape = piece.shape) {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;
        const gx = px + x;
        const gy = py + y;
        if (gx < 0 || gx >= cols || gy >= rows) return true;
        if (gy >= 0 && grid[gy][gx]) return true;
      }
    }
    return false;
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - t0) / 1000);
    t0 = now;
    acc += dt;
    fillBg(ctx, w, h);

    // panels
    ctx.save();
    ctx.fillStyle = 'rgba(8,4,12,0.75)';
    ctx.strokeStyle = 'rgba(255,32,64,0.45)';
    roundRect(ctx, ox - 150, oy, 120, 140, 8);
    ctx.fill();
    ctx.stroke();
    roundRect(ctx, ox + boardW + 30, oy, 140, 260, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#9a8aa8';
    ctx.font = '600 12px Orbitron, sans-serif';
    ctx.fillText('HOLD', ox - 120, oy + 24);
    ctx.fillText('NEXT', ox + boardW + 70, oy + 24);
    ctx.restore();
    drawMini(hold, holdColor, ox - 90, oy + 80);
    next.forEach((n, i) => drawMini(n.s, n.c, ox + boardW + 100, oy + 70 + i * 70));

    // board frame
    ctx.save();
    const frameG = ctx.createLinearGradient(ox, oy, ox, oy + boardH);
    frameG.addColorStop(0, 'rgba(20,8,28,0.95)');
    frameG.addColorStop(1, 'rgba(10,4,14,0.95)');
    ctx.fillStyle = frameG;
    ctx.fillRect(ox - 4, oy - 4, boardW + 8, boardH + 8);
    ctx.strokeStyle = 'rgba(0,232,255,0.45)';
    ctx.lineWidth = 3;
    ctx.strokeRect(ox - 4, oy - 4, boardW + 8, boardH + 8);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.strokeRect(ox + x * cell, oy + y * cell, cell, cell);
        if (grid[y][x]) drawBlock(x, y, grid[y][x]!);
      }
    }
    ctx.restore();

    // ghost
    ghostY = piece.y;
    while (!collides(piece.x, ghostY + 1)) ghostY++;
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) drawBlock(piece.x + x, ghostY + y, piece.color, 0.7, true);
      }
    }
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) drawBlock(piece.x + x, piece.y + y, piece.color);
      }
    }

    if (acc > 0.45) {
      acc = 0;
      if (!collides(piece.x, piece.y + 1)) piece.y++;
      else {
        // lock visual + clear flash
        for (let y = 0; y < piece.shape.length; y++) {
          for (let x = 0; x < piece.shape[y].length; x++) {
            if (!piece.shape[y][x]) continue;
            const gy = piece.y + y;
            const gx = piece.x + x;
            if (gy >= 0 && gy < rows) grid[gy][gx] = piece.color;
          }
        }
        flashRows = [];
        for (let y = 0; y < rows; y++) {
          if (grid[y].every((c) => c)) flashRows.push(y);
        }
        if (flashRows.length) {
          flashT = 0.45;
          for (const y of flashRows) grid[y] = Array(cols).fill(null);
          // gravity
          for (let y = rows - 1; y >= 0; y--) {
            if (grid[y].every((c) => !c)) {
              grid.splice(y, 1);
              grid.unshift(Array(cols).fill(null));
            }
          }
        }
        const idx = (Math.random() * SHAPES.length) | 0;
        piece = { shape: SHAPES[idx], color: COLORS[idx], x: 3, y: 0 };
      }
      // nudge sideways for life
      if (Math.random() > 0.6 && !collides(piece.x + 1, piece.y)) piece.x++;
      else if (Math.random() > 0.6 && !collides(piece.x - 1, piece.y)) piece.x--;
    }

    if (flashT > 0) {
      flashT -= dt;
      ctx.fillStyle = `rgba(255,255,255,${flashT * 1.5})`;
      ctx.fillRect(ox, oy, boardW, boardH);
      glowCircle(ctx, ox + boardW / 2, oy + boardH / 2, 180, `rgba(0,232,255,${flashT})`);
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
