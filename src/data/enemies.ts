export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  ac: number;
  hit: number;
  dmg: string; // damage dice
  speed: number;
  xp: number;
  gold: string; // dice for gold reward
  /** Sprite shape used by the procedural generator. */
  shape: "slime" | "goblin" | "wolf" | "bandit" | "skeleton" | "mage" | "dragon" | "golem" | "wraith";
  palette: [number, number, number];
  minLevel: number;
  boss?: boolean;
  skillDice?: string; // occasional special attack
}

export const ENEMIES: Record<string, EnemyDef> = {
  slime: { id: "slime", name: "Cave Slime", hp: 14, ac: 10, hit: 2, dmg: "1d4", speed: 6, xp: 12, gold: "1d6", shape: "slime", palette: [0x59d98a, 0x2a6b45, 0xbfffdc], minLevel: 1 },
  goblin: { id: "goblin", name: "Goblin Cutter", hp: 18, ac: 12, hit: 3, dmg: "1d6", speed: 11, xp: 18, gold: "1d8+2", shape: "goblin", palette: [0x8bbf3a, 0x3a4d18, 0xd0d0a0], minLevel: 1 },
  wolf: { id: "wolf", name: "Dire Wolf", hp: 22, ac: 13, hit: 4, dmg: "1d6+1", speed: 14, xp: 24, gold: "1d6", shape: "wolf", palette: [0x8a8a9a, 0x33333f, 0xe0e0e8], minLevel: 2 },
  bandit: { id: "bandit", name: "Highway Bandit", hp: 28, ac: 13, hit: 4, dmg: "1d8", speed: 10, xp: 30, gold: "2d8+5", shape: "bandit", palette: [0xc7563a, 0x4a2418, 0xe8c07a], minLevel: 2, skillDice: "2d6" },
  skeleton: { id: "skeleton", name: "Risen Skeleton", hp: 26, ac: 14, hit: 5, dmg: "1d8", speed: 8, xp: 34, gold: "1d10", shape: "skeleton", palette: [0xe8e0d0, 0x5a5040, 0xb0a890], minLevel: 3 },
  cultist: { id: "cultist", name: "Cultist Adept", hp: 24, ac: 12, hit: 4, dmg: "1d6", speed: 9, xp: 40, gold: "2d10", shape: "mage", palette: [0x7b4bff, 0x2a1a4a, 0xffcf5c], minLevel: 3, skillDice: "3d6" },
  wraith: { id: "wraith", name: "Grave Wraith", hp: 34, ac: 15, hit: 6, dmg: "1d10", speed: 12, xp: 55, gold: "2d10+5", shape: "wraith", palette: [0x6a4a9a, 0x1a1030, 0xbfa0ff], minLevel: 4, skillDice: "2d8" },
  golem: { id: "golem", name: "Stone Golem", hp: 60, ac: 16, hit: 6, dmg: "2d6", speed: 5, xp: 80, gold: "3d10", shape: "golem", palette: [0x8a7a6a, 0x3a3028, 0xc0b0a0], minLevel: 5 },

  // Bosses (roam the overworld)
  boss_ogre: { id: "boss_ogre", name: "Grommash, the Bonebreaker", hp: 90, ac: 14, hit: 7, dmg: "2d8+2", speed: 8, xp: 200, gold: "4d12+20", shape: "golem", palette: [0xc7563a, 0x3a1810, 0xffcf5c], minLevel: 3, boss: true, skillDice: "3d8" },
  boss_dragon: { id: "boss_dragon", name: "Vaelysra, the Ember Wyrm", hp: 160, ac: 17, hit: 9, dmg: "3d8", speed: 12, xp: 500, gold: "6d20+50", shape: "dragon", palette: [0xff5c3a, 0x5a1810, 0xffcf5c], minLevel: 6, boss: true, skillDice: "4d8" },
};

/** Random-encounter tables per overworld region. */
export const ENCOUNTER_TABLES: Record<string, string[]> = {
  meadow: ["slime", "goblin", "wolf"],
  forest: ["wolf", "bandit", "goblin", "skeleton"],
  wastes: ["skeleton", "cultist", "wraith", "golem"],
};
