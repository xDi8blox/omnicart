/** Keep canvas CSS size responsive while backing store matches devicePixelRatio. */
export function resizeCanvas(
  canvas: HTMLCanvasElement,
  cssW: number,
  cssH: number,
  opts: { dprCap?: number; setup2d?: boolean } = {},
): { w: number; h: number; dpr: number } {
  const dpr = Math.min(window.devicePixelRatio || 1, opts.dprCap ?? 2.5);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.max(1, Math.floor(cssW * dpr));
  canvas.height = Math.max(1, Math.floor(cssH * dpr));
  canvas.dataset.cssW = String(cssW);
  canvas.dataset.cssH = String(cssH);
  if (opts.setup2d !== false) {
    // Only touch 2d context when requested (default true for Canvas2D games).
    // 3D games must pass setup2d:false — a canvas cannot host both contexts.
    try {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } catch {
      /* ignore if webgl already bound */
    }
  }
  return { w: cssW, h: cssH, dpr };
}

export function fitParent(
  canvas: HTMLCanvasElement,
  parent: HTMLElement,
  aspect = 16 / 9,
  opts?: { dprCap?: number; setup2d?: boolean },
): { w: number; h: number; dpr: number } {
  const rect = parent.getBoundingClientRect();
  let w = rect.width;
  let h = rect.height;
  if (w / h > aspect) w = h * aspect;
  else h = w / aspect;
  return resizeCanvas(canvas, Math.floor(w), Math.floor(h), opts);
}
