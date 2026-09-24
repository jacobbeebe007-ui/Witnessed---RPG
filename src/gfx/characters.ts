import { makeCanvas, px, shade, ellipse } from "./pixel";
import type { ClassId, Gender } from "../data/classes";
import { CLASSES } from "../data/classes";
import type { ArmorStyle, WeaponStyle } from "../data/items";
import {
  type Character,
  armorStyle,
  weaponStyle,
  defaultHair,
  defaultSkin,
} from "../systems/character";

export const CHAR_W = 36;
export const CHAR_H = 52;

export type AnimPose = "idle" | "walk" | "attack" | "cast" | "hurt" | "guard";

interface DrawOpts {
  classId: ClassId;
  gender: Gender;
  armor: ArmorStyle;
  weapon: WeaponStyle;
  pose: AnimPose;
  frame: number;
  hair: number;
  skin: number;
}

interface Rig {
  bob: number;
  lean: number;
  leftLeg: number;
  rightLeg: number;
  armSwing: number;
  weaponLift: number;
  weaponSwing: number;
  raise: number;
  recoil: number;
}

function rigFor(pose: AnimPose, frame: number): Rig {
  const r: Rig = { bob: 0, lean: 0, leftLeg: 0, rightLeg: 0, armSwing: 0, weaponLift: 0, weaponSwing: 0, raise: 0, recoil: 0 };
  if (pose === "idle") {
    r.bob = frame % 2 === 1 ? -1 : 0;
    return r;
  }
  if (pose === "walk") {
    const p = frame % 4;
    r.bob = p === 1 || p === 3 ? -1 : 0;
    r.leftLeg = p === 1 ? -3 : p === 3 ? 2 : 0;
    r.rightLeg = p === 3 ? -3 : p === 1 ? 2 : 0;
    r.armSwing = p === 1 ? 2 : p === 3 ? -2 : 0;
    return r;
  }
  if (pose === "attack") {
    const p = frame % 4;
    // wind-up → step-in → impact → recover
    if (p === 0) {
      r.lean = -2;
      r.weaponSwing = -10;
      r.weaponLift = 4;
      r.armSwing = -2;
    } else if (p === 1) {
      r.lean = 2;
      r.weaponSwing = 2;
      r.weaponLift = 2;
      r.armSwing = 1;
    } else if (p === 2) {
      r.lean = 5;
      r.weaponSwing = 12;
      r.weaponLift = -1;
      r.armSwing = 3;
      r.bob = -1;
    } else {
      r.lean = 1;
      r.weaponSwing = 4;
      r.armSwing = 1;
    }
    return r;
  }
  if (pose === "cast") {
    const p = frame % 3;
    r.raise = p === 0 ? 4 : p === 1 ? 8 : 6;
    r.bob = p === 1 ? -2 : -1;
    r.weaponLift = r.raise;
    return r;
  }
  if (pose === "hurt") {
    r.recoil = 4;
    r.lean = -3;
    r.bob = 1;
    return r;
  }
  // guard
  r.weaponSwing = -4;
  r.weaponLift = 2;
  r.armSwing = -1;
  r.lean = -1;
  return r;
}

