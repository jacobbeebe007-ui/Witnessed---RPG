export type SkillKind = "physical" | "magical" | "heal" | "buff";

export interface Skill {
  id: string;
  name: string;
  mp: number;
  kind: SkillKind;
  /** Damage/heal dice notation, scaled by the relevant ability modifier. */
  dice: string;
  /** Which ability score scales this skill. */
  scale: "str" | "dex" | "int" | "wis" | "cha";
  desc: string;
  /** Buff effect id, if kind === "buff". */
  effect?: "guard" | "focus" | "haste";
  hits?: number;
  /** Hits every living enemy. */
  aoe?: boolean;
}

export const SKILLS: Record<string, Skill> = {
  // Caster (Mage / Siren)
  firebolt: { id: "firebolt", name: "Firebolt", mp: 4, kind: "magical", dice: "2d6", scale: "int", desc: "Hurl a bolt of flame." },
  frostlance: { id: "frostlance", name: "Frost Lance", mp: 6, kind: "magical", dice: "3d6", scale: "int", desc: "A piercing shard of ice." },
  siren_wail: { id: "siren_wail", name: "Siren's Wail", mp: 8, kind: "magical", dice: "2d8", scale: "cha", desc: "A charming, damaging cry." },
  mend: { id: "mend", name: "Mend", mp: 5, kind: "heal", dice: "2d6", scale: "wis", desc: "Restore an ally's vitality." },
  arcane_burst: { id: "arcane_burst", name: "Arcane Burst", mp: 9, kind: "magical", dice: "2d8", scale: "int", desc: "A compressed nova of raw magic.", hits: 2 },
  nova: { id: "nova", name: "Solstice Nova", mp: 14, kind: "magical", dice: "3d8", scale: "int", desc: "Bathe the field in solar fire.", aoe: true },

  // Rogue
  backstab: { id: "backstab", name: "Backstab", mp: 3, kind: "physical", dice: "2d6", scale: "dex", desc: "A vicious strike from the shadows." },
  flurry: { id: "flurry", name: "Flurry", mp: 6, kind: "physical", dice: "1d6", scale: "dex", desc: "Three rapid cuts.", hits: 3 },
  shadowstep: { id: "shadowstep", name: "Shadowstep", mp: 8, kind: "physical", dice: "3d6", scale: "dex", desc: "Blink behind the foe and carve." },
  deathbloom: { id: "deathbloom", name: "Deathbloom", mp: 12, kind: "physical", dice: "2d8", scale: "dex", desc: "A finishing dance of blades.", hits: 2 },

  // Ranger
  aimed_shot: { id: "aimed_shot", name: "Aimed Shot", mp: 3, kind: "physical", dice: "2d8", scale: "dex", desc: "A carefully placed arrow." },
  volley: { id: "volley", name: "Volley", mp: 7, kind: "physical", dice: "1d8", scale: "dex", desc: "A rain of arrows.", hits: 2 },
  beastmark: { id: "beastmark", name: "Beastmark", mp: 5, kind: "buff", dice: "0", scale: "wis", desc: "Sharpen the next volley.", effect: "focus" },
  skyfall: { id: "skyfall", name: "Skyfall", mp: 12, kind: "physical", dice: "2d6", scale: "dex", desc: "Arrows from the canopy.", hits: 3, aoe: true },

  // Knight
  smite: { id: "smite", name: "Smite", mp: 4, kind: "physical", dice: "2d8", scale: "str", desc: "A righteous overhead blow." },
  guard: { id: "guard", name: "Bulwark", mp: 2, kind: "buff", dice: "0", scale: "str", desc: "Brace, halving incoming damage.", effect: "guard" },
  holy_aegis: { id: "holy_aegis", name: "Holy Aegis", mp: 7, kind: "heal", dice: "2d8", scale: "wis", desc: "A prayer that knits wounds." },
  oathbreak: { id: "oathbreak", name: "Oathbreaker", mp: 12, kind: "physical", dice: "3d10", scale: "str", desc: "A vow made steel." },

  // Brute
  crush: { id: "crush", name: "Crush", mp: 3, kind: "physical", dice: "2d10", scale: "str", desc: "A staggering slam." },
  rampage: { id: "rampage", name: "Rampage", mp: 7, kind: "physical", dice: "1d12", scale: "str", desc: "Two wild swings.", hits: 2 },
  warcry: { id: "warcry", name: "Warcry", mp: 4, kind: "buff", dice: "0", scale: "str", desc: "Fury that steadies the next blow.", effect: "focus" },
  earthshatter: { id: "earthshatter", name: "Earthshatter", mp: 13, kind: "physical", dice: "3d8", scale: "str", desc: "Split the ground beneath every foe.", aoe: true },

  // Inquisitor
  judgment: { id: "judgment", name: "Judgment", mp: 5, kind: "magical", dice: "2d8", scale: "wis", desc: "Holy fire scours the guilty." },
  purge: { id: "purge", name: "Purge", mp: 6, kind: "heal", dice: "3d6", scale: "wis", desc: "Cleanse wounds with zeal." },
  focus: { id: "focus", name: "Focus", mp: 2, kind: "buff", dice: "0", scale: "wis", desc: "Sharpen aim: +4 to hit next turn.", effect: "focus" },
  divine_storm: { id: "divine_storm", name: "Divine Storm", mp: 12, kind: "magical", dice: "2d10", scale: "wis", desc: "A column of consecrated light.", aoe: true },
};

export interface SkillUnlock {
  level: number;
  skill: string;
}

/** Skills granted at given levels. Level-1 entries match starting kits. */
export const CLASS_PROGRESSION: Record<string, SkillUnlock[]> = {
  mage: [
    { level: 1, skill: "firebolt" },
    { level: 1, skill: "mend" },
    { level: 3, skill: "frostlance" },
    { level: 5, skill: "arcane_burst" },
    { level: 7, skill: "nova" },
  ],
  rogue: [
    { level: 1, skill: "backstab" },
    { level: 3, skill: "flurry" },
    { level: 5, skill: "shadowstep" },
    { level: 7, skill: "deathbloom" },
  ],
  ranger: [
    { level: 1, skill: "aimed_shot" },
    { level: 3, skill: "volley" },
    { level: 5, skill: "beastmark" },
    { level: 7, skill: "skyfall" },
  ],
  knight: [
    { level: 1, skill: "smite" },
    { level: 1, skill: "guard" },
    { level: 3, skill: "holy_aegis" },
    { level: 5, skill: "oathbreak" },
  ],
  brute: [
    { level: 1, skill: "crush" },
    { level: 3, skill: "rampage" },
    { level: 5, skill: "warcry" },
    { level: 7, skill: "earthshatter" },
  ],
  inquisitor: [
    { level: 1, skill: "judgment" },
    { level: 1, skill: "purge" },
    { level: 1, skill: "focus" },
    { level: 4, skill: "divine_storm" },
  ],
};
