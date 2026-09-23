// Vector drawing helpers for smooth, illustrated dark-fantasy sprites.
import { makeCanvas } from "./pixel";

export { makeCanvas };

export const OUTLINE = "#0d0a12";

export function hex(c: number): string {
  return "#" + (c >>> 0).toString(16).padStart(6, "0");
}

export function rgba(c: number, a: number): string {
  const r = (c >> 16) & 0xff;
  const g = (c >> 8) & 0xff;
  const b = c & 0xff;
  return `rgba(${r},${g},${b},${a})`;
}

export function shade(color: number, amt: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + amt * 255)));
  return (f(r) << 16) | (f(g) << 8) | f(b);
}

/** Vertical gradient between two colors over [y0,y1]. */
export function vgrad(ctx: CanvasRenderingContext2D, y0: number, y1: number, top: number, bot: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, hex(top));
  g.addColorStop(1, hex(bot));
  return g;
}

/** A rounded limb (capsule) with a dark outline and a soft highlight. */
export function limb(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r: number,
  fill: number,
  outline = true,
  highlight = true
): void {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (outline) {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2 * r + 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.strokeStyle = hex(fill);
  ctx.lineWidth = 2 * r;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  if (highlight) {
    ctx.strokeStyle = rgba(shade(fill, 0.22), 0.5);
    ctx.lineWidth = Math.max(1, r * 0.7);
    ctx.beginPath();
    ctx.moveTo(x1 - r * 0.25, y1);
    ctx.lineTo(x2 - r * 0.25, (y1 + y2) / 2);
    ctx.stroke();
  }
}

type Fill = number | string | CanvasGradient;

function toStyle(fill: Fill): string | CanvasGradient {
  return typeof fill === "number" ? hex(fill) : fill;
}

/** A filled circle/orb with optional outline. */
export function orb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: Fill, outline = true): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = toStyle(fill);
  if (outline) {
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
  }
  ctx.fill();
}

/** A filled polygon from a list of [x,y] points. */
export function polygon(ctx: CanvasRenderingContext2D, pts: Array<[number, number]>, fill: Fill, outline = true, lw = 2.5): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = toStyle(fill);
  ctx.fill();
  if (outline) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = OUTLINE;
    ctx.lineJoin = "round";
    ctx.stroke();
  }
}

/** Begin a custom path; caller adds curves then calls fillPath. */
export function fillPath(ctx: CanvasRenderingContext2D, fill: Fill, outline = true, lw = 2.5): void {
  ctx.fillStyle = toStyle(fill);
  ctx.fill();
  if (outline) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = OUTLINE;
    ctx.lineJoin = "round";
    ctx.stroke();
  }
}

export function ellipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, fill: Fill, alpha = 1, outline = false): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = toStyle(fill);
  ctx.fill();
  if (outline) {
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
  }
  ctx.restore();
}