function drawWeapon(ctx: CanvasRenderingContext2D, style: WeaponStyle, ax: number, ay: number, swing: number, lift: number, glow: number): void {
  const x = ax + swing;
  const y = ay - lift;
  switch (style) {
    case "staff": {
      px(ctx, x + 1, y - 10, 2, 24, 0x6a4428);
      px(ctx, x, y - 10, 1, 24, shade(0x6a4428, 0.12));
      ellipse(ctx, x + 2, y - 12, 4, 4, glow || 0xffcf5c, 0.95);
      px(ctx, x + 1, y - 13, 2, 2, 0xffffff);
      break;
    }
    case "dagger": {
      px(ctx, x + 1, y + 2, 2, 9, 0xd8dee8);
      px(ctx, x + 1, y + 2, 1, 9, 0xffffff);
      px(ctx, x, y + 10, 4, 2, 0x7a5a2a);
      px(ctx, x + 1, y + 12, 2, 3, 0x4a3020);
      break;
    }
    case "rapier": {
      px(ctx, x + 1, y - 8, 2, 20, 0xe8eef6);
      px(ctx, x + 1, y - 8, 1, 20, 0xffffff);
      px(ctx, x - 1, y + 10, 6, 2, 0xc9a24a);
      px(ctx, x + 1, y + 12, 2, 4, 0x5a3a20);
      break;
    }
    case "bow": {
      ctx.strokeStyle = "#8a5a2a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + 1, y + 2, 10, -Math.PI / 2.1, Math.PI / 2.1);
      ctx.stroke();
      ctx.strokeStyle = "#f0e8d8";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 1, y - 8);
      ctx.lineTo(x + 1 + Math.min(6, swing), y + 12);
      ctx.stroke();
      if (swing > 4) {
        px(ctx, x + 6, y + 2, 8, 1, 0xc9a06a); // loosed arrow
        px(ctx, x + 13, y + 1, 2, 3, 0xd8dee8);
      }
      break;
    }
    case "sword": {
      px(ctx, x + 1, y - 10, 2, 20, 0xdfe6f0);
      px(ctx, x + 1, y - 10, 1, 18, 0xffffff);
      px(ctx, x - 1, y + 8, 6, 2, 0xc9a24a);
      px(ctx, x + 1, y + 10, 2, 4, 0x5a3a20);
      break;
    }
    case "great": {
      px(ctx, x, y - 14, 3, 26, 0xd0d6e0);
      px(ctx, x, y - 14, 1, 24, 0xffffff);
      px(ctx, x - 2, y + 10, 8, 2, 0xb08a3a);
      px(ctx, x, y + 12, 3, 4, 0x4a3020);
      break;
    }
    case "axe": {
      px(ctx, x + 1, y - 8, 2, 22, 0x6a4428);
      px(ctx, x - 4, y - 10, 10, 7, 0xb8bcc4);
      px(ctx, x - 4, y - 10, 10, 2, shade(0xb8bcc4, 0.2));
      px(ctx, x + 4, y - 8, 3, 4, 0x9aa0aa);
      break;
    }
    case "mace": {
      px(ctx, x + 1, y - 4, 2, 18, 0x6a4428);
      px(ctx, x - 1, y - 10, 6, 6, 0xc9a24a);
      px(ctx, x, y - 9, 4, 4, shade(0xc9a24a, -0.2));
      px(ctx, x - 2, y - 8, 2, 2, 0xe8d080);
      px(ctx, x + 4, y - 8, 2, 2, 0xe8d080);
      break;
    }
    case "hammer": {
      px(ctx, x + 1, y - 6, 2, 20, 0x6a4428);
      px(ctx, x - 3, y - 12, 10, 8, 0x8a92a0);
      px(ctx, x - 3, y - 12, 10, 2, shade(0x8a92a0, 0.18));
      break;
    }
  }
}

