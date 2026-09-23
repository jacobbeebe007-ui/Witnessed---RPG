import type { Attributes, AttrKey } from "../data/attributes";
import { abilityMod } from "../data/dice";
import { CLASSES, type ClassId, type Gender } from "../data/classes";
import { ARMORS, WEAPONS, type ArmorItem, type WeaponItem } from "../data/items";

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
  inventory: string[]; // consumable + owned item ids
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
  c.hp = maxHP(c);
  c.mp = maxMP(c);
  return c;
}

export interface LevelUpResult {
  leveled: boolean;
  newLevel: number;
  hpGain: number;
  mpGain: number;
}

export function grantXP(c: Character, amount: number): LevelUpResult {
  c.xp += amount;
  let leveled = false;
  let hpGain = 0;
  let mpGain = 0;
  while (c.xp >= xpForNextLevel(c.level)) {
    c.xp -= xpForNextLevel(c.level);
    const beforeHP = maxHP(c);
    const beforeMP = maxMP(c);
    c.level += 1;
    hpGain += maxHP(c) - beforeHP;
    mpGain += maxMP(c) - beforeMP;
    leveled = true;
  }
  if (leveled) {
    c.hp = maxHP(c);
    c.mp = maxMP(c);
  }
  return { leveled, newLevel: c.level, hpGain, mpGain };
}
