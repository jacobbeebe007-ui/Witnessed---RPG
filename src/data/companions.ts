import type { Attributes } from "./attributes";
import type { ClassId, Gender } from "./classes";

export interface CompanionDef {
  id: string;
  name: string;
  gender: Gender;
  classId: ClassId;
  attrs: Attributes;
  hairColor: number;
  skinTone: number;
  title: string;
  blurb: string;
  lines: string[];
  joinLine: string;
  tx: number;
  ty: number;
  regionLabel: string;
}

export const COMPANIONS: Record<string, CompanionDef> = {
  aria: {
    id: "aria",
    name: "Aria Vale",
    gender: "female",
    classId: "mage",
    attrs: { str: 8, dex: 11, con: 10, int: 16, wis: 12, cha: 15 },
    hairColor: 0xd4a6ff,
    skinTone: 0xf4c8b0,
    title: "Siren of Valehaven",
    blurb: "A songstress whose voice can split stone and mend a failing heart.",
    regionLabel: "Valehaven",
    tx: 8,
    ty: 14,
    lines: [
      "The Solstice Seal is cracking. I felt it in the river this morning.",
      "Take me with you. Four voices can hold a chorus the dark cannot drown.",
    ],
    joinLine: "Aria Vale takes her place at your side.",
  },
  thorne: {
    id: "thorne",
    name: "Thorne Kestrel",
    gender: "male",
    classId: "rogue",
    attrs: { str: 10, dex: 16, con: 12, int: 11, wis: 10, cha: 9 },
    hairColor: 0x2a2430,
    skinTone: 0xc98a62,
    title: "Forest Knife",
    blurb: "A quiet cutter of purses and of things that should stay dead.",
    regionLabel: "Thornwood",
    tx: 25,
    ty: 11,
    lines: [
      "You walk loud. Lucky for you, so do the things hunting you.",
      "I'll watch your back — if you watch my cut. Deal?",
    ],
    joinLine: "Thorne Kestrel melts into the party's shadow.",
  },
  mirielle: {
    id: "mirielle",
    name: "Dame Mirielle",
    gender: "female",
    classId: "knight",
    attrs: { str: 15, dex: 10, con: 14, int: 9, wis: 13, cha: 12 },
    hairColor: 0xf0d080,
    skinTone: 0xe8b894,
    title: "Oath of the Gate",
    blurb: "A sworn defender whose plate is cut like a rose and hits like a wall.",
    regionLabel: "Ashen Gate",
    tx: 39,
    ty: 20,
    lines: [
      "The wastes remember every oath broken here. I will not add another.",
      "If you mean to face what waits beyond the Gate, you will not do it three-strong.",
    ],
    joinLine: "Dame Mirielle lowers her visor and joins the line.",
  },
};

export const COMPANION_ORDER = ["aria", "thorne", "mirielle"] as const;
export const MAX_PARTY = 4;
