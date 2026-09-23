import { makeCanvas, limb, orb, polygon, ellipse, vgrad, shade, rgba, hex, OUTLINE } from "./draw";
import type { ClassId, Gender } from "../data/classes";
import { CLASSES } from "../data/classes";

const W = 108;
const H = 156;
const CX = 54;
const FEET = 150;

const SKIN: Record<Gender, number> = { male: 0xb98a63, female: 0xcaa07d };
const SKIN_SHADOW: Record<Gender, number> = { male: 0x8f6746, female: 0xa87e5c };
const HAIR: Record<ClassId, number> = {
  mage: 0x6a4a9a,
  rogue: 0x241f2e,
  ranger: 0x6b4a2a,
  knight: 0xcaa64a,
  brute: 0x5a2318,
  inquisitor: 0xe4dcc8,
};

interface Metrics {
  headR: number;
  shoulder: number;
  waist: number;
  hip: number;
  armR: number;
  legR: number;
  bust: number;
}

function metrics(g: Gender): Metrics {
  return g === "male"
    ? { headR: 13, shoulder: 22, waist: 15, hip: 15, armR: 7, legR: 8, bust: 0 }
    : { headR: 12, shoulder: 14, waist: 9, hip: 18, armR: 5, legR: 6, bust: 4 };
}

interface Anim {
  bob: number;
  lFoot: [number, number];
  rFoot: [number, number];
  lHand: [number, number];
  rHand: [number, number];
  robeSway: number;
}

function animate(phase: number, m: Metrics): Anim {
  const bob = phase === 1 || phase === 3 ? -2 : 0;
  const sw = phase === 1 ? 6 : phase === 3 ? -6 : 0;
  const hipJ = Math.max(6, m.hip - 6);
  const shJ = m.shoulder - 3;
  return {
    bob,
    lFoot: [CX - hipJ - Math.max(0, sw) * 0.4, FEET - (phase === 1 ? 3 : 0)],
    rFoot: [CX + hipJ - Math.min(0, sw) * 0.4, FEET - (phase === 3 ? 3 : 0)],
    lHand: [CX - shJ - 2 + sw * 0.4, 96 + bob],
    rHand: [CX + shJ + 2 - sw * 0.4, 96 + bob],
    robeSway: sw * 0.6,
  };
}

