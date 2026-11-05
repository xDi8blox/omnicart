export const PAL = {
  bg: 0x050308,
  blood: 0xff2040,
  ember: 0xff8a1a,
  cyan: 0x00e8ff,
  magenta: 0xff2bd6,
  gold: 0xf0c14b,
  void: 0x0a0614,
  deep: 0x12061a,
};

export const W = 1280;
export const H = 720;

export function canvasTex(
  size: number,
  draw: (g: CanvasRenderingContext2D, s: number) => void,
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  return c;
}

export function softGlow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a = 0.55) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(0.35, color.replace(/[\d.]+\)$/, `${a * 0.45})`).replace(/^rgb/, 'rgba').replace(/^#/, ''));
  // simpler: use rgba strings from callers
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawNoiseOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, a = 0.04) {
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = (Math.random() * 255) | 0;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = (a * 255) | 0;
  }
  ctx.putImageData(img, 0, 0);
}
