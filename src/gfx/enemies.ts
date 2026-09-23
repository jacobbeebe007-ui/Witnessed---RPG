import { makeCanvas, limb, orb, polygon, ellipse, vgrad, shade, rgba, hex, OUTLINE } from "./draw";
import { ENEMIES, type EnemyDef } from "../data/enemies";

type Shape = EnemyDef["shape"];

const S = 128;
const CX = 64;
const GROUND = 118;

function drawShape(shape: Shape, pal: [number, number, number], phase: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(S, S);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const [p, s, a] = pal;
  const bob = phase === 1 ? -3 : 0;
  ellipse(ctx, CX, GROUND + 4, 40, 8, 0x000000, 0.3);

  switch (shape) {
    case "slime": {
      const y = 66 + bob;
      ctx.beginPath();
      ctx.moveTo(CX - 34, GROUND);
      ctx.quadraticCurveTo(CX - 40, y, CX, y - 6);
      ctx.quadraticCurveTo(CX + 40, y, CX + 34, GROUND);
      ctx.quadraticCurveTo(CX, GROUND + 8, CX - 34, GROUND);
      ctx.closePath();
      ctx.fillStyle = vgrad(ctx, y - 6, GROUND, shade(p, 0.18), shade(p, -0.14));
      ctx.lineWidth = 3;
      ctx.strokeStyle = OUTLINE;
      ctx.fill();
      ctx.stroke();
      ellipse(ctx, CX - 10, y + 12, 12, 8, rgba(0xffffff, 0.18), 1);
      orb(ctx, CX - 12, y + 18, 6, 0x14100f);
      orb(ctx, CX + 12, y + 18, 6, 0x14100f);
      orb(ctx, CX - 13, y + 16, 2, 0xffffff, false);
      orb(ctx, CX + 11, y + 16, 2, 0xffffff, false);
      break;
    }
    case "goblin": {
      const y = 44 + bob;
      // legs
      limb(ctx, CX - 8, 96, CX - 10, GROUND, 6, s);
      limb(ctx, CX + 8, 96, CX + 10, GROUND, 6, s);
      // body
      polygon(ctx, [[CX - 16, y + 18], [CX + 16, y + 18], [CX + 12, 98], [CX - 12, 98]], vgrad(ctx, y + 18, 98, shade(p, 0.12), shade(p, -0.12)));
      // arms
      limb(ctx, CX - 14, y + 24, CX - 22, y + 44, 5, p);
      limb(ctx, CX + 14, y + 24, CX + 24, y + 40, 5, p);
      // head
      orb(ctx, CX, y, 17, vgrad(ctx, y - 17, y + 17, shade(p, 0.14), shade(p, -0.1)));
      // ears
      polygon(ctx, [[CX - 15, y - 4], [CX - 30, y - 10], [CX - 15, y + 6]], p);
      polygon(ctx, [[CX + 15, y - 4], [CX + 30, y - 10], [CX + 15, y + 6]], p);
      // eyes + fangs
      orb(ctx, CX - 6, y, 3, 0xd83b28, false);
      orb(ctx, CX + 6, y, 3, 0xd83b28, false);
      polygon(ctx, [[CX - 4, y + 8], [CX, y + 14], [CX + 4, y + 8]], 0xf0ead6);
      // club
      ctx.save();
      ctx.translate(CX + 24, y + 40);
      ctx.rotate(0.3);
      limb(ctx, 0, 12, 0, -24, 4, 0x5a3d22);
      orb(ctx, 0, -26, 9, shade(s, 0.1));
      ctx.restore();
      break;
    }
    case "wolf": {
      const y = 60 + bob;
      // legs
      for (const lx of [-24, -8, 12, 26]) limb(ctx, CX + lx, y + 10, CX + lx + 2, GROUND, 5, shade(p, -0.12));
      // body
      ctx.beginPath();
      ctx.ellipse(CX + 4, y + 4, 34, 20, 0, 0, Math.PI * 2);
      ctx.fillStyle = vgrad(ctx, y - 16, y + 24, shade(p, 0.12), shade(p, -0.12));
      ctx.lineWidth = 3;
      ctx.strokeStyle = OUTLINE;
      ctx.fill();
      ctx.stroke();
      // tail
      ctx.strokeStyle = hex(shade(p, -0.05));
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(CX + 34, y);
      ctx.quadraticCurveTo(CX + 54, y - 6, CX + 50, y - 20);
      ctx.stroke();
      // head
      orb(ctx, CX - 34, y - 2, 16, vgrad(ctx, y - 18, y + 14, shade(p, 0.12), shade(p, -0.1)));
      polygon(ctx, [[CX - 44, y - 14], [CX - 38, y - 26], [CX - 34, y - 12]], s);
      polygon(ctx, [[CX - 24, y - 14], [CX - 30, y - 26], [CX - 34, y - 12]], s);
      polygon(ctx, [[CX - 50, y], [CX - 34, y - 4], [CX - 44, y + 10]], shade(p, -0.15));
      orb(ctx, CX - 34, y - 4, 3, 0xffcf3a, false);
      break;
    }
    case "bandit": {
      const y = 40 + bob;
      limb(ctx, CX - 8, 92, CX - 12, GROUND, 7, s);
      limb(ctx, CX + 8, 92, CX + 12, GROUND, 7, s);
      // cloak/body
      polygon(ctx, [[CX - 20, y + 16], [CX + 20, y + 16], [CX + 16, 96], [CX - 16, 96]], vgrad(ctx, y + 16, 96, shade(p, 0.1), shade(p, -0.14)));
      limb(ctx, CX - 18, y + 22, CX - 26, y + 46, 6, p);
      limb(ctx, CX + 18, y + 22, CX + 30, y + 30, 6, p);
      // head + hood
      orb(ctx, CX, y, 15, 0xcaa07d);
      polygon(ctx, [[CX - 17, y + 4], [CX, y - 20], [CX + 17, y + 4]], shade(s, 0.05));
      // mask
      polygon(ctx, [[CX - 12, y + 2], [CX + 12, y + 2], [CX + 11, y + 9], [CX - 11, y + 9]], 0x1a1620);
      orb(ctx, CX - 5, y + 4, 2, a, false);
      orb(ctx, CX + 5, y + 4, 2, a, false);
      // sword
      ctx.save();
      ctx.translate(CX + 30, y + 30);
      ctx.rotate(0.2);
      polygon(ctx, [[-2, 6], [2, 6], [2, -30], [0, -34], [-2, -30]], vgrad(ctx, -34, 6, 0xdfe6f0, 0x9aa3b6));
      polygon(ctx, [[-7, 6], [7, 6], [7, 9], [-7, 9]], a);
      ctx.restore();
      break;
    }
    case "skeleton": {
      const y = 40 + bob;
      limb(ctx, CX - 7, 94, CX - 10, GROUND, 4, p);
      limb(ctx, CX + 7, 94, CX + 10, GROUND, 4, p);
      // spine + ribs
      limb(ctx, CX, y + 14, CX, 96, 4, p);
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = hex(p);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(CX, y + 22 + i * 8);
        ctx.quadraticCurveTo(CX - 14, y + 20 + i * 8, CX - 12, y + 30 + i * 8);
        ctx.moveTo(CX, y + 22 + i * 8);
        ctx.quadraticCurveTo(CX + 14, y + 20 + i * 8, CX + 12, y + 30 + i * 8);
        ctx.stroke();
      }
      limb(ctx, CX - 10, y + 16, CX - 18, y + 44, 4, p);
      limb(ctx, CX + 10, y + 16, CX + 20, y + 30, 4, p);
      // skull
      orb(ctx, CX, y, 15, vgrad(ctx, y - 15, y + 15, shade(p, 0.1), shade(p, -0.08)));
      polygon(ctx, [[CX - 7, y + 10], [CX + 7, y + 10], [CX + 5, y + 18], [CX - 5, y + 18]], shade(p, -0.05));
      orb(ctx, CX - 6, y - 1, 4, 0x120e10, false);
      orb(ctx, CX + 6, y - 1, 4, 0x120e10, false);
      orb(ctx, CX - 6, y - 1, 1.6, 0x8fd0ff, false);
      orb(ctx, CX + 6, y - 1, 1.6, 0x8fd0ff, false);
      // sword
      ctx.save();
      ctx.translate(CX + 20, y + 30);
      polygon(ctx, [[-2, 6], [2, 6], [2, -34], [0, -38], [-2, -34]], vgrad(ctx, -38, 6, 0xdfe6f0, 0x9aa3b6));
      polygon(ctx, [[-7, 6], [7, 6], [7, 9], [-7, 9]], s);
      ctx.restore();
      break;
    }
    case "mage": {
      const y = 40 + bob;
      // robe
      ctx.beginPath();
      ctx.moveTo(CX - 12, y + 14);
      ctx.quadraticCurveTo(CX - 34, GROUND, CX - 30, GROUND);
      ctx.quadraticCurveTo(CX, GROUND + 6, CX + 30, GROUND);
      ctx.quadraticCurveTo(CX + 34, GROUND, CX + 12, y + 14);
      ctx.closePath();
      ctx.fillStyle = vgrad(ctx, y + 14, GROUND, shade(p, 0.1), shade(p, -0.16));
      ctx.lineWidth = 3;
      ctx.strokeStyle = OUTLINE;
      ctx.fill();
      ctx.stroke();
      // hood
      polygon(ctx, [[CX - 18, y + 16], [CX, y - 22], [CX + 18, y + 16]], vgrad(ctx, y - 22, y + 16, shade(s, 0.08), shade(s, -0.08)), true, 3);
      // shadowed face + glow
      ellipse(ctx, CX, y + 2, 10, 12, 0x000000, 0.6);
      orb(ctx, CX - 4, y, 2.4, a, false);
      orb(ctx, CX + 4, y, 2.4, a, false);
      // staff
      ctx.save();
      ctx.translate(CX + 26, y + 30);
      limb(ctx, 0, 30, 0, -34, 4, 0x5a3d22);
      orb(ctx, 0, -38, 8, vgrad(ctx, -46, -30, shade(a, 0.2), shade(a, -0.2)));
      orb(ctx, 0, -38, 3, 0xfff2c0, false);
      ctx.restore();
      break;
    }
    case "wraith": {
      const y = 46 + bob;
      // tattered cloak
      ctx.beginPath();
      ctx.moveTo(CX - 26, y + 4);
      ctx.quadraticCurveTo(CX - 34, y + 40, CX - 26, GROUND);
      for (let i = -2; i <= 2; i++) {
        const tx = CX + i * 13;
        const th = GROUND - ((i * 5 + phase * 4 + 8) % 14);
        ctx.lineTo(tx - 5, th);
        ctx.lineTo(tx + 5, GROUND);
      }
      ctx.quadraticCurveTo(CX + 34, y + 40, CX + 26, y + 4);
      ctx.quadraticCurveTo(CX, y - 26, CX - 26, y + 4);
      ctx.closePath();
      ctx.fillStyle = vgrad(ctx, y - 20, GROUND, shade(p, 0.06), shade(s, -0.05));
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 3;
      ctx.strokeStyle = OUTLINE;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      // hollow face
      ellipse(ctx, CX, y, 12, 16, 0x000000, 0.7);
      orb(ctx, CX - 5, y - 2, 3, a, false);
      orb(ctx, CX + 5, y - 2, 3, a, false);
      // wispy arms
      ctx.strokeStyle = rgba(shade(p, 0.1), 0.8);
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(CX - 20, y + 14);
      ctx.quadraticCurveTo(CX - 40, y + 20, CX - 34, y + 40);
      ctx.moveTo(CX + 20, y + 14);
      ctx.quadraticCurveTo(CX + 40, y + 20, CX + 34, y + 40);
      ctx.stroke();
      break;
    }
    case "golem": {
      const y = 30 + bob;
      // legs
      limb(ctx, CX - 14, 92, CX - 16, GROUND, 11, shade(p, -0.05));
      limb(ctx, CX + 14, 92, CX + 16, GROUND, 11, shade(p, -0.05));
      // body
      polygon(ctx, [[CX - 26, y + 20], [CX + 26, y + 20], [CX + 30, 96], [CX - 30, 96]], vgrad(ctx, y + 20, 96, shade(p, 0.14), shade(p, -0.12)));
      // arms (big)
      limb(ctx, CX - 26, y + 26, CX - 40, y + 60, 10, p);
      limb(ctx, CX + 26, y + 26, CX + 40, y + 60, 10, p);
      // head
      polygon(ctx, [[CX - 16, y - 8], [CX + 16, y - 8], [CX + 18, y + 20], [CX - 18, y + 20]], vgrad(ctx, y - 8, y + 20, shade(p, 0.16), shade(p, -0.08)));
      orb(ctx, CX - 6, y + 4, 3, a, false);
      orb(ctx, CX + 6, y + 4, 3, a, false);
      // cracks glowing
      ctx.strokeStyle = rgba(a, 0.7);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CX - 10, y + 30);
      ctx.lineTo(CX - 4, y + 44);
      ctx.lineTo(CX - 12, y + 58);
      ctx.moveTo(CX + 8, y + 34);
      ctx.lineTo(CX + 14, y + 50);
      ctx.stroke();
      break;
    }
    case "dragon": {
      const y = 40 + bob;
      // wings
      polygon(ctx, [[CX - 6, y], [CX - 54, y - 20], [CX - 40, y + 6], [CX - 56, y + 8], [CX - 38, y + 22], [CX - 10, y + 20]], vgrad(ctx, y - 20, y + 22, shade(s, 0.1), shade(s, -0.12)), true, 3);
      polygon(ctx, [[CX + 6, y], [CX + 54, y - 20], [CX + 40, y + 6], [CX + 56, y + 8], [CX + 38, y + 22], [CX + 10, y + 20]], vgrad(ctx, y - 20, y + 22, shade(s, 0.1), shade(s, -0.12)), true, 3);
      // legs
      limb(ctx, CX - 12, 92, CX - 16, GROUND, 8, shade(p, -0.05));
      limb(ctx, CX + 12, 92, CX + 16, GROUND, 8, shade(p, -0.05));
      // tail
      ctx.strokeStyle = hex(shade(p, -0.05));
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(CX + 10, 96);
      ctx.quadraticCurveTo(CX + 44, 104, CX + 40, 78);
      ctx.stroke();
      polygon(ctx, [[CX + 40, 82], [CX + 52, 74], [CX + 44, 88]], a);
      // body
      ellipse(ctx, CX, y + 34, 26, 28, vgrad(ctx, y + 6, y + 62, shade(p, 0.14), shade(p, -0.12)), 1, true);
      ellipse(ctx, CX, y + 40, 14, 18, rgba(a, 0.5), 0.7);
      // neck + head
      limb(ctx, CX, y + 18, CX + 6, y - 6, 9, p);
      orb(ctx, CX + 10, y - 12, 13, vgrad(ctx, y - 24, y, shade(p, 0.14), shade(p, -0.08)));
      polygon(ctx, [[CX + 18, y - 14], [CX + 34, y - 16], [CX + 18, y - 6]], shade(p, -0.05)); // snout
      polygon(ctx, [[CX + 4, y - 22], [CX + 8, y - 22], [CX + 6, y - 32]], a); // horn
      polygon(ctx, [[CX + 14, y - 22], [CX + 18, y - 22], [CX + 16, y - 32]], a);
      orb(ctx, CX + 10, y - 12, 3, 0xffd23a, false);
      break;
    }
  }
  return canvas;
}

export function buildEnemyTextures(scene: Phaser.Scene): void {
  for (const id of Object.keys(ENEMIES)) {
    const def = ENEMIES[id];
    for (let phase = 0; phase < 2; phase++) {
      const key = enemyKey(id, phase);
      if (scene.textures.exists(key)) continue;
      scene.textures.addCanvas(key, drawShape(def.shape, def.palette, phase));
    }
    const anim = `enemyidle_${id}`;
    if (!scene.anims.exists(anim)) {
      scene.anims.create({
        key: anim,
        frames: [{ key: enemyKey(id, 0) }, { key: enemyKey(id, 1) }],
        frameRate: 2.5,
        repeat: -1,
      });
    }
  }
}

export function enemyKey(id: string, phase = 0): string {
  return `enemy_${id}_${phase}`;
}
