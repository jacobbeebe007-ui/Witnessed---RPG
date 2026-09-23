import type { AttrKey } from "./attributes";

export type ClassId = "mage" | "rogue" | "ranger" | "knight" | "brute" | "inquisitor";
export type Gender = "male" | "female";

export interface ClassDef {
  id: ClassId;
  /** Display name, may differ by gender (e.g. Mage / Siren). */
  name: (g: Gender) => string;
  role: string;
  desc: string;
  primary: AttrKey;
  /** HP/MP per level after level 1 (plus CON/INT mods). */
  hpBase: number;
  mpBase: number;
  hpPerLevel: number;
  mpPerLevel: number;
  startingSkills: string[];
  startingWeapon: string;
  startingArmor: string;
  /** Palette for the procedural sprite: [primary, secondary, trim]. */
  palette: [number, number, number];
  /** Suggested point-buy allocation to preview. */
  suggested: Partial<Record<AttrKey, number>>;
}

export const CLASSES: Record<ClassId, ClassDef> = {
  mage: {
    id: "mage",
    name: (g) => (g === "female" ? "Siren" : "Mage"),
    role: "Arcane Caster",
    desc: "A weaver of raw magic. Devastating spells, fragile body. The Siren bends foes with charmed song.",
    primary: "int",
    hpBase: 18,
    mpBase: 20,
    hpPerLevel: 4,
    mpPerLevel: 8,
    startingSkills: ["firebolt", "mend"],
    startingWeapon: "oak_staff",
    startingArmor: "cloth_robe",
    palette: [0x7b4bff, 0x3a2a6a, 0xffcf5c],
    suggested: { int: 5, wis: 3, con: 2, cha: 2 },
  },
  rogue: {
    id: "rogue",
    name: () => "Rogue",
    role: "Shadow Duelist",
    desc: "Quick, precise and deadly. Strikes first and hits vital points, but cannot trade blows for long.",
    primary: "dex",
    hpBase: 24,
    mpBase: 10,
    hpPerLevel: 6,
    mpPerLevel: 4,
    startingSkills: ["backstab"],
    startingWeapon: "twin_daggers",
    startingArmor: "leather_vest",
    palette: [0x3ad0a0, 0x1f3a34, 0xe8e0f0],
    suggested: { dex: 6, con: 3, str: 2, cha: 1 },
  },
  ranger: {
    id: "ranger",
    name: () => "Ranger",
    role: "Wilds Hunter",
    desc: "Master of bow and beast. Reliable ranged damage and strong evasion in the open field.",
    primary: "dex",
    hpBase: 26,
    mpBase: 12,
    hpPerLevel: 6,
    mpPerLevel: 4,
    startingSkills: ["aimed_shot"],
    startingWeapon: "hunting_bow",
    startingArmor: "leather_vest",
    palette: [0x4f9d3a, 0x274d1e, 0xc9a55c],
    suggested: { dex: 5, wis: 3, con: 3, str: 1 },
  },
  knight: {
    id: "knight",
    name: () => "Knight",
    role: "Sworn Defender",
    desc: "Steel-clad guardian. Heavy armor, high defense, and holy strikes that punish the wicked.",
    primary: "str",
    hpBase: 32,
    mpBase: 10,
    hpPerLevel: 8,
    mpPerLevel: 3,
    startingSkills: ["smite", "guard"],
    startingWeapon: "longsword",
    startingArmor: "chainmail",
    palette: [0x9aa7c7, 0x3a4360, 0xffcf5c],
    suggested: { str: 5, con: 5, wis: 2 },
  },
  brute: {
    id: "brute",
    name: () => "Brute",
    role: "Savage Berserker",
    desc: "A wall of muscle and fury. Colossal damage and HP, but reckless and slow to strike.",
    primary: "str",
    hpBase: 38,
    mpBase: 8,
    hpPerLevel: 10,
    mpPerLevel: 2,
    startingSkills: ["crush"],
    startingWeapon: "great_axe",
    startingArmor: "hide_armor",
    palette: [0xc7563a, 0x5a2418, 0xe8c07a],
    suggested: { str: 6, con: 5, dex: 1 },
  },
  inquisitor: {
    id: "inquisitor",
    name: () => "Inquisitor",
    role: "Zealous Judge",
    desc: "Holy warrior-priest. Balances martial skill with divine magic and self-healing zeal.",
    primary: "wis",
    hpBase: 28,
    mpBase: 16,
    hpPerLevel: 7,
    mpPerLevel: 5,
    startingSkills: ["judgment", "purge", "focus"],
    startingWeapon: "war_mace",
    startingArmor: "chainmail",
    palette: [0xd0b04a, 0x4a3a1a, 0xe8e0f0],
    suggested: { wis: 5, str: 3, con: 3, cha: 1 },
  },
};

export const CLASS_ORDER: ClassId[] = ["mage", "rogue", "ranger", "knight", "brute", "inquisitor"];