// ---- Shared parts ----
function drawHead(ctx: CanvasRenderingContext2D, g: Gender, hy: number, m: Metrics, shadowed: boolean): void {
  // neck
  limb(ctx, CX, hy + m.headR - 2, CX, hy + m.headR + 8, g === "male" ? 5 : 4, SKIN[g], true, false);
  // head
  ctx.beginPath();
  ctx.ellipse(CX, hy, m.headR, m.headR + 1, 0, 0, Math.PI * 2);
  ctx.fillStyle = hex(SKIN[g]);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = OUTLINE;
  ctx.fill();
  ctx.stroke();
  // jaw shading difference: male squarer chin
  if (g === "male") {
    ctx.fillStyle = rgba(SKIN_SHADOW.male, 0.5);
    ctx.beginPath();
    ctx.moveTo(CX - m.headR + 2, hy + 4);
    ctx.lineTo(CX, hy + m.headR + 1);
    ctx.lineTo(CX + m.headR - 2, hy + 4);
    ctx.closePath();
    ctx.fill();
  }
  // face
  if (shadowed) {
    ctx.fillStyle = rgba(0x000000, 0.55);
    ctx.beginPath();
    ctx.ellipse(CX, hy + 1, m.headR - 1, m.headR, 0, 0, Math.PI * 2);
    ctx.fill();
    orb(ctx, CX - 4, hy, 1.8, 0xffe08a, false);
    orb(ctx, CX + 4, hy, 1.8, 0xffe08a, false);
  } else {
    ctx.fillStyle = "#241820";
    ctx.beginPath();
    ctx.ellipse(CX - 4.5, hy, 1.6, 2.4, 0, 0, Math.PI * 2);
    ctx.ellipse(CX + 4.5, hy, 1.6, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // brow / cheek shading
    ctx.strokeStyle = rgba(SKIN_SHADOW[g], 0.7);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(CX - 2, hy + 5);
    ctx.quadraticCurveTo(CX, hy + 7, CX + 2, hy + 5);
    ctx.stroke();
  }
}

function drawHairBack(ctx: CanvasRenderingContext2D, g: Gender, hy: number, m: Metrics, color: number): void {
  if (g === "female") {
    // long hair flowing behind shoulders
    ctx.fillStyle = hex(shade(color, -0.08));
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CX - m.headR - 1, hy - 2);
    ctx.quadraticCurveTo(CX - m.headR - 8, hy + 22, CX - m.headR + 2, hy + 40);
    ctx.quadraticCurveTo(CX, hy + 34, CX + m.headR - 2, hy + 40);
    ctx.quadraticCurveTo(CX + m.headR + 8, hy + 22, CX + m.headR + 1, hy - 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawHairFront(ctx: CanvasRenderingContext2D, g: Gender, hy: number, m: Metrics, color: number): void {
  ctx.fillStyle = hex(color);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  if (g === "female") {
    ctx.beginPath();
    ctx.moveTo(CX - m.headR - 1, hy + 2);
    ctx.quadraticCurveTo(CX - m.headR + 1, hy - m.headR - 3, CX, hy - m.headR - 2);
    ctx.quadraticCurveTo(CX + m.headR - 1, hy - m.headR - 3, CX + m.headR + 1, hy + 2);
    ctx.quadraticCurveTo(CX + m.headR - 2, hy - 3, CX + 3, hy - 2);
    ctx.quadraticCurveTo(CX, hy + 3, CX - 3, hy - 2);
    ctx.quadraticCurveTo(CX - m.headR + 2, hy - 3, CX - m.headR - 1, hy + 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(CX - m.headR, hy - 1);
    ctx.quadraticCurveTo(CX - m.headR, hy - m.headR - 4, CX, hy - m.headR - 3);
    ctx.quadraticCurveTo(CX + m.headR, hy - m.headR - 4, CX + m.headR, hy - 1);
    ctx.quadraticCurveTo(CX + 4, hy - m.headR + 1, CX, hy - m.headR + 2);
    ctx.quadraticCurveTo(CX - 4, hy - m.headR + 1, CX - m.headR, hy - 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

/** Gendered torso silhouette path (shoulders -> waist -> hips) filled with a color. */
function torsoPath(ctx: CanvasRenderingContext2D, top: number, m: Metrics): void {
  const sh = top + 2;
  const waistY = 82;
  const hipY = 96;
  ctx.beginPath();
  ctx.moveTo(CX - m.shoulder, sh);
  ctx.quadraticCurveTo(CX - m.shoulder - 2, sh + 14, CX - m.waist, waistY);
  ctx.quadraticCurveTo(CX - m.hip - 2, hipY - 4, CX - m.hip, hipY);
  ctx.lineTo(CX + m.hip, hipY);
  ctx.quadraticCurveTo(CX + m.hip + 2, hipY - 4, CX + m.waist, waistY);
  ctx.quadraticCurveTo(CX + m.shoulder + 2, sh + 14, CX + m.shoulder, sh);
  ctx.quadraticCurveTo(CX, sh - 6, CX - m.shoulder, sh);
  ctx.closePath();
}

function shadowFloor(ctx: CanvasRenderingContext2D): void {
  ellipse(ctx, CX, FEET + 2, 26, 6, 0x000000, 0.32);
}

// ---- Class outfits ----
function drawArms(ctx: CanvasRenderingContext2D, _g: Gender, m: Metrics, a: Anim, shoulderY: number, sleeve: number, hand: number): void {
  const shJ = m.shoulder - 3;
  // back (left) arm slightly darker
  limb(ctx, CX - shJ, shoulderY, a.lHand[0], a.lHand[1], m.armR, shade(sleeve, -0.12));
  orb(ctx, a.lHand[0], a.lHand[1], m.armR - 1, hand, true);
  // front (right) arm
  limb(ctx, CX + shJ, shoulderY, a.rHand[0], a.rHand[1], m.armR, sleeve);
  orb(ctx, a.rHand[0], a.rHand[1], m.armR - 1, hand, true);
}

function drawLegsPants(ctx: CanvasRenderingContext2D, _g: Gender, m: Metrics, a: Anim, pants: number, boots: number): void {
  const hipJ = Math.max(6, m.hip - 6);
  limb(ctx, CX - hipJ, 96, a.lFoot[0], a.lFoot[1] - 8, m.legR, pants);
  limb(ctx, CX + hipJ, 96, a.rFoot[0], a.rFoot[1] - 8, m.legR, pants);
  // boots
  limb(ctx, a.lFoot[0], a.lFoot[1] - 10, a.lFoot[0], a.lFoot[1], m.legR + 0.5, boots);
  limb(ctx, a.rFoot[0], a.rFoot[1] - 10, a.rFoot[0], a.rFoot[1], m.legR + 0.5, boots);
  polygon(ctx, [[a.lFoot[0] - m.legR, a.lFoot[1]], [a.lFoot[0] + m.legR + 3, a.lFoot[1]], [a.lFoot[0] + m.legR + 3, a.lFoot[1] + 3], [a.lFoot[0] - m.legR, a.lFoot[1] + 3]], shade(boots, -0.15));
  polygon(ctx, [[a.rFoot[0] - m.legR, a.rFoot[1]], [a.rFoot[0] + m.legR + 3, a.rFoot[1]], [a.rFoot[0] + m.legR + 3, a.rFoot[1] + 3], [a.rFoot[0] - m.legR, a.rFoot[1] + 3]], shade(boots, -0.15));
}

function drawRobe(ctx: CanvasRenderingContext2D, g: Gender, m: Metrics, a: Anim, cloth: number, trim: number): void {
  const hemY = FEET - 2;
  const flare = g === "female" ? 20 : 24;
  const waistW = g === "female" ? m.waist + 1 : m.waist + 3;
  ctx.beginPath();
  ctx.moveTo(CX - waistW, 84);
  ctx.quadraticCurveTo(CX - waistW - 6, 116, CX - flare + a.robeSway, hemY);
  // scalloped hem
  ctx.quadraticCurveTo(CX - flare / 2 + a.robeSway, hemY - 6, CX + a.robeSway * 0.5, hemY);
  ctx.quadraticCurveTo(CX + flare / 2 + a.robeSway, hemY - 6, CX + flare + a.robeSway, hemY);
  ctx.quadraticCurveTo(CX + waistW + 6, 116, CX + waistW, 84);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 84, hemY, shade(cloth, 0.06), shade(cloth, -0.16));
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = OUTLINE;
  ctx.fill();
  ctx.stroke();
  // center trim
  ctx.strokeStyle = hex(trim);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CX, 84);
  ctx.lineTo(CX + a.robeSway * 0.6, hemY - 3);
  ctx.stroke();
  // hem band
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CX - flare + a.robeSway, hemY - 1);
  ctx.quadraticCurveTo(CX + a.robeSway * 0.5, hemY - 7, CX + flare + a.robeSway, hemY - 1);
  ctx.stroke();
}

function metalPlate(ctx: CanvasRenderingContext2D, top: number, m: Metrics, base: number): void {
  torsoPath(ctx, top, m);
  ctx.fillStyle = vgrad(ctx, top, 96, shade(base, 0.22), shade(base, -0.14));
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = OUTLINE;
  ctx.fill();
  ctx.stroke();
}

function drawFrame(classId: ClassId, gender: Gender, phase: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const def = CLASSES[classId];
  const [primary, secondary, trim] = def.palette;
  const m = metrics(gender);
  const a = animate(phase, m);
  const hy = 24 + a.bob;
  const shoulderY = 48 + a.bob;
  const top = 44 + a.bob;
  const skin = SKIN[gender];
  const hairColor = HAIR[classId];

  shadowFloor(ctx);
  drawHairBack(ctx, gender, hy, m, hairColor);

  switch (classId) {
    case "mage": {
      // Robe caster — Siren (female) has a fitted flared dress
      drawArms(ctx, gender, m, a, shoulderY, primary, skin);
      drawRobe(ctx, gender, m, a, primary, trim);
      // torso / bodice
      torsoPath(ctx, top, m);
      ctx.fillStyle = vgrad(ctx, top, 90, shade(primary, 0.12), shade(primary, -0.1));
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = OUTLINE;
      ctx.fill();
      ctx.stroke();
      if (gender === "female") {
        // bust curve + corset lacing
        ctx.strokeStyle = rgba(shade(primary, -0.2), 0.8);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(CX - m.bust - 2, 58);
        ctx.quadraticCurveTo(CX, 66, CX + m.bust + 2, 58);
        ctx.stroke();
        ctx.strokeStyle = hex(trim);
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(CX - 3, 60 + i * 6);
          ctx.lineTo(CX + 3, 63 + i * 6);
          ctx.stroke();
        }
      }
      // collar
      polygon(ctx, [[CX - m.shoulder, top], [CX, top + 10], [CX + m.shoulder, top]], shade(secondary, 0.05));
      drawHead(ctx, gender, hy, m, false);
      drawHairFront(ctx, gender, hy, m, hairColor);
      // wizard hat / circlet
      if (gender === "male") {
        polygon(ctx, [[CX - m.headR - 3, hy - m.headR + 4], [CX + m.headR + 3, hy - m.headR + 4], [CX + 3, hy - m.headR - 20], [CX, hy - m.headR - 22]], secondary);
        orb(ctx, CX + 2, hy - m.headR - 20, 3, trim);
      } else {
        // circlet with gem
        ctx.strokeStyle = hex(trim);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(CX, hy - 2, m.headR - 1, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        orb(ctx, CX, hy - m.headR + 1, 2.4, 0x9ad0ff);
      }
      // staff in right hand
      ctx.strokeStyle = hex(0x5a3d22);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(a.rHand[0], a.rHand[1] - 30);
      ctx.lineTo(a.rHand[0], a.rHand[1] + 8);
      ctx.stroke();
      orb(ctx, a.rHand[0], a.rHand[1] - 34, 5, trim);
      orb(ctx, a.rHand[0], a.rHand[1] - 34, 2.4, 0xfff2c0, false);
      break;
    }
    case "rogue": {
      drawLegsPants(ctx, gender, m, a, secondary, shade(secondary, -0.1));
      if (gender === "female") drawSkirt(ctx, m, a, shade(primary, -0.05), trim, 12);
      drawArms(ctx, gender, m, a, shoulderY, primary, skin);
      // leather vest
      torsoPath(ctx, top, m);
      ctx.fillStyle = vgrad(ctx, top, 96, shade(primary, 0.14), shade(primary, -0.12));
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = OUTLINE;
      ctx.fill();
      ctx.stroke();
      // cross straps
      ctx.strokeStyle = hex(shade(secondary, 0.1));
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(CX - m.shoulder + 2, top + 2);
      ctx.lineTo(CX + m.waist, 80);
      ctx.moveTo(CX + m.shoulder - 2, top + 2);
      ctx.lineTo(CX - m.waist, 80);
      ctx.stroke();
      orb(ctx, CX, 60, 2.4, trim);
      drawHead(ctx, gender, hy, m, true);
      drawHood(ctx, gender, hy, m, primary, secondary);
      // dagger in right hand
      ctx.save();
      ctx.translate(a.rHand[0], a.rHand[1]);
      polygon(ctx, [[-1.5, 2], [1.5, 2], [1.5, -14], [0, -18], [-1.5, -14]], 0xcfd6e0);
      polygon(ctx, [[-4, 2], [4, 2], [4, 4], [-4, 4]], trim);
      ctx.restore();
      break;
    }
    case "ranger": {
      // cloak behind
      polygon(ctx, [[CX - m.shoulder - 2, top], [CX + m.shoulder + 2, top], [CX + m.hip + 8, 120], [CX - m.hip - 8, 120]], shade(secondary, -0.05));
      drawLegsPants(ctx, gender, m, a, shade(secondary, 0.05), shade(secondary, -0.12));
      if (gender === "female") drawSkirt(ctx, m, a, shade(primary, -0.04), trim, 10);
      drawArms(ctx, gender, m, a, shoulderY, primary, skin);
      // tunic
      torsoPath(ctx, top, m);
      ctx.fillStyle = vgrad(ctx, top, 96, shade(primary, 0.14), shade(primary, -0.12));
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = OUTLINE;
      ctx.fill();
      ctx.stroke();
      if (gender === "female") bustLine(ctx, m, primary);
      // quiver strap
      ctx.strokeStyle = hex(trim);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(CX - m.shoulder + 2, top + 2);
      ctx.lineTo(CX + m.waist, 82);
      ctx.stroke();
      drawHead(ctx, gender, hy, m, false);
      drawHairFront(ctx, gender, hy, m, hairColor);
      // hood down (collar behind head)
      polygon(ctx, [[CX - m.shoulder, top + 2], [CX - 6, top - 4], [CX - 10, top + 12]], shade(secondary, -0.05));
      polygon(ctx, [[CX + m.shoulder, top + 2], [CX + 6, top - 4], [CX + 10, top + 12]], shade(secondary, -0.05));
      // bow in right hand
      ctx.strokeStyle = hex(0x6a4a2a);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(a.rHand[0] + 3, a.rHand[1] - 6, 22, Math.PI * 0.62, Math.PI * 1.38);
      ctx.stroke();
      ctx.strokeStyle = rgba(0xffffff, 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a.rHand[0] - 4, a.rHand[1] - 26);
      ctx.lineTo(a.rHand[0] - 4, a.rHand[1] + 14);
      ctx.stroke();
      break;
    }
    case "knight": {
      // greaves + tassets
      drawLegsPants(ctx, gender, m, a, 0x6e7688, 0x3a4152);
      if (gender === "female") drawFauld(ctx, m, a, 0x7a8394, trim);
      else drawTassets(ctx, m, a, 0x7a8394);
      drawArms(ctx, gender, m, a, shoulderY, 0x8a94a8, 0x6e7688);
      // pauldrons
      orb(ctx, CX - m.shoulder, shoulderY - 2, m.armR + 3, vgrad(ctx, shoulderY - 8, shoulderY + 6, 0xaab2c4, 0x59607a));
      orb(ctx, CX + m.shoulder, shoulderY - 2, m.armR + 3, vgrad(ctx, shoulderY - 8, shoulderY + 6, 0xaab2c4, 0x59607a));
      // breastplate
      metalPlate(ctx, top, m, 0x8a94a8);
      // sculpted highlight
      ctx.strokeStyle = rgba(0xffffff, 0.25);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CX - m.shoulder + 4, top + 6);
      ctx.quadraticCurveTo(CX, top + 16, CX, 78);
      ctx.moveTo(CX + m.shoulder - 4, top + 6);
      ctx.quadraticCurveTo(CX, top + 16, CX, 78);
      ctx.stroke();
      if (gender === "female") {
        ctx.strokeStyle = rgba(0x0d0a12, 0.6);
        ctx.beginPath();
        ctx.moveTo(CX - m.bust - 1, 58);
        ctx.quadraticCurveTo(CX, 65, CX + m.bust + 1, 58);
        ctx.stroke();
      }
      orb(ctx, CX, 60, 3, trim);
      // helm
      drawHead(ctx, gender, hy, m, true);
      drawHelm(ctx, gender, hy, m, 0x9aa3b6, trim, hairColor);
      // sword
      ctx.save();
      ctx.translate(a.rHand[0], a.rHand[1]);
      polygon(ctx, [[-2, 4], [2, 4], [2, -26], [0, -30], [-2, -26]], vgrad(ctx, -30, 4, 0xe6ecf5, 0x9aa3b6));
      polygon(ctx, [[-7, 4], [7, 4], [7, 7], [-7, 7]], trim);
      ctx.restore();
      break;
    }
    case "brute": {
      drawLegsBare(ctx, gender, m, a, skin, secondary);
      if (gender === "female") drawSkirt(ctx, m, a, secondary, trim, 12);
      // bare muscled torso
      torsoPath(ctx, top, m);
      ctx.fillStyle = vgrad(ctx, top, 96, shade(skin, 0.08), shade(skin, -0.14));
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = OUTLINE;
      ctx.fill();
      ctx.stroke();
      // muscle definition
      ctx.strokeStyle = rgba(SKIN_SHADOW[gender], 0.8);
      ctx.lineWidth = 1.6;
      if (gender === "male") {
        ctx.beginPath();
        ctx.moveTo(CX - m.shoulder + 4, 54);
        ctx.quadraticCurveTo(CX, 60, CX + m.shoulder - 4, 54); // pecs
        ctx.moveTo(CX, 52);
        ctx.lineTo(CX, 80); // sternum
        for (let i = 0; i < 3; i++) {
          ctx.moveTo(CX - 6, 64 + i * 6);
          ctx.lineTo(CX + 6, 64 + i * 6); // abs
        }
        ctx.stroke();
      } else {
        // chest wrap
        polygon(ctx, [[CX - m.shoulder + 2, 52], [CX + m.shoulder - 2, 52], [CX + m.waist, 66], [CX - m.waist, 66]], secondary);
        ctx.beginPath();
        ctx.moveTo(CX, 66);
        ctx.lineTo(CX, 80);
        ctx.stroke();
      }
      // fur pauldron on one shoulder
      orb(ctx, CX - m.shoulder, shoulderY - 4, m.armR + 4, shade(secondary, 0.1));
      drawArms(ctx, gender, m, a, shoulderY, skin, skin);
      // war paint face
      drawHead(ctx, gender, hy, m, false);
      ctx.strokeStyle = rgba(0x8f2a2a, 0.85);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CX - 6, hy - 3);
      ctx.lineTo(CX + 6, hy + 4);
      ctx.moveTo(CX + 6, hy - 3);
      ctx.lineTo(CX - 6, hy + 4);
      ctx.stroke();
      // wild hair / topknot
      drawHairFront(ctx, gender, hy, m, hairColor);
      orb(ctx, CX, hy - m.headR - 1, 4, hairColor);
      // great axe
      ctx.save();
      ctx.translate(a.rHand[0], a.rHand[1]);
      ctx.strokeStyle = hex(0x5a3d22);
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.lineTo(0, 12);
      ctx.stroke();
      polygon(ctx, [[0, -30], [16, -24], [14, -10], [0, -14]], vgrad(ctx, -30, -10, 0xbfc6d0, 0x6a7280));
      ctx.restore();
      break;
    }
    case "inquisitor": {
      drawRobe(ctx, gender, m, a, secondary, trim);
      drawArms(ctx, gender, m, a, shoulderY, primary, skin);
      // robe/tabard torso
      torsoPath(ctx, top, m);
      ctx.fillStyle = vgrad(ctx, top, 96, shade(primary, 0.12), shade(primary, -0.12));
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = OUTLINE;
      ctx.fill();
      ctx.stroke();
      // tabard band
      polygon(ctx, [[CX - 8, top], [CX + 8, top], [CX + 7, 96], [CX - 7, 96]], shade(0xe4dcc8, -0.02));
      // holy cross emblem
      ctx.strokeStyle = hex(trim);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(CX, 56);
      ctx.lineTo(CX, 74);
      ctx.moveTo(CX - 5, 62);
      ctx.lineTo(CX + 5, 62);
      ctx.stroke();
      if (gender === "female") bustLine(ctx, m, primary);
      drawHead(ctx, gender, hy, m, true);
      drawHood(ctx, gender, hy, m, secondary, shade(secondary, -0.1));
      // halo
      ctx.strokeStyle = rgba(trim, 0.8);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(CX, hy - m.headR - 4, m.headR - 2, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      // mace
      ctx.save();
      ctx.translate(a.rHand[0], a.rHand[1]);
      ctx.strokeStyle = hex(0x5a3d22);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(0, 12);
      ctx.stroke();
      orb(ctx, 0, -26, 6, vgrad(ctx, -32, -20, shade(trim, 0.2), shade(trim, -0.2)));
      ctx.restore();
      break;
    }
  }

  return canvas;
}

// ---- Extra gendered garment helpers ----
function drawSkirt(ctx: CanvasRenderingContext2D, m: Metrics, a: Anim, color: number, trim: number, len: number): void {
  ctx.beginPath();
  ctx.moveTo(CX - m.waist - 1, 92);
  ctx.quadraticCurveTo(CX - m.hip - 4, 96 + len, CX - m.hip - 6 + a.robeSway, 100 + len);
  ctx.lineTo(CX + m.hip + 6 + a.robeSway, 100 + len);
  ctx.quadraticCurveTo(CX + m.hip + 4, 96 + len, CX + m.waist + 1, 92);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 92, 100 + len, shade(color, 0.08), shade(color, -0.12));
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = OUTLINE;
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = hex(trim);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CX - m.hip - 6 + a.robeSway, 99 + len);
  ctx.lineTo(CX + m.hip + 6 + a.robeSway, 99 + len);
  ctx.stroke();
}

function drawFauld(ctx: CanvasRenderingContext2D, m: Metrics, a: Anim, color: number, trim: number): void {
  drawSkirt(ctx, m, a, color, trim, 8);
  // plate segments
  ctx.strokeStyle = rgba(0x0d0a12, 0.6);
  ctx.lineWidth = 1.2;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(CX + i * 7, 94);
    ctx.lineTo(CX + i * 8 + a.robeSway, 108);
    ctx.stroke();
  }
}

