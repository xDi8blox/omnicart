import { makeCanvas2d, fillBg, glowCircle } from '../shared/canvas2d';
import { mountStandardHud } from '../shared/hud';

export async function run() {
  mountStandardHud({
    title: 'Lumen Chase',
    tag: 'Lit Labyrinth Pursuit',
    stats: [
      { label: 'SCORE', value: '6,420', tone: 'gold' },
      { label: 'PELLETS', value: '74', tone: 'cyan' },
      { label: 'LIVES', value: '♥♥♡', tone: 'warn' },
    ],
  });
  const { ctx, w, h } = makeCanvas2d();

  // compact maze
  const map = [
    '#####################',
    '#........#.........#',
    '#.###.###.#.###.###.#',
    '#o#.............#o#',
    '#.#.##.#####.##.#.#',
    '#......#...#......#',
    '###.#.#.#.#.#.#.###',
    '....#.#.....#.#....',
    '###.#.#####.#.#.###',
    '#......#P.........#',
    '#.###.###.#.###.###',
    '#o....#...#....#o.#',
    '#.#####.###.#####.#',
    '#........#........#',
    '#####################',
  ].map((r) => r.split(''));

  // fix length - make all rows same
  const rows = [
    '#####################',
    '#........#..........#',
    '#.###.###.#.###.###.#',
    '#o#.............#..o#',
    '#.#.##.#####.##.#.#.#',
    '#......#...#........#',
    '###.#.#.#.#.#.#.#####',
    '#...#.#.....#.#.....#',
    '###.#.#####.#.#.#####',
    '#......#P...........#',
    '#.###.###.#.###.###.#',
    '#o....#...#.......o.#',
    '#.#####.###.#####.#.#',
    '#........#..........#',
    '#####################',
  ];
  const grid = rows.map((r) => r.split(''));
  const rowsN = grid.length;
  const colsN = grid[0].length;
  const cell = Math.floor(Math.min((w - 80) / colsN, (h - 140) / rowsN));
  const ox = (w - colsN * cell) / 2;
  const oy = (h - rowsN * cell) / 2 + 20;

  let px = 9;
  let py = 9;
  for (let y = 0; y < rowsN; y++) {
    for (let x = 0; x < colsN; x++) {
      if (grid[y][x] === 'P') {
        px = x;
        py = y;
        grid[y][x] = '.';
      }
    }
  }
  const ghosts = [
    { x: 9, y: 5, c: '#ff2040', name: 'ASH' },
    { x: 8, y: 5, c: '#ff2bd6', name: 'HEX' },
    { x: 10, y: 5, c: '#00e8ff', name: 'NYX' },
    { x: 9, y: 6, c: '#f0c14b', name: 'EMBER' },
  ];
  let t0 = performance.now();
  let acc = 0;
  let mouth = 0;

  function isWall(x: number, y: number) {
    if (y < 0 || y >= rowsN || x < 0 || x >= colsN) return true;
    return grid[y][x] === '#';
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - t0) / 1000);
    t0 = now;
    acc += dt;
    mouth = 0.35 + Math.sin(now * 0.012) * 0.3;
    fillBg(ctx, w, h);

    // ambient gloom
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, w, h);

    for (let y = 0; y < rowsN; y++) {
      for (let x = 0; x < colsN; x++) {
        const px0 = ox + x * cell;
        const py0 = oy + y * cell;
        if (grid[y][x] === '#') {
          const g = ctx.createLinearGradient(px0, py0, px0 + cell, py0 + cell);
          g.addColorStop(0, '#3a1528');
          g.addColorStop(0.5, '#1a0a14');
          g.addColorStop(1, '#0c0610');
          ctx.fillStyle = g;
          ctx.fillRect(px0, py0, cell + 0.5, cell + 0.5);
          ctx.strokeStyle = 'rgba(255,32,64,0.55)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px0 + 2, py0 + 2, cell - 4, cell - 4);
          // top edge light
          ctx.fillStyle = 'rgba(0,232,255,0.15)';
          ctx.fillRect(px0 + 3, py0 + 3, cell - 6, 3);
        } else {
          ctx.fillStyle = 'rgba(8,4,12,0.85)';
          ctx.fillRect(px0, py0, cell, cell);
          if (grid[y][x] === '.') {
            glowCircle(ctx, px0 + cell / 2, py0 + cell / 2, 5, 'rgba(240,193,75,0.5)');
            ctx.fillStyle = '#f0c14b';
            ctx.beginPath();
            ctx.arc(px0 + cell / 2, py0 + cell / 2, 2.2, 0, Math.PI * 2);
            ctx.fill();
          } else if (grid[y][x] === 'o') {
            glowCircle(ctx, px0 + cell / 2, py0 + cell / 2, 14, 'rgba(255,140,40,0.7)');
            ctx.fillStyle = '#ff8a1a';
            ctx.beginPath();
            ctx.arc(px0 + cell / 2, py0 + cell / 2, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // player movement
    if (acc > 0.16) {
      acc = 0;
      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      const opts = dirs.filter(([dx, dy]) => !isWall(px + dx, py + dy));
      if (opts.length) {
        const [dx, dy] = opts[(Math.random() * opts.length) | 0];
        // bias toward right/down for liveliness
        const prefer = opts.find((d) => d[0] === 1) || opts[0];
        px += prefer[0];
        py += prefer[1];
        if (grid[py][px] === '.' || grid[py][px] === 'o') grid[py][px] = ' ';
      }
      for (const g of ghosts) {
        const opts2 = dirs.filter(([dx, dy]) => !isWall(g.x + dx, g.y + dy));
        if (opts2.length) {
          // chase-ish
          opts2.sort(
            (a, b) =>
              Math.hypot(g.x + a[0] - px, g.y + a[1] - py) -
              Math.hypot(g.x + b[0] - px, g.y + b[1] - py),
          );
          const pick = Math.random() > 0.35 ? opts2[0] : opts2[(Math.random() * opts2.length) | 0];
          g.x += pick[0];
          g.y += pick[1];
        }
      }
    }

    // light around player
    const pcx = ox + px * cell + cell / 2;
    const pcy = oy + py * cell + cell / 2;
    glowCircle(ctx, pcx, pcy, 70, 'rgba(0,232,255,0.35)');

    // draw player
    ctx.save();
    ctx.translate(pcx, pcy);
    ctx.fillStyle = '#00e8ff';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, cell * 0.38, mouth, Math.PI * 2 - mouth);
    ctx.closePath();
    ctx.fill();
    glowCircle(ctx, 0, 0, cell * 0.7, 'rgba(0,232,255,0.45)');
    ctx.fillStyle = '#050208';
    ctx.beginPath();
    ctx.arc(cell * 0.08, -cell * 0.14, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ghosts with character
    for (const g of ghosts) {
      const gx = ox + g.x * cell + cell / 2;
      const gy = oy + g.y * cell + cell / 2;
      glowCircle(ctx, gx, gy, 28, g.c + '88');
      ctx.save();
      ctx.translate(gx, gy);
      ctx.fillStyle = g.c;
      ctx.beginPath();
      ctx.arc(0, -2, cell * 0.32, Math.PI, 0);
      ctx.lineTo(cell * 0.32, cell * 0.28);
      ctx.lineTo(cell * 0.16, cell * 0.16);
      ctx.lineTo(0, cell * 0.28);
      ctx.lineTo(-cell * 0.16, cell * 0.16);
      ctx.lineTo(-cell * 0.32, cell * 0.28);
      ctx.closePath();
      ctx.fill();
      // eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-6, -4, 5, 0, Math.PI * 2);
      ctx.arc(6, -4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#050208';
      ctx.beginPath();
      ctx.arc(-4, -4, 2.2, 0, Math.PI * 2);
      ctx.arc(8, -4, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
