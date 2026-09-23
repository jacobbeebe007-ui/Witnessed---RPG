export type AttrKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export const ATTR_KEYS: AttrKey[] = ["str", "dex", "con", "int", "wis", "cha"];

export interface AttrInfo {
  key: AttrKey;
  name: string;
  abbr: string;
  blurb: string;
}

export const ATTRIBUTES: Record<AttrKey, AttrInfo> = {
  str: { key: "str", name: "Strength", abbr: "STR", blurb: "Melee damage & carry weight" },
  dex: { key: "dex", name: "Dexterity", abbr: "DEX", blurb: "Accuracy, evasion & turn order" },
  con: { key: "con", name: "Constitution", abbr: "CON", blurb: "Max HP & endurance" },
  int: { key: "int", name: "Intelligence", abbr: "INT", blurb: "Arcane power & max MP" },
  wis: { key: "wis", name: "Wisdom", abbr: "WIS", blurb: "Healing, resistance & perception" },
  cha: { key: "cha", name: "Charisma", abbr: "CHA", blurb: "Shop prices & siren magic" },
};

export type Attributes = Record<AttrKey, number>;

export function baseAttributes(): Attributes {
  return { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };
}

export const POINT_BUY_POOL = 12;
export const ATTR_MIN = 8;
export const ATTR_MAX = 16;
