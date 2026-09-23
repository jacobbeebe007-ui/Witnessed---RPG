import { makeCanvas, px, shade, ellipse } from "./pixel";
import type { ClassId, Gender } from "../data/classes";
import { CLASSES } from "../data/classes";

const W = 24;
const H = 34;

const SKIN: Record<Gender, number> = { male: 0xe6b48c, female: 0xf1c6a2 };
const HAIR: Record<ClassId, number> = {
  mage: 0x9a6bd0,
  rogue: 0x2e2a3a,
  ranger: 0x6b4a2a,
  knight: 0xcaa64a,
  brute: 0x7a2a1a,
  inquisitor: 0xe8e0d0,
};

interface DrawOpts {
  classId: ClassId;
  gender: Gender;
  phase: number; // 0..3 walk cycle
  facing: 1 | -1;
}

function drawWeapon(ctx: CanvasRenderingContext2D, classId: ClassId, palette: [number, number, number], armX: number, bodyY: number): void {
  const [, , trim] = palette;
  switch (classId) {
    case "mage": {
      // Staff with glowing orb
      px(ctx, armX + 2, bodyY - 6, 2, 20, 0x7a5a3a);
      px(ctx, armX + 1, bodyY - 9, 4, 4, trim);
      px(ctx, armX + 2, bodyY - 8, 2, 2, 0xffffff);
      break;
    }
    case "rogue": {
      px(ctx, armX + 2, bodyY + 4, 2, 8, 0xcfd6e0); // dagger blade
      px(ctx, armX + 1, bodyY + 11, 4, 2, 0x5a4a2a); // guard
      break;
    }
    case "ranger": {
      // Bow arc
      ctx.strokeStyle = "#8a5a2a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(armX + 2, bodyY + 4, 9, -Math.PI / 2.2, Math.PI / 2.2);
      ctx.stroke();
      ctx.strokeStyle = "#e8e0d0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(armX + 2, bodyY - 4);
      ctx.lineTo(armX + 2, bodyY + 12);
      ctx.stroke();
      break;
    }
    case "knight": {
      px(ctx, armX + 2, bodyY - 8, 2, 16, 0xdfe6f0); // sword blade
      px(ctx, armX, bodyY + 6, 6, 2, trim); // crossguard
      break;
    }
    case "brute": {
      px(ctx, armX + 2, bodyY - 6, 2, 18, 0x6a4a2a); // haft
      px(ctx, armX - 2, bodyY - 8, 8, 6, 0xb8bcc4); // axe head
      px(ctx, armX - 2, bodyY - 8, 8, 2, shade(0xb8bcc4, 0.2));
      break;
    }
    case "inquisitor": {
      px(ctx, armX + 2, bodyY - 4, 2, 16, 0x6a4a2a); // mace haft
      px(ctx, armX, bodyY - 8, 6, 6, trim); // head
      px(ctx, armX + 1, bodyY - 7, 4, 4, shade(trim, -0.2));
      break;
    }
  }
}