function drawTassets(ctx: CanvasRenderingContext2D, m: Metrics, a: Anim, color: number): void {
  polygon(ctx, [[CX - m.hip - 2, 92], [CX - 2, 92], [CX - 3, 108], [CX - m.hip - 3, 106]], vgrad(ctx, 92, 108, shade(color, 0.15), shade(color, -0.12)));
  polygon(ctx, [[CX + 2, 92], [CX + m.hip + 2, 92], [CX + m.hip + 3, 106], [CX + 3, 108]], vgrad(ctx, 92, 108, shade(color, 0.15), shade(color, -0.12)));
  void a;
}

function drawLegsBare(ctx: CanvasRenderingContext2D, g: Gender, m: Metrics, a: Anim, skin: number, wrap: number): void {
  const hipJ = Math.max(6, m.hip - 6);
  limb(ctx, CX - hipJ, 96, a.lFoot[0], a.lFoot[1] - 6, m.legR, skin);
  limb(ctx, CX + hipJ, 96, a.rFoot[0], a.rFoot[1] - 6, m.legR, skin);
  // wrapped boots
  limb(ctx, a.lFoot[0], a.lFoot[1] - 16, a.lFoot[0], a.lFoot[1], m.legR + 0.5, wrap);
  limb(ctx, a.rFoot[0], a.rFoot[1] - 16, a.rFoot[0], a.rFoot[1], m.legR + 0.5, wrap);
  void g;
}

