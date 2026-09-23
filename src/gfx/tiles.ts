import { makeCanvas, px, shade } from "./pixel";
import { TILE } from "../config";

function grass(base: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(TILE, TILE);
  px(ctx, 0, 0, TILE, TILE, base);
  for (let i = 0; i < 26; i++) {
    const x = (i * 7 + 3) % TILE;
    const y = (i * 13 + 5) % TILE;
    px(ctx, x, y, 2, 2, shade(base, i % 3 === 0 ? 0.08 : -0.08));
  }
  return canvas;
}

function water(): HTMLCanvasElement {
  const base = 0x2a5aa8;
  const { canvas, ctx } = makeCanvas(TILE, TILE);
  px(ctx, 0, 0, TILE, TILE, base);
  for (let y = 2; y < TILE; y += 8) {
    for (let x = ((y / 2) % 8); x < TILE; x += 10) {
      px(ctx, x, y, 5, 2, shade(base, 0.18), 0.7);
    }
  }
  return canvas;
}

function path(): HTMLCanvasElement {
  const base = 0xb89a6a;
  const { canvas, ctx } = makeCanvas(TILE, TILE);
  px(ctx, 0, 0, TILE, TILE, base);
  for (let i = 0; i < 20; i++) {
    const x = (i * 11 + 2) % TILE;
    const y = (i * 5 + 4) % TILE;
    px(ctx, x, y, 3, 2, shade(base, i % 2 ? -0.1 : 0.08));
  }
  return canvas;
}

function tree(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(TILE, TILE);
  px(ctx, 0, 0, TILE, TILE, 0x2f7d3a);
  px(ctx, 14, 20, 4, 10, 0x5a3a1a); // trunk
  const leaf = 0x1f5a2a;
  px(ctx, 8, 6, 16, 16, leaf);
  px(ctx, 6, 10, 20, 10, leaf);
  px(ctx, 10, 4, 12, 6, shade(leaf, 0.12));
  px(ctx, 9, 8, 4, 4, shade(leaf, 0.2));
  return canvas;
}

function mountain(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(TILE, TILE);
  px(ctx, 0, 0, TILE, TILE, 0x6a6250);
  const rock = 0x8a8270;
  ctx.fillStyle = "#8a8270";
  ctx.beginPath();
  ctx.moveTo(4, 30);
  ctx.lineTo(16, 6);
  ctx.lineTo(28, 30);
  ctx.closePath();
  ctx.fill();
  px(ctx, 12, 8, 8, 5, 0xffffff); // snow cap
  px(ctx, 14, 6, 4, 3, 0xffffff);
  px(ctx, 6, 26, 20, 4, shade(rock, -0.15));
  return canvas;
}

function town(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(TILE, TILE);
  px(ctx, 0, 0, TILE, TILE, 0x8fae5a); // grass base
  px(ctx, 4, 14, 24, 14, 0xcaa06a); // wall
  px(ctx, 4, 14, 24, 3, shade(0xcaa06a, 0.12));
  // roofs
  ctx.fillStyle = "#b0423a";
  ctx.beginPath();
  ctx.moveTo(2, 14);
  ctx.lineTo(16, 4);
  ctx.lineTo(30, 14);
  ctx.closePath();
  ctx.fill();
  px(ctx, 13, 18, 6, 10, 0x5a3a2a); // door
  px(ctx, 7, 18, 4, 4, 0xffe27a); // windows
  px(ctx, 21, 18, 4, 4, 0xffe27a);
  return canvas;
}

export function buildTileTextures(scene: Phaser.Scene): void {
  const defs: Record<string, () => HTMLCanvasElement> = {
    tile_meadow: () => grass(0x6aa84a),
    tile_forest: () => grass(0x3f7d3a),
    tile_wastes: () => grass(0x9a8a5a),
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
