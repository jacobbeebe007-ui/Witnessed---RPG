import { makeCanvas } from "./pixel";
import { shade, hex, rgba, polygon, ellipse, OUTLINE } from "./draw";
import { TILE } from "../config";

function noise(ctx: CanvasRenderingContext2D, base: number, n: number, alpha: number): void {
  for (let i = 0; i < n; i++) {
    const x = (i * 7.3 + 3) % TILE;
    const y = (i * 12.9 + 5) % TILE;
    ctx.fillStyle = rgba(shade(base, i % 3 === 0 ? 0.1 : -0.12), alpha);
    ctx.beginPath();
    ctx.ellipse(x, y, 2.2, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function ground(base: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(TILE, TILE);
  const g = ctx.createLinearGradient(0, 0, 0, TILE);
  g.addColorStop(0, hex(shade(base, 0.06)));
  g.addColorStop(1, hex(shade(base, -0.1)));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TILE, TILE);
  noise(ctx, base, 16, 0.5);
  return canvas;
}

function water(): HTMLCanvasElement {
  const base = 0x1f3f56;
  const { canvas, ctx } = makeCanvas(TILE, TILE);
  const g = ctx.createLinearGradient(0, 0, 0, TILE);
  g.addColorStop(0, hex(shade(base, 0.1)));
  g.addColorStop(1, hex(shade(base, -0.12)));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TILE, TILE);
  ctx.strokeStyle = rgba(0x7fb0d8, 0.35);
  ctx.lineWidth = 1.4;
  for (let y = 6; y < TILE; y += 9) {
    ctx.beginPath();
    ctx.moveTo(2, y);
    ctx.quadraticCurveTo(TILE / 2, y - 3, TILE - 2, y);
    ctx.stroke();
  }
  return canvas;
}

function path(): HTMLCanvasElement {
  const base = 0x4a4236;
  const { canvas, ctx } = makeCanvas(TILE, TILE);
  ctx.fillStyle = hex(base);
  ctx.fillRect(0, 0, TILE, TILE);
  for (let i = 0; i < 6; i++) {
    const x = (i * 11 + 4) % (TILE - 8);
    const y = (i * 7 + 3) % (TILE - 8);
    ctx.fillStyle = rgba(shade(base, i % 2 ? -0.12 : 0.1), 0.8);
    ctx.beginPath();
    ctx.ellipse(x + 4, y + 4, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

function tree(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(TILE, TILE);
  ctx.fillStyle = hex(0x243a22);
  ctx.fillRect(0, 0, TILE, TILE);
  ellipse(ctx, TILE / 2, TILE - 4, 9, 3, 0x000000, 0.3);
  ctx.fillStyle = hex(0x3a2a1a);
  ctx.fillRect(TILE / 2 - 2, TILE - 12, 4, 9);
  const leaf = 0x2f5a30;
  const g = ctx.createRadialGradient(TILE / 2 - 3, 10, 2, TILE / 2, 12, 15);
  g.addColorStop(0, hex(shade(leaf, 0.18)));
  g.addColorStop(1, hex(shade(leaf, -0.14)));
  ctx.fillStyle = g;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(TILE / 2, 13, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  return canvas;
}

function mountain(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(TILE, TILE);
  ctx.fillStyle = hex(0x3f3b34);
  ctx.fillRect(0, 0, TILE, TILE);
  polygon(ctx, [[4, TILE - 3], [TILE / 2, 5], [TILE - 4, TILE - 3]], (() => {
    const g = ctx.createLinearGradient(0, 5, 0, TILE);
    g.addColorStop(0, hex(0x6b6455));
    g.addColorStop(1, hex(0x38332b));
    return g;
  })());
  polygon(ctx, [[TILE / 2 - 4, 11], [TILE / 2, 5], [TILE / 2 + 4, 11], [TILE / 2, 9]], 0xd8dae0);
  return canvas;
}

function town(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(TILE, TILE);
  ctx.fillStyle = hex(0x33402a);
  ctx.fillRect(0, 0, TILE, TILE);
  ellipse(ctx, TILE / 2, TILE - 3, 12, 3, 0x000000, 0.3);
  // wall
  const g = ctx.createLinearGradient(0, 14, 0, TILE);
  g.addColorStop(0, hex(0x6a5f4c));
  g.addColorStop(1, hex(0x453d30));
  ctx.fillStyle = g;
  ctx.fillRect(5, 15, TILE - 10, TILE - 18);
  // roof
  polygon(ctx, [[3, 15], [TILE / 2, 4], [TILE - 3, 15]], (() => {
    const r = ctx.createLinearGradient(0, 4, 0, 15);
    r.addColorStop(0, hex(0x7a2f2a));
    r.addColorStop(1, hex(0x4e1e1b));
    return r;
  })());
  // door + windows (glowing)
  ctx.fillStyle = hex(0x2a1e16);
  ctx.fillRect(TILE / 2 - 3, 20, 6, 9);
  ctx.fillStyle = rgba(0xffcf6a, 0.95);
  ctx.fillRect(9, 19, 4, 4);
  ctx.fillRect(TILE - 13, 19, 4, 4);
  return canvas;
}

function blank(): HTMLCanvasElement {
  return makeCanvas(TILE, TILE).canvas;
}

export function buildTileTextures(scene: Phaser.Scene): void {
  const defs: Record<string, () => HTMLCanvasElement> = {
    tile_blank: blank,
    tile_meadow: () => ground(0x3f5235),
    tile_forest: () => ground(0x2d3f27),
    tile_wastes: () => ground(0x4a4436),
    tile_water: water,
    tile_path: path,
    tile_tree: tree,
    tile_mountain: mountain,
    tile_town: town,
  };
  for (const [key, fn] of Object.entries(defs)) {
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, fn());
  }
}
