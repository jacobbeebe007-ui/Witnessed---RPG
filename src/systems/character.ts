import type { Attributes, AttrKey } from "../data/attributes";
import { abilityMod } from "../data/dice";
import { CLASSES, type ClassId, type Gender } from "../data/classes";
import { ARMORS, WEAPONS, type ArmorItem, type WeaponItem, type ArmorStyle, type WeaponStyle } from "../data/items";
import { CLASS_PROGRESSION, SKILLS } from "../data/skills";
import { COMPANIONS } from "../data/companions";

export interface Character {
  name: string;
  gender: Gender;
  classId: ClassId;
  attrs: Attributes;
  level: number;
  xp: number;
  hp: number;
  mp: number;
  gold: number;
  weaponId: string;
  armorId: string;
  skills: string[];
  inventory: string[];
  companionId?: string;
  hairColor?: number;
  skinTone?: number;
}

export function xpForNextLevel(level: number): number {
  return Math.floor(40 * Math.pow(level, 1.6));
}

export function maxHP(c: Character): number {
  const def = CLASSES[c.classId];
  return def.hpBase + (c.level - 1) * def.hpPerLevel + abilityMod(c.attrs.con) * c.level;
}

export function maxMP(c: Character): number {
  const def = CLASSES[c.classId];
  const casterMod = def.primary === "int" ? abilityMod(c.attrs.int) : def.primary === "wis" ? abilityMod(c.attrs.wis) : abilityMod(c.attrs.cha);
  return def.mpBase + (c.level - 1) * def.mpPerLevel + Math.max(0, casterMod) * c.level;
}

export function weapon(c: Character): WeaponItem {
  return WEAPONS[c.weaponId] ?? WEAPONS.oak_staff;
}

export function armor(c: Character): ArmorItem {
  return ARMORS[c.armorId] ?? ARMORS.cloth_robe;
}

export function weaponStyle(c: Character): WeaponStyle {
  return weapon(c).style;
}

export function armorStyle(c: Character): ArmorStyle {
  return armor(c).style;
}

/** Armor Class the enemy must beat with its d20 attack. */
export function armorClass(c: Character): number {
  const a = armor(c);
  const dex = abilityMod(c.attrs.dex) - (a.evasionPenalty ?? 0);
  return 10 + a.ac + Math.max(-2, dex);
}

export function initiative(c: Character): number {
  return abilityMod(c.attrs.dex);
}

/** Flat bonus added to the player's d20 attack roll. */
export function attackBonus(c: Character): number {
  const def = CLASSES[c.classId];
  const w = weapon(c);
  const scoreMod = def.primary === "str" ? abilityMod(c.attrs.str) : abilityMod(c.attrs.dex);
  const prof = 2 + Math.floor(c.level / 3);
  return scoreMod + w.hit + prof;
}

/** Ability modifier that scales a skill of the given key. */
export function scaleMod(c: Character, key: AttrKey): number {
  return abilityMod(c.attrs[key]);
}

export function createCharacter(gender: Gender, classId: ClassId, attrs: Attributes, name: string): Character {
  const def = CLASSES[classId];
  const c: Character = {
    name,
    gender,
    classId,
    attrs,
    level: 1,
    xp: 0,
    hp: 0,
    mp: 0,
    gold: 60,
    weaponId: def.startingWeapon,
    armorId: def.startingArmor,
    skills: [...def.startingSkills],
    inventory: ["potion", "potion"],
  };
  if (gender === "female" && classId === "mage" && !c.skills.includes("siren_wail")) {
    // Sirens begin with their signature cry already humming.
    c.skills.push("siren_wail");
  }
  syncSkills(c);
  c.hp = maxHP(c);
  c.mp = maxMP(c);
  return c;
}

export function makeCompanion(id: string): Character {
  const def = COMPANIONS[id];
  const c = createCharacter(def.gender, def.classId, { ...def.attrs }, def.name);
  c.companionId = id;
  c.hairColor = def.hairColor;
  c.skinTone = def.skinTone;
  c.gold = 0;
  c.inventory = [];
  c.hp = maxHP(c);
  c.mp = maxMP(c);
  return c;
}

/** Unlock every skill the character has earned for their current level. Returns newly granted ids. */
export function syncSkills(c: Character): string[] {
  const unlocked: string[] = [];
  const steps = CLASS_PROGRESSION[c.classId] ?? [];
  for (const step of steps) {
    if (c.level >= step.level && !c.skills.includes(step.skill) && SKILLS[step.skill]) {
      c.skills.push(step.skill);
      unlocked.push(step.skill);
    }
  }
  if (c.gender === "female" && c.classId === "mage" && c.level >= 1 && !c.skills.includes("siren_wail")) {
    c.skills.push("siren_wail");
    unlocked.push("siren_wail");
  }
  return unlocked;
}

export interface LevelUpResult {
  leveled: boolean;
  newLevel: number;
  hpGain: number;
  mpGain: number;
  newSkills: string[];
}

export function grantXP(c: Character, amount: number): LevelUpResult {
  c.xp += amount;
  let leveled = false;
  let hpGain = 0;
  let mpGain = 0;
  const newSkills: string[] = [];
  while (c.xp >= xpForNextLevel(c.level)) {
    c.xp -= xpForNextLevel(c.level);
    const beforeHP = maxHP(c);
    const beforeMP = maxMP(c);
    c.level += 1;
    hpGain += maxHP(c) - beforeHP;
    mpGain += maxMP(c) - beforeMP;
    leveled = true;
    newSkills.push(...syncSkills(c));
  }
  if (leveled) {
    c.hp = maxHP(c);
    c.mp = maxMP(c);
  }
  return { leveled, newLevel: c.level, hpGain, mpGain, newSkills };
}

export function defaultHair(classId: ClassId, gender: Gender): number {
  const byClass: Record<ClassId, number> = {
    mage: gender === "female" ? 0xc9a0ff : 0x5a3a8a,
    rogue: gender === "female" ? 0x1a1220 : 0x2e2a3a,
    ranger: gender === "female" ? 0x8a4a20 : 0x6b4a2a,
    knight: gender === "female" ? 0xf0d080 : 0xcaa64a,
    brute: gender === "female" ? 0xa03020 : 0x7a2a1a,
    inquisitor: gender === "female" ? 0xf4ecd8 : 0xe8e0d0,
  };
  return byClass[classId];
}

export function defaultSkin(gender: Gender): number {
  return gender === "female" ? 0xf3c6a8 : 0xe0a878;
}