function drawHair(ctx: CanvasRenderingContext2D, gender: Gender, classId: ClassId, hair: number, hx: number, hy: number, headW: number): void {
  const dark = shade(hair, -0.22);
  const lite = shade(hair, 0.16);
  // crown
  px(ctx, hx - 1, hy - 2, headW + 2, 4, hair);
  px(ctx, hx, hy - 3, headW, 2, lite);
  px(ctx, hx - 1, hy, 2, 4, hair);
  px(ctx, hx + headW - 1, hy, 2, 4, hair);

  if (gender === "female") {
    // long waves + bangs
    px(ctx, hx - 2, hy + 1, 2, 16, hair);
    px(ctx, hx + headW, hy + 1, 2, 16, hair);
    px(ctx, hx - 3, hy + 6, 2, 13, dark);
    px(ctx, hx + headW + 1, hy + 6, 2, 13, dark);
    px(ctx, hx - 2, hy + 15, 4, 3, lite);
    px(ctx, hx + headW - 2, hy + 15, 4, 3, lite);
    px(ctx, hx + 1, hy, 4, 2, lite); // bang
    px(ctx, hx + headW - 4, hy + 1, 3, 2, hair);
    if (classId === "mage" || classId === "knight") {
      px(ctx, hx - 1, hy + 17, 3, 2, hair);
      px(ctx, hx + headW - 1, hy + 17, 3, 2, hair);
    }
  } else {
    // short / undercut
    px(ctx, hx - 1, hy + 2, 2, 3, hair);
    px(ctx, hx + headW - 1, hy + 2, 2, 3, hair);
    if (classId === "brute") {
      px(ctx, hx + 2, hy + 8, 5, 3, hair); // short beard
    }
  }

  if (classId === "mage") {
    // hat
    const hat = 0x3a2a6a;
    px(ctx, hx - 3, hy - 1, headW + 6, 2, hat);
    px(ctx, hx - 1, hy - 5, headW + 2, 4, hat);
    px(ctx, hx + 2, hy - 8, 5, 4, hat);
    px(ctx, hx + 1, hy - 2, headW, 1, 0xffcf5c);
  } else if (classId === "knight") {
    px(ctx, hx - 1, hy - 2, headW + 2, 2, 0xb0b8c8);
    px(ctx, hx + Math.floor(headW / 2) - 1, hy - 5, 2, 4, 0xc04040); // plume
  } else if (classId === "inquisitor") {
    px(ctx, hx + Math.floor(headW / 2) - 1, hy - 5, 3, 3, 0xffe27a);
  }
}

function drawHead(ctx: CanvasRenderingContext2D, gender: Gender, skin: number, hx: number, hy: number, headW: number, hurt: boolean): void {
  const jaw = gender === "male" ? headW : headW - 1;
  const jx = gender === "male" ? hx : hx + 1;
  // outline
  px(ctx, hx - 1, hy, 1, 9, shade(skin, -0.35));
  px(ctx, hx + headW, hy, 1, 9, shade(skin, -0.35));
  px(ctx, hx, hy + 10, headW, 1, shade(skin, -0.3));
  px(ctx, hx, hy, headW, 8, skin);
  px(ctx, jx, hy + 7, jaw, 3, shade(skin, -0.06));
  px(ctx, hx, hy, headW, 2, shade(skin, 0.12));
  if (gender === "female") {
    px(ctx, hx + 1, hy + 6, 2, 1, 0xe89aa0, 0.55);
    px(ctx, hx + headW - 3, hy + 6, 2, 1, 0xe89aa0, 0.55);
  } else {
    px(ctx, hx + 1, hy + 8, headW - 2, 2, shade(skin, -0.1)); // jaw shadow
  }
  const eyeY = hy + 4;
  if (hurt) {
    px(ctx, hx + 2, eyeY, 2, 1, 0x2a2030);
    px(ctx, hx + headW - 4, eyeY, 2, 1, 0x2a2030);
  } else {
    px(ctx, hx + 2, eyeY, 2, 2, 0x2a2030);
    px(ctx, hx + headW - 4, eyeY, 2, 2, 0x2a2030);
    px(ctx, hx + 2, eyeY, 1, 1, 0xffffff);
    px(ctx, hx + headW - 4, eyeY, 1, 1, 0xffffff);
    if (gender === "female") {
      px(ctx, hx + 1, eyeY - 1, 3, 1, 0x1a1420);
      px(ctx, hx + headW - 4, eyeY - 1, 3, 1, 0x1a1420);
      px(ctx, hx + 2, eyeY + 2, 2, 1, 0xc9a890);
    }
  }
  const mx = hx + Math.floor(headW / 2) - 1;
  if (gender === "female") {
    px(ctx, mx, hy + 8, 2, 1, 0xc07078);
  } else {
    px(ctx, mx, hy + 8, 3, 1, shade(skin, -0.22));
  }
}

