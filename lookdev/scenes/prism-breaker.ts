import { makeCanvas2d, fillBg, glowCircle, roundRect } from '../shared/canvas2d';
import { mountStandardHud } from '../shared/hud';

export async function run() {
  mountStandardHud({
    title: 'Prism Breaker',
    tag: 'Glossy Brick Siege',
    stats: [
      { label: 'SCORE', value: '42,800', tone: 'gold' },
      { label: 'BALLS', value: '3', tone: 'cyan' },
      { label: 'COMBO', value: 'x6', tone: 'warn' },
    ],
  });
  const { ctx, w, h } = makeCanvas2d();

  const cols = 12;
  const rows = 7;
  const bw = 84;
  const bh = 28;
  const gap = 6;
  const ox = (w - cols * (bw + gap)) / 2;
  const oy = 120;
  const palette = [
    ['#ff2040', '#ff8a9a'],
    ['#ff2bd6', '#ff9ae8'],
    ['#00e8ff', '#9af0ff'],
    ['#f0c14b', '#ffe6a0'],
    ['#7cff6b', '#c8ffb8'],
    ['#8a5cff', '#cbb0ff'],
    ['#ff8a1a', '#ffd0a0'],
  ];
  type Brick = { x: number; y: number; alive: boolean; c0: string; c1: string; flash: number };
  const bricks: Brick[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 3 && c > 3 && c < 8) continue; // gap mid-play
      const [c0, c1] = palette[r % palette.length];
      bricks.push({
        x: ox + c * (bw + gap),
        y: oy + r * (bh + gap),
        alive: true,
        c0,
        c1,
        flash: 0,
      });
    }
  }

  type P = { x: number; y: number; vx: number; vy: number; life: number; c: string };
  const particles: P[] = [];
  const trail: { x: number; y: number; a: number }[] = [];

  let paddleX = w * 0.45;
  let ballX = paddleX + 50;
  let ballY = h - 160;
  let bvx = 220;
  let bvy = -320;
  let t0 = performance.now();
  let breakAcc = 0;

  function frame(now: number) {
    const dt = Math.min(0.05, (now - t0) / 1000);
    t0 = now;
    fillBg(ctx, w, h);

    // playfield frame
    ctx.save();
    ctx.strokeStyle = 'rgba(255,32,64,0.45)';
    ctx.lineWidth = 3;
    roundRect(ctx, 36, 96, w - 72, h - 130, 12);
    ctx.stroke();
    const frameG = ctx.createLinearGradient(0, 96, 0, h);
    frameG.addColorStop(0, 'rgba(255,32,64,0.06)');
    frameG.addColorStop(1, 'rgba(0,232,255,0.04)');
    ctx.fillStyle = frameG;
    ctx.fill();
    ctx.restore();

    paddleX = w * 0.5 + Math.sin(now * 0.0012) * 220 - 60;
    const paddleY = h - 78;
    const paddleW = 140;

    // bricks
    for (const b of bricks) {
      if (!b.alive) continue;
      const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + bh);
      g.addColorStop(0, b.c1);
      g.addColorStop(0.45, b.c0);
      g.addColorStop(1, '#1a0810');
      ctx.fillStyle = g;
      roundRect(ctx, b.x, b.y, bw, bh, 5);
      ctx.fill();
      // gloss
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      roundRect(ctx, b.x + 4, b.y + 3, bw - 8, 7, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.stroke();
      if (b.flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${b.flash})`;
        roundRect(ctx, b.x, b.y, bw, bh, 5);
        ctx.fill();
        b.flash -= dt * 3;
      }
    }

    // ball physics (visual)
    ballX += bvx * dt;
    ballY += bvy * dt;
    if (ballX < 50 || ballX > w - 50) bvx *= -1;
    if (ballY < 110) bvy = Math.abs(bvy);
    if (ballY > paddleY - 10 && ballX > paddleX && ballX < paddleX + paddleW && bvy > 0) {
      bvy = -Math.abs(bvy);
      bvx += (ballX - (paddleX + paddleW / 2)) * 3;
    }
    if (ballY > h) {
      ballY = h - 180;
      ballX = paddleX + 70;
      bvy = -320;
    }

    // collide bricks
    for (const b of bricks) {
      if (!b.alive) continue;
      if (ballX > b.x && ballX < b.x + bw && ballY > b.y && ballY < b.y + bh) {
        b.alive = false;
        bvy *= -1;
        for (let i = 0; i < 18; i++) {
          particles.push({
            x: b.x + bw / 2,
            y: b.y + bh / 2,
            vx: (Math.random() - 0.5) * 360,
            vy: (Math.random() - 0.5) * 360,
            life: 0.5 + Math.random() * 0.5,
            c: b.c0,
          });
        }
      }
    }

    breakAcc += dt;
    if (breakAcc > 1.6) {
      breakAcc = 0;
      const live = bricks.filter((b) => b.alive);
      if (live.length) {
        const b = live[(Math.random() * live.length) | 0];
        b.alive = false;
        for (let i = 0; i < 22; i++) {
          particles.push({
            x: b.x + bw / 2,
            y: b.y + bh / 2,
            vx: (Math.random() - 0.5) * 400,
            vy: (Math.random() - 0.5) * 400,
            life: 0.6,
            c: b.c0,
          });
        }
      }
    }

    trail.push({ x: ballX, y: ballY, a: 1 });
    if (trail.length > 18) trail.shift();
    for (let i = 0; i < trail.length; i++) {
      const t = trail[i];
      t.a *= 0.92;
      glowCircle(ctx, t.x, t.y, 10 + i * 0.4, `rgba(0,232,255,${t.a * 0.35})`);
    }
    glowCircle(ctx, ballX, ballY, 22, 'rgba(255,255,255,0.8)', '#fff');
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ballX, ballY, 7, 0, Math.PI * 2);
    ctx.fill();

    // paddle
    const pg = ctx.createLinearGradient(paddleX, paddleY, paddleX, paddleY + 18);
    pg.addColorStop(0, '#fff');
    pg.addColorStop(0.3, '#00e8ff');
    pg.addColorStop(1, '#003344');
    ctx.fillStyle = pg;
    roundRect(ctx, paddleX, paddleY, paddleW, 18, 9);
    ctx.fill();
    glowCircle(ctx, paddleX + paddleW / 2, paddleY + 8, 40, 'rgba(0,232,255,0.35)');

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 400 * dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y, 4, 4);
      ctx.globalAlpha = 1;
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
