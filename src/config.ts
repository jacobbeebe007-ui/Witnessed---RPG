export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const TILE = 32;

export const COLORS: Record<string, number> = {
  bg: 0x0b0710,
  panel: 0x1a1226,
  panelLight: 0x2a1e3c,
  border: 0x6b4ba3,
  accent: 0xb47bff,
  accent2: 0xffcf5c,
  text: 0xe8e0f0,
  textDim: 0x9a8bb5,
  hp: 0xe0556b,
  mp: 0x4aa6ff,
  xp: 0x59d98a,
  danger: 0xff5c5c,
  good: 0x59d98a,
};

export const FONT = "'Trebuchet MS', 'Segoe UI', sans-serif";

export const SCENES = {
  Boot: "Boot",
  Start: "Start",
  Settings: "Settings",
  CharacterCreation: "CharacterCreation",
  Overworld: "Overworld",
  Battle: "Battle",
  Shop: "Shop",
} as const;