function drawArmorTorso(
  ctx: CanvasRenderingContext2D,
  gender: Gender,
  armor: ArmorStyle,
  classId: ClassId,
  palette: [number, number, number],
  cx: number,
  bodyTop: number,
  shoulder: number,
  waist: number,
  hip: number
): void {
  const [primary, secondary, trim] = palette;
  const metal = armor === "heavy" || armor === "plate" ? 0xc5ccd8 : armor === "chain" ? 0x8a92a0 : primary;

  if (armor === "cloth") {
    if (gender === "female") {
      // fitted bodice + flared gown
      px(ctx, cx - shoulder, bodyTop, shoulder * 2, 5, primary);
      px(ctx, cx - waist, bodyTop + 5, waist * 2, 5, shade(primary, -0.04));
      px(ctx, cx - hip - 1, bodyTop + 10, hip * 2 + 2, 12, shade(primary, -0.08));
      px(ctx, cx - hip - 2, bodyTop + 16, hip * 2 + 4, 7, shade(primary, -0.12));
      px(ctx, cx - 1, bodyTop + 2, 2, 8, trim); // sash
      px(ctx, cx - waist, bodyTop + 9, waist * 2, 2, trim);
      px(ctx, cx - shoulder, bodyTop, 2, 5, shade(primary, 0.14));
    } else {
      px(ctx, cx - shoulder, bodyTop, shoulder * 2, 12, primary);
      px(ctx, cx - waist, bodyTop + 10, waist * 2, 6, shade(primary, -0.08));
      px(ctx, cx - shoulder, bodyTop, 2, 12, shade(primary, 0.12));
      px(ctx, cx - 2, bodyTop, 4, 12, shade(primary, -0.1)); // tabard
      px(ctx, cx - waist, bodyTop + 14, waist * 2, 2, trim);
    }
    return;
  }

  if (armor === "leather" || armor === "hide") {
    const hide = armor === "hide";
    const body = hide ? 0x6a4a2a : 0x5a3a24;
    if (gender === "female") {
      px(ctx, cx - shoulder, bodyTop, shoulder * 2, 5, body);
      px(ctx, cx - waist + 1, bodyTop + 5, waist * 2 - 2, 5, shade(body, 0.06));
      px(ctx, cx - hip, bodyTop + 10, hip * 2, 6, body);
      px(ctx, cx - hip, bodyTop + 14, hip * 2, 3, trim);
      px(ctx, cx - 2, bodyTop + 3, 4, 2, shade(skinSafe(trim), 0.1));
      if (hide) {
        px(ctx, cx - shoulder - 1, bodyTop, 2, 4, 0xc8b090); // fur
        px(ctx, cx + shoulder - 1, bodyTop, 2, 4, 0xc8b090);
      }
    } else {
      px(ctx, cx - shoulder, bodyTop, shoulder * 2, 12, body);
      px(ctx, cx - waist, bodyTop + 10, waist * 2, 6, shade(body, -0.08));
      px(ctx, cx - 3, bodyTop + 4, 6, 2, 0x3a2414); // belts
      px(ctx, cx - 3, bodyTop + 9, 6, 2, 0x3a2414);
      if (hide) px(ctx, cx - shoulder, bodyTop - 1, shoulder * 2, 3, 0xc8b090);
    }
    px(ctx, cx - shoulder, bodyTop, 2, 10, shade(body, 0.12));
    return;
  }

  if (armor === "chain") {
    const mail = 0x8a92a0;
    if (gender === "female") {
      px(ctx, cx - shoulder, bodyTop, shoulder * 2, 6, mail);
      px(ctx, cx - waist, bodyTop + 6, waist * 2, 5, shade(mail, -0.06));
      // mail skirt
      px(ctx, cx - hip - 1, bodyTop + 11, hip * 2 + 2, 8, shade(mail, -0.1));
      for (let i = 0; i < 5; i++) px(ctx, cx - hip + i * 3, bodyTop + 12, 2, 7, shade(mail, i % 2 ? 0.08 : -0.08));
      px(ctx, cx - 1, bodyTop + 2, 2, 8, trim);
    } else {
      px(ctx, cx - shoulder, bodyTop, shoulder * 2, 14, mail);
      px(ctx, cx - waist, bodyTop + 12, waist * 2, 5, shade(mail, -0.1));
      for (let i = 0; i < 4; i++) px(ctx, cx - shoulder + 2 + i * 3, bodyTop + 3, 2, 10, shade(mail, 0.1));
    }
    px(ctx, cx - shoulder, bodyTop, 2, 12, shade(mail, 0.14));
    return;
  }

  // plate / heavy
  const plate = metal;
  const dark = shade(plate, -0.18);
  const lite = shade(plate, 0.16);
  if (gender === "female") {
    // sculpted cuirass + flared faulds
    px(ctx, cx - shoulder, bodyTop, shoulder * 2, 5, plate);
    px(ctx, cx - waist + 1, bodyTop + 5, waist * 2 - 2, 5, lite);
    px(ctx, cx - hip, bodyTop + 10, hip * 2, 3, plate);
    px(ctx, cx - hip - 1, bodyTop + 13, hip * 2 + 2, 7, dark);
    for (let i = 0; i < 4; i++) px(ctx, cx - hip + i * 3, bodyTop + 13, 2, 7, plate);
    // decorative center ridge
    px(ctx, cx - 1, bodyTop + 1, 2, 10, trim);
    // small refined pauldrons
    px(ctx, cx - shoulder - 2, bodyTop, 3, 4, plate);
    px(ctx, cx + shoulder - 1, bodyTop, 3, 4, plate);
    px(ctx, cx - shoulder - 2, bodyTop, 3, 1, lite);
    px(ctx, cx + shoulder - 1, bodyTop, 3, 1, lite);
  } else {
    px(ctx, cx - shoulder, bodyTop, shoulder * 2, 13, plate);
    px(ctx, cx - waist, bodyTop + 11, waist * 2, 6, dark);
    px(ctx, cx - 2, bodyTop + 2, 4, 10, lite);
    // heavy pauldrons
    px(ctx, cx - shoulder - 3, bodyTop - 1, 5, 6, plate);
    px(ctx, cx + shoulder - 2, bodyTop - 1, 5, 6, plate);
    px(ctx, cx - shoulder - 3, bodyTop - 1, 5, 2, lite);
    px(ctx, cx + shoulder - 2, bodyTop - 1, 5, 2, lite);
    if (armor === "heavy") {
      px(ctx, cx - shoulder, bodyTop + 6, shoulder * 2, 2, trim);
    }
  }
  void classId;
  void secondary;
}

