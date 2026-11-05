import { makeCanvas2d, fillBg, glowCircle } from '../shared/canvas2d';
import { mountStandardHud } from '../shared/hud';

export async function run() {
  mountStandardHud({
    title: 'Void Wing',
    tag: 'Bullet-Hell Strike',
    stats: [
      { label: 'SCORE', value: '184K', tone: 'gold' },
      { label: 'LIVES', value: '◆◆◇', tone: 'warn' },
      { label: 'BOSS', value: '38%', tone: 'cyan' },
    ],
  });
  const { ctx, w, h } = makeCanvas2d();

  type Bullet = { x: number; y: number; vx: number; vy: number; r: number; c: string };
  type Star = { x: number; y: number; z: number; s: number };
  const stars: Star[] = Array.from({ length: 120 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    z: 0.3 + Math.random() * 1.5,
    s: 0.5 + Math.random() * 2,
  }));
  const bullets: Bullet[] = [];
  const playerBullets: Bullet[] = [];

  function spawnRing(cx: number, cy: number, n: number, speed: number, phase: number) {
    for (let i = 0; i < n; i++) {
      const a = phase + (i / n) * Math.PI * 2;
      bullets.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        r: 5,
        c: i % 2 ? 'rgba(255,32,64,0.95)' : 'rgba(255,140,40,0.95)',
      });
    }
  }

  let t0 = performance.now();
  let acc = 0;
  let shipX = w * 0.5;
  let shipY = h * 0.78;

  function drawShip(x: number, y: number) {
    glowCircle(ctx, x, y, 48, 'rgba(0,232,255,0.55)');
    ctx.save();
    ctx.translate(x, y);
    // detailed ship
    const g = ctx.createLinearGradient(0, -28, 0, 24);
    g.addColorStop(0, '#e8ffff');
    g.addColorStop(0.4, '#00e8ff');
    g.addColorStop(1, '#004466');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(16, 8);
    ctx.lineTo(8, 6);
    ctx.lineTo(10, 22);
    ctx.lineTo(0, 14);
    ctx.lineTo(-10, 22);
    ctx.lineTo(-8, 6);
    ctx.lineTo(-16, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff2040';
    ctx.beginPath();
    ctx.moveTo(-18, 4);
    ctx.lineTo(-28, 14);
    ctx.lineTo(-12, 10);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(18, 4);
    ctx.lineTo(28, 14);
    ctx.lineTo(12, 10);
    ctx.fill();
    glowCircle(ctx, 0, 16, 18, 'rgba(255,140,40,0.8)');
    ctx.restore();
  }

  function drawBoss(x: number, y: number, t: number) {
    glowCircle(ctx, x, y, 110, 'rgba(255,32,64,0.45)');
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 0.001) * 0.08);
    const body = ctx.createRadialGradient(0, 0, 10, 0, 0, 70);
    body.addColorStop(0, '#ff6688');
    body.addColorStop(0.4, '#aa0022');
    body.addColorStop(1, '#2a0010');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 0, 78, 48, 0, 0, Math.PI * 2);
    ctx.fill();
    // wings
    ctx.fillStyle = '#6a1030';
    ctx.beginPath();
    ctx.moveTo(-70, 0);
    ctx.quadraticCurveTo(-140, -40, -160, 10);
    ctx.quadraticCurveTo(-100, 30, -70, 18);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(70, 0);
    ctx.quadraticCurveTo(140, -40, 160, 10);
    ctx.quadraticCurveTo(100, 30, 70, 18);
    ctx.fill();
    // eyes
    glowCircle(ctx, -22, -8, 16, 'rgba(0,232,255,0.9)', '#fff');
    glowCircle(ctx, 22, -8, 16, 'rgba(0,232,255,0.9)', '#fff');
    ctx.fillStyle = '#050208';
    ctx.beginPath();
    ctx.arc(-22, -8, 5, 0, Math.PI * 2);
    ctx.arc(22, -8, 5, 0, Math.PI * 2);
    ctx.fill();
    // core
    glowCircle(ctx, 0, 12, 28, 'rgba(255,200,40,0.85)');
    ctx.restore();
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - t0) / 1000);
    t0 = now;
    acc += dt;
    fillBg(ctx, w, h);

    // nebula layers
    for (let i = 0; i < 5; i++) {
      const g = ctx.createRadialGradient(
        w * (0.2 + i * 0.15),
        h * (0.2 + (i % 3) * 0.2),
        20,
        w * (0.2 + i * 0.15),
        h * (0.2 + (i % 3) * 0.2),
        220,
      );
      g.addColorStop(0, i % 2 ? 'rgba(255,32,64,0.12)' : 'rgba(80,0,120,0.14)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    for (const s of stars) {
      s.y += s.z * 40 * dt;
      if (s.y > h) {
        s.y = 0;
        s.x = Math.random() * w;
      }
      ctx.fillStyle = `rgba(220,200,255,${0.3 + s.z * 0.4})`;
      ctx.fillRect(s.x, s.y, s.s, s.s * 2);
    }

    const bossX = w * 0.5 + Math.sin(now * 0.0008) * 160;
    const bossY = 150 + Math.sin(now * 0.0011) * 20;
    drawBoss(bossX, bossY, now);

    if (acc > 0.28) {
      acc = 0;
      spawnRing(bossX, bossY + 20, 16, 140, now * 0.002);
      spawnRing(bossX, bossY + 20, 10, 90, now * 0.002 + 0.2);
      playerBullets.push({ x: shipX, y: shipY - 24, vx: 0, vy: -520, r: 4, c: 'rgba(0,232,255,1)' });
      playerBullets.push({ x: shipX - 12, y: shipY - 10, vx: -40, vy: -480, r: 3, c: 'rgba(0,255,200,0.9)' });
      playerBullets.push({ x: shipX + 12, y: shipY - 10, vx: 40, vy: -480, r: 3, c: 'rgba(0,255,200,0.9)' });
    }

    shipX = w * 0.5 + Math.sin(now * 0.0015) * 120;
    shipY = h * 0.76 + Math.sin(now * 0.002) * 12;

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -20 || b.x > w + 20 || b.y < -20 || b.y > h + 20) {
        bullets.splice(i, 1);
        continue;
      }
      glowCircle(ctx, b.x, b.y, b.r * 2.8, b.c);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = playerBullets.length - 1; i >= 0; i--) {
      const b = playerBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < -20) {
        playerBullets.splice(i, 1);
        continue;
      }
      glowCircle(ctx, b.x, b.y, 10, b.c);
    }

    drawShip(shipX, shipY);

    // boss HP bar
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(w * 0.2, 100, w * 0.6, 10);
    const hg = ctx.createLinearGradient(w * 0.2, 0, w * 0.8, 0);
    hg.addColorStop(0, '#ff2040');
    hg.addColorStop(1, '#ff8a1a');
    ctx.fillStyle = hg;
    ctx.fillRect(w * 0.2, 100, w * 0.6 * 0.38, 10);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.strokeRect(w * 0.2, 100, w * 0.6, 10);
    ctx.restore();

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