function bustLine(ctx: CanvasRenderingContext2D, m: Metrics, color: number): void {
  ctx.strokeStyle = rgba(shade(color, -0.22), 0.75);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(CX - m.bust - 2, 58);
  ctx.quadraticCurveTo(CX, 65, CX + m.bust + 2, 58);
  ctx.stroke();
}

function drawHood(ctx: CanvasRenderingContext2D, g: Gender, hy: number, m: Metrics, color: number, dark: number): void {
  ctx.beginPath();
  ctx.moveTo(CX - m.headR - 3, hy + 8);
  ctx.quadraticCurveTo(CX - m.headR - 5, hy - m.headR - 6, CX, hy - m.headR - 8);
  ctx.quadraticCurveTo(CX + m.headR + 5, hy - m.headR - 6, CX + m.headR + 3, hy + 8);
  ctx.quadraticCurveTo(CX + m.headR - 3, hy - 2, CX + m.headR - 5, hy - 4);
  ctx.quadraticCurveTo(CX, hy - m.headR + 1, CX - m.headR + 5, hy - 4);
  ctx.quadraticCurveTo(CX - m.headR + 3, hy - 2, CX - m.headR - 3, hy + 8);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, hy - m.headR - 8, hy + 8, shade(color, 0.05), shade(dark, -0.05));
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = OUTLINE;
  ctx.fill();
  ctx.stroke();
  if (g === "female") {
    // hair strands escaping the hood
    ctx.strokeStyle = rgba(0x2a2233, 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CX - m.headR + 2, hy + 4);
    ctx.lineTo(CX - m.headR, hy + 16);
    ctx.moveTo(CX + m.headR - 2, hy + 4);
    ctx.lineTo(CX + m.headR, hy + 16);
    ctx.stroke();
  }
}

