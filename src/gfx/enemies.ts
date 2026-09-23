import { makeCanvas, px, shade, ellipse } from "./pixel";
import { ENEMIES, type EnemyDef } from "../data/enemies";

type Shape = EnemyDef["shape"];

function drawShape(shape: Shape, pal: [number, number, number], phase: number): HTMLCanvasElement {
  const S = 48;
  const { canvas, ctx } = makeCanvas(S, S);
  const [p, s, a] = pal;
  const cx = 24;
  const bob = phase === 1 ? -2 : 0;
  ellipse(ctx, cx, 44, 14, 3, 0x000000, 0.3);

  switch (shape) {
    case "slime": {
      const y = 22 + bob;
      ellipse(ctx, cx, y + 10, 15, 11, p, 0.95);
      ellipse(ctx, cx, y + 6, 12, 7, shade(p, 0.15), 0.6);
      px(ctx, cx - 6, y + 6, 3, 4, 0x201818);
      px(ctx, cx + 3, y + 6, 3, 4, 0x201818);
      px(ctx, cx - 5, y + 7, 1, 1, 0xffffff);
      px(ctx, cx + 4, y + 7, 1, 1, 0xffffff);
      break;
    }
    case "goblin": {
      const y = 12 + bob;
      px(ctx, cx - 8, y + 14, 16, 12, p); // body
      px(ctx, cx - 6, y, 12, 12, shade(p, 0.1)); // head
      px(ctx, cx - 12, y + 2, 6, 4, p); // ears
      px(ctx, cx + 6, y + 2, 6, 4, p);
      px(ctx, cx - 3, y + 5, 2, 2, 0xff3030); // eyes
      px(ctx, cx + 1, y + 5, 2, 2, 0xff3030);
      px(ctx, cx - 2, y + 9, 4, 2, 0xffffff); // teeth
      px(ctx, cx + 8, y + 10, 3, 14, 0x6a4a2a); // club
      px(ctx, cx + 6, y + 8, 7, 5, s);
      break;
    }
    case "wolf": {
      const y = 18 + bob;
      ellipse(ctx, cx, y + 8, 15, 8, p); // body
      px(ctx, cx - 16, y + 2, 10, 8, p); // head
      px(ctx, cx - 16, y - 2, 3, 4, s); // ears
      px(ctx, cx - 11, y - 2, 3, 4, s);
      px(ctx, cx - 14, y + 5, 2, 2, 0xffd23a); // eye
      px(ctx, cx - 18, y + 8, 4, 2, shade(p, -0.2)); // snout
      px(ctx, cx + 12, y + 4, 6, 6, s); // tail
      px(ctx, cx - 10, y + 14, 3, 6, shade(p, -0.15)); // legs
      px(ctx, cx - 2, y + 14, 3, 6, shade(p, -0.15));
      px(ctx, cx + 8, y + 14, 3, 6, shade(p, -0.15));
      break;
    }
    case "bandit": {
      const y = 10 + bob;
      px(ctx, cx - 7, y + 12, 14, 14, p); // torso
      px(ctx, cx - 5, y, 10, 10, 0xe6b48c); // head
      px(ctx, cx - 6, y - 2, 12, 5, s); // hood
      px(ctx, cx - 5, y + 5, 10, 2, 0x201818); // mask
      px(ctx, cx + 7, y - 4, 2, 20, 0xcfd6e0); // sword
      px(ctx, cx + 5, y + 14, 6, 2, a);
      break;
    }
    case "skeleton": {
      const y = 10 + bob;
      px(ctx, cx - 5, y, 10, 9, p); // skull
      px(ctx, cx - 3, y + 4, 2, 3, 0x201818); // eye sockets
      px(ctx, cx + 1, y + 4, 2, 3, 0x201818);
      for (let i = 0; i < 4; i++) px(ctx, cx - 6, y + 11 + i * 3, 12, 2, p); // ribs
      px(ctx, cx - 6, y + 11, 2, 14, p); // spine sides
      px(ctx, cx + 4, y + 11, 2, 14, p);
      px(ctx, cx + 7, y + 6, 2, 18, 0xcfd6e0); // sword
      px(ctx, cx + 5, y + 6, 6, 2, s);
      break;
    }
    case "mage": {
      const y = 8 + bob;
      px(ctx, cx - 8, y + 10, 16, 18, p); // robe
      px(ctx, cx - 6, y + 26, 12, 3, shade(p, -0.15));
      px(ctx, cx - 6, y, 12, 12, s); // hood
      px(ctx, cx - 3, y + 6, 6, 3, a); // glowing face
      px(ctx, cx + 8, y - 2, 2, 26, 0x6a4a2a); // staff
      ellipse(ctx, cx + 9, y - 3, 4, 4, a, 0.9);
      break;
    }
    case "wraith": {
      const y = 8 + bob;
      ellipse(ctx, cx, y + 8, 10, 10, p, 0.85); // head/hood
      for (let i = 0; i < 6; i++) {
        const h = 14 + ((i * 7 + phase * 3) % 10);
        px(ctx, cx - 10 + i * 4, y + 14, 3, h, shade(p, -0.1), 0.8); // tatters
      }
      px(ctx, cx - 4, y + 6, 3, 3, a); // eyes
      px(ctx, cx + 2, y + 6, 3, 3, a);
      break;
    }
    case "golem": {
      const y = 6 + bob;
      px(ctx, cx - 12, y + 12, 24, 22, p); // body
      px(ctx, cx - 8, y, 16, 14, shade(p, 0.08)); // head
      px(ctx, cx - 5, y + 5, 3, 3, a); // eyes
      px(ctx, cx + 2, y + 5, 3, 3, a);
      px(ctx, cx - 18, y + 14, 6, 16, p); // arms
      px(ctx, cx + 12, y + 14, 6, 16, p);
      px(ctx, cx - 10, y + 18, 4, 4, shade(p, -0.2)); // cracks
      px(ctx, cx + 4, y + 24, 5, 3, shade(p, -0.2));
      break;
    }
    case "dragon": {
      const y = 6 + bob;
      // Wings
      px(ctx, cx - 22, y + 4, 12, 18, s);
      px(ctx, cx + 10, y + 4, 12, 18, s);
      px(ctx, cx - 22, y + 4, 12, 3, shade(s, 0.15));
      px(ctx, cx + 10, y + 4, 12, 3, shade(s, 0.15));
      // Body
      ellipse(ctx, cx, y + 20, 12, 12, p);
      px(ctx, cx - 4, y - 2, 12, 12, p); // head
      px(ctx, cx + 6, y - 6, 6, 6, p); // snout up
      px(ctx, cx - 2, y + 2, 2, 2, 0xffe23a); // eye
      px(ctx, cx + 8, y - 4, 2, 2, 0xffe23a);
      // Horns + belly
      px(ctx, cx - 4, y - 4, 2, 3, a);
      px(ctx, cx + 2, y - 4, 2, 3, a);
      ellipse(ctx, cx, y + 24, 6, 6, a, 0.6);
      px(ctx, cx - 14, y + 22, 8, 5, p); // tail
      break;
    }
  }
  return canvas;
}

export function buildEnemyTextures(scene: Phaser.Scene): void {
  for (const id of Object.keys(ENEMIES)) {
    const def = ENEMIES[id];
    for (let phase = 0; phase < 2; phase++) {
      const key = `enemy_${id}_${phase}`;
      if (scene.textures.exists(key)) continue;
      scene.textures.addCanvas(key, drawShape(def.shape, def.palette, phase));
    }
    const anim = `enemyidle_${id}`;
    if (!scene.anims.exists(anim)) {
      scene.anims.create({
        key: anim,
        frames: [{ key: `enemy_${id}_0` }, { key: `enemy_${id}_1` }],
        frameRate: 2.5,
        repeat: -1,
      });
    }
  }
}

export function enemyKey(id: string, phase = 0): string {
  return `enemy_${id}_${phase}`;
}
