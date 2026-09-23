// D&D-style dice utilities.

export function rollDie(sides: number): number {
  return 1 + Math.floor(Math.random() * sides);
}

/** Roll `count` dice of `sides` and add a flat modifier. */
export function roll(count: number, sides: number, mod = 0): number {
  let total = mod;
  for (let i = 0; i < count; i++) total += rollDie(sides);
  return total;
}

/** Parse and roll a dice string like "2d6+3" or "1d8" or "d20". */
export function rollNotation(notation: string): { total: number; rolls: number[] } {
  const m = notation.trim().toLowerCase().match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (!m) return { total: parseInt(notation, 10) || 0, rolls: [] };
  const count = m[1] ? parseInt(m[1], 10) : 1;
  const sides = parseInt(m[2], 10);
  const mod = m[3] ? parseInt(m[3], 10) : 0;
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) rolls.push(rollDie(sides));
  return { total: rolls.reduce((a, b) => a + b, 0) + mod, rolls };
}

/** D&D ability modifier from a score. */
export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function d20(): number {
  return rollDie(20);
}

export function chance(p: number): boolean {
  return Math.random() < p;
}

export function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