function drawHelm(ctx: CanvasRenderingContext2D, g: Gender, hy: number, m: Metrics, metal: number, trim: number, hairColor: number): void {
  // dome
  ctx.beginPath();
  ctx.arc(CX, hy, m.headR + 1, Math.PI, 0);
  ctx.lineTo(CX + m.headR + 1, hy + 4);
  ctx.lineTo(CX - m.headR - 1, hy + 4);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, hy - m.headR, hy + 4, shade(metal, 0.2), shade(metal, -0.15));
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = OUTLINE;
  ctx.fill();
  ctx.stroke();
  // visor slit
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CX - m.headR + 2, hy + 2);
  ctx.lineTo(CX + m.headR - 2, hy + 2);
  ctx.stroke();
  // nasal
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CX, hy - 2);
  ctx.lineTo(CX, hy + 7);
  ctx.stroke();
  // plume
  polygon(ctx, [[CX - 2, hy - m.headR], [CX + 2, hy - m.headR], [CX + 5, hy - m.headR - 12], [CX, hy - m.headR - 8], [CX - 5, hy - m.headR - 12]], trim);
  if (g === "female") {
    // hair flowing from under the helm
    ctx.strokeStyle = hex(hairColor);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(CX - m.headR, hy + 4);
    ctx.quadraticCurveTo(CX - m.headR - 3, hy + 20, CX - m.headR + 2, hy + 30);
    ctx.moveTo(CX + m.headR, hy + 4);
    ctx.quadraticCurveTo(CX + m.headR + 3, hy + 20, CX + m.headR - 2, hy + 30);
    ctx.stroke();
  }
}

// ---- Public API ----
export function buildCharacterTextures(scene: Phaser.Scene): void {
  const genders: Gender[] = ["male", "female"];
  const classIds = Object.keys(CLASSES) as ClassId[];
  for (const g of genders) {
    for (const c of classIds) {
      for (let p = 0; p < 4; p++) {
        const key = charKey(c, g, p);
        if (scene.textures.exists(key)) continue;
        scene.textures.addCanvas(key, drawFrame(c, g, p));
      }
    }
  }
}

export function charKey(classId: ClassId, gender: Gender, phase = 0): string {
  return `char_${classId}_${gender}_${phase}`;
}

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