function skinSafe(c: number): number {
  return c;
}

function drawFrame(opts: DrawOpts): HTMLCanvasElement {
  const { classId, gender, armor, weapon: weap, pose, frame, hair, skin } = opts;
  const def = CLASSES[classId];
  const { canvas, ctx } = makeCanvas(CHAR_W, CHAR_H);
  const cx = 16 + (pose === "hurt" ? 2 : 0);
  const rig = rigFor(pose, frame);

  ellipse(ctx, 16, 49, 9, 2.6, 0x000000, 0.3);

  const male = gender === "male";
  const shoulder = male ? 7 : 6;
  const waist = male ? 6 : 4;
  const hip = male ? 6 : 6;
  const bodyTop = 18 + rig.bob;
  const headW = male ? 10 : 9;
  const hx = cx - Math.floor(headW / 2) + rig.lean;
  const hy = 6 + rig.bob;

  // Legs / boots
  const boot = armor === "heavy" || armor === "plate" ? 0x4a5060 : 0x3a2a1c;
  const pant = shade(def.palette[1], -0.05);
  px(ctx, cx - 5 + rig.lean, 34 + rig.leftLeg, 4, 12 - Math.max(0, rig.leftLeg), pant);
  px(ctx, cx + 1 + rig.lean, 34 + rig.rightLeg, 4, 12 - Math.max(0, rig.rightLeg), pant);
  px(ctx, cx - 5 + rig.lean, 43, 4, 4, boot);
  px(ctx, cx + 1 + rig.lean, 43, 4, 4, boot);
  if (male) {
    px(ctx, cx - 5 + rig.lean, 45, 5, 2, shade(boot, -0.15));
    px(ctx, cx + 1 + rig.lean, 45, 5, 2, shade(boot, -0.15));
  }

  // Back hair
  if (gender === "female") {
    px(ctx, hx - 2, hy + 4, 2, 12, shade(hair, -0.15));
    px(ctx, hx + headW, hy + 4, 2, 12, shade(hair, -0.15));
  }

  // Back arm
  const armCol = armor === "cloth" ? shade(def.palette[0], -0.08) : shade(0x8a92a0, armor === "leather" || armor === "hide" ? -0.3 : 0);
  const armSkin = skin;
  px(ctx, cx - shoulder - 3 + rig.lean, bodyTop + 1 + rig.armSwing, 3, 9, armCol);
  px(ctx, cx - shoulder - 3 + rig.lean, bodyTop + 9 + rig.armSwing, 3, 2, armSkin);

  // Torso
  drawArmorTorso(ctx, gender, armor, classId, def.palette, cx + rig.lean, bodyTop, shoulder, waist, hip);

  // Front arm + weapon hand
  const frontArmX = cx + shoulder + rig.lean + rig.weaponSwing * 0.15;
  const frontArmY = bodyTop + 1 - rig.armSwing - Math.floor(rig.raise / 2);
  px(ctx, frontArmX, frontArmY, 3, 9, armCol);
  px(ctx, frontArmX, frontArmY + 8, 3, 2, armSkin);

  // Head
  drawHead(ctx, gender, skin, hx, hy, headW, pose === "hurt");
  drawHair(ctx, gender, classId, hair, hx, hy, headW);

  // Weapon
  const glow = classId === "mage" || classId === "inquisitor" ? def.palette[2] : 0xffcf5c;
  drawWeapon(ctx, weap, frontArmX + 2, frontArmY + 4, rig.weaponSwing, rig.weaponLift, glow);

  // Cast aura
  if (pose === "cast") {
    ellipse(ctx, cx, bodyTop + 6, 11 + frame, 14, def.palette[2], 0.12 + frame * 0.06);
  }
  if (pose === "attack" && frame === 2) {
    px(ctx, frontArmX + 8 + rig.weaponSwing, frontArmY - 2, 6, 2, 0xffffff, 0.7);
    px(ctx, frontArmX + 10 + rig.weaponSwing, frontArmY, 8, 1, def.palette[2], 0.8);
  }
  if (pose === "guard") {
    px(ctx, cx + 4 + rig.lean, bodyTop + 2, 3, 12, 0xc5ccd8);
    px(ctx, cx + 3 + rig.lean, bodyTop + 2, 5, 2, shade(0xc5ccd8, 0.15));
  }

  return canvas;
}

