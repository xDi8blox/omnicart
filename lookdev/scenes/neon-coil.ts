import { makeCanvas2d, fillBg, glowCircle } from '../shared/canvas2d';
import { mountStandardHud } from '../shared/hud';

export async function run() {
  mountStandardHud({
    title: 'Neon Coil',
    tag: 'Occult Serpent Arena',
    stats: [
      { label: 'LENGTH', value: '48', tone: 'cyan' },
      { label: 'GEMS', value: '12', tone: 'gold' },
      { label: 'HAZARD', value: 'ON', tone: 'warn' },
    ],
  });
  const { ctx, w, h } = makeCanvas2d();
  const cell = 28;
  const cols = 36;
  const rows = 20;
  const ox = (w - cols * cell) / 2;
  const oy = (h - rows * cell) / 2 + 20;

  const snake: { x: number; y: number }[] = [];
  for (let i = 0; i < 22; i++) snake.push({ x: 8 + i, y: 10 });
  let dir = { x: 1, y: 0 };
  let gems = [
    { x: 24, y: 6 },
    { x: 30, y: 14 },
    { x: 12, y: 16 },
  ];
  const hazards = [
    { x: 18, y: 8 },
    { x: 18, y: 9 },
    { x: 18, y: 10 },
    { x: 26, y: 12 },
  ];
  let acc = 0;
  let pathPhase = 0;
  let t0 = performance.now();

  function frame(now: number) {
    const dt = Math.min(0.05, (now - t0) / 1000);
    t0 = now;
    acc += dt;
    fillBg(ctx, w, h);

    // arena floor
    ctx.save();
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = ox + x * cell;
        const py = oy + y * cell;
        ctx.fillStyle = (x + y) % 2 ? 'rgba(30,12,28,0.9)' : 'rgba(18,8,22,0.9)';
        ctx.fillRect(px, py, cell, cell);
      }
    }
    ctx.strokeStyle = 'rgba(255,32,64,0.55)';
    ctx.lineWidth = 4;
    ctx.strokeRect(ox - 4, oy - 4, cols * cell + 8, rows * cell + 8);
    // inner rune border
    ctx.strokeStyle = 'rgba(0,232,255,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + 8, oy + 8, cols * cell - 16, rows * cell - 16);
    ctx.restore();

    for (const hz of hazards) {
      const px = ox + hz.x * cell + cell / 2;
      const py = oy + hz.y * cell + cell / 2;
      glowCircle(ctx, px, py, 22, 'rgba(255,32,64,0.5)');
      ctx.fillStyle = '#3a0810';
      ctx.beginPath();
      ctx.moveTo(px, py - 10);
      ctx.lineTo(px + 9, py + 8);
      ctx.lineTo(px - 9, py + 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ff2040';
      ctx.stroke();
    }

    for (const g of gems) {
      const px = ox + g.x * cell + cell / 2;
      const py = oy + g.y * cell + cell / 2;
      glowCircle(ctx, px, py, 20, 'rgba(240,193,75,0.7)');
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(now * 0.002);
      ctx.fillStyle = '#f0c14b';
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // move snake along a looping path for mid-play look
    if (acc > 0.12) {
      acc = 0;
      pathPhase++;
      const pattern = [
        { x: 1, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: -1 },
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 0 },
      ];
      dir = pattern[pathPhase % pattern.length];
      const head = snake[snake.length - 1];
      let nx = head.x + dir.x;
      let ny = head.y + dir.y;
      if (nx < 1 || nx >= cols - 1 || ny < 1 || ny >= rows - 1) {
        dir = { x: -dir.y, y: dir.x };
        nx = head.x + dir.x;
        ny = head.y + dir.y;
      }
      snake.push({ x: nx, y: ny });
      if (snake.length > 28) snake.shift();
    }

    // draw segmented glowing serpent
    for (let i = 0; i < snake.length; i++) {
      const s = snake[i];
      const px = ox + s.x * cell + cell / 2;
      const py = oy + s.y * cell + cell / 2;
      const t = i / snake.length;
      const r = 8 + t * 6;
      const col = t > 0.85 ? 'rgba(255,255,200,0.95)' : t > 0.5 ? 'rgba(0,232,255,0.85)' : 'rgba(255,32,64,0.75)';
      glowCircle(ctx, px, py, r * 2.2, col);
      const g = ctx.createRadialGradient(px - 3, py - 3, 2, px, py, r);
      g.addColorStop(0, '#fff');
      g.addColorStop(0.4, t > 0.5 ? '#00e8ff' : '#ff4060');
      g.addColorStop(1, '#1a0520');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // head details
    const head = snake[snake.length - 1];
    const hx = ox + head.x * cell + cell / 2;
    const hy = oy + head.y * cell + cell / 2;
    glowCircle(ctx, hx, hy, 28, 'rgba(255,240,180,0.55)');
    ctx.fillStyle = '#050208';
    ctx.beginPath();
    ctx.arc(hx + dir.x * 5 - dir.y * 4, hy + dir.y * 5 + dir.x * 4, 2.5, 0, Math.PI * 2);
    ctx.arc(hx + dir.x * 5 + dir.y * 4, hy + dir.y * 5 - dir.x * 4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // tongue
    ctx.strokeStyle = '#ff2040';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx + dir.x * 12, hy + dir.y * 12);
    ctx.lineTo(hx + dir.x * 20, hy + dir.y * 20);
    ctx.stroke();

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
