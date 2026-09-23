import { abilityMod, d20, rollNotation, chance } from "../data/dice";
import type { EnemyDef } from "../data/enemies";
import type { Character } from "./character";
import { armorClass, attackBonus, scaleMod, weapon } from "./character";
import { SKILLS, type Skill } from "../data/skills";
import type { AttrKey } from "../data/attributes";

export interface EnemyInstance {
  def: EnemyDef;
  hp: number;
  maxHp: number;
  alive: boolean;
}

export function spawnEnemy(def: EnemyDef, hpMult = 1): EnemyInstance {
  const hp = Math.max(1, Math.round(def.hp * hpMult));
  return { def, hp, maxHp: hp, alive: true };
}

export interface AttackResult {
  hit: boolean;
  crit: boolean;
  roll: number;
  total: number;
  damage: number;
  target: number; // AC needed to hit
  log: string;
}

/** Player basic weapon attack against an enemy. */
export function playerAttack(c: Character, e: EnemyInstance): AttackResult {
  const w = weapon(c);
  const roll = d20();
  const bonus = attackBonus(c);
  const total = roll + bonus;
  const crit = roll === 20;
  const hit = crit || (roll !== 1 && total >= e.def.ac);
  let damage = 0;
  if (hit) {
    const dmgMod = scaleMod(c, primaryAttackAttr(c));
    const base = rollNotation(w.dice);
    damage = Math.max(1, base.total + dmgMod);
    if (crit) damage += rollNotation(w.dice).total;
  }
  const log = hit
    ? `${c.name} strikes with ${w.name} (d20 ${roll}+${bonus}=${total} vs AC ${e.def.ac})${crit ? " — CRITICAL!" : ""} for ${damage} damage.`
    : `${c.name} attacks (d20 ${roll}+${bonus}=${total} vs AC ${e.def.ac}) and misses.`;
  return { hit, crit, roll, total, damage, target: e.def.ac, log };
}

function primaryAttackAttr(c: Character): AttrKey {
  // STR classes use STR for weapon damage; others use DEX.
  return c.classId === "knight" || c.classId === "brute" || c.classId === "inquisitor" ? "str" : "dex";
}

export interface SkillResult {
  ok: boolean;
  damage: number;
  heal: number;
  buff?: Skill["effect"];
  log: string;
  hits: number;
}

/** Resolve a skill by the player against an enemy (or self for heal/buff). */
export function playerSkill(c: Character, skillId: string, e: EnemyInstance, focusBonus: number): SkillResult {
  const sk = SKILLS[skillId];
  if (!sk) return { ok: false, damage: 0, heal: 0, log: "Nothing happens.", hits: 0 };
  const mod = scaleMod(c, sk.scale);

  if (sk.kind === "heal") {
    const amt = Math.max(1, rollNotation(sk.dice).total + mod);
    return { ok: true, damage: 0, heal: amt, log: `${c.name} casts ${sk.name}, restoring ${amt} HP.`, hits: 0 };
  }
  if (sk.kind === "buff") {
    return { ok: true, damage: 0, heal: 0, buff: sk.effect, log: `${c.name} uses ${sk.name}.`, hits: 0 };
  }

  // Offensive skill: number of hits, each rolls to-hit for physical (magic auto-hits but can be resisted lightly).
  const hits = sk.hits ?? 1;
  let damage = 0;
  let landed = 0;
  for (let i = 0; i < hits; i++) {
    if (sk.kind === "physical") {
      const roll = d20();
      const total = roll + attackBonus(c) + focusBonus;
      if (roll === 20 || (roll !== 1 && total >= e.def.ac)) {
        damage += Math.max(1, rollNotation(sk.dice).total + mod);
        landed++;
      }
    } else {
      // magical: rarely resisted
      const resisted = chance(0.1);
      const dmg = Math.max(1, rollNotation(sk.dice).total + mod);
      damage += resisted ? Math.floor(dmg / 2) : dmg;
      landed++;
    }
  }
  const label = hits > 1 ? `${sk.name} (${landed}/${hits} hits)` : sk.name;
  const verb = sk.kind === "magical" ? "unleashes" : "performs";
  return {
    ok: true,
    damage,
    heal: 0,
    log: damage > 0 ? `${c.name} ${verb} ${label} for ${damage} damage.` : `${c.name} uses ${sk.name} but it misses!`,
    hits: landed,
  };
}

export interface EnemyTurnResult {
  damage: number;
  hit: boolean;
  special: boolean;
  log: string;
}

/** Enemy attacks the player. `guarding` halves damage; returns damage dealt. */
export function enemyAttack(e: EnemyInstance, c: Character, guarding: boolean, difficultyMult: number): EnemyTurnResult {
  const ac = armorClass(c);
  const roll = d20();
  const useSpecial = !!e.def.skillDice && chance(e.def.boss ? 0.4 : 0.25);
  const total = roll + e.def.hit;
  const crit = roll === 20;
  const hit = crit || (roll !== 1 && total >= ac);
  let damage = 0;
  if (hit) {
    const dice = useSpecial ? e.def.skillDice! : e.def.dmg;
    let dmg = rollNotation(dice).total;
    if (crit) dmg += rollNotation(dice).total;
    dmg = Math.round(dmg * difficultyMult);
    if (guarding) dmg = Math.floor(dmg / 2);
    damage = Math.max(1, dmg);
  }
  const name = e.def.name;
  const action = useSpecial ? "unleashes a special attack" : "attacks";
  const log = hit
    ? `${name} ${action} (d20 ${roll}+${e.def.hit}=${total} vs AC ${ac})${crit ? " — CRIT!" : ""}${guarding ? " (guarded)" : ""} for ${damage} damage.`
    : `${name} ${action} (d20 ${roll}+${e.def.hit}=${total} vs AC ${ac}) but misses.`;
  return { damage, hit, special: useSpecial, log };
}

export function playerInitiative(c: Character): number {
  return d20() + abilityMod(c.attrs.dex);
}

export function enemyInitiative(e: EnemyDef): number {
  return d20() + Math.floor((e.speed - 10) / 2);
}