export function visualId(c: Pick<Character, "gender" | "classId" | "armorId" | "weaponId" | "hairColor" | "skinTone">): string {
  const hair = c.hairColor ?? defaultHair(c.classId, c.gender);
  const skin = c.skinTone ?? defaultSkin(c.gender);
  return `${c.gender}_${c.classId}_${c.armorId}_${c.weaponId}_${hair.toString(16)}_${skin.toString(16)}`;
}

function frameKey(vid: string, pose: AnimPose, frame: number): string {
  return `vis_${vid}_${pose}_${frame}`;
}

const POSE_FRAMES: Record<AnimPose, number> = {
  idle: 2,
  walk: 4,
  attack: 4,
  cast: 3,
  hurt: 1,
  guard: 1,
};

export function ensureActorAnims(scene: Phaser.Scene, c: Character): { idle: string; walk: string; attack: string; cast: string; hurt: string; guard: string; vid: string } {
  const vid = visualId(c);
  const hair = c.hairColor ?? defaultHair(c.classId, c.gender);
  const skin = c.skinTone ?? defaultSkin(c.gender);
  const armor = armorStyle(c);
  const weap = weaponStyle(c);

  (Object.keys(POSE_FRAMES) as AnimPose[]).forEach((pose) => {
    const n = POSE_FRAMES[pose];
    for (let f = 0; f < n; f++) {
      const key = frameKey(vid, pose, f);
      if (!scene.textures.exists(key)) {
        const canvas = drawFrame({
          classId: c.classId,
          gender: c.gender,
          armor,
          weapon: weap,
          pose,
          frame: f,
          hair,
          skin,
        });
        scene.textures.addCanvas(key, canvas);
      }
    }
  });

  const idle = `idle_${vid}`;
  const walk = `walk_${vid}`;
  const attack = `attack_${vid}`;
  const cast = `cast_${vid}`;
  const hurt = `hurt_${vid}`;
  const guard = `guard_${vid}`;

  if (!scene.anims.exists(idle)) {
    scene.anims.create({
      key: idle,
      frames: [0, 1].map((f) => ({ key: frameKey(vid, "idle", f) })),
      frameRate: 2,
      repeat: -1,
    });
  }
  if (!scene.anims.exists(walk)) {
    scene.anims.create({
      key: walk,
      frames: [0, 1, 2, 3].map((f) => ({ key: frameKey(vid, "walk", f) })),
      frameRate: 7,
      repeat: -1,
    });
  }
  if (!scene.anims.exists(attack)) {
    scene.anims.create({
      key: attack,
      frames: [0, 1, 2, 3].map((f) => ({ key: frameKey(vid, "attack", f) })),
      frameRate: 10,
      repeat: 0,
    });
  }
  if (!scene.anims.exists(cast)) {
    scene.anims.create({
      key: cast,
      frames: [0, 1, 2].map((f) => ({ key: frameKey(vid, "cast", f) })),
      frameRate: 8,
      repeat: 0,
    });
  }
  if (!scene.anims.exists(hurt)) {
    scene.anims.create({ key: hurt, frames: [{ key: frameKey(vid, "hurt", 0) }], frameRate: 1, repeat: 0 });
  }
  if (!scene.anims.exists(guard)) {
    scene.anims.create({ key: guard, frames: [{ key: frameKey(vid, "guard", 0) }], frameRate: 1, repeat: 0 });
  }

  return { idle, walk, attack, cast, hurt, guard, vid };
}

