export type ItemKind = "weapon" | "armor" | "consumable";

/** Visual weapon family used by the pixel-art renderer. */
export type WeaponStyle = "staff" | "dagger" | "bow" | "sword" | "axe" | "mace" | "great" | "hammer" | "rapier";

/** Visual armor family. Gender dimorphism is applied at draw time. */
export type ArmorStyle = "cloth" | "leather" | "hide" | "chain" | "plate" | "heavy";

export interface WeaponItem {
  id: string;
  name: string;
  kind: "weapon";
  /** Base damage dice, e.g. "1d8". */
  dice: string;
  /** Flat to-hit bonus (modifies the d20 attack roll). */
  hit: number;
  price: number;
  desc: string;
  style: WeaponStyle;
}

export interface ArmorItem {
  id: string;
  name: string;
  kind: "armor";
  /** Armor Class bonus (raises the number an attacker must beat). */
  ac: number;
  /** Evasion penalty for very heavy armor (subtracts from DEX-based dodge). */
  evasionPenalty?: number;
  price: number;
  desc: string;
  style: ArmorStyle;
}

export interface ConsumableItem {
  id: string;
  name: string;
  kind: "consumable";
  effect: "heal" | "mana";
  amount: string; // dice
  price: number;
  desc: string;
}

export type Item = WeaponItem | ArmorItem | ConsumableItem;

export const WEAPONS: Record<string, WeaponItem> = {
  oak_staff: { id: "oak_staff", name: "Oak Staff", kind: "weapon", dice: "1d6", hit: 0, price: 20, desc: "A simple focus for spellcasters.", style: "staff" },
  twin_daggers: { id: "twin_daggers", name: "Twin Daggers", kind: "weapon", dice: "1d4", hit: 2, price: 30, desc: "Fast and accurate; +2 to hit.", style: "dagger" },
  hunting_bow: { id: "hunting_bow", name: "Hunting Bow", kind: "weapon", dice: "1d8", hit: 1, price: 40, desc: "Strikes from afar.", style: "bow" },
  longsword: { id: "longsword", name: "Longsword", kind: "weapon", dice: "1d8", hit: 1, price: 45, desc: "A knight's reliable blade.", style: "sword" },
  great_axe: { id: "great_axe", name: "Great Axe", kind: "weapon", dice: "1d12", hit: -1, price: 55, desc: "Brutal but unwieldy; -1 to hit.", style: "axe" },
  war_mace: { id: "war_mace", name: "War Mace", kind: "weapon", dice: "1d8", hit: 0, price: 40, desc: "Blessed bludgeon of the faithful.", style: "mace" },
  steel_rapier: { id: "steel_rapier", name: "Steel Rapier", kind: "weapon", dice: "1d6", hit: 4, price: 140, desc: "Exquisite balance; +4 to hit.", style: "rapier" },
  runed_staff: { id: "runed_staff", name: "Runed Staff", kind: "weapon", dice: "1d8", hit: 2, price: 160, desc: "Amplifies arcane focus.", style: "staff" },
  composite_bow: { id: "composite_bow", name: "Composite Bow", kind: "weapon", dice: "1d10", hit: 2, price: 170, desc: "Layered horn and sinew.", style: "bow" },
  greatsword: { id: "greatsword", name: "Greatsword", kind: "weapon", dice: "2d6", hit: 1, price: 200, desc: "A two-handed wall of steel.", style: "great" },
  warhammer: { id: "warhammer", name: "Warhammer", kind: "weapon", dice: "1d10", hit: 1, price: 190, desc: "Crushes plate and bone alike.", style: "hammer" },
};

export const ARMORS: Record<string, ArmorItem> = {
  cloth_robe: { id: "cloth_robe", name: "Cloth Robe", kind: "armor", ac: 0, price: 15, desc: "Soft cloth — a gown on women, a tabard on men.", style: "cloth" },
  leather_vest: { id: "leather_vest", name: "Leather Vest", kind: "armor", ac: 2, price: 35, desc: "Fitted leather, cut to the wearer's frame.", style: "leather" },
  hide_armor: { id: "hide_armor", name: "Hide Armor", kind: "armor", ac: 3, price: 50, desc: "Thick beast hide with fur trim.", style: "hide" },
  chainmail: { id: "chainmail", name: "Chainmail", kind: "armor", ac: 5, evasionPenalty: 1, price: 90, desc: "Interlocking rings — skirted mail or a hauberk.", style: "chain" },
  brigandine: { id: "brigandine", name: "Brigandine", kind: "armor", ac: 4, price: 120, desc: "Riveted plates in cloth. Tailored feminine or bulky.", style: "leather" },
  half_plate: { id: "half_plate", name: "Half Plate", kind: "armor", ac: 7, evasionPenalty: 2, price: 240, desc: "Polished plate, sculpted or squared by the smith.", style: "plate" },
  full_plate: { id: "full_plate", name: "Full Plate", kind: "armor", ac: 9, evasionPenalty: 3, price: 420, desc: "An impregnable shell — valkyrie lines or a war-bulwark.", style: "heavy" },
};

export const CONSUMABLES: Record<string, ConsumableItem> = {
  potion: { id: "potion", name: "Healing Potion", kind: "consumable", effect: "heal", amount: "2d6+4", price: 25, desc: "Restores health." },
  hi_potion: { id: "hi_potion", name: "Greater Potion", kind: "consumable", effect: "heal", amount: "4d6+8", price: 70, desc: "Restores lots of health." },
  ether: { id: "ether", name: "Ether", kind: "consumable", effect: "mana", amount: "2d6+4", price: 40, desc: "Restores magic." },
};

export const ALL_ITEMS: Record<string, Item> = { ...WEAPONS, ...ARMORS, ...CONSUMABLES };

export function getItem(id: string): Item | undefined {
  return ALL_ITEMS[id];
}

export const SHOP_STOCK: string[] = [
  "potion",
  "hi_potion",
  "ether",
  "steel_rapier",
  "runed_staff",
  "composite_bow",
  "greatsword",
  "warhammer",
  "brigandine",
  "half_plate",
  "full_plate",
];
