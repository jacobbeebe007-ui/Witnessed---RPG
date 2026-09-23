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
}

export const SKILLS: Record<string, Skill> = {
  // Caster (Mage / Siren)
  firebolt: { id: "firebolt", name: "Firebolt", mp: 4, kind: "magical", dice: "2d6", scale: "int", desc: "Hurl a bolt of flame." },
  frostlance: { id: "frostlance", name: "Frost Lance", mp: 6, kind: "magical", dice: "3d6", scale: "int", desc: "A piercing shard of ice." },
  siren_wail: { id: "siren_wail", name: "Siren's Wail", mp: 8, kind: "magical", dice: "2d8", scale: "cha", desc: "A charming, damaging cry." },
  mend: { id: "mend", name: "Mend", mp: 5, kind: "heal", dice: "2d6", scale: "wis", desc: "Restore vitality." },

  // Rogue
  backstab: { id: "backstab", name: "Backstab", mp: 3, kind: "physical", dice: "2d6", scale: "dex", desc: "A vicious strike from the shadows." },
  flurry: { id: "flurry", name: "Flurry", mp: 6, kind: "physical", dice: "1d6", scale: "dex", desc: "Three rapid cuts.", hits: 3 },

  // Ranger
  aimed_shot: { id: "aimed_shot", name: "Aimed Shot", mp: 3, kind: "physical", dice: "2d8", scale: "dex", desc: "A carefully placed arrow." },
  volley: { id: "volley", name: "Volley", mp: 7, kind: "physical", dice: "1d8", scale: "dex", desc: "A rain of arrows.", hits: 2 },

  // Knight
  smite: { id: "smite", name: "Smite", mp: 4, kind: "physical", dice: "2d8", scale: "str", desc: "A righteous overhead blow." },
  guard: { id: "guard", name: "Bulwark", mp: 2, kind: "buff", dice: "0", scale: "str", desc: "Brace, halving incoming damage.", effect: "guard" },

  // Brute
  crush: { id: "crush", name: "Crush", mp: 3, kind: "physical", dice: "2d10", scale: "str", desc: "A staggering slam." },
  rampage: { id: "rampage", name: "Rampage", mp: 7, kind: "physical", dice: "1d12", scale: "str", desc: "Two wild swings.", hits: 2 },

  // Inquisitor
  judgment: { id: "judgment", name: "Judgment", mp: 5, kind: "magical", dice: "2d8", scale: "wis", desc: "Holy fire scours the guilty." },
  purge: { id: "purge", name: "Purge", mp: 6, kind: "heal", dice: "3d6", scale: "wis", desc: "Cleanse wounds with zeal." },
  focus: { id: "focus", name: "Focus", mp: 2, kind: "buff", dice: "0", scale: "wis", desc: "Sharpen aim: +4 to hit next turn.", effect: "focus" },
};