/** Register starting-kit textures + legacy walk keys used by older scenes. */
export function buildCharacterTextures(scene: Phaser.Scene): void {
  const genders: Gender[] = ["male", "female"];
  const classIds = Object.keys(CLASSES) as ClassId[];
  for (const g of genders) {
    for (const c of classIds) {
      const fake: Character = {
        name: "_",
        gender: g,
        classId: c,
        attrs: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        level: 1,
        xp: 0,
        hp: 1,
        mp: 1,
        gold: 0,
        weaponId: CLASSES[c].startingWeapon,
        armorId: CLASSES[c].startingArmor,
        skills: [],
        inventory: [],
      };
      const anims = ensureActorAnims(scene, fake);
      // Legacy keys so existing references keep working.
      for (let p = 0; p < 4; p++) {
        const legacy = `char_${c}_${g}_${p}`;
        if (scene.textures.exists(legacy)) continue;
        const src = `vis_${anims.vid}_walk_${p}`;
        if (scene.textures.exists(src)) {
          const tex = scene.textures.get(src);
          const srcImg = tex.getSourceImage() as HTMLCanvasElement;
          const { canvas, ctx } = makeCanvas(srcImg.width, srcImg.height);
          ctx.drawImage(srcImg, 0, 0);
          scene.textures.addCanvas(legacy, canvas);
        }
      }
    }
  }
}

export function charKey(classId: ClassId, gender: Gender, phase = 0): string {
  return `char_${classId}_${gender}_${phase}`;
}

export function ensureWalkAnim(scene: Phaser.Scene, classId: ClassId, gender: Gender): string {
  const fake: Character = {
    name: "_",
    gender,
    classId,
    attrs: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    level: 1,
    xp: 0,
    hp: 1,
    mp: 1,
    gold: 0,
    weaponId: CLASSES[classId].startingWeapon,
    armorId: CLASSES[classId].startingArmor,
    skills: [],
    inventory: [],
  };
  return ensureActorAnims(scene, fake).walk;
}

export function actorKeys(scene: Phaser.Scene, c: Character) {
  return ensureActorAnims(scene, c);
}
