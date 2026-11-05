import { W, H } from './theme';

export type C2D = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
};

export function makeCanvas2d(): C2D {
  const canvas = document.getElementById('c') as HTMLCanvasElement;
  canvas.width = W;
  canvas.height = H;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  const stage = document.getElementById('stage')!;
  stage.style.width = `${W}px`;
  stage.style.height = `${H}px`;
  stage.style.margin = '0 auto';
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx, w: W, h: H };
}

export function fillBg(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#12061a');
  g.addColorStop(0.5, '#08040e');
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
) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, core);
  g.addColorStop(0.25, color);
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
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
