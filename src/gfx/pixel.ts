// Low-level helpers for drawing blocky pixel-art onto a canvas.

export function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

export function hex(n: number): string {
  return "#" + n.toString(16).padStart(6, "0");
}

export function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: number, alpha = 1): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = hex(color);
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
}

/** Draw a horizontally-symmetric block: mirrors x around the center width. */
export function pxSym(ctx: CanvasRenderingContext2D, cw: number, x: number, y: number, w: number, h: number, color: number): void {
  px(ctx, x, y, w, h, color);
  px(ctx, cw - x - w, y, w, h, color);
}

/** Lighten/darken a color by amount (-1..1). */
export function shade(color: number, amt: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + amt * 255)));
  return (f(r) << 16) | (f(g) << 8) | f(b);
}

export function ellipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: number, alpha = 1): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = hex(color);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}
