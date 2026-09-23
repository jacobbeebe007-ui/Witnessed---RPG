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
    palette: [0x5b3a9e, 0x241640, 0xd4af5a],
    suggested: { int: 4, wis: 2, con: 2 },
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
    palette: [0x4a4460, 0x17141f, 0x9a3b3b],
    suggested: { dex: 4, con: 2, str: 2 },
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
    palette: [0x3e6b3a, 0x1e2b18, 0xb08a4a],
    suggested: { dex: 4, wis: 2, con: 2 },
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
    palette: [0x8a94a8, 0x2c3346, 0xd4af5a],
    suggested: { str: 4, con: 3, wis: 1 },
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
    palette: [0x8f3f2c, 0x2a1712, 0xc08a4a],
    suggested: { str: 4, con: 4 },
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
    palette: [0x6e2b2b, 0x241820, 0xd4af5a],
    suggested: { wis: 4, str: 2, con: 2 },
  },
};

export const CLASS_ORDER: ClassId[] = ["mage", "rogue", "ranger", "knight", "brute", "inquisitor"];
