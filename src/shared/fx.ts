/** Canvas glow / gem helpers shared by 2D lookdev-quality games. */

export function fillVoidBg(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#12061a');
  g.addColorStop(0.55, '#08040e');
  g.addColorStop(1, '#14060c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function glowCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  core = '#ffffff',
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, core);
  g.addColorStop(0.28, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function drawPremiumHud(
  ctx: CanvasRenderingContext2D,
  w: number,
  opts: { title: string; stats: { label: string; value: string; color?: string }[] },
): void {
  ctx.save();
  const top = ctx.createLinearGradient(0, 0, 0, 64);
  top.addColorStop(0, 'rgba(5,2,8,0.88)');
  top.addColorStop(1, 'rgba(5,2,8,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, 64);
  ctx.strokeStyle = 'rgba(255,40,80,0.35)';
  ctx.beginPath();
  ctx.moveTo(0, 52);
  ctx.lineTo(w, 52);
  ctx.stroke();

  ctx.fillStyle = '#ff2040';
  ctx.font = '700 11px Orbitron, Rajdhani, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('OMNICART', 14, 18);
  ctx.fillStyle = '#9a8aa8';
  ctx.font = '600 9px Orbitron, sans-serif';
  ctx.fillText('V2', 14, 30);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = '800 16px Orbitron, sans-serif';
  ctx.fillText(opts.title.toUpperCase(), w / 2, 24);

  ctx.textAlign = 'right';
  let x = w - 14;
  for (let i = opts.stats.length - 1; i >= 0; i--) {
    const s = opts.stats[i];
    ctx.fillStyle = s.color ?? '#00e8ff';
    ctx.font = '700 16px Orbitron, sans-serif';
    ctx.fillText(s.value, x, 22);
    ctx.fillStyle = '#9a8aa8';
    ctx.font = '600 8px Orbitron, sans-serif';
    ctx.fillText(s.label, x, 34);
    x -= 88;
  }
  ctx.restore();
}

export function isMobile(): boolean {
  return window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;
}

export function maxDpr(cap = 2): number {
  return Math.min(window.devicePixelRatio || 1, isMobile() ? Math.min(cap, 1.5) : cap);
}