function drawFrame(opts: DrawOpts): HTMLCanvasElement {
  const { classId, gender, phase } = opts;
  const def = CLASSES[classId];
  const [primary, secondary, trim] = def.palette;
  const { canvas, ctx } = makeCanvas(W, H);
  const cx = 12;

  const skin = SKIN[gender];
  const hair = HAIR[classId];

  // Walk cycle offsets
  const bob = phase === 1 || phase === 3 ? -1 : 0;
  const leftLeg = phase === 1 ? -2 : phase === 3 ? 1 : 0;
  const rightLeg = phase === 3 ? -2 : phase === 1 ? 1 : 0;
  const armSwing = phase === 1 ? 1 : phase === 3 ? -1 : 0;

  // Shadow
  ellipse(ctx, cx, 32, 8, 2.5, 0x000000, 0.28);

  const shoulder = gender === "male" ? 6 : 5; // half-width of torso
  const waist = gender === "male" ? 5 : 4;
  const bodyTop = 14 + bob;

  // Legs
  px(ctx, cx - 4, 25 + leftLeg, 3, 6 - leftLeg, secondary);
  px(ctx, cx + 1, 25 + rightLeg, 3, 6 - rightLeg, secondary);
  px(ctx, cx - 4, 30, 3, 2, shade(secondary, -0.3)); // boots
  px(ctx, cx + 1, 30, 3, 2, shade(secondary, -0.3));

  // Torso (trapezoid via two rects)
  px(ctx, cx - shoulder, bodyTop, shoulder * 2, 5, primary);
  px(ctx, cx - waist, bodyTop + 5, waist * 2, 6, primary);
  // Torso shading + trim belt
  px(ctx, cx - shoulder, bodyTop, 2, 11, shade(primary, 0.12));
  px(ctx, cx - waist, bodyTop + 9, waist * 2, 2, trim);
  // Robe/skirt for casters + female
  if (classId === "mage") {
    px(ctx, cx - waist - 1, bodyTop + 10, waist * 2 + 2, 6, shade(primary, -0.08));
  } else if (gender === "female") {
    px(ctx, cx - waist, bodyTop + 10, waist * 2, 3, shade(primary, -0.05));
  }

  // Arms
  px(ctx, cx - shoulder - 2, bodyTop + 1 + armSwing, 2, 8, shade(primary, -0.1));
  px(ctx, cx + shoulder, bodyTop + 1 - armSwing, 2, 8, shade(primary, -0.1));
  // Hands
  px(ctx, cx - shoulder - 2, bodyTop + 8 + armSwing, 2, 2, skin);
  px(ctx, cx + shoulder, bodyTop + 8 - armSwing, 2, 2, skin);

  // Head
  const headY = 5 + bob;
  px(ctx, cx - 4, headY, 8, 8, skin);
  px(ctx, cx - 4, headY, 8, 2, shade(skin, 0.08));
  // Eyes
  px(ctx, cx - 2, headY + 4, 1, 2, 0x2a2030);
  px(ctx, cx + 1, headY + 4, 1, 2, 0x2a2030);

  // Hair
  px(ctx, cx - 4, headY - 1, 8, 3, hair); // top
  px(ctx, cx - 4, headY, 1, 3, hair);
  px(ctx, cx + 3, headY, 1, 3, hair);
  if (gender === "female") {
    px(ctx, cx - 5, headY, 1, 9, hair); // long hair sides
    px(ctx, cx + 4, headY, 1, 9, hair);
  }

  // Class headwear accents
  if (classId === "mage") {
    // wizard hat
    px(ctx, cx - 5, headY - 1, 10, 2, secondary);
    px(ctx, cx - 3, headY - 4, 6, 3, secondary);
    px(ctx, cx - 1, headY - 6, 3, 2, secondary);
  } else if (classId === "knight") {
    px(ctx, cx - 4, headY - 1, 8, 2, shade(primary, 0.1)); // helm rim
    px(ctx, cx - 1, headY - 3, 2, 2, trim); // plume
  } else if (classId === "inquisitor") {
    px(ctx, cx - 1, headY - 3, 2, 3, trim); // halo crest
  }

  // Weapon in right hand
  drawWeapon(ctx, classId, def.palette, cx + shoulder + 1, bodyTop);

  return canvas;
}

/** Register all character frame textures + walk animations for a Phaser scene. */
export function buildCharacterTextures(scene: Phaser.Scene): void {
  const genders: Gender[] = ["male", "female"];
  const classIds = Object.keys(CLASSES) as ClassId[];
  for (const g of genders) {
    for (const c of classIds) {
      for (let p = 0; p < 4; p++) {
        const key = `char_${c}_${g}_${p}`;
        if (scene.textures.exists(key)) continue;
        const canvas = drawFrame({ classId: c, gender: g, phase: p, facing: 1 });
        scene.textures.addCanvas(key, canvas);
      }
    }
  }
}

export function charKey(classId: ClassId, gender: Gender, phase = 0): string {
  return `char_${classId}_${gender}_${phase}`;
}

/** Ensure a walk animation exists in the global anim manager. */
export function ensureWalkAnim(scene: Phaser.Scene, classId: ClassId, gender: Gender): string {
  const anim = `walk_${classId}_${gender}`;
  if (!scene.anims.exists(anim)) {
    scene.anims.create({
      key: anim,
      frames: [0, 1, 2, 3].map((p) => ({ key: charKey(classId, gender, p) })),
      frameRate: 6,
      repeat: -1,
    });
  }
  const idle = `idle_${classId}_${gender}`;
  if (!scene.anims.exists(idle)) {
    scene.anims.create({
      key: idle,
      frames: [{ key: charKey(classId, gender, 0) }, { key: charKey(classId, gender, 2) }],
      frameRate: 2,
      repeat: -1,
    });
  }
  return anim;
}
